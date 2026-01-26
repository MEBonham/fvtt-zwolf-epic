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

        // Calculate slots (Phase 8)
        if (context.isEidolon) {
            // Eidolons use special slot calculations
            this._calculateEidolonSlots(context);
        } else if (!context.isSpawn && !context.isMook) {
            // Regular character slot calculations
            this._calculateSlots(context);
        }

        // Calculate build points (Phase 9)
        if (context.isCharacter) {
            if (context.isEidolon) {
                this._calculateEidolonBuildPoints(context);
            } else {
                this._calculateBuildPoints(context);
            }
        }

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

    // ========================================
    // SLOTS CALCULATION (PHASE 8)
    // ========================================

    /**
     * Calculate all slots for regular characters (not eidolons)
     * @param {Object} context - Sheet context
     * @private
     */
    _calculateSlots(context) {
        const totalKnacksProvided = this._calculateTotalKnacksProvided();
        context.knackSlots = this._prepareSlots("knack", totalKnacksProvided);

        const trackSlotCount = Math.min(4, context.system.level || 0);
        context.trackSlots = this._prepareSlots("track", trackSlotCount);

        context.talentSlots = this._prepareSlots("talent", context.system.level || 0);
    }

    /**
     * Calculate total knacks provided from ancestry, fundament, talents, and track tiers
     * @returns {number} Total knack slots available
     * @private
     */
    _calculateTotalKnacksProvided() {
        let totalKnacks = 0;

        // From ancestry
        if (this.actor.system.ancestryId) {
            const ancestryItem = this.actor.items.get(this.actor.system.ancestryId);
            totalKnacks += ancestryItem?.system?.knacksProvided || 0;
        }

        // From fundament (not for eidolons)
        if (this.actor.type !== "eidolon" && this.actor.system.fundamentId) {
            const fundamentItem = this.actor.items.get(this.actor.system.fundamentId);
            totalKnacks += fundamentItem?.system?.knacksProvided || 0;
        }

        // From talents
        const talentItems = this.actor.items.filter(item => item.type === "talent");
        talentItems.forEach((talent) => {
            totalKnacks += talent.system?.knacksProvided || 0;
        });

        // From track tiers
        const characterLevel = this.actor.system.level || 0;
        const trackItems = this.actor.items.filter(item => item.type === "track");

        trackItems.forEach(track => {
            const trackSlotIndex = this._getTrackSlotIndex(track);
            const unlockedTiers = this._getUnlockedTiers(trackSlotIndex, characterLevel);

            unlockedTiers.forEach(tierNumber => {
                const tierData = track.system.tiers?.[`tier${tierNumber}`];
                if (tierData?.sideEffects && Array.isArray(tierData.sideEffects)) {
                    // Find knacksProvided side effect
                    const knackEffect = tierData.sideEffects.find(e => e.type === "knacksProvided");
                    if (knackEffect) {
                        totalKnacks += parseInt(knackEffect.value) || 0;
                    }
                }
            });
        });

        return totalKnacks;
    }

    /**
     * Prepare slots for a given item type
     * @param {string} itemType - Type of item (knack, track, talent)
     * @param {number} slotCount - Number of slots
     * @returns {Array} Array of slot objects
     * @private
     */
    _prepareSlots(itemType, slotCount) {
        if (itemType === "talent") {
            return this._prepareTalentSlots(slotCount);
        } else if (itemType === "track") {
            return this._prepareTrackSlots(slotCount);
        } else {
            return this._prepareSequentialSlots(itemType, slotCount);
        }
    }

    /**
     * Prepare talent slots with track association
     * @param {number} slotCount - Total level (one talent per level)
     * @returns {Array} Talent slots with track associations
     * @private
     */
    _prepareTalentSlots(slotCount) {
        const slots = [];

        // Get track assignments
        const trackItems = this.actor.items.filter(item => item.type === "track");
        const assignedTracks = new Map();

        trackItems.forEach(track => {
            const slotIndex = this._getTrackSlotIndex(track);
            if (slotIndex < 4) {
                assignedTracks.set(slotIndex + 1, track);
            }
        });

        // Helper to get track info for a talent slot
        const getTrackInfo = (talentSlotNumber) => {
            const modResult = talentSlotNumber % 4;
            const trackNumber = modResult === 0 ? 4 : modResult;
            const assignedTrack = assignedTracks.get(trackNumber);

            return {
                trackNumber: trackNumber,
                trackName: assignedTrack ? assignedTrack.name : null,
                hasTrack: !!assignedTrack
            };
        };

        // Create all slots
        for (let i = 0; i < slotCount; i++) {
            const talentSlotNumber = i + 1;
            const trackInfo = getTrackInfo(talentSlotNumber);

            slots.push({
                index: i,
                item: null,
                talentNumber: talentSlotNumber,
                trackNumber: trackInfo.trackNumber,
                trackName: trackInfo.trackName,
                hasTrack: trackInfo.hasTrack
            });
        }

        // Fill slots with talent items
        const talentItems = this.actor.items.filter(item => item.type === "talent");
        talentItems.forEach((talent) => {
            const slotIndex = talent.getFlag("zwolf-epic", "slotIndex");

            if (slotIndex !== undefined && slotIndex < slotCount && slots[slotIndex] && !slots[slotIndex].item) {
                slots[slotIndex].item = talent.toObject();
            } else {
                // Find first available slot
                for (let i = 0; i < slotCount; i++) {
                    if (!slots[i].item) {
                        slots[i].item = talent.toObject();
                        talent.setFlag("zwolf-epic", "slotIndex", i);
                        break;
                    }
                }
            }
        });

        return slots;
    }

    /**
     * Prepare track slots
     * @param {number} slotCount - Number of track slots (min of 4 or level)
     * @returns {Array} Track slots
     * @private
     */
    _prepareTrackSlots(slotCount) {
        const slots = [];
        const items = this.actor.items.filter(item => item.type === "track");

        // Create all slots
        for (let i = 0; i < slotCount; i++) {
            slots.push({ index: i, item: null });
        }

        // Fill slots based on stored slotIndex
        items.forEach((item) => {
            const slotIndex = this._getTrackSlotIndex(item);

            if (slotIndex < slotCount && slots[slotIndex] && !slots[slotIndex].item) {
                slots[slotIndex].item = item.toObject();
            } else {
                // Find first available slot
                for (let i = 0; i < slotCount; i++) {
                    if (!slots[i].item) {
                        slots[i].item = item.toObject();
                        item.setFlag("zwolf-epic", "slotIndex", i);
                        break;
                    }
                }
            }
        });

        return slots;
    }

    /**
     * Prepare sequential slots (for knacks)
     * @param {string} itemType - Item type
     * @param {number} slotCount - Number of slots
     * @returns {Array} Sequential slots
     * @private
     */
    _prepareSequentialSlots(itemType, slotCount) {
        const slots = [];
        const items = this.actor.items.filter(item => item.type === itemType);

        for (let i = 0; i < slotCount; i++) {
            slots.push({
                index: i,
                item: items[i] ? items[i].toObject() : null
            });
        }

        return slots;
    }

    /**
     * Get track slot index with fallback
     * @param {Object} trackItem - Track item
     * @returns {number} Slot index
     * @private
     */
    _getTrackSlotIndex(trackItem) {
        const storedIndex = trackItem.getFlag("zwolf-epic", "slotIndex");
        if (storedIndex !== undefined) return storedIndex;

        const trackItems = this.actor.items.filter(i => i.type === "track");
        return trackItems.findIndex(t => t.id === trackItem.id);
    }

    /**
     * Calculate slots for eidolons (special placeholder-based logic)
     * @param {Object} context - Sheet context
     * @private
     */
    _calculateEidolonSlots(context) {
        // Get base creature
        const baseCreature = context.system.baseCreatureId
            ? game.actors.get(context.system.baseCreatureId)
            : null;

        if (!baseCreature) {
            // No base creature - use minimal defaults
            context.knackSlots = [];
            context.trackSlots = [];
            context.talentSlots = [];
            return;
        }

        // Knack slots from own ancestry + base creature's "(Eidolon Placeholder)" knacks
        const ancestry = context.system.ancestryId
            ? this.actor.items.get(context.system.ancestryId)
            : null;
        let totalKnacks = ancestry?.system?.knacksProvided || 0;

        const placeholderKnacks = baseCreature.items.filter(item =>
            item.type === "knack" && item.name === "(Eidolon Placeholder)"
        ).length;

        totalKnacks += placeholderKnacks;
        context.knackSlots = this._prepareSequentialSlots("knack", totalKnacks);

        // Track slots only for placeholder positions
        context.trackSlots = this._calculateEidolonTrackSlots(baseCreature);

        // Talent slots based on enabled tracks
        context.talentSlots = this._prepareEidolonTalentSlots(baseCreature);
    }

    /**
     * Calculate track slots for eidolon based on placeholders in base creature
     * @param {Object} baseCreature - Base creature actor
     * @returns {Array} Track slots
     * @private
     */
    _calculateEidolonTrackSlots(baseCreature) {
        const slots = [];

        // Find base creature's "(Eidolon Placeholder)" tracks
        const placeholderTracks = baseCreature.items.filter(item =>
            item.type === "track" && item.name === "(Eidolon Placeholder)"
        );

        // Create slots only for placeholder positions
        placeholderTracks.forEach(track => {
            const slotIndex = track.getFlag("zwolf-epic", "slotIndex");
            if (slotIndex !== undefined) {
                slots.push({
                    index: slotIndex,
                    item: null,
                    enabled: true
                });
            }
        });

        // Fill with eidolon's actual tracks
        const eidolonTracks = this.actor.items.filter(item => item.type === "track");
        eidolonTracks.forEach(track => {
            const slotIndex = track.getFlag("zwolf-epic", "slotIndex");
            const slot = slots.find(s => s.index === slotIndex);
            if (slot && !slot.item) {
                slot.item = track.toObject();
            }
        });

        return slots.sort((a, b) => a.index - b.index);
    }

    /**
     * Prepare talent slots for eidolon based on enabled tracks
     * @param {Object} baseCreature - Base creature actor
     * @returns {Array} Talent slots
     * @private
     */
    _prepareEidolonTalentSlots(baseCreature) {
        const slots = [];
        const characterLevel = baseCreature.system.level || 0;

        // Get eidolon's track assignments
        const trackItems = this.actor.items.filter(item => item.type === "track");
        const assignedTracks = new Map();

        trackItems.forEach(track => {
            const slotIndex = this._getTrackSlotIndex(track);
            assignedTracks.set(slotIndex + 1, track);
        });

        // Get base creature's placeholder track positions
        const placeholderTracks = baseCreature.items.filter(item =>
            item.type === "track" && item.name === "(Eidolon Placeholder)"
        );
        const enabledTrackPositions = new Set();
        placeholderTracks.forEach(track => {
            const slotIndex = track.getFlag("zwolf-epic", "slotIndex");
            if (slotIndex !== undefined) {
                enabledTrackPositions.add(slotIndex + 1);
            }
        });

        // Only create talent slots for enabled track positions
        for (let trackNum = 1; trackNum <= 4; trackNum++) {
            if (!enabledTrackPositions.has(trackNum)) continue;

            // Calculate how many talent slots this track should have
            const tierLevels = [trackNum, trackNum + 4, trackNum + 8, trackNum + 12, trackNum + 16];
            const unlockedTiers = tierLevels.filter(level => characterLevel >= level).length;

            // Create slots for each unlocked tier
            for (let tier = 0; tier < unlockedTiers; tier++) {
                const trackInfo = assignedTracks.get(trackNum);

                slots.push({
                    index: slots.length,
                    item: null,
                    trackNumber: trackNum,
                    trackName: trackInfo ? trackInfo.name : null,
                    hasTrack: !!trackInfo
                });
            }
        }

        // Fill slots with talent items
        const talentItems = this.actor.items.filter(item => item.type === "talent");
        talentItems.forEach((talent) => {
            const slotIndex = talent.getFlag("zwolf-epic", "slotIndex");

            if (slotIndex !== undefined && slotIndex < slots.length && !slots[slotIndex].item) {
                slots[slotIndex].item = talent.toObject();
            } else {
                // Find first available slot
                for (let i = 0; i < slots.length; i++) {
                    if (!slots[i].item) {
                        slots[i].item = talent.toObject();
                        talent.setFlag("zwolf-epic", "slotIndex", i);
                        break;
                    }
                }
            }
        });

        return slots;
    }

    // ========================================
    // BUILD POINTS CALCULATION (PHASE 9)
    // ========================================

    /**
     * Calculate build points for regular characters (PC/NPC)
     * @param {Object} context - Sheet context
     * @private
     */
    _calculateBuildPoints(context) {
        const ancestry = context.system.ancestryId
            ? this.actor.items.get(context.system.ancestryId)
            : null;
        const fundament = context.system.fundamentId
            ? this.actor.items.get(context.system.fundamentId)
            : null;

        const attributeBP = this._calculateAttributeBP(context.system.attributes || {});
        const skillBP = this._calculateSkillBP(context.system.skills || {}, context.system.attributes || {});
        const maxBP = this._calculateMaxBP(ancestry, fundament);

        context.buildPoints = {
            attributes: attributeBP,
            skills: skillBP,
            total: attributeBP + skillBP,
            max: maxBP
        };
    }

    /**
     * Calculate attribute build points cost
     * @param {Object} attributes - Attributes object
     * @returns {number} Total BP cost
     * @private
     */
    _calculateAttributeBP(attributes) {
        const costs = {
            mediocre: -5,
            moderate: 0,
            specialty: 4,
            awesome: 8
        };

        let total = 0;
        const attributeKeys = ["agility", "fortitude", "perception", "willpower"];

        attributeKeys.forEach(key => {
            const progression = attributes[key]?.progression || "moderate";
            total += costs[progression];
        });

        return total;
    }

    /**
     * Calculate skill build points cost including excess penalties
     * @param {Object} skills - Skills object
     * @param {Object} attributes - Attributes object
     * @returns {number} Total BP cost
     * @private
     */
    _calculateSkillBP(skills, attributes) {
        const baseCosts = {
            mediocre: 0,
            moderate: 1,
            specialty: 2,
            awesome: 3
        };

        const progressionValues = {
            mediocre: 1,
            moderate: 2,
            specialty: 3,
            awesome: 4
        };

        // Get base values from attributes
        const attributeValues = {};
        Object.keys(attributes).forEach(key => {
            const progression = attributes[key]?.progression || "moderate";
            attributeValues[key] = progressionValues[progression];
        });

        let total = 0;

        // Calculate cost for each skill
        const skillConfigs = {
            acumen: { base: attributeValues.willpower },
            athletics: { base: Math.max(attributeValues.agility, attributeValues.fortitude) },
            brawn: { base: attributeValues.fortitude },
            dexterity: { base: attributeValues.agility },
            glibness: { base: progressionValues[skills.insight?.progression || "mediocre"] },
            influence: { base: attributeValues.willpower },
            insight: { base: attributeValues.perception },
            stealth: { base: attributeValues.agility }
        };

        Object.keys(skillConfigs).forEach(skillKey => {
            const skillProgression = skills[skillKey]?.progression || "mediocre";
            const skillValue = progressionValues[skillProgression];
            const baseValue = skillConfigs[skillKey].base;

            const baseCost = baseCosts[skillProgression];
            const excessCost = Math.max(0, skillValue - baseValue);

            total += baseCost + excessCost;
        });

        return total;
    }

    /**
     * Calculate maximum build points from ancestry and fundament
     * @param {Object} ancestry - Ancestry item
     * @param {Object} fundament - Fundament item
     * @returns {number} Maximum BP available
     * @private
     */
    _calculateMaxBP(ancestry, fundament) {
        let maxBP = 0;

        if (ancestry?.system?.buildPoints) {
            maxBP += ancestry.system.buildPoints;
        }

        if (fundament?.system?.buildPoints) {
            maxBP += fundament.system.buildPoints;
        }

        return maxBP;
    }

    /**
     * Calculate build points for eidolons
     * @param {Object} context - Sheet context
     * @private
     */
    _calculateEidolonBuildPoints(context) {
        const baseCreature = context.system.baseCreatureId
            ? game.actors.get(context.system.baseCreatureId)
            : null;

        if (!baseCreature) {
            // No base creature - use minimal defaults
            context.buildPoints = {
                attributes: 0,
                skills: 0,
                skillExcessPenalty: 0,
                total: 0,
                max: 0,
                fromAncestry: 0,
                fromBaseUnused: 0
            };
            return;
        }

        // Calculate eidolon's own BP usage
        const attributeBP = this._calculateAttributeBP(this.actor.system.attributes || {});
        const skillBP = this._calculateSkillBP(this.actor.system.skills || {}, this.actor.system.attributes || {});

        // Calculate skill excess penalty (1 BP per skill that exceeds base creature)
        const skillExcessPenalty = this._calculateEidolonSkillExcessPenalty(baseCreature);

        // Get BP from own ancestry
        const ancestry = context.system.ancestryId
            ? this.actor.items.get(context.system.ancestryId)
            : null;
        const ancestryBP = ancestry?.system?.buildPoints || 0;

        // Calculate base creature's unused BP
        const baseAncestry = baseCreature.system.ancestryId
            ? baseCreature.items.get(baseCreature.system.ancestryId)
            : null;
        const baseFundament = baseCreature.system.fundamentId
            ? baseCreature.items.get(baseCreature.system.fundamentId)
            : null;

        const baseAttributeBP = this._calculateAttributeBP(baseCreature.system.attributes || {});
        const baseSkillBP = this._calculateSkillBP(baseCreature.system.skills || {}, baseCreature.system.attributes || {});
        const baseMaxBP = this._calculateMaxBP(baseAncestry, baseFundament);
        const baseTotalBP = baseAttributeBP + baseSkillBP;
        const baseUnusedBP = baseMaxBP - baseTotalBP;

        // Eidolon's max = own ancestry + base creature's unused BP
        const maxBP = ancestryBP + Math.max(0, baseUnusedBP);

        context.buildPoints = {
            attributes: attributeBP,
            skills: skillBP,
            skillExcessPenalty: skillExcessPenalty,
            total: attributeBP + skillBP + skillExcessPenalty,
            max: maxBP,
            fromAncestry: ancestryBP,
            fromBaseUnused: Math.max(0, baseUnusedBP)
        };
    }

    /**
     * Calculate BP penalty for eidolon skills that exceed base creature
     * @param {Object} baseCreature - Base creature actor
     * @returns {number} Total penalty BP
     * @private
     */
    _calculateEidolonSkillExcessPenalty(baseCreature) {
        const progressionValues = {
            mediocre: 1,
            moderate: 2,
            specialty: 3,
            awesome: 4
        };

        let penalty = 0;
        const eidolonSkills = this.actor.system.skills || {};
        const baseSkills = baseCreature.system.skills || {};

        const skillKeys = ["acumen", "athletics", "brawn", "dexterity", "glibness", "influence", "insight", "stealth"];

        skillKeys.forEach(skillKey => {
            const eidolonProgression = eidolonSkills[skillKey]?.progression || "mediocre";
            const baseProgression = baseSkills[skillKey]?.progression || "mediocre";

            const eidolonValue = progressionValues[eidolonProgression] || 1;
            const baseValue = progressionValues[baseProgression] || 1;

            // If eidolon's skill is higher than base creature's, add 1 BP penalty (regardless of how many steps)
            if (eidolonValue > baseValue) {
                penalty += 1;
            }
        });

        return penalty;
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
