const { ItemSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;
import { ItemDataProcessor } from "../helpers/item-data-processor.mjs";
import { EditorSaveHandler } from "../helpers/editor-save-handler.mjs";

/**
 * Item sheet for Z-Wolf Epic items.
 * @extends {ItemSheetV2}
 */
export class ZWolfItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

    constructor(options = {}) {
        super(options);

        // Initialize tab groups
        this.tabGroups = {
            primary: "summary"
        };
    }

    static DEFAULT_OPTIONS = {
        classes: ["zwolf-epic", "sheet", "item"],
        position: {
            width: 720,
            height: 680
        },
        actions: {
            editImage: ZWolfItemSheet.#onEditImage,
            changeTab: ZWolfItemSheet.#onChangeTab,
            "add-ability": ZWolfItemSheet.#onAddAbility,
            "delete-ability": ZWolfItemSheet.#onDeleteAbility,
            "add-side-effect": ZWolfItemSheet.#onAddSideEffect,
            "delete-side-effect": ZWolfItemSheet.#onDeleteSideEffect
        },
        form: {
            submitOnChange: true,
            closeOnSubmit: false
        },
        window: {
            resizable: true
        }
    };

    static PARTS = {
        header: {
            template: "systems/zwolf-epic/templates/item/parts/item-header.hbs"
        },
        tabs: {
            template: "systems/zwolf-epic/templates/item/parts/item-tabs.hbs"
        },
        "tab-summary": {
            template: "systems/zwolf-epic/templates/item/parts/item-summary.hbs",
            scrollable: [".tab"]
        },
        "tab-abilities": {
            template: "systems/zwolf-epic/templates/item/parts/item-abilities.hbs",
            scrollable: [".tab"]
        },
        "tab-effects": {
            template: "systems/zwolf-epic/templates/item/parts/item-effects.hbs",
            scrollable: [".tab"]
        },
        "tab-tiers": {
            template: "systems/zwolf-epic/templates/item/parts/item-tiers.hbs",
            scrollable: [".tab"]
        }
    };

    /** @override */
    _onRender(context, options) {
        super._onRender(context, options);

        // Initialize tab visibility based on current active tab
        const activeTab = this.tabGroups.primary || "summary";
        const tabContents = this.element.querySelectorAll(".tab[data-tab]");

        tabContents.forEach(tab => {
            if (tab.dataset.tab === activeTab) {
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
            if (btn.dataset.tab === activeTab) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        // Restore scroll positions if they were saved
        if (this._scrollPositions) {
            const scrollContainers = this.element.querySelectorAll(".tab[data-tab]");
            scrollContainers.forEach(container => {
                const tabName = container.dataset.tab;
                if (this._scrollPositions[tabName] !== undefined) {
                    container.scrollTop = this._scrollPositions[tabName];
                }
            });
        }

        // Attach event listeners for side effect type changes
        this._attachSideEffectListeners();

        // Activate rich text editors with Edit/Save workflow
        EditorSaveHandler.activateEditors(this);
    }

    /**
     * Attach event listeners to side effect type dropdowns
     * @private
     */
    _attachSideEffectListeners() {
        const typeSelects = this.element.querySelectorAll(".side-effect-type select");

        typeSelects.forEach(select => {
            select.addEventListener("change", (event) => {
                this._onSideEffectTypeChange(event.target);
            });
        });
    }

    /**
     * Handle side effect type change to update the value input
     * @param {HTMLSelectElement} typeSelect - The type select element
     * @private
     */
    _onSideEffectTypeChange(typeSelect) {
        const effectItem = typeSelect.closest(".side-effect-item");
        if (!effectItem) return;

        const valueContainer = effectItem.querySelector(".side-effect-value");
        if (!valueContainer) return;

        const selectedType = typeSelect.value;
        const basePath = typeSelect.name.replace(".type", "");

        // Get current value if it exists
        const currentValueInput = valueContainer.querySelector("input, select");
        const currentValue = currentValueInput?.value || "";

        // Build the appropriate input based on type
        const newInput = this._buildValueInput(selectedType, basePath, currentValue);

        // Replace the existing input
        const label = valueContainer.querySelector("label");
        const existingInput = valueContainer.querySelector("input, select, .vision-input-group");
        if (existingInput) {
            existingInput.remove();
        }

        label.insertAdjacentHTML("afterend", newInput);
    }

    /**
     * Build the HTML for a value input based on effect type
     * @param {string} type - The effect type
     * @param {string} basePath - The base path for the form field
     * @param {string} currentValue - The current value
     * @returns {string} HTML string for the input
     * @private
     */
    _buildValueInput(type, basePath, currentValue = "") {
        const config = CONFIG.ZWOLF;

        switch (type) {
            case "characterTag":
                return `<input type="text" name="${basePath}.value" value="${currentValue}" placeholder="${game.i18n.localize('ZWOLF.CharacterTagsPlaceholder')}"/>`;

            case "proficiency":
                return this._buildProficiencySelect(basePath, currentValue, config);

            case "speedProgression":
            case "toughnessTNProgression":
            case "destinyTNProgression":
                return this._buildProgressionSelect(basePath, currentValue);

            case "nightsightRadius":
            case "darkvisionRadius":
                return `<div class="vision-input-group">
                    <input type="number" name="${basePath}.value" value="${currentValue}" data-dtype="Number" min="0" step="0.5" placeholder="0"/>
                    <span class="input-suffix">${game.i18n.localize('ZWOLF.Meters')}</span>
                </div>`;

            case "bulkCapacityBoost":
            case "sizeModifier":
                return `<input type="number" name="${basePath}.value" value="${currentValue}" data-dtype="Number" step="1" placeholder="0"/>`;

            case "resistance":
            case "vulnerability":
                return this._buildDamageTypeSelect(basePath, currentValue, config);

            default:
                return `<input type="text" name="${basePath}.value" value="${currentValue}" placeholder=""/>`;
        }
    }

    /**
     * Build proficiency select HTML
     * @private
     */
    _buildProficiencySelect(basePath, currentValue, config) {
        let html = `<select name="${basePath}.value" data-dtype="String">`;
        html += `<option value="" ${currentValue === "" ? "selected" : ""}>${game.i18n.localize('ZWOLF.None')}</option>`;

        // Seed proficiencies
        html += `<optgroup label="${game.i18n.localize('ZWOLF.SeedProficiencies')}">`;
        for (const [key, prof] of Object.entries(config.proficiencies || {})) {
            if (prof.type === "seed") {
                html += `<option value="${key}" ${currentValue === key ? "selected" : ""}>${prof.label}</option>`;
            }
        }
        html += `</optgroup>`;

        // Weapon proficiencies
        html += `<optgroup label="${game.i18n.localize('ZWOLF.WeaponProficiencies')}">`;
        for (const [key, prof] of Object.entries(config.proficiencies || {})) {
            if (prof.type === "weapon") {
                html += `<option value="${key}" ${currentValue === key ? "selected" : ""}>${prof.label}</option>`;
            }
        }
        html += `</optgroup>`;

        // Misc proficiencies
        html += `<optgroup label="${game.i18n.localize('ZWOLF.MiscellaneousProficiencies')}">`;
        for (const [key, prof] of Object.entries(config.proficiencies || {})) {
            if (prof.type === "miscellaneous") {
                html += `<option value="${key}" ${currentValue === key ? "selected" : ""}>${prof.label}</option>`;
            }
        }
        html += `</optgroup>`;
        html += `</select>`;

        return html;
    }

    /**
     * Build progression select HTML
     * @private
     */
    _buildProgressionSelect(basePath, currentValue) {
        let html = `<select name="${basePath}.value" data-dtype="String">`;
        html += `<option value="" ${currentValue === "" ? "selected" : ""}>${game.i18n.localize('ZWOLF.None')}</option>`;
        html += `<option value="mediocre" ${currentValue === "mediocre" ? "selected" : ""}>${game.i18n.localize('ZWOLF.Mediocre')}</option>`;
        html += `<option value="moderate" ${currentValue === "moderate" ? "selected" : ""}>${game.i18n.localize('ZWOLF.Moderate')}</option>`;
        html += `<option value="specialty" ${currentValue === "specialty" ? "selected" : ""}>${game.i18n.localize('ZWOLF.Specialty')}</option>`;
        html += `<option value="awesome" ${currentValue === "awesome" ? "selected" : ""}>${game.i18n.localize('ZWOLF.Awesome')}</option>`;
        html += `</select>`;
        return html;
    }

    /**
     * Build damage type select HTML
     * @private
     */
    _buildDamageTypeSelect(basePath, currentValue, config) {
        let html = `<select name="${basePath}.value" data-dtype="String">`;
        html += `<option value="" ${currentValue === "" ? "selected" : ""}>${game.i18n.localize('ZWOLF.None')}</option>`;

        for (const [key, damageType] of Object.entries(config.damageTypes || {})) {
            html += `<option value="${key}" ${currentValue === key ? "selected" : ""}>${game.i18n.localize(damageType.label)}</option>`;
        }

        html += `</select>`;
        return html;
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        context.item = this.item;
        context.system = this.item.system;
        context.config = CONFIG.ZWOLF;
        context.itemType = this.item.type;

        // Ensure tabGroups.primary has a value
        if (!this.tabGroups.primary) {
            this.tabGroups.primary = "summary";
        }

        // Add current tab
        context.currentTab = this.tabGroups.primary;

        // Determine which item types have tags
        const TYPES_WITH_TAGS = ["ancestry", "knack", "equipment", "track", "talent", "attunement", "commodity"];
        context.hasTags = TYPES_WITH_TAGS.includes(this.item.type);


        // Determine if abilities tab should be shown
        // Show if item type can have granted abilities and either has some or is editable
        const TYPES_WITH_ABILITIES = ["fundament", "equipment", "knack", "talent", "ancestry", "track", "attunement", "universal"];
        const hasAbilities = this.item.system.grantedAbilities && Object.keys(this.item.system.grantedAbilities).length > 0;
        context.showAbilitiesTab = TYPES_WITH_ABILITIES.includes(this.item.type) && (hasAbilities || context.editable);

        // Determine if effects tab should be shown
        // Show for types with sideEffects (tracks have tierSideEffects)
        const TYPES_WITH_SIDE_EFFECTS = ["fundament", "equipment", "knack", "talent", "ancestry", "track", "attunement", "universal"];
        context.showEffectsTab = TYPES_WITH_SIDE_EFFECTS.includes(this.item.type);

        // GM and ownership flags
        context.isGM = game.user.isGM;
        context.owner = this.item.isOwner;
        context.editable = this.isEditable;

        // Process granted abilities into an array if they exist
        if (this.item.system.grantedAbilities) {
            context.grantedAbilitiesArray = Object.entries(this.item.system.grantedAbilities).map(([id, ability]) => ({
                ...ability,
                id,
                index: id,
                tier: ability.tier !== undefined ? ability.tier : 0,
                nameTarget: `system.grantedAbilities.${id}.name`,
                tagsTarget: `system.grantedAbilities.${id}.tags`,
                typeTarget: `system.grantedAbilities.${id}.type`,
                descriptionTarget: `system.grantedAbilities.${id}.description`,
                tierTarget: `system.grantedAbilities.${id}.tier`
            }));
        } else {
            context.grantedAbilitiesArray = [];
        }

        // For track items, group abilities by tier for display
        if (this.item.type === "track" && this.item.system.grantedAbilities) {
            // Group abilities by tier
            const abilitiesByTier = {};
            for (let tier = 1; tier <= 5; tier++) {
                abilitiesByTier[tier] = [];
            }

            Object.entries(this.item.system.grantedAbilities).forEach(([id, ability]) => {
                const tier = ability.tier || 1;
                if (tier >= 1 && tier <= 5) {
                    abilitiesByTier[tier].push({
                        ...ability,
                        id,
                        index: id,
                        tier,
                        nameTarget: `system.grantedAbilities.${id}.name`,
                        tagsTarget: `system.grantedAbilities.${id}.tags`,
                        typeTarget: `system.grantedAbilities.${id}.type`,
                        descriptionTarget: `system.grantedAbilities.${id}.description`,
                        tierTarget: `system.grantedAbilities.${id}.tier`
                    });
                }
            });

            context.abilitiesByTier = abilitiesByTier;
        }

        // For all items with sideEffects, prepare for display
        if (this.item.system.sideEffects && Array.isArray(this.item.system.sideEffects)) {
            context.sideEffectsArray = this.item.system.sideEffects.map((effect, index) => ({
                ...effect,
                index,
                pathPrefix: `system.sideEffects.${index}`
            }));
        } else {
            context.sideEffectsArray = [];
        }

        // For attunement items on actors, get list of equipment
        if (this.item.type === "attunement" && this.item.actor) {
            context.actorEquipment = this.item.actor.items.filter(i => i.type === "equipment");
        }

        // For equipment items, calculate if effects are active based on placement requirements
        if (this.item.type === "equipment") {
            const requiredPlacement = this.item.system.requiredPlacement;

            // Only show status if there's a required placement
            if (requiredPlacement) {
                // Normalize placement values for comparison (hyphens to underscores)
                const currentPlacement = this.item.system.placement?.replace(/-/g, "_") || "";
                context.effectsActive = currentPlacement === requiredPlacement;
                context.showPlacementStatus = true;
            } else {
                // No required placement means effects are always active
                context.effectsActive = true;
                context.showPlacementStatus = false;
            }
        }

        return context;
    }

    /**
     * Handle form submission - ported from legacy version
     * @param {Object} formConfig - Form configuration
     * @param {Event} event - The form submission event
     * @override
     */
    async _onSubmitForm(formConfig, event) {
        // Get the form element
        const form = event?.target?.form || event?.target?.closest("form") || this.element.querySelector("form");
        if (!form) {
            console.error("Z-Wolf Epic | No form found in submit event");
            return;
        }

        // Extract form data using FormDataExtended
        const formData = new foundry.applications.ux.FormDataExtended(form);
        let submitData = formData.object;

        // Convert number fields explicitly
        const numberInputs = form.querySelectorAll("input[data-dtype=\"Number\"], input[type=\"number\"]");
        numberInputs.forEach(input => {
            const fieldPath = input.name;
            if (fieldPath && submitData[fieldPath] !== null && submitData[fieldPath] !== undefined && submitData[fieldPath] !== "") {
                const parsedValue = Number(submitData[fieldPath]);
                const finalValue = input.step && input.step !== "1" ? parsedValue : Math.floor(parsedValue);
                submitData[fieldPath] = isNaN(finalValue) ? 0 : finalValue;
            }
        });

        // Handle multi-select fields
        ItemDataProcessor.processMultiSelectFields(form, submitData);

        // Process side effects for all items
        submitData["system.sideEffects"] = this._reconstructSideEffectsArray(submitData, "system.sideEffects");

        // Expand object structure
        submitData = foundry.utils.expandObject(submitData);

        // Update the document
        try {
            await this.document.update(submitData, { render: false, diff: true });
        } catch (error) {
            console.error("Z-Wolf Epic | Failed to update item:", error);
            ui.notifications.error("Failed to save changes: " + error.message);
        }
    }

    /**
     * Reconstruct side effects array from flattened form data
     * @param {Object} formData - The form data object
     * @param {string} basePath - Base path for the side effects array
     * @returns {Array} - Reconstructed side effects array
     * @private
     */
    _reconstructSideEffectsArray(formData, basePath) {
        const effects = [];
        const effectPattern = new RegExp(`^${basePath.replace(/\./g, "\\.")}\\.(\\d+)\\.(.+)$`);

        // Find all keys that match the side effects pattern
        Object.keys(formData).forEach(key => {
            const match = key.match(effectPattern);
            if (match) {
                const index = parseInt(match[1]);
                const field = match[2];
                const value = formData[key];

                // Ensure we have an object at this index
                // IMPORTANT: Don't create placeholder objects here - wait until we know the index is valid
                if (!effects[index]) {
                    effects[index] = {};
                }

                // Update the specific field
                effects[index][field] = value;

                // Remove the flattened key from form data
                delete formData[key];
            }
        });

        // If no effects were found in form data, preserve existing effects
        if (effects.length === 0) {
            return this.item.system.sideEffects || [];
        }

        // Filter out any undefined/null slots (in case of gaps in indices) and validate
        const validEffects = effects.filter(effect => {
            // Must have an object with at least type and value
            return effect && typeof effect === "object" && effect.type;
        }).map(effect => {
            // Ensure ID exists - preserve existing or generate new one if missing
            if (!effect.id) {
                effect.id = foundry.utils.randomID();
            }
            // Ensure required fields have defaults
            return {
                id: effect.id,
                type: effect.type || "characterTag",
                value: effect.value !== undefined ? effect.value : "",
                // Preserve tier if it exists (for track items)
                ...(effect.tier !== undefined && { tier: parseInt(effect.tier) || 1 })
            };
        });

        return validEffects;
    }

    /**
     * Save scroll positions before update
     * @private
     */
    _saveScrollPositions() {
        this._scrollPositions = {};

        const sheetBody = this.element?.querySelector(".sheet-body");
        if (sheetBody) {
            this._scrollPositions.body = sheetBody.scrollTop;
        }

        // Save scroll for each tab
        const scrollContainers = this.element?.querySelectorAll(".tab[data-tab]");
        scrollContainers?.forEach(container => {
            const tabName = container.dataset.tab;
            this._scrollPositions[tabName] = container.scrollTop;
        });
    }

    static async #onChangeTab(event, target) {
        const newTab = target.dataset.tab;
        const group = target.dataset.group || "primary";

        if (this.tabGroups[group] !== newTab) {
            // Update the tab group
            this.tabGroups[group] = newTab;

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

    /**
     * Handle adding a new granted ability
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     * @private
     */
    static async #onAddAbility(event, target) {
        event.preventDefault();

        // Save scroll position
        this._saveScrollPositions();

        // Get current granted abilities or initialize empty object
        const currentAbilities = this.item.system.grantedAbilities || {};

        // Generate a unique ID for the new ability
        const newId = foundry.utils.randomID();

        // Determine tier based on item type
        let tier = 0;
        if (this.item.type === "track") {
            // For track items, check if we're adding to a specific tier
            tier = parseInt(target.dataset.tier) || 1;
        }

        // Create new ability with default values
        const newAbility = {
            name: this.item.name,
            type: "passive",
            tags: "",
            description: "",
            tier: tier
        };

        // Add the new ability to the object
        const updatedAbilities = {
            ...currentAbilities,
            [newId]: newAbility
        };

        // Update the item
        await this.item.update({
            "system.grantedAbilities": updatedAbilities
        });
    }

    /**
     * Handle deleting a granted ability
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     * @private
     */
    static async #onDeleteAbility(event, target) {
        event.preventDefault();

        // Save scroll position
        this._saveScrollPositions();

        // Get the ability ID from the closest ability item container
        const abilityItem = target.closest("[data-ability-id]");
        if (!abilityItem) return;

        const abilityId = abilityItem.dataset.abilityId;

        // Confirm deletion
        const abilityName = this.item.system.grantedAbilities[abilityId]?.name || game.i18n.localize("ZWOLF.UnknownAbility");
        const confirmed = await Dialog.confirm({
            title: game.i18n.localize("ZWOLF.DeleteAbility"),
            content: `<p>${game.i18n.format("ZWOLF.DeleteAbilityConfirm", { name: abilityName })}</p>`,
            yes: () => true,
            no: () => false
        });

        if (!confirmed) return;

        // Use Foundry's -= deletion syntax to properly remove nested keys
        await this.item.update({
            [`system.grantedAbilities.-=${abilityId}`]: null
        });
    }

    /**
     * Handle editing the item image
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     * @private
     */
    static async #onEditImage(event, target) {
        const currentImage = this.item.img;
        const fp = new FilePicker({
            type: "image",
            current: currentImage,
            callback: async (path) => {
                await this.item.update({ img: path });
            }
        });
        fp.browse();
    }

    /**
     * Handle adding a new side effect
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     * @private
     */
    static async #onAddSideEffect(event, target) {
        event.preventDefault();

        // Save scroll position
        this._saveScrollPositions();

        // Get current side effects
        const sideEffectsPath = "system.sideEffects";
        const itemEffects = this.item.system.sideEffects;
        const currentEffects = Array.isArray(itemEffects) ? itemEffects : [];

        // Generate a unique ID for the new side effect
        const newId = foundry.utils.randomID();

        // Create new side effect with default values
        const newEffect = {
            id: newId,
            type: "characterTag",
            value: ""
        };

        // For track items, add a default tier
        if (this.item.type === "track") {
            newEffect.tier = 1;
        }

        // Add the new effect to the array
        const updatedEffects = [...currentEffects, newEffect];

        // Update the item
        await this.item.update({
            [sideEffectsPath]: updatedEffects
        });
    }

    /**
     * Handle deleting a side effect
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     * @private
     */
    static async #onDeleteSideEffect(event, target) {
        event.preventDefault();

        // Save scroll position
        this._saveScrollPositions();

        // Get the effect index from the closest effect container
        const effectItem = target.closest("[data-effect-index]");
        if (!effectItem) return;

        const effectIndex = parseInt(effectItem.dataset.effectIndex);

        // Confirm deletion
        const confirmed = await Dialog.confirm({
            title: game.i18n.localize("ZWOLF.DeleteSideEffect"),
            content: `<p>${game.i18n.localize("ZWOLF.DeleteSideEffectConfirm")}</p>`,
            yes: () => true,
            no: () => false
        });

        if (!confirmed) return;

        // Get current side effects
        const sideEffectsPath = "system.sideEffects";
        const itemEffects = this.item.system.sideEffects;
        const currentEffects = Array.isArray(itemEffects) ? itemEffects : [];

        // Remove the effect at the specified index
        const updatedEffects = currentEffects.filter((_, index) => index !== effectIndex);

        // Update the item
        await this.item.update({
            [sideEffectsPath]: updatedEffects
        });
    }
}
