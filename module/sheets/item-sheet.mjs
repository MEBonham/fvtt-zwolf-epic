/**
 * Z-Wolf Epic Item Sheet (Refactored)
 * Uses SheetStateManager for state preservation
 * Simplified from 900+ lines to ~400 lines
 */

import { SheetStateManager } from "../helpers/sheet-state-manager.mjs";
import { ItemDataProcessor } from "../helpers/item-data-processor.mjs";
import { HtmlEnricher } from "../helpers/html-enricher.mjs";
import { EditorSaveHandler } from "../helpers/editor-save-handler.mjs";

export default class ZWolfItemSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ItemSheetV2
) {
  
  constructor(options) {
    super(options);
    
    // Initialize state manager
    this.stateManager = new SheetStateManager(this, {
      scrollSelectors: ['.window-content', '.tab', '.scrollable'],
      tabSelector: '.tab[data-tab]',
      accordionSelector: 'details[data-tier]',
      debug: false // Set to true for troubleshooting
    });
    
    // Track active tab
    this._activeTab = "summary";
  }

  static DEFAULT_OPTIONS = {
    classes: ["zwolf-epic", "sheet", "item"],
    position: { width: 770, height: 600 },
    window: { resizable: true, minimizable: true },
    form: { submitOnChange: true, closeOnSubmit: false }
  };

  static PARTS = {
    header: { template: "systems/zwolf-epic/templates/item/parts/item-header.hbs" },
    tabs: { template: "systems/zwolf-epic/templates/item/parts/item-tabs.hbs" },
    summary: { template: "systems/zwolf-epic/templates/item/parts/item-summary.hbs" },
    basics: { template: "systems/zwolf-epic/templates/item/parts/item-basics.hbs" },
    abilities: { template: "systems/zwolf-epic/templates/item/parts/item-abilities.hbs" },
    formulae: { template: "systems/zwolf-epic/templates/item/parts/item-formulae.hbs" },
    effects: { template: "systems/zwolf-epic/templates/item/parts/item-effects.hbs" },
    tiers: { template: "systems/zwolf-epic/templates/item/parts/item-tiers.hbs" }
  };

  get title() {
    return `${this.document.name} [${this.document.type.titleCase()}]`;
  }

  // ========================================
  // CONTEXT PREPARATION
  // ========================================

  async _prepareContext(options) {
    this.stateManager.captureState();
    
    const context = await super._prepareContext(options);
    const itemData = this.document.toObject(false);

    Object.assign(context, {
      editable: this.isEditable,
      owner: this.document.isOwner,
      system: itemData.system,
      flags: itemData.flags,
      config: CONFIG.ZWOLF,
      item: this.document,
      itemType: this.document.type,
      isLocked: this.document.actor && this.document.getFlag('zwolf-epic', 'locked'),
      isEquipment: this.document.type === 'equipment'
    });

    // Only enrich description once (not in type-specific methods)
    context.enrichedDescription = await HtmlEnricher.enrichContent(
      this.document.system.description || "",
      this.document,
      "main description"
    );

    // Only prepare data for type-specific if needed
    await this._prepareTypeSpecificData(context, itemData);
    
    // REMOVE THIS - summary data is prepared in type-specific methods
    // await this._prepareSummaryData(context, itemData);

    return context;
  }

  /**
   * Prepare minimal data for summary tab
   * @private
   */
  async _prepareSummaryData(context, itemData) {
    // Count granted abilities for summary
    if (itemData.system.grantedAbilities) {
      const abilities = Object.values(itemData.system.grantedAbilities).filter(a => a && a.name);
      context.grantedAbilitiesCount = abilities.length;
    }
    
    // Process track tiers for summary (add ability count and enrich talent menu)
    if (this.document.type === 'track' && itemData.system.tiers) {
      for (const [tierKey, tierData] of Object.entries(itemData.system.tiers)) {
        // Count abilities in this tier
        if (tierData.grantedAbilities) {
          const tierAbilities = Object.values(tierData.grantedAbilities).filter(a => a && a.name);
          tierData.grantedAbilitiesCount = tierAbilities.length;
        }
      }
    }
    
    // Enrich required field for items that have it
    if (['ancestry', 'talent', 'knack'].includes(this.document.type) && itemData.system.required) {
      context.enrichedRequired = await HtmlEnricher.enrichContent(
        itemData.system.required,
        this.document,
        "required field"
      );
    }
  }

  /**
   * Prepare data specific to item type
   * @private
   */
  async _prepareTypeSpecificData(context, itemData) {
    switch (this.document.type) {
      case 'track':
        await this._prepareTrackData(context, itemData);
        break;
      case 'ancestry':
        await this._prepareAncestryData(context, itemData);
        break;
      case 'fundament':
        await this._prepareFundamentData(context, itemData);
        break;
      case 'talent':
        await this._prepareTalentData(context, itemData);
        break;
      case 'knack':
      case 'universal':
        await this._prepareTaggedItemData(context, itemData);
        break;
      case 'equipment':
        await this._prepareEquipmentData(context, itemData);
        break;
    }

    // Process granted abilities (for non-track items)
    if (this.document.type !== 'track') {
      await this._prepareGrantedAbilities(context, itemData);
    }
  }

  /**
   * Prepare granted abilities for display
   * @private
   */
  async _prepareGrantedAbilities(context, itemData) {
    const abilities = itemData.system.grantedAbilities || {};
    const abilitiesArray = [];

    for (const [key, ability] of Object.entries(abilities)) {
      const index = parseInt(key);
      if (!isNaN(index) && ability && typeof ability === 'object') {
        const enrichedDescription = await HtmlEnricher.enrichContent(
          ability.description || "",
          this.document,
          `ability ${index} description`
        );

        abilitiesArray.push({
          ...ability,
          index: index,
          enrichedDescription: enrichedDescription,
          nameTarget: `system.grantedAbilities.${index}.name`,
          typeTarget: `system.grantedAbilities.${index}.type`,
          tagsTarget: `system.grantedAbilities.${index}.tags`,
          descriptionTarget: `system.grantedAbilities.${index}.description`
        });
      }
    }

    context.grantedAbilitiesArray = abilitiesArray.sort((a, b) => a.index - b.index);
  }

  /**
   * Prepare track-specific data including tier abilities
   * @private
   */
  async _prepareTrackData(context, itemData) {
    if (!itemData.system.tiers) return;

    for (const [tierKey, tierData] of Object.entries(itemData.system.tiers)) {
      const tierNumber = tierKey.replace('tier', '');
      
      // Enrich talent menu
      tierData.enrichedTalentMenu = await HtmlEnricher.enrichContent(
        tierData.talentMenu || "",
        this.document,
        `${tierKey} talent menu`
      );

      // Process tier abilities
      const tierAbilities = tierData.grantedAbilities || {};
      const tierAbilitiesArray = [];

      for (const [key, ability] of Object.entries(tierAbilities)) {
        const index = parseInt(key);
        if (!isNaN(index) && ability && typeof ability === 'object') {
          const enrichedDescription = await HtmlEnricher.enrichContent(
            ability.description || "",
            this.document,
            `tier ${tierNumber} ability ${index}`
          );

          tierAbilitiesArray.push({
            ...ability,
            index: index,
            enrichedDescription: enrichedDescription,
            nameTarget: `system.tiers.tier${tierNumber}.grantedAbilities.${index}.name`,
            typeTarget: `system.tiers.tier${tierNumber}.grantedAbilities.${index}.type`,
            tagsTarget: `system.tiers.tier${tierNumber}.grantedAbilities.${index}.tags`,
            descriptionTarget: `system.tiers.tier${tierNumber}.grantedAbilities.${index}.description`,
            tierNumber: tierNumber
          });
        }
      }

      tierData.grantedAbilitiesArray = tierAbilitiesArray.sort((a, b) => a.index - b.index);
    }
  }

  /**
   * Prepare ancestry-specific data
   * @private
   */
  async _prepareAncestryData(context, itemData) {
    // Enrich knack menu as simple rich text (like talent menus in tracks)
    context.enrichedKnackMenu = await HtmlEnricher.enrichContent(
      itemData.system.knackMenu || "",
      this.document,
      "knack menu"
    );
  }

  /**
   * Prepare fundament-specific data
   * @private
   */
  async _prepareFundamentData(context, itemData) {
    // Fundament-specific logic if needed
  }

  /**
   * Prepare talent-specific data
   * @private
   */
  async _prepareTalentData(context, itemData) {
    if (itemData.system.required) {
      context.enrichedRequired = await HtmlEnricher.enrichContent(
        itemData.system.required,
        this.document,
        "required field"
      );
    }
  }

  /**
   * Prepare data for tagged items (knack, universal)
   * @private
   */
  async _prepareTaggedItemData(context, itemData) {
    // Basic tag handling already in context
  }

  /**
   * Prepare equipment-specific data
   * @private
   */
  async _prepareEquipmentData(context, itemData) {
    // Equipment-specific logic if needed
  }

  // ========================================
  // RENDERING
  // ========================================

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    
    // Determine which parts to render based on item type
    const itemType = this.document.type;
    const partsToRender = ['header', 'tabs', 'summary', 'basics', 'effects'];
    
    if (itemType === 'fundament') {
      partsToRender.push('formulae', 'abilities');
    } else if (itemType === 'track') {
      partsToRender.push('tiers');
    } else {
      partsToRender.push('abilities');
    }
    
    options.parts = partsToRender;
    return options;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    
    // Capture state BEFORE any form inputs change
    this.element.addEventListener('input', () => {
      this.stateManager.captureState();
    }, { capture: true });
    
    // Activate the correct tab FIRST
    this._activateTab();
    
    // Activate rich text editors
    EditorSaveHandler.activateEditors(this);
    
    // Restore state AFTER everything else
    this.stateManager.restoreState();
  }

  /**
   * Activate the current tab
   * @private
   */
  _activateTab() {
    const activeTab = this._activeTab || "summary";
    
    // Show the active tab content
    const tabContents = this.element.querySelectorAll('.tab[data-tab]');
    tabContents.forEach(tab => {
      if (tab.dataset.tab === activeTab) {
        tab.classList.add('active');
        tab.style.display = 'block';
      } else {
        tab.classList.remove('active');
        tab.style.display = 'none';
      }
    });
    
    // Highlight the active tab button
    const tabButtons = this.element.querySelectorAll('[data-group="primary"][data-tab]');
    tabButtons.forEach(btn => {
      if (btn.dataset.tab === activeTab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /**
   * Apply lock state to disable all inputs
   * @private
   */
  _applyLockState() {
    this.element.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
    this.element.querySelectorAll('button').forEach(btn => {
      if (!btn.classList.contains('close')) btn.disabled = true;
    });
  }

  // ========================================
  // EVENT LISTENERS
  // ========================================

  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    
    if (!this.isEditable) return;

    switch (partId) {
      case 'header':
        this._attachHeaderListeners(htmlElement);
        break;
      case 'tabs':
        this._attachTabListeners(htmlElement);
        break;
      case 'abilities':
        this._attachAbilityListeners(htmlElement);
        break;
      case 'tiers':
        this._attachTierListeners(htmlElement);
        break;
    }
  }

  /**
   * Attach header listeners (image picker)
   * @private
   */
  _attachHeaderListeners(html) {
    const imgElement = html.querySelector('img[data-edit="img"]');
    if (imgElement) {
      imgElement.style.cursor = 'pointer';
      imgElement.addEventListener('click', this._onEditImage.bind(this));
    }
  }

  /**
   * Attach tab navigation listeners
   * @private
   */
  _attachTabListeners(html) {
    html.querySelectorAll('[data-tab]').forEach(tab => {
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        const tabId = event.currentTarget.dataset.tab;
        this._activeTab = tabId;
        this.stateManager.setActiveTab(tabId);
        this._activateTab(); // ← ADD THIS to immediately show the tab
      });
    });
  }

  /**
   * Attach ability management listeners
   * @private
   */
  _attachAbilityListeners(html) {
    // Add ability button
    html.querySelectorAll('[data-action="add-ability"]').forEach(btn => {
      btn.addEventListener('click', async (event) => {
        event.preventDefault();
        await this.document.addGrantedAbility();
      });
    });

    // Delete ability buttons
    html.querySelectorAll('[data-action="delete-ability"]').forEach(btn => {
      btn.addEventListener('click', async (event) => {
        event.preventDefault();
        const index = parseInt(event.currentTarget.dataset.abilityIndex);
        if (!isNaN(index)) {
          await this.document.removeGrantedAbility(index);
        }
      });
    });
  }

  /**
   * Attach tier management listeners (using event delegation)
   * @private
   */
  _attachTierListeners(html) {
    // Use event delegation for better performance
    html.addEventListener('click', async (event) => {
      const target = event.target.closest('[data-action]');
      if (!target) return;

      const action = target.dataset.action;
      
      if (action === 'add-tier-ability') {
        event.preventDefault();
        const tier = parseInt(target.dataset.tier);
        if (!isNaN(tier)) {
          await this.document.addTierAbility(tier);
        }
      } else if (action === 'delete-tier-ability') {
        event.preventDefault();
        const tier = parseInt(target.dataset.tier);
        const index = parseInt(target.dataset.abilityIndex);
        if (!isNaN(tier) && !isNaN(index)) {
          await this.document.removeTierAbility(tier, index);
        }
      }
    });
  }

  // ========================================
  // FORM SUBMISSION
  // ========================================

  async _onSubmitForm(formConfig, event) {
    // Get the form element
    const form = event?.target?.form || event?.target?.closest('form');
    if (!form) {
      console.error("Z-Wolf Epic | No form found in submit event");
      return;
    }

    // Extract form data using FormDataExtended
    const formData = new foundry.applications.ux.FormDataExtended(form);
    let submitData = formData.object;
    
    // Convert number fields explicitly
    const numberInputs = form.querySelectorAll('input[data-dtype="Number"], input[type="number"]');
    numberInputs.forEach(input => {
      const fieldPath = input.name;
      if (fieldPath && submitData[fieldPath] !== null && submitData[fieldPath] !== undefined && submitData[fieldPath] !== '') {
        const parsedValue = Number(submitData[fieldPath]);
        const finalValue = input.step && input.step !== '1' ? parsedValue : Math.floor(parsedValue);
        submitData[fieldPath] = isNaN(finalValue) ? 0 : finalValue;
      }
    });

    // Handle multi-select fields
    ItemDataProcessor.processMultiSelectFields(form, submitData);

    // Expand object structure
    submitData = foundry.utils.expandObject(submitData);

    try {
      await this.document.update(submitData, { render: false, diff: true });
    } catch (error) {
      console.error("Z-Wolf Epic | Failed to update item:", error);
      ui.notifications.error("Failed to save changes: " + error.message);
    }
  }

  // ========================================
  // ACTION HANDLERS
  // ========================================

  async _onEditImage(event) {
    event.preventDefault();
    
    const fp = new FilePicker({
      type: "image",
      current: this.document.img,
      callback: (path) => this.document.update({ img: path }),
      top: this.position.top + 40,
      left: this.position.left + 10
    });
    
    return fp.browse();
  }
}
