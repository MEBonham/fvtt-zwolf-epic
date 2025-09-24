// module/sheets/item-sheet.mjs

import { ItemDataProcessor } from "../helpers/item-data-processor.mjs";
import { HtmlEnricher } from "../helpers/html-enricher.mjs";
import { EditorSaveHandler } from "../helpers/editor-save-handler.mjs";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class ZWolfItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["zwolf-epic", "sheet", "item"],
      width: 700,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "basics" }],
      scrollY: [".sheet-body"]
    });
  }

  /** @override */
  get template() {
    const path = "systems/zwolf-epic/templates/item";
    return `${path}/item-${this.item.type}-sheet.html`;
  }

  /** @override */
  async getData() {
    const context = super.getData();
    const itemData = this.item.toObject(false);

    // Basic context setup
    context.editable = this.isEditable;
    context.owner = this.item.isOwner;
    context.system = itemData.system;
    context.flags = itemData.flags;
    context.config = CONFIG.ZWOLF;

    // Process granted abilities
    itemData.system.grantedAbilities = ItemDataProcessor.validateGrantedAbilities(
      itemData.system.grantedAbilities
    );

    // Enrich granted abilities descriptions
    itemData.system.grantedAbilities = await HtmlEnricher.enrichGrantedAbilities(
      itemData.system.grantedAbilities,
      this.item
    );

    // Handle knacks calculation for ancestries and talents
    if (['ancestry', 'talent'].includes(this.item.type) && this.item.system.required) {
      const totalKnacksProvided = ItemDataProcessor.calculateKnacksProvided(
        itemData.system.knackMenus || []
      );
      itemData.system.knacksProvided = totalKnacksProvided;
      context.calculatedKnacksProvided = totalKnacksProvided;
    }

    // Handle item-type specific data
    await this._processItemSpecificData(context, itemData);

    // Enrich main description
    context.enrichedDescription = await HtmlEnricher.enrichContent(
      this.item.system.description || "",
      this.item,
      "main description"
    );

    // Enrich required field for ancestries and talents
    if (['ancestry', 'talent'].includes(this.item.type) && this.item.system.required) {
      context.enrichedRequired = await HtmlEnricher.enrichContent(
        this.item.system.required,
        this.item,
        "required field"
      );
    }

    return context;
  }

  /**
   * Process item-type specific data
   * @param {Object} context - Sheet context
   * @param {Object} itemData - Item data
   * @private
   */
  async _processItemSpecificData(context, itemData) {
    switch (this.item.type) {
      case 'track':
        await this._processTrackData(context, itemData);
        break;
      case 'ancestry':
        await this._processAncestryData(context, itemData);
        break;
    }
  }

  /**
   * Process track-specific data
   * @param {Object} context - Sheet context
   * @param {Object} itemData - Item data
   * @private
   */
  async _processTrackData(context, itemData) {
    if (itemData.system.tiers) {
      itemData.system.tiers = await HtmlEnricher.enrichAllTrackTiers(
        itemData.system.tiers,
        this.item
      );
    }
  }

  /**
   * Process ancestry-specific data
   * @param {Object} context - Sheet context
   * @param {Object} itemData - Item data
   * @private
   */
  async _processAncestryData(context, itemData) {
    if (itemData.system.knackMenus) {
      itemData.system.knackMenus = await HtmlEnricher.enrichKnackMenus(
        itemData.system.knackMenus,
        this.item
      );
    }
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    if (!this.options.editable) return;

    // Granted abilities management
    html.on('click', '[data-action="add-ability"]', this._onAddAbility.bind(this));
    html.on('click', '[data-action="delete-ability"]', this._onDeleteAbility.bind(this));
    html.on('change', 'input[name*="system.grantedAbilities"], textarea[name*="system.grantedAbilities"], select[name*="system.grantedAbilities"]', 
      this._onAbilityFieldChange.bind(this));

    // Knack menus (ancestry only)
    html.on('click', '[data-action="add-knack-menu"]', this._onAddKnackMenu.bind(this));
    html.on('click', '[data-action="delete-knack-menu"]', this._onDeleteKnackMenu.bind(this));
    html.on('change', 'input[name*="knackMenus"][name*="selectionCount"]', 
      this._onKnackMenuSelectionCountChange.bind(this));

    // Function testing for fundaments
    html.on('click', '#test-functions', this._onTestFunctions.bind(this));

    // Track-specific listeners
    if (this.item.type === 'track') {
      this._activateTrackListeners(html);
    }

    // Lock handling
    this._handleLockState(html);
  }

  /**
   * Activate track-specific listeners
   * @param {jQuery} html - The sheet HTML
   * @private
   */
  _activateTrackListeners(html) {
    html.on('click', '[data-action="add-tier-ability"]', this._onAddTierAbility.bind(this));
    html.on('click', '[data-action="delete-tier-ability"]', this._onDeleteTierAbility.bind(this));
    html.on('change', 'input[name*="tiers.tier"][name*="grantedAbilities"], select[name*="tiers.tier"][name*="grantedAbilities"]', 
      this._onTierAbilityFieldChange.bind(this));
  }

  /**
   * Handle lock state for items
   * @param {jQuery} html - The sheet HTML
   * @private
   */
  _handleLockState(html) {
    const isLocked = this.item.actor && this.item.getFlag('zwolf-epic', 'locked');
    const isEquipment = this.item.type === 'equipment';

    if (isLocked && !isEquipment) {
      html.find('input, select, textarea').prop('disabled', true);
      html.find('button').not('.close').prop('disabled', true);
    }
  }

  /** @override */
  async render(force, options) {
    // Always force getData refresh when rendering
    if (this._state === Application.RENDER_STATES.RENDERED) {
      this._data = null;
    }
    return super.render(force, options);
  }

  /** @override */
  async _onEditorSave(target, element, content) {
    // Try to handle with our specialized handler first
    const handled = await EditorSaveHandler.handleEditorSave(this.item, target, element, content);
    
    if (!handled) {
      // Fall back to parent method for other fields
      return super._onEditorSave(target, element, content);
    }
  }

  /** @override */
  async _updateObject(event, formData) {
    console.log("=== UPDATE OBJECT DEBUG ===");
    console.log("Form data keys:", Object.keys(formData));
    console.log("Item type:", this.item.type);
    
    // Process form data based on item type
    if (this.item.type === 'track') {
      // Only process granted abilities if we actually have granted ability form data
      const hasGrantedAbilityData = Object.keys(formData).some(key => 
        key.includes('grantedAbilities') && !key.includes('tiers.tier')
      );
      
      if (hasGrantedAbilityData) {
        formData = ItemDataProcessor.preserveGrantedAbilities(formData, this.item.system.grantedAbilities);
      }
      
      // Handle track tier abilities
      formData = ItemDataProcessor.preserveTrackTierAbilities(formData, this.item.system);
    } else {
      // For non-track items, use the full preservation logic
      formData = ItemDataProcessor.preserveGrantedAbilities(formData, this.item.system.grantedAbilities);
    }
    
    // Handle multi-select fields (only sizeOptions now)
    ItemDataProcessor.processMultiSelectFields(this.form, formData);

    console.log("Final form data before parent update:", formData);

    // Call the parent update
    const result = await super._updateObject(event, formData);
    
    // Update knacksProvided after form submission for ancestry items
    if (this.item.type === 'ancestry') {
      await this.item.updateKnacksProvided();
    }
    
    return result;
  }

  /* -------------------------------------------- */
  /* Event Handlers                              */
  /* -------------------------------------------- */

  /**
   * Handle adding a new granted ability
   * @param {Event} event - The originating click event
   * @private
   */
  async _onAddAbility(event) {
    event.preventDefault();
    await this.item.addGrantedAbility();
  }

  /**
   * Handle deleting a granted ability
   * @param {Event} event - The originating click event
   * @private
   */
  async _onDeleteAbility(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.abilityIndex);
    await this.item.removeGrantedAbility(index);
  }

  /**
   * Handle changes to granted ability fields
   * @param {Event} event - The originating change event
   * @private
   */
  async _onAbilityFieldChange(event) {
    event.preventDefault();
    const input = event.currentTarget;
    const field = input.name;
    
    // Extract ability index and field name from input name
    const match = field.match(/system\.grantedAbilities\.(\d+)\.(.+)/);
    if (!match) return;
    
    const abilityIndex = parseInt(match[1]);
    const fieldName = match[2];
    
    // Skip description fields - they're handled by the editor system
    if (fieldName === 'description') return;
    
    await this.item.updateGrantedAbilityField(abilityIndex, fieldName, input.value);
  }

  /**
   * Handle adding a new knack menu
   * @param {Event} event - The originating click event
   * @private
   */
  async _onAddKnackMenu(event) {
    event.preventDefault();
    await this.item.addKnackMenu();
  }

  /**
   * Handle deleting a knack menu
   * @param {Event} event - The originating click event
   * @private
   */
  async _onDeleteKnackMenu(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.menuIndex);
    await this.item.removeKnackMenu(index);
  }

  /**
   * Handle changes to knack menu selection counts
   * @param {Event} event - The originating change event
   * @private
   */
  async _onKnackMenuSelectionCountChange(event) {
    // Let the normal form handling take care of the update first
    setTimeout(async () => {
      await this.item.updateKnacksProvided();
    }, 100);
  }

  /**
   * Handle adding a new tier ability
   * @param {Event} event - The originating click event
   * @private
   */
  async _onAddTierAbility(event) {
    event.preventDefault();
    const tier = parseInt(event.currentTarget.dataset.tier);
    await this.item.addTierAbility(tier);
  }

  /**
   * Handle deleting a tier ability
   * @param {Event} event - The originating click event
   * @private
   */
  async _onDeleteTierAbility(event) {
    event.preventDefault();
    const tier = parseInt(event.currentTarget.dataset.tier);
    const abilityIndex = parseInt(event.currentTarget.dataset.abilityIndex);
    await this.item.removeTierAbility(tier, abilityIndex);
  }

  /**
   * Handle changes to tier ability fields
   * @param {Event} event - The originating change event
   * @private
   */
  async _onTierAbilityFieldChange(event) {
    event.preventDefault();
    const input = event.currentTarget;
    const field = input.name;
    
    const match = field.match(/system\.tiers\.tier(\d+)\.grantedAbilities\.(\d+)\.(.+)/);
    if (!match) return;
    
    const tier = parseInt(match[1]);
    const abilityIndex = parseInt(match[2]);
    const fieldName = match[3];
    
    await this.item.updateTierAbilityField(tier, abilityIndex, fieldName, input.value);
  }

  /**
   * Handle testing fundament functions
   * @param {Event} event - The originating click event
   * @private
   */
  async _onTestFunctions(event) {
    event.preventDefault();
    
    const testLevel = parseInt(document.getElementById('test-level').value) || 1;
    const testVitalityBoost = parseInt(document.getElementById('test-vitality-boost').value) || 0;
    const resultsDiv = document.getElementById('function-test-results');
    
    // Test the functions using the item's method
    const results = this.item.testFunctions({
      level: testLevel,
      vitalityBoostCount: testVitalityBoost
    });
    
    // Display results
    let html = `<div class="test-result"><strong>Test Results for Level ${results.level}, Vitality Boosts: ${results.vitalityBoosts}:</strong></div>`;
    
    if (results.vitality !== undefined) {
      html += `<div class="test-result vitality">Vitality Points: ${results.vitality}</div>`;
    } else if (results.vitalityError) {
      html += `<div class="test-result error">Vitality Function Error: ${results.vitalityError}</div>`;
    }
    
    if (results.coast !== undefined) {
      html += `<div class="test-result coast">Coast Number: ${results.coast}</div>`;
    } else if (results.coastError) {
      html += `<div class="test-result error">Coast Function Error: ${results.coastError}</div>`;
    }
    
    resultsDiv.innerHTML = html;
  }
}
