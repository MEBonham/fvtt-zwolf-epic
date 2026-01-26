const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;
import { SheetStateManager } from "../helpers/sheet-state-manager.mjs";
import { calculateProgressionBonuses, calculateTn } from "../helpers/calculation-utils.mjs";

/**
 * Actor sheet for Z-Wolf Epic actors.
 * @extends {ActorSheetV2}
 */
export class ZWolfActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

    constructor(options = {}) {
        super(options);

        // Initialize state manager with custom scroll selectors
        this.stateManager = new SheetStateManager(this, {
            scrollSelectors: [".tab", ".abilities-accordion", ".biography-content", ".inventory-content", ".configure-content"],
            tabSelector: ".tab[data-tab]",
            tabNavSelector: ".sheet-tabs .item[data-tab]"
        });

        // Initialize tab groups
        this.tabGroups = {
            primary: "main"
        };
    }

    static DEFAULT_OPTIONS = {
        classes: ["zwolf-epic", "sheet", "actor"],
        position: {
            width: 900,
            height: 650
        },
        actions: {
            editImage: ZWolfActorSheet.#onEditImage,
            changeTab: ZWolfActorSheet.#onChangeTab
        },
        form: {
            submitOnChange: true
        },
        window: {
            resizable: true
        }
    };

    static PARTS = {
        header: {
            template: "systems/zwolf-epic/templates/actor/parts/actor-header.hbs"
        },
        sidebar: {
            template: "systems/zwolf-epic/templates/actor/parts/actor-sidebar.hbs"
        },
        tabs: {
            template: "systems/zwolf-epic/templates/actor/parts/actor-tabs.hbs"
        },
        "tab-main": {
            template: "systems/zwolf-epic/templates/actor/parts/actor-abilities-accordion.hbs",
            scrollable: [".abilities-accordion"]
        },
        "tab-biography": {
            template: "systems/zwolf-epic/templates/actor/parts/actor-biography-content.hbs",
            scrollable: [".biography-content"]
        },
        "tab-inventory": {
            template: "systems/zwolf-epic/templates/actor/parts/actor-inventory-content.hbs",
            scrollable: [".inventory-content"]
        },
        "tab-configure": {
            template: "systems/zwolf-epic/templates/actor/parts/actor-configure-content.hbs",
            scrollable: [".configure-content"]
        }
    };

    async _prepareContext(options) {
        // Capture state before re-render
        if (this.stateManager) {
            this.stateManager.captureState();
        }

        const context = await super._prepareContext(options);

        context.system = this.actor.system;
        context.items = this.actor.items;

        // Add actor type flags
        context.isCharacter = ["pc", "npc", "eidolon"].includes(this.actor.type);
        context.isEidolon = this.actor.type === "eidolon";
        context.isMook = this.actor.type === "mook";
        context.isSpawn = this.actor.type === "spawn";
        context.isGM = game.user.isGM;

        // Ensure tabGroups.primary has a value
        if (!this.tabGroups.primary) {
            this.tabGroups.primary = "main";
        }

        // Add tabs configuration
        context.tabs = this._getTabs();
        context.currentTab = this.tabGroups.primary;

        // Determine visible parts
        context.showTabs = !context.isSpawn;
        context.showBiography = context.isCharacter;
        context.showInventory = context.isCharacter;
        context.showConfigure = !context.isSpawn;

        // Calculate progression bonuses
        const level = context.system.level ?? 0;
        const progressionOnlyLevel = this._getProgressionOnlyLevel();
        const progressionBonuses = calculateProgressionBonuses(level, progressionOnlyLevel);

        // Process side effects to get highest progressions
        const sideEffects = this._processSideEffects();
        context.sideEffects = sideEffects;

        // Organize stats by progression
        context.progressions = this._organizeByProgression(context.system, progressionBonuses);

        // Calculate target numbers
        context.tns = {
            toughness: calculateTn(sideEffects.toughnessTNProgression, level, progressionOnlyLevel),
            destiny: calculateTn(sideEffects.destinyTNProgression, level, progressionOnlyLevel),
            improvised: calculateTn("mediocre", level, progressionOnlyLevel),
            healing: calculateTn("moderate", level, progressionOnlyLevel),
            challenge: calculateTn("specialty", level, progressionOnlyLevel)
        };

        return context;
    }

    /**
     * Get tab configuration for current actor type
     * @returns {Object} Tab configuration
     * @private
     */
    _getTabs() {
        const actorType = this.actor.type;
        let tabs = {};

        // Character types get all tabs
        if (["pc", "npc", "eidolon"].includes(actorType)) {
            tabs = {
                main: { id: "main", group: "primary", label: "Main" },
                biography: { id: "biography", group: "primary", label: "Biography" },
                inventory: { id: "inventory", group: "primary", label: "Inventory" },
                configure: { id: "configure", group: "primary", label: "Configure" }
            };
        }
        // Mooks get main and configure
        else if (actorType === "mook") {
            tabs = {
                main: { id: "main", group: "primary", label: "Main" },
                configure: { id: "configure", group: "primary", label: "Configure" }
            };
        }

        // Set active states
        for (const [k, v] of Object.entries(tabs)) {
            v.active = this.tabGroups.primary === k;
            v.cssClass = v.active ? "active" : "";
        }

        return tabs;
    }

    /**
     * Get progression-only level from Progression Enhancement item
     * @returns {number} 0 or 1
     * @private
     */
    _getProgressionOnlyLevel() {
        if (this.actor.items) {
            return this.actor.items.some(item => item.name === "Progression Enhancement") ? 1 : 0;
        }
        return 0;
    }

    /**
     * Organize attributes and skills by their progression tiers
     * @param {Object} system - Actor system data
     * @param {Object} bonuses - Progression bonuses
     * @returns {Object} Organized progression data
     * @private
     */
    _organizeByProgression(system, bonuses) {
        const progressions = {
            mediocre: { name: "Mediocre", bonus: bonuses.mediocre, stats: [] },
            moderate: { name: "Moderate", bonus: bonuses.moderate, stats: [] },
            specialty: { name: "Specialty", bonus: bonuses.specialty, stats: [] },
            awesome: { name: "Awesome", bonus: bonuses.awesome, stats: [] }
        };

        // Ensure system data exists
        system.attributes = system.attributes || this._getDefaultAttributes();
        system.skills = system.skills || this._getDefaultSkills();

        // Organize attributes
        const attributes = ["agility", "fortitude", "perception", "willpower"];
        attributes.forEach(attr => {
            const progression = system.attributes[attr]?.progression || "moderate";
            progressions[progression].stats.push({
                name: attr.charAt(0).toUpperCase() + attr.slice(1),
                type: "attribute",
                key: attr,
                value: bonuses[progression]
            });
        });

        // Organize skills
        const skills = ["acumen", "athletics", "brawn", "dexterity", "glibness", "influence", "insight", "stealth"];
        skills.forEach(skill => {
            const progression = system.skills[skill]?.progression || "mediocre";
            progressions[progression].stats.push({
                name: skill.charAt(0).toUpperCase() + skill.slice(1),
                type: "skill",
                key: skill,
                value: bonuses[progression]
            });
        });

        return progressions;
    }

    /**
     * Get default attributes structure
     * @returns {Object} Default attributes
     * @private
     */
    _getDefaultAttributes() {
        return {
            agility: { value: 0, progression: "moderate" },
            fortitude: { value: 0, progression: "moderate" },
            perception: { value: 0, progression: "moderate" },
            willpower: { value: 0, progression: "moderate" }
        };
    }

    /**
     * Get default skills structure
     * @returns {Object} Default skills
     * @private
     */
    _getDefaultSkills() {
        return {
            acumen: { value: 0, progression: "mediocre" },
            athletics: { value: 0, progression: "mediocre" },
            brawn: { value: 0, progression: "mediocre" },
            dexterity: { value: 0, progression: "mediocre" },
            glibness: { value: 0, progression: "mediocre" },
            influence: { value: 0, progression: "mediocre" },
            insight: { value: 0, progression: "mediocre" },
            stealth: { value: 0, progression: "mediocre" }
        };
    }

    /**
     * Process side effects from all attached items
     * @returns {Object} Side effects data including progressions, vision, resistances, etc.
     * @private
     */
    _processSideEffects() {
        const progressionLevels = {
            "": 0,
            "mediocre": 1,
            "moderate": 2,
            "specialty": 3,
            "awesome": 4
        };

        // Initialize tracking objects
        const highest = {
            speed: { level: 0, progression: null, source: null },
            toughness: { level: 1, progression: "mediocre", source: "default" },
            destiny: { level: 2, progression: "moderate", source: "default" },
            nightsight: { radius: this.actor.system.nightsight || 1, source: "base" },
            darkvision: { radius: this.actor.system.darkvision || 0.2, source: "base" }
        };

        const accumulated = {
            bulkCapacityBoost: 0,
            sizeModifier: 0,
            characterTags: [],
            proficiencies: new Set(),
            resistances: new Set(),
            vulnerabilities: new Set()
        };

        // Helper to check a single side effect
        const checkSideEffect = (itemName, effect) => {
            if (!effect || !effect.type) return;

            // Handle progression types (find highest)
            if (effect.type === "speedProgression") {
                const level = progressionLevels[effect.value] || 0;
                if (level > highest.speed.level) {
                    highest.speed = { level, progression: effect.value, source: itemName };
                }
            } else if (effect.type === "toughnessTNProgression") {
                const level = progressionLevels[effect.value] || 0;
                if (level > highest.toughness.level) {
                    highest.toughness = { level, progression: effect.value, source: itemName };
                }
            } else if (effect.type === "destinyTNProgression") {
                const level = progressionLevels[effect.value] || 0;
                if (level > highest.destiny.level) {
                    highest.destiny = { level, progression: effect.value, source: itemName };
                }
            }
            // Handle vision radii (find highest)
            else if (effect.type === "nightsightRadius") {
                const radius = parseFloat(effect.value) || 0;
                if (radius > highest.nightsight.radius) {
                    highest.nightsight = { radius, source: itemName };
                }
            } else if (effect.type === "darkvisionRadius") {
                const radius = parseFloat(effect.value) || 0;
                if (radius > highest.darkvision.radius) {
                    highest.darkvision = { radius, source: itemName };
                }
            }
            // Handle accumulated types (sum/collect)
            else if (effect.type === "bulkCapacityBoost") {
                const boost = parseFloat(effect.value) || 0;
                accumulated.bulkCapacityBoost += boost;
            } else if (effect.type === "sizeModifier") {
                const modifier = parseInt(effect.value) || 0;
                accumulated.sizeModifier += modifier;
            } else if (effect.type === "characterTag") {
                if (effect.value && effect.value.trim()) {
                    accumulated.characterTags.push(effect.value.trim());
                }
            } else if (effect.type === "proficiency") {
                if (effect.value && effect.value.trim()) {
                    accumulated.proficiencies.add(effect.value);
                }
            } else if (effect.type === "resistance") {
                if (effect.value && effect.value.trim()) {
                    accumulated.resistances.add(effect.value);
                }
            } else if (effect.type === "vulnerability") {
                if (effect.value && effect.value.trim()) {
                    accumulated.vulnerabilities.add(effect.value);
                }
            }
        };

        // Helper to process all side effects from an item
        const processItemSideEffects = (item) => {
            if (!item.system?.sideEffects || !Array.isArray(item.system.sideEffects)) return;

            item.system.sideEffects.forEach(effect => {
                checkSideEffect(item.name, effect);
            });
        };

        // Get ancestry and fundament
        const ancestry = this.actor.system.ancestryId
            ? this.actor.items.get(this.actor.system.ancestryId)
            : null;
        const fundament = this.actor.system.fundamentId
            ? this.actor.items.get(this.actor.system.fundamentId)
            : null;

        // Process ancestry and fundament first
        if (ancestry) processItemSideEffects(ancestry);
        if (fundament) processItemSideEffects(fundament);

        // Process all other items
        const characterLevel = this.actor.system.level || 0;
        this.actor.items.forEach(item => {
            // Skip ancestry and fundament (already processed)
            if (item.type === "ancestry" || item.type === "fundament") return;

            // Skip equipment not in required placement
            if (item.type === "equipment" && !this._isEquipmentActive(item)) return;

            // Skip inactive attunements
            if (item.type === "attunement" && !this._isAttunementActive(item)) return;

            // For track items, process tier-specific side effects
            if (item.type === "track") {
                this._processTrackSideEffects(item, characterLevel, checkSideEffect);
            } else {
                processItemSideEffects(item);
            }
        });

        // Return comprehensive side effects object
        return {
            speedProgression: highest.speed.progression,
            speedProgressionSource: highest.speed.source,
            toughnessTNProgression: highest.toughness.progression,
            toughnessTNProgressionSource: highest.toughness.source,
            destinyTNProgression: highest.destiny.progression,
            destinyTNProgressionSource: highest.destiny.source,
            nightsightRadius: highest.nightsight.radius,
            nightsightRadiusSource: highest.nightsight.source,
            darkvisionRadius: highest.darkvision.radius,
            darkvisionRadiusSource: highest.darkvision.source,
            bulkCapacityBoost: accumulated.bulkCapacityBoost,
            sizeModifier: accumulated.sizeModifier,
            characterTags: accumulated.characterTags,
            proficiencies: Array.from(accumulated.proficiencies),
            resistances: Array.from(accumulated.resistances),
            vulnerabilities: Array.from(accumulated.vulnerabilities)
        };
    }

    /**
     * Check if equipment item is active (in required placement)
     * @param {Object} item - Equipment item
     * @returns {boolean} True if active
     * @private
     */
    _isEquipmentActive(item) {
        if (!item.system?.requiredPlacement) return true;
        return item.system.placement === item.system.requiredPlacement;
    }

    /**
     * Check if attunement is active (linked equipment is properly placed)
     * @param {Object} item - Attunement item
     * @returns {boolean} True if active
     * @private
     */
    _isAttunementActive(item) {
        if (!item.system?.appliesTo) return false;

        const linkedEquipment = this.actor.items.get(item.system.appliesTo);
        if (!linkedEquipment) return false;

        return this._isEquipmentActive(linkedEquipment);
    }

    /**
     * Process track item side effects including tier-specific effects
     * @param {Object} trackItem - Track item
     * @param {number} characterLevel - Character level
     * @param {Function} checkCallback - Callback to check each side effect
     * @private
     */
    _processTrackSideEffects(trackItem, characterLevel, checkCallback) {
        // Get track slot index (assuming it's stored in flags)
        const trackSlotIndex = trackItem.getFlag("zwolf-epic", "slotIndex") ?? 0;

        // Calculate unlocked tiers based on slot position and level
        const unlockedTiers = this._getUnlockedTiers(trackSlotIndex, characterLevel);

        // Check base track side effects
        if (trackItem.system?.sideEffects && Array.isArray(trackItem.system.sideEffects)) {
            trackItem.system.sideEffects.forEach(effect => {
                checkCallback(trackItem.name, effect);
            });
        }

        // Check tier-specific side effects
        unlockedTiers.forEach(tierNumber => {
            const tierData = trackItem.system.tiers?.[`tier${tierNumber}`];
            if (tierData?.sideEffects && Array.isArray(tierData.sideEffects)) {
                const tierSourceName = `${trackItem.name} (Tier ${tierNumber})`;
                tierData.sideEffects.forEach(effect => {
                    checkCallback(tierSourceName, effect);
                });
            }
        });
    }

    /**
     * Get unlocked tiers for a track based on slot index and level
     * @param {number} slotIndex - Track slot index (0-3)
     * @param {number} characterLevel - Character level
     * @returns {number[]} Array of unlocked tier numbers (1-5)
     * @private
     */
    _getUnlockedTiers(slotIndex, characterLevel) {
        const trackNumber = slotIndex + 1;
        const tierLevels = [trackNumber, trackNumber + 4, trackNumber + 8, trackNumber + 12, trackNumber + 16];
        const unlocked = [];

        for (let i = 0; i < tierLevels.length; i++) {
            if (characterLevel >= tierLevels[i]) {
                unlocked.push(i + 1);
            }
        }

        return unlocked;
    }

    /**
     * Called after rendering
     * @override
     */
    _onRender(context, options) {
        super._onRender(context, options);

        // Restore state AFTER everything else
        if (this.stateManager) {
            this.stateManager.restoreState();
        }
    }

    static async #onChangeTab(event, target) {
        const newTab = target.dataset.tab;
        const group = target.dataset.group || "primary";

        if (this.tabGroups[group] !== newTab) {
            // Update the tab group
            this.tabGroups[group] = newTab;

            // IMPORTANT: Update the state manager BEFORE any rendering
            if (this.stateManager) {
                this.stateManager.state.activeTab = newTab;
            }

            // Use CSS to show/hide tabs immediately (no render needed)
            const tabContents = this.element.querySelectorAll(".tab[data-tab]");

            tabContents.forEach(tab => {
                if (tab.dataset.tab === newTab) {
                    tab.classList.add("active");
                    tab.style.display = "block";
                } else {
                    tab.classList.remove("active");
                    tab.style.display = "none";
                }
            });

            // Update tab button active states
            const tabButtons = this.element.querySelectorAll("[data-group=\"primary\"][data-tab]");

            tabButtons.forEach(btn => {
                if (btn.dataset.tab === newTab) {
                    btn.classList.add("active");
                } else {
                    btn.classList.remove("active");
                }
            });
        }
    }

    static async #onEditImage(event, target) {
        const currentImage = this.actor.img;
        const fp = new FilePicker({
            type: "image",
            current: currentImage,
            callback: async (path) => {
                await this.actor.update({ img: path });
            }
        });
        fp.browse();
    }
}
