const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;
import { SheetStateManager } from "../helpers/sheet-state-manager.mjs";
import { calculateProgressionBonuses, calculateTn } from "../helpers/calculation-utils.mjs";
import { DropZoneHandler } from "../helpers/drop-zone-handler.mjs";
import { ZWolfDice } from "../dice/dice-system.mjs";

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
            changeTab: ZWolfActorSheet.#onChangeTab,
            editItem: ZWolfActorSheet.#onEditItem,
            deleteItem: ZWolfActorSheet.#onDeleteItem,
            toggleLock: ZWolfActorSheet.#onToggleLock,
            gainWealth: ZWolfActorSheet.#onGainWealth,
            loseWealth: ZWolfActorSheet.#onLoseWealth,
            shortRest: ZWolfActorSheet.#onShortRest,
            extendedRest: ZWolfActorSheet.#onExtendedRest,
            rollSpeed: ZWolfActorSheet.#onRollSpeed,
            rollProgression: ZWolfActorSheet.#onRollProgression,
            rollStat: ZWolfActorSheet.#onRollStat,
            toggleProgression: ZWolfActorSheet.#onToggleProgression
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

        // Calculate speed bonus for display
        context.speedBonus = sideEffects.speedProgression
            ? progressionBonuses[sideEffects.speedProgression] || 0
            : 0;

        // Calculate target numbers
        context.tns = {
            toughness: calculateTn(sideEffects.toughnessTNProgression, level, progressionOnlyLevel),
            destiny: calculateTn(sideEffects.destinyTNProgression, level, progressionOnlyLevel),
            improvised: calculateTn("mediocre", level, progressionOnlyLevel),
            healing: calculateTn("moderate", level, progressionOnlyLevel),
            challenge: calculateTn("specialty", level, progressionOnlyLevel)
        };

        // Mooks use combined Toughness/Destiny TN (average of the two, rounded up)
        if (context.isMook) {
            context.tns.combined = Math.ceil((context.tns.toughness + context.tns.destiny) / 2);
        }

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

        // Get foundation items (Phase 11)
        context.ancestry = context.system.ancestryId
            ? this.actor.items.get(context.system.ancestryId)?.toObject()
            : null;
        context.fundament = context.system.fundamentId
            ? this.actor.items.get(context.system.fundamentId)?.toObject()
            : null;

        // Prepare inventory context (Phase 12)
        if (context.showInventory) {
            this._prepareInventoryContext(context);
        }

        // Gather granted abilities (Phase 13)
        context.abilityCategories = this._gatherGrantedAbilities();

        // Add proficiencies as a virtual passive ability if any exist
        if (sideEffects.proficiencies?.length > 0) {
            const proficiencyAbility = this._buildProficienciesAbility(sideEffects.proficiencies);
            context.abilityCategories.passive.unshift(proficiencyAbility);
        }

        // Add resistances as a virtual passive ability if any exist
        if (sideEffects.resistances?.length > 0) {
            const resistanceAbility = this._buildResistancesAbility(sideEffects.resistances);
            context.abilityCategories.passive.unshift(resistanceAbility);
        }

        // Add vulnerabilities as a virtual drawback if any exist
        if (sideEffects.vulnerabilities?.length > 0) {
            const vulnerabilityAbility = this._buildVulnerabilitiesAbility(sideEffects.vulnerabilities);
            context.abilityCategories.drawback.unshift(vulnerabilityAbility);
        }

        // Format character tags for display (Phase 13)
        context.characterTags = sideEffects.characterTags?.join(", ") || "";

        // Build exotic senses display data (includes abilities + vision enhancements)
        context.exoticSensesDisplay = this._buildExoticSensesDisplay(
            context.abilityCategories.exoticSenses,
            sideEffects
        );

        // Calculate and update effective size (Phase 14)
        const effectiveSize = this._calculateEffectiveSize(sideEffects);
        context.effectiveSize = effectiveSize;

        // Update actor's effectiveSize if it changed
        if (this.actor.system.effectiveSize !== effectiveSize) {
            this.actor.update({ "system.effectiveSize": effectiveSize }, { render: false });
        }

        // Calculate language limit (Phase 14)
        context.languageLimit = this._calculateLanguageLimit();

        // Build calculated values for template (Phase 16)
        context.calculatedValues = {
            maxVitality: context.system.vitalityPoints?.max ?? 12,
            maxStamina: context.system.staminaPoints?.max ?? 4,
            coastNumber: context.system.coastNumber ?? 4
        };

        // Get base creature for spawns and mooks (Phase 17)
        if (context.isSpawn || context.isMook || context.isEidolon) {
            context.baseCreature = context.system.baseCreatureId
                ? game.actors.get(context.system.baseCreatureId)?.toObject()
                : null;
            context.hasBaseCreature = !!context.baseCreature;

            // Add trait information
            context.trait = context.system.trait || this._getDefaultTrait();
            context.traitLabel = this._getTraitLabel(context.trait);
            context.traitDescription = this._getTraitDescription(context.trait);

            // Flag if spawn is mirroring base
            context.mirroringBase = context.system.mirroringBase || false;

            // Get available base creatures for the selector dropdown
            context.availableBaseCreatures = this._getAvailableBaseCreatures();
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

    // ========================================
    // GRANTED ABILITIES GATHERING (PHASE 13)
    // ========================================

    /**
     * Gather all granted abilities from items and organize by category
     * @returns {Object} Abilities organized by type
     * @private
     */
    _gatherGrantedAbilities() {
        const categories = {
            passive: [],
            drawback: [],
            exoticSenses: [],
            dominantAction: [],
            swiftAction: [],
            reaction: [],
            freeAction: [],
            strike: [],
            journey: [],
            miscellaneous: []
        };

        const characterLevel = this.actor.system.level || 0;

        /**
         * Process abilities from an item's grantedAbilities object
         * @param {Object} item - The source item
         * @param {Object} grantedAbilities - The abilities object
         * @param {string} sourceSuffix - Optional suffix for source name (e.g., "(Tier 2)")
         */
        const processAbilities = (item, grantedAbilities, sourceSuffix = "") => {
            if (!grantedAbilities || typeof grantedAbilities !== "object") return;

            Object.entries(grantedAbilities).forEach(([key, ability]) => {
                if (!ability || !ability.name) return;

                const abilityType = ability.type || "miscellaneous";
                const category = categories[abilityType] || categories.miscellaneous;

                category.push({
                    id: key,
                    name: ability.name,
                    type: abilityType,
                    tags: ability.tags || "",
                    description: ability.description || "",
                    itemId: item.id,
                    itemName: sourceSuffix ? `${item.name} ${sourceSuffix}` : item.name
                });
            });
        };

        // Process each item on the actor
        this.actor.items.forEach(item => {
            // Skip equipment not in required placement
            if (item.type === "equipment" && !this._isEquipmentActive(item)) return;

            // Skip inactive attunements
            if (item.type === "attunement" && !this._isAttunementActive(item)) return;

            // For track items, process tier-specific abilities based on character level
            if (item.type === "track") {
                // Process base track abilities
                if (item.system?.grantedAbilities) {
                    processAbilities(item, item.system.grantedAbilities);
                }

                // Process tier-specific abilities
                const trackSlotIndex = this._getTrackSlotIndex(item);
                const unlockedTiers = this._getUnlockedTiers(trackSlotIndex, characterLevel);

                unlockedTiers.forEach(tierNumber => {
                    const tierData = item.system.tiers?.[`tier${tierNumber}`];
                    if (tierData?.grantedAbilities) {
                        processAbilities(item, tierData.grantedAbilities, `(Tier ${tierNumber})`);
                    }
                });
            } else {
                // Process regular item abilities
                if (item.system?.grantedAbilities) {
                    processAbilities(item, item.system.grantedAbilities);
                }
            }
        });

        // Sort each category by name
        Object.keys(categories).forEach(key => {
            categories[key].sort((a, b) => a.name.localeCompare(b.name));
        });

        return categories;
    }

    /**
     * Build a virtual "Proficiencies" ability from collected proficiency keys
     * @param {Array<string>} proficiencyKeys - Array of proficiency keys
     * @returns {Object} Ability object for display
     * @private
     */
    _buildProficienciesAbility(proficiencyKeys) {
        const proficiencies = CONFIG.ZWOLF.proficiencies;

        // Group proficiencies by type
        const grouped = {
            seed: [],
            weapon: [],
            miscellaneous: []
        };

        proficiencyKeys.forEach(key => {
            const prof = proficiencies[key];
            if (prof) {
                grouped[prof.type].push(prof.label);
            }
        });

        // Build description parts
        const parts = [];

        if (grouped.seed.length > 0) {
            grouped.seed.sort();
            parts.push(`<strong>${game.i18n.localize("ZWOLF.SeedProficiencies")}:</strong> ${grouped.seed.join(", ")}`);
        }

        if (grouped.weapon.length > 0) {
            grouped.weapon.sort();
            parts.push(`<strong>${game.i18n.localize("ZWOLF.WeaponProficiencies")}:</strong> ${grouped.weapon.join(", ")}`);
        }

        if (grouped.miscellaneous.length > 0) {
            grouped.miscellaneous.sort();
            parts.push(`<strong>${game.i18n.localize("ZWOLF.MiscellaneousProficiencies")}:</strong> ${grouped.miscellaneous.join(", ")}`);
        }

        return {
            id: "virtual-proficiencies",
            name: game.i18n.localize("ZWOLF.Proficiencies"),
            type: "passive",
            tags: "",
            description: parts.join("<br>"),
            itemId: null,
            itemName: ""
        };
    }

    /**
     * Build a virtual "Resistances" ability from collected resistance keys
     * @param {Array<string>} resistanceKeys - Array of damage type keys
     * @returns {Object} Ability object for display
     * @private
     */
    _buildResistancesAbility(resistanceKeys) {
        const damageTypes = CONFIG.ZWOLF.damageTypes;

        // Get localized labels for each resistance
        const labels = resistanceKeys
            .map(key => {
                const dmgType = damageTypes[key];
                return dmgType ? game.i18n.localize(dmgType.label) : key;
            })
            .sort();

        return {
            id: "virtual-resistances",
            name: game.i18n.localize("ZWOLF.Resistances"),
            type: "passive",
            tags: "",
            description: labels.join(", "),
            itemId: null,
            itemName: ""
        };
    }

    /**
     * Build a virtual "Vulnerabilities" drawback from collected vulnerability keys
     * @param {Array<string>} vulnerabilityKeys - Array of damage type keys
     * @returns {Object} Ability object for display
     * @private
     */
    _buildVulnerabilitiesAbility(vulnerabilityKeys) {
        const damageTypes = CONFIG.ZWOLF.damageTypes;

        // Get localized labels for each vulnerability
        const labels = vulnerabilityKeys
            .map(key => {
                const dmgType = damageTypes[key];
                return dmgType ? game.i18n.localize(dmgType.label) : key;
            })
            .sort();

        return {
            id: "virtual-vulnerabilities",
            name: game.i18n.localize("ZWOLF.Vulnerabilities"),
            type: "drawback",
            tags: "",
            description: labels.join(", "),
            itemId: null,
            itemName: ""
        };
    }

    /**
     * Build exotic senses display data combining abilities and vision enhancements
     * @param {Array} exoticSensesAbilities - Abilities of type exoticSenses
     * @param {Object} sideEffects - Processed side effects
     * @returns {Object} Display data for exotic senses tooltip
     * @private
     */
    _buildExoticSensesDisplay(exoticSensesAbilities, sideEffects) {
        const items = [];

        // Base vision values
        const baseNightsight = 1;
        const baseDarkvision = 0.2;

        // Check for enhanced nightsight
        const nightsightRadius = sideEffects.nightsightRadius || baseNightsight;
        if (nightsightRadius > baseNightsight) {
            items.push({
                name: game.i18n.localize("ZWOLF.Nightsight"),
                tags: `${nightsightRadius}m`,
                source: sideEffects.nightsightRadiusSource || ""
            });
        }

        // Check for enhanced darkvision
        const darkvisionRadius = sideEffects.darkvisionRadius || baseDarkvision;
        if (darkvisionRadius > baseDarkvision) {
            items.push({
                name: game.i18n.localize("ZWOLF.Darkvision"),
                tags: `${darkvisionRadius}m`,
                source: sideEffects.darkvisionRadiusSource || ""
            });
        }

        // Add exotic senses abilities
        exoticSensesAbilities.forEach(ability => {
            items.push({
                name: ability.name,
                tags: ability.tags || "",
                source: ability.itemName || ""
            });
        });

        return {
            hasContent: items.length > 0,
            items: items
        };
    }

    // ========================================
    // PHASE 14: VISION & PROPERTIES
    // ========================================

    /**
     * Calculate effective size based on base size and size modifiers
     * @param {Object} sideEffects - Processed side effects
     * @returns {string} Effective size key
     * @private
     */
    _calculateEffectiveSize(sideEffects) {
        const sizeOrder = [
            "diminutive", "tiny", "small", "medium",
            "large", "huge", "gargantuan", "colossal", "titanic"
        ];

        const baseSize = this.actor.system.size || "medium";
        const sizeModifier = sideEffects?.sizeModifier || 0;

        // Find base size index
        let sizeIndex = sizeOrder.indexOf(baseSize);
        if (sizeIndex === -1) sizeIndex = 3; // Default to medium

        // Apply modifier
        sizeIndex += sizeModifier;

        // Clamp to valid range
        sizeIndex = Math.max(0, Math.min(sizeOrder.length - 1, sizeIndex));

        return sizeOrder[sizeIndex];
    }

    /**
     * Calculate maximum languages based on Linguist knacks
     * Base: 2 languages, +2 per Linguist knack
     * @returns {number} Maximum number of languages
     * @private
     */
    _calculateLanguageLimit() {
        const linguistCount = this.actor.items.filter(item =>
            item.type === "knack" && item.name.toLowerCase() === "linguist"
        ).length;

        return 2 + (linguistCount * 2);
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

        // Initialize drop zones (not for spawns)
        if (this.document.type !== "spawn") {
            const dropHandler = new DropZoneHandler(this);
            dropHandler.bindDropZones(this.element);
        }

        // Bind progression slider events
        this._bindProgressionSliders();

        // Bind equipment placement change events
        this._bindEquipmentPlacementSelects();

        // Restore state AFTER everything else
        if (this.stateManager) {
            this.stateManager.restoreState();
        }
    }

    /**
     * Bind equipment placement select change events
     * @private
     */
    _bindEquipmentPlacementSelects() {
        const selects = this.element.querySelectorAll(".equipment-placement-select");
        selects.forEach(select => {
            select.addEventListener("change", (event) => this._onEquipmentPlacementChange(event));
        });
    }

    /**
     * Bind progression slider events and apply locked state
     * @private
     */
    _bindProgressionSliders() {
        const sliders = this.element.querySelectorAll(".progression-slider");
        const isLocked = this.document.system.buildPointsLocked || false;

        sliders.forEach(slider => {
            // Apply locked state
            slider.disabled = isLocked;
            if (isLocked) {
                slider.classList.add("locked");
            } else {
                slider.classList.remove("locked");
            }

            // Bind change event
            slider.addEventListener("input", (event) => this._onProgressionSliderChange(event));
            slider.addEventListener("change", (event) => this._onProgressionSliderChange(event));
        });
    }

    /**
     * Override drop handler to prevent default behavior when using custom drop zones
     * @override
     */
    async _onDrop(event) {
        // If a custom drop zone is handling this, skip default behavior
        if (this._processingCustomDrop) {
            return;
        }

        // Otherwise, use default behavior
        return super._onDrop(event);
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

    /**
     * Handle editing an item
     * @param {Event} event - The triggering event
     * @param {HTMLElement} target - The element that was clicked
     */
    static async #onEditItem(event, target) {
        const itemId = target.closest("[data-item-id]")?.dataset.itemId;
        const item = this.document.items.get(itemId);
        if (item) {
            item.sheet.render(true);
        }
    }

    /**
     * Handle deleting an item
     * @param {Event} event - The triggering event
     * @param {HTMLElement} target - The element that was clicked
     */
    static async #onDeleteItem(event, target) {
        const itemId = target.closest("[data-item-id]")?.dataset.itemId;
        const item = this.document.items.get(itemId);
        if (!item) return;

        const confirmed = await Dialog.confirm({
            title: `Delete ${item.name}?`,
            content: `<p>Are you sure you want to delete <strong>${item.name}</strong>?</p>`
        });

        if (confirmed) {
            await item.delete();
        }
    }

    /**
     * Handle toggling the build points lock
     * @param {Event} event - The triggering event
     * @param {HTMLElement} target - The element that was clicked
     */
    static async #onToggleLock(event, target) {
        const currentLockState = this.document.system.buildPointsLocked || false;
        await this.document.update({ "system.buildPointsLocked": !currentLockState });

        const message = !currentLockState
            ? game.i18n.localize("ZWOLF.BuildPointsLocked")
            : game.i18n.localize("ZWOLF.BuildPointsUnlocked");
        ui.notifications.info(message);
    }

    /**
     * Handle progression slider change
     * @param {Event} event - The change event
     * @private
     */
    async _onProgressionSliderChange(event) {
        event.preventDefault();

        // Check if sliders are locked
        const isLocked = this.document.system.buildPointsLocked || false;
        if (isLocked) {
            ui.notifications.warn(game.i18n.localize("ZWOLF.BuildPointsLockedWarning"));
            // Reset slider to current value
            this.render(false);
            return;
        }

        const element = event.currentTarget;
        const statKey = element.dataset.stat;
        const statType = element.dataset.type;
        const sliderValue = parseInt(element.value);

        const progressionMap = {
            1: "mediocre",
            2: "moderate",
            3: "specialty",
            4: "awesome"
        };

        const newProgression = progressionMap[sliderValue];

        let updatePath;
        if (statType === "attribute") {
            updatePath = `system.attributes.${statKey}.progression`;
        } else if (statType === "skill") {
            updatePath = `system.skills.${statKey}.progression`;
        }

        if (updatePath && newProgression) {
            await this.document.update({ [updatePath]: newProgression });
        }
    }

    // ========================================
    // INVENTORY CONTEXT (PHASE 12)
    // ========================================

    /**
     * Prepare inventory context data
     * @param {Object} context - Sheet context
     * @private
     */
    _prepareInventoryContext(context) {
        // Get all equipment and commodities
        const equipmentItems = this.actor.items.filter(item => item.type === "equipment");
        const commodityItems = this.actor.items.filter(item => item.type === "commodity");

        // Organize equipment by placement
        const placements = ["wielded", "worn", "readily_available", "stowed", "not_carried"];
        context.equipment = {};

        placements.forEach(placement => {
            context.equipment[placement] = equipmentItems
                .filter(item => item.system.placement === placement)
                .map(item => this._prepareEquipmentItem(item));
        });

        // Add commodities to stowed (or their placement if set)
        commodityItems.forEach(item => {
            const placement = item.system.placement || "stowed";
            if (!context.equipment[placement]) {
                context.equipment[placement] = [];
            }
            context.equipment[placement].push(this._prepareCommodityItem(item));
        });

        // Calculate inventory totals
        context.inventoryTotals = this._calculateInventoryTotals(equipmentItems, commodityItems, context.sideEffects);

        // Prepare attunement slots
        context.attunementSlots = this._prepareAttunementSlots();
    }

    /**
     * Prepare a single equipment item for display
     * @param {Object} item - Equipment item
     * @returns {Object} Prepared item data
     * @private
     */
    _prepareEquipmentItem(item) {
        const itemData = item.toObject();

        // Check placement validity
        itemData.placementValid = this._isEquipmentActive(item);

        // Check for linked attunement
        const linkedAttunement = this.actor.items.find(
            att => att.type === "attunement" && att.system.appliesTo === item.id
        );

        if (linkedAttunement) {
            itemData.attunementTier = linkedAttunement.system.tier || 1;
            itemData.attunementActive = this._isAttunementActive(linkedAttunement);
        }

        return itemData;
    }

    /**
     * Prepare a commodity item for display
     * @param {Object} item - Commodity item
     * @returns {Object} Prepared item data
     * @private
     */
    _prepareCommodityItem(item) {
        const itemData = item.toObject();
        itemData.isCommodity = true;
        itemData.placementValid = true;
        return itemData;
    }

    /**
     * Calculate inventory totals (bulk, max bulk, value)
     * @param {Array} equipmentItems - Equipment items
     * @param {Array} commodityItems - Commodity items
     * @param {Object} sideEffects - Side effects data
     * @returns {Object} Inventory totals
     * @private
     */
    _calculateInventoryTotals(equipmentItems, commodityItems, sideEffects) {
        let totalBulk = 0;

        // Calculate bulk from equipment (only if carried)
        equipmentItems.forEach(item => {
            const placement = item.system.placement || "stowed";
            // Not carried items don't count toward bulk
            if (placement !== "not_carried") {
                const itemBulk = parseFloat(item.system.bulk) || 0;
                const quantity = parseInt(item.system.quantity) || 1;
                totalBulk += itemBulk * quantity;
            }
        });

        // Calculate bulk from commodities
        commodityItems.forEach(item => {
            const placement = item.system.placement || "stowed";
            if (placement !== "not_carried") {
                const itemBulk = parseFloat(item.system.bulk) || 0;
                const quantity = parseInt(item.system.quantity) || 1;
                totalBulk += itemBulk * quantity;
            }
        });

        // Calculate max bulk
        let maxBulk = 10;

        // Size modifier based on effective size
        const sizeModifiers = {
            "diminutive": -12, "tiny": -8, "small": -4, "medium": 0,
            "large": 4, "huge": 8, "gargantuan": 12, "colossal": 16,
            "titanic": 20
        };
        const effectiveSize = this.actor.system?.effectiveSize || this.actor.system?.size || "medium";
        maxBulk += sizeModifiers[effectiveSize] || 0;

        // Brawn progression bonus
        const brawnProgression = this.actor.system?.skills?.brawn?.progression || "mediocre";
        const brawnBonus = { "mediocre": 0, "moderate": 3, "specialty": 6, "awesome": 9 };
        maxBulk += brawnBonus[brawnProgression] || 0;

        // Bulk capacity boosts from side effects
        const bulkBoost = sideEffects?.bulkCapacityBoost || 0;
        maxBulk += bulkBoost;

        // Ensure minimum of 1
        maxBulk = Math.max(1, maxBulk);

        // Calculate total value
        let totalValue = 0;
        equipmentItems.forEach(item => {
            const price = parseFloat(item.system.price) || 0;
            const quantity = parseInt(item.system.quantity) || 1;
            totalValue += price * quantity;
        });
        commodityItems.forEach(item => {
            const price = parseFloat(item.system.price) || 0;
            const quantity = parseInt(item.system.quantity) || 1;
            totalValue += price * quantity;
        });

        return {
            bulk: Math.round(totalBulk * 10) / 10,
            maxBulk: maxBulk,
            isOverBulk: totalBulk > maxBulk,
            value: totalValue
        };
    }

    /**
     * Prepare attunement slots for display
     * The last slot is always "overextended" - using it causes the character
     * to be continually Shaken.
     * @returns {Object} Attunement slots data
     * @private
     */
    _prepareAttunementSlots() {
        const attunementItems = this.actor.items.filter(item => item.type === "attunement");
        const level = this.actor.system.level || 1;

        // Calculate total slots: floor((level + 3) / 4)
        // Level 1: 1 slot, Level 2-5: 2 slots, Level 6-9: 3 slots, etc.
        const totalSlots = Math.floor((level + 3) / 4);

        // Create slots array
        const slots = [];
        let hasOverextended = false;

        for (let i = 0; i < totalSlots; i++) {
            // Last slot is always the "overextended" slot (causes Shaken if used)
            const isOverextended = (i === totalSlots - 1);

            // Each slot's tier equals its position (1-based)
            const slotTier = i + 1;

            // Find attunement assigned to this slot
            const attunement = attunementItems.find(
                att => att.getFlag("zwolf-epic", "slotIndex") === i
            );

            const slot = {
                index: i,
                slotIndex: i + 1, // 1-based for display
                tier: slotTier,
                item: attunement ? attunement.toObject() : null,
                isOverextended: isOverextended
            };

            // If attunement has appliesTo, find the equipment item
            if (attunement && attunement.system.appliesTo) {
                const appliedEquipment = this.actor.items.get(attunement.system.appliesTo);
                if (appliedEquipment) {
                    slot.item.appliedEquipment = appliedEquipment.toObject();
                }
            }

            // Track if the overextended slot is actually being used
            if (isOverextended && attunement) {
                hasOverextended = true;
            }

            slots.push(slot);
        }

        // Handle any attunements not yet assigned to slots
        attunementItems.forEach(att => {
            const slotIndex = att.getFlag("zwolf-epic", "slotIndex");
            if (slotIndex === undefined || slotIndex >= totalSlots) {
                // Find first empty slot
                for (let i = 0; i < slots.length; i++) {
                    if (!slots[i].item) {
                        slots[i].item = att.toObject();
                        // Check if this is the overextended slot being filled
                        if (slots[i].isOverextended) {
                            hasOverextended = true;
                        }
                        att.setFlag("zwolf-epic", "slotIndex", i);
                        break;
                    }
                }
            }
        });

        return {
            slots: slots,
            total: totalSlots,
            filled: attunementItems.length,
            hasOverextended: hasOverextended
        };
    }

    /**
     * Handle gaining wealth
     * @param {Event} event - The triggering event
     * @param {HTMLElement} target - The element that was clicked
     */
    static async #onGainWealth(event, target) {
        const currentWealth = this.document.system.wealth || 0;

        // Prompt for amount
        const content = `
            <form>
                <div class="form-group">
                    <label>${game.i18n.localize("ZWOLF.GainWealth")}</label>
                    <input type="number" name="amount" value="1" min="0" autofocus />
                </div>
            </form>
        `;

        const result = await Dialog.prompt({
            title: game.i18n.localize("ZWOLF.GainWealth"),
            content: content,
            callback: (html) => {
                const form = html.querySelector("form");
                return parseInt(form.amount.value) || 0;
            },
            rejectClose: false
        });

        if (result !== null && result > 0) {
            const newWealth = currentWealth + result;
            await this.document.update({ "system.wealth": newWealth });
            ui.notifications.info(`${game.i18n.localize("ZWOLF.Wealth")}: ${currentWealth} → ${newWealth}`);
        }
    }

    /**
     * Handle losing wealth
     * @param {Event} event - The triggering event
     * @param {HTMLElement} target - The element that was clicked
     */
    static async #onLoseWealth(event, target) {
        const currentWealth = this.document.system.wealth || 0;

        // Prompt for amount
        const content = `
            <form>
                <div class="form-group">
                    <label>${game.i18n.localize("ZWOLF.LoseWealth")}</label>
                    <input type="number" name="amount" value="1" min="0" max="${currentWealth}" autofocus />
                </div>
            </form>
        `;

        const result = await Dialog.prompt({
            title: game.i18n.localize("ZWOLF.LoseWealth"),
            content: content,
            callback: (html) => {
                const form = html.querySelector("form");
                return parseInt(form.amount.value) || 0;
            },
            rejectClose: false
        });

        if (result !== null && result > 0) {
            const newWealth = Math.max(0, currentWealth - result);
            await this.document.update({ "system.wealth": newWealth });
            ui.notifications.info(`${game.i18n.localize("ZWOLF.Wealth")}: ${currentWealth} → ${newWealth}`);
        }
    }

    // ========================================
    // REST ACTIONS (PHASE 16)
    // ========================================

    /**
     * Handle taking a short rest
     * Costs 1 SP, restores VP to max, grants Suffused condition
     * @param {Event} event - The triggering event
     * @param {HTMLElement} target - The element that was clicked
     */
    static async #onShortRest(event, target) {
        const currentSP = this.document.system.staminaPoints?.value ?? 0;
        const maxVP = this.document.system.vitalityPoints?.max ?? 12;

        // Check if character has stamina to spend
        if (currentSP <= 0) {
            ui.notifications.warn(game.i18n.localize("ZWOLF.NoStaminaForRest"));
            return;
        }

        // Confirm the rest using DialogV2
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: game.i18n.localize("ZWOLF.ShortRest") },
            content: `<p>${game.i18n.localize("ZWOLF.ShortRestConfirm")}</p>
                <ul>
                    <li>${game.i18n.format("ZWOLF.SpendStamina", { current: currentSP, new: currentSP - 1 })}</li>
                    <li>${game.i18n.localize("ZWOLF.RestoreVitality")}</li>
                    <li>${game.i18n.localize("ZWOLF.GainSuffused")}</li>
                </ul>`,
            rejectClose: false,
            modal: true
        });

        if (!confirmed) return;

        try {
            // Update actor: spend 1 SP, restore VP to max
            await this.document.update({
                "system.staminaPoints.value": currentSP - 1,
                "system.vitalityPoints.value": maxVP
            });

            // Add Suffused condition
            await this.#addCondition("suffused");

            ui.notifications.info(game.i18n.localize("ZWOLF.ShortRestComplete"));
        } catch (error) {
            console.error("Z-Wolf Epic | Error during Short Rest:", error);
            ui.notifications.error(game.i18n.localize("ZWOLF.RestFailed"));
        }
    }

    /**
     * Handle taking an extended rest
     * Restores SP and VP to max, grants Suffused, removes Bruised
     * @param {Event} event - The triggering event
     * @param {HTMLElement} target - The element that was clicked
     */
    static async #onExtendedRest(event, target) {
        const maxSP = this.document.system.staminaPoints?.max ?? 4;
        const maxVP = this.document.system.vitalityPoints?.max ?? 12;

        // Confirm the rest using DialogV2
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: game.i18n.localize("ZWOLF.ExtendedRest") },
            content: `<p>${game.i18n.localize("ZWOLF.ExtendedRestConfirm")}</p>
                <ul>
                    <li>${game.i18n.localize("ZWOLF.RestoreStamina")}</li>
                    <li>${game.i18n.localize("ZWOLF.RestoreVitality")}</li>
                    <li>${game.i18n.localize("ZWOLF.GainSuffused")}</li>
                    <li>${game.i18n.localize("ZWOLF.RemoveBruised")}</li>
                    <li>${game.i18n.localize("ZWOLF.FortitudeReminder")}</li>
                </ul>`,
            rejectClose: false,
            modal: true
        });

        if (!confirmed) return;

        try {
            // Update actor: restore both SP and VP to max
            await this.document.update({
                "system.staminaPoints.value": maxSP,
                "system.vitalityPoints.value": maxVP
            });

            // Add Suffused condition
            await this.#addCondition("suffused");

            // Remove Bruised condition
            await this.#removeCondition("bruised");

            // Check for Dying/Wounded and show reminder
            const hasDying = this.document.effects.find(e => e.statuses.has("dying"));
            const hasWounded = this.document.effects.find(e => e.statuses.has("wounded"));

            if (hasDying || hasWounded) {
                ui.notifications.info(game.i18n.localize("ZWOLF.ExtendedRestCompleteWithReminder"));
            } else {
                ui.notifications.info(game.i18n.localize("ZWOLF.ExtendedRestComplete"));
            }
        } catch (error) {
            console.error("Z-Wolf Epic | Error during Extended Rest:", error);
            ui.notifications.error(game.i18n.localize("ZWOLF.RestFailed"));
        }
    }

    // ========================================
    // CONDITION HELPER METHODS
    // ========================================

    /**
     * Add a condition effect to the actor
     * @param {string} conditionId - The condition ID to add
     */
    async #addCondition(conditionId) {
        // Check if condition already exists
        const existingEffect = this.document.effects.find(e => e.statuses.has(conditionId));
        if (existingEffect) {
            console.log(`Z-Wolf Epic | ${conditionId} condition already exists`);
            return;
        }

        const conditionData = CONFIG.ZWOLF?.conditions?.[conditionId];
        if (!conditionData) {
            console.error(`Z-Wolf Epic | Unknown condition: ${conditionId}`);
            return;
        }

        // Create the effect
        const effectData = {
            name: game.i18n.localize(conditionData.label),
            icon: conditionData.icon,
            statuses: [conditionId]
        };

        await this.document.createEmbeddedDocuments("ActiveEffect", [effectData]);
        console.log(`Z-Wolf Epic | Added ${conditionId} condition`);
    }

    /**
     * Remove a condition effect from the actor
     * @param {string} conditionId - The condition ID to remove
     */
    async #removeCondition(conditionId) {
        const effect = this.document.effects.find(e => e.statuses.has(conditionId));
        if (effect) {
            await effect.delete();
            console.log(`Z-Wolf Epic | Removed ${conditionId} condition`);
        }
    }

    // ========================================
    // DICE ROLLING ACTIONS (PHASE 15)
    // ========================================

    /**
     * Handle rolling speed check
     * @param {Event} event - The triggering event
     * @param {HTMLElement} target - The element that was clicked
     */
    static async #onRollSpeed(event, target) {
        event.preventDefault();
        event.stopPropagation();

        // Get speed progression from side effects (may be null)
        const sideEffects = this._processSideEffects();
        const speedProgression = sideEffects?.speedProgression || null;

        await ZWolfDice.rollSpeed(this.actor, speedProgression);
    }

    /**
     * Handle rolling for a progression tier
     * @param {Event} event - The triggering event
     * @param {HTMLElement} target - The element that was clicked
     */
    static async #onRollProgression(event, target) {
        event.preventDefault();
        event.stopPropagation();

        const progression = target.dataset.progression;
        const bonus = parseInt(target.dataset.bonus) || 0;

        if (!progression) {
            ui.notifications.warn("No progression specified for roll");
            return;
        }

        await ZWolfDice.rollProgression(this.actor, progression, bonus);
    }

    /**
     * Handle rolling for an individual stat (attribute or skill)
     * @param {Event} event - The triggering event
     * @param {HTMLElement} target - The element that was clicked
     */
    static async #onRollStat(event, target) {
        event.preventDefault();
        event.stopPropagation();

        const statKey = target.dataset.stat;
        const statType = target.dataset.type;

        if (!statKey || !statType) {
            ui.notifications.warn("Invalid stat specified for roll");
            return;
        }

        if (statType === "attribute") {
            await ZWolfDice.rollAttribute(this.actor, statKey);
        } else if (statType === "skill") {
            await ZWolfDice.rollSkill(this.actor, statKey);
        }
    }

    /**
     * Handle toggling progression accordion sections
     * @param {Event} event - The triggering event
     * @param {HTMLElement} target - The element that was clicked
     */
    static async #onToggleProgression(event, target) {
        // Don't toggle if clicking on the roll die icon
        if (event.target.closest("[data-action=\"rollProgression\"]")) {
            return;
        }

        const progressionGroup = target.closest(".progression-group");
        if (progressionGroup) {
            progressionGroup.classList.toggle("collapsed");
        }
    }

    /**
     * Handle equipment placement change
     * @param {Event} event - The change event
     * @private
     */
    async _onEquipmentPlacementChange(event) {
        const select = event.currentTarget;
        const itemId = select.dataset.itemId;
        const newPlacement = select.value;

        const item = this.actor.items.get(itemId);
        if (item) {
            await item.update({ "system.placement": newPlacement });
        }
    }

    // ========================================
    // PHASE 17: ACTOR TYPE TRAIT HELPERS
    // ========================================

    /**
     * Get the default trait for the current actor type
     * @returns {string} Default trait key
     * @private
     */
    _getDefaultTrait() {
        const defaults = {
            eidolon: "gemini",
            mook: "shapeAlly",
            spawn: "swarmer"
        };
        return defaults[this.actor.type] || "";
    }

    /**
     * Get the localized label for a trait
     * @param {string} trait - Trait key
     * @returns {string} Localized trait label
     * @private
     */
    _getTraitLabel(trait) {
        const labels = {
            gemini: "ZWOLF.TraitGemini",
            swarmer: "ZWOLF.TraitSwarmer",
            shapeAlly: "ZWOLF.TraitShapeAlly"
        };
        const key = labels[trait];
        return key ? game.i18n.localize(key) : trait;
    }

    /**
     * Get the localized description for a trait
     * @param {string} trait - Trait key
     * @returns {string} Localized trait description
     * @private
     */
    _getTraitDescription(trait) {
        const descriptions = {
            gemini: "ZWOLF.TraitGeminiDescription",
            swarmer: "ZWOLF.TraitSwarmerDescription",
            shapeAlly: "ZWOLF.TraitShapeAllyDescription"
        };
        const key = descriptions[trait];
        return key ? game.i18n.localize(key) : "";
    }

    /**
     * Get available base creatures for spawns, mooks, and eidolons
     * Returns PC and NPC actors that can serve as base creatures
     * @returns {Array} Array of actor objects suitable for base creature selection
     * @private
     */
    _getAvailableBaseCreatures() {
        // Get all PC and NPC actors that can serve as base creatures
        const availableTypes = ["pc", "npc"];

        return game.actors.contents
            .filter(actor => availableTypes.includes(actor.type) && actor.id !== this.actor.id)
            .map(actor => actor.toObject())
            .sort((a, b) => a.name.localeCompare(b.name));
    }
}

