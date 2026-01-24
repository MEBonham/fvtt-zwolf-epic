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

        // Organize stats by progression
        context.progressions = this._organizeByProgression(context.system, progressionBonuses);

        // Calculate target numbers
        context.tns = {
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
