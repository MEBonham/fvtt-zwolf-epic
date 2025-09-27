import { ItemDataProcessor } from "../helpers/item-data-processor.mjs";
import { HtmlEnricher } from "../helpers/html-enricher.mjs";
import { EditorSaveHandler } from "../helpers/editor-save-handler.mjs";
import { calculateVitality, calculateCoast } from "../helpers/calculations.js";

/**
 * Z-Wolf Epic Item Sheet using V2 Application Framework
 * Extend the basic ItemSheetV2 with Z-Wolf Epic modifications
 * @extends {foundry.applications.sheets.ItemSheetV2}
 */
export default class ZWolfItemSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ItemSheetV2
) {
    _activeTab = "summary";
  
  static DEFAULT_OPTIONS = {
    classes: ["zwolf-epic", "sheet", "item"],
    position: { 
      width: 700, 
      height: 600
    },
    window: {
      resizable: true,
      minimizable: true
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  static PARTS = {
    header: {
      template: "systems/zwolf-epic/templates/item/parts/item-header.hbs"
    },
    tabs: {
      template: "systems/zwolf-epic/templates/item/parts/item-tabs.hbs"
    },
    summary: {
      template: "systems/zwolf-epic/templates/item/parts/item-summary.hbs"  // NEW
    },
    basics: {
      template: "systems/zwolf-epic/templates/item/parts/item-basics.hbs"
    },
    abilities: {
      template: "systems/zwolf-epic/templates/item/parts/item-abilities.hbs"
    },
    formulae: {
      template: "systems/zwolf-epic/templates/item/parts/item-formulae.hbs"
    },
    effects: {
      template: "systems/zwolf-epic/templates/item/parts/item-effects.hbs"
    },
    tiers: {
      template: "systems/zwolf-epic/templates/item/parts/item-tiers.hbs"
    }
  };

  /** @override */
  get title() {
    return `${this.document.name} [${this.document.type.titleCase()}]`;
  }

  /** @override */
  async _prepareContext(options) {
    console.log("_prepareContext called for item type:", this.document.type);
    
    const context = await super._prepareContext(options);
    const itemData = this.document.toObject(false);

    // Basic context setup
    const preparedContext = foundry.utils.mergeObject(context, {
      editable: this.isEditable,
      owner: this.document.isOwner,
      system: itemData.system,
      flags: itemData.flags,
      config: CONFIG.ZWOLF,
      
      // Item-specific data
      item: this.document,
      itemType: this.document.type,
      
      // Lock state
      isLocked: this.document.actor && this.document.getFlag('zwolf-epic', 'locked'),
      isEquipment: this.document.type === 'equipment'
    });
  
    // Prepare data for Summary tab
    await this._prepareSummaryData(preparedContext, itemData);
    
    // Only validate/auto-fill if we're not in the middle of a deletion operation
    if (!this._skipAbilityValidation) {
      itemData.system.grantedAbilities = ItemDataProcessor.validateGrantedAbilities(
        itemData.system.grantedAbilities
      );
    } else {
      console.log("Skipping ability validation due to deletion operation");
    }
    
    console.log("After validateGrantedAbilities:", itemData.system.grantedAbilities);

    // FIXED: Debug the HTML enricher that's causing the empty array
    console.log("Before HtmlEnricher.enrichGrantedAbilities:", itemData.system.grantedAbilities);
    console.log("Type before enricher:", typeof itemData.system.grantedAbilities, Array.isArray(itemData.system.grantedAbilities));
    
    // Enrich granted abilities descriptions
    itemData.system.grantedAbilities = await HtmlEnricher.enrichGrantedAbilities(
      itemData.system.grantedAbilities,
      this.document
    );
    
    console.log("After HtmlEnricher.enrichGrantedAbilities:", itemData.system.grantedAbilities);
    console.log("Type after enricher:", typeof itemData.system.grantedAbilities, Array.isArray(itemData.system.grantedAbilities));

    // Handle knacks calculation for ancestries and talents
    if (['ancestry', 'talent'].includes(this.document.type) && this.document.system.required) {
      const totalKnacksProvided = ItemDataProcessor.calculateKnacksProvided(
        itemData.system.knackMenus || []
      );
      itemData.system.knacksProvided = totalKnacksProvided;
      preparedContext.calculatedKnacksProvided = totalKnacksProvided;
    }

    // Convert grantedAbilities object to array for Handlebars iteration
    if (itemData.system.grantedAbilities && typeof itemData.system.grantedAbilities === 'object') {
      console.log("=== ABILITIES DEBUG ===");
      console.log("Raw abilities:", itemData.system.grantedAbilities);
      console.log("Abilities type:", typeof itemData.system.grantedAbilities);
      console.log("Object.entries result:", Object.entries(itemData.system.grantedAbilities));
      
      // Create a proper dense array instead of sparse array
      const abilitiesArray = [];
      
      // FIXED: Handle both array and object formats properly
      if (Array.isArray(itemData.system.grantedAbilities)) {
        console.log("Processing as array");
        itemData.system.grantedAbilities.forEach((ability, index) => {
          if (ability) {
            console.log(`Processing array ability at index ${index}:`, ability);
            abilitiesArray.push({
              ...ability,
              index: index,
              originalIndex: index,
              enrichedDescription: ability.enrichedDescription || ability.description || "",
              nameTarget: `system.grantedAbilities.${index}.name`,
              typeTarget: `system.grantedAbilities.${index}.type`,
              tagsTarget: `system.grantedAbilities.${index}.tags`,
              descriptionTarget: `system.grantedAbilities.${index}.description`,
              deleteAction: "delete-ability"
            });
          }
        });
      } else {
        console.log("Processing as object");
        for (const [key, ability] of Object.entries(itemData.system.grantedAbilities)) {
          console.log(`Processing object entry - key: ${key}, ability:`, ability);
          const index = parseInt(key);
          console.log(`Parsed index: ${index}, isNaN: ${isNaN(index)}, ability exists: ${!!ability}`);
          
          if (!isNaN(index) && ability && typeof ability === 'object') {
            console.log(`Adding ability at index ${index} to array`);
            
            // Enrich the ability description for the editor
            const enrichedDescription = await HtmlEnricher.enrichContent(
              ability.description || "",
              this.document,
              `ability ${index} description`
            );
            
            // Add the ability with its original index preserved and proper editor targets
            abilitiesArray.push({
              ...ability,
              index: index, // Use 'index' instead of 'originalIndex' for template compatibility
              originalIndex: index,
              enrichedDescription: enrichedDescription,
              nameTarget: `system.grantedAbilities.${index}.name`,
              typeTarget: `system.grantedAbilities.${index}.type`,
              tagsTarget: `system.grantedAbilities.${index}.tags`,
              descriptionTarget: `system.grantedAbilities.${index}.description`,
              deleteAction: "delete-ability"
            });
          } else {
            console.log(`Skipping entry - key: ${key}, parsed index: ${index}, ability:`, ability);
          }
        }
      }
      
      // Sort by original index to maintain order
      abilitiesArray.sort((a, b) => a.originalIndex - b.originalIndex);
      
      console.log("Converted abilities array:", abilitiesArray);
      console.log("Array length:", abilitiesArray.length);
      
      // Add the array version for template use, keep original object for form submission
      preparedContext.grantedAbilitiesArray = abilitiesArray;
    } else {
      console.log("No grantedAbilities found or not an object");
      preparedContext.grantedAbilitiesArray = [];
    }

    // Handle item-type specific data
    await this._processItemSpecificData(preparedContext, itemData);

    // Enrich main description
    preparedContext.enrichedDescription = await HtmlEnricher.enrichContent(
      this.document.system.description || "",
      this.document,
      "main description"
    );

    // Enrich required field for ancestries and talents
    if (['ancestry', 'talent'].includes(this.document.type) && this.document.system.required) {
      preparedContext.enrichedRequired = await HtmlEnricher.enrichContent(
        this.document.system.required,
        this.document,
        "required field"
      );
    }

    console.log("Context prepared:", preparedContext);
    return preparedContext;
  }

  /**
   * Process item-type specific data
   * @param {Object} context - Sheet context
   * @param {Object} itemData - Item data
   * @private
   */
  async _processItemSpecificData(context, itemData) {
    switch (this.document.type) {
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
    // Process tags
    if (Array.isArray(itemData.system.tags)) {
      context.tagsString = itemData.system.tags.join(', ');
    } else {
      context.tagsString = itemData.system.tags || '';
    }
    
    if (itemData.system.tiers) {
      for (const [tierKey, tierData] of Object.entries(itemData.system.tiers)) {
        // Enrich talent menu as a string
        tierData.enrichedTalentMenu = await HtmlEnricher.enrichContent(
          tierData.talentMenu || "",
          this.document,
          `${tierKey} talent menu`
        );
        
        // Process tier granted abilities
        if (tierData.grantedAbilities) {
          tierData.grantedAbilities = await HtmlEnricher.enrichGrantedAbilities(
            tierData.grantedAbilities,
            this.document,
            `${tierKey} abilities`
          );
        }
      }
    }
  }

  async _processTalentData(context, itemData) {
    // Process tags arrays to comma-separated strings for display
    if (Array.isArray(itemData.system.tags)) {
      context.tagsString = itemData.system.tags.join(', ');
    } else {
      context.tagsString = itemData.system.tags || '';
    }
    
    if (Array.isArray(itemData.system.characterTags)) {
      context.characterTagsString = itemData.system.characterTags.join(', ');
    } else {
      context.characterTagsString = itemData.system.characterTags || '';
    }
    
    // Calculate knacks provided if needed
    if (this.document.system.required) {
      const totalKnacksProvided = ItemDataProcessor.calculateKnacksProvided(
        itemData.system.knackMenus || []
      );
      itemData.system.knacksProvided = totalKnacksProvided;
      context.calculatedKnacksProvided = totalKnacksProvided;
    }
  }

  /**
   * Process ancestry-specific data
   * @param {Object} context - Sheet context
   * @param {Object} itemData - Item data
   * @private
   */
  async _processAncestryData(context, itemData) {
    // Process tags
    if (Array.isArray(itemData.system.tags)) {
      context.tagsString = itemData.system.tags.join(', ');
    } else {
      context.tagsString = itemData.system.tags || '';
    }
    
    if (Array.isArray(itemData.system.characterTags)) {
      context.characterTagsString = itemData.system.characterTags.join(', ');
    } else {
      context.characterTagsString = itemData.system.characterTags || '';
    }
    
    // Enrich knack menu string
    context.enrichedKnackMenu = await HtmlEnricher.enrichContent(
      itemData.system.knackMenu || "",
      this.document,
      "knack menu"
    );
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

/** @override */
_attachPartListeners(partId, htmlElement, options) {
  console.log(`_attachPartListeners called for part: ${partId}`);
  console.log("htmlElement:", htmlElement);
  console.log("V2 form options:", this.options.form);
  console.log("Document:", this.document);
  
  super._attachPartListeners(partId, htmlElement, options);
  
  // Add debugging for form events
  if (partId === "formulae") {
    const selects = htmlElement.querySelectorAll('select');
    console.log(`Found ${selects.length} select elements in formulae part`);
    
    selects.forEach(select => {
      console.log(`Select: ${select.name} = ${select.value}`);
      
      // Test if manual events work
      select.addEventListener('change', (event) => {
        console.log("MANUAL CHANGE EVENT:", event.target.name, event.target.value);
      });
    });
  }

  if (!this.isEditable) {
    console.log("Sheet not editable, skipping listeners");
    return;
  }

  console.log(`Attaching universal listeners for part: ${partId}`);
  this._attachUniversalFormListeners(htmlElement);
  console.log(`Finished attaching universal listeners for part: ${partId}`);

    // Your existing part-specific listeners
    switch (partId) {
      case "abilities":
        this._attachAbilityListeners(htmlElement);
        break;
      case "basics":
        this._attachBasicsListeners(htmlElement);
        break;
      case "formulae":
        this._attachFormulaeListeners(htmlElement);
        break;
      case "effects":
        this._attachEffectsListeners(htmlElement);
        break;
      case "tiers":
        this._activateTrackListeners(htmlElement);
        break;
      case "summary":
        this._attachSummaryListeners(htmlElement);
        break;
    }

    // CRITICAL: Handle image picker for header part
    if (partId === "header") {
      this._attachImagePicker(htmlElement);
    }

    // Handle lock state
    this._handleLockState(htmlElement);
  }

  /**
   * Attach ability-related listeners
   */
  _attachAbilityListeners(html) {
    console.log("=== ATTACHING ABILITY LISTENERS ===");
    
    // Granted abilities management
    const addButtons = html.querySelectorAll('[data-action="add-ability"]');
    console.log("Found add-ability buttons:", addButtons.length);
    addButtons.forEach(btn => {
      btn.addEventListener('click', this._onAddAbility.bind(this));
    });
    
    // FIXED: Properly bind delete button listeners
    const deleteButtons = html.querySelectorAll('[data-action="delete-ability"]');
    console.log("Found delete-ability buttons:", deleteButtons.length);
    deleteButtons.forEach(btn => {
      console.log("Binding delete button for ability index:", btn.dataset.abilityIndex);
      btn.addEventListener('click', this._onDeleteAbility.bind(this));
    });
    
    const abilityInputs = html.querySelectorAll('input[name*="system.grantedAbilities"], textarea[name*="system.grantedAbilities"], select[name*="system.grantedAbilities"]');
    console.log("Found ability inputs:", abilityInputs.length);
    abilityInputs.forEach(input => {
      input.addEventListener('change', this._onAbilityFieldChange.bind(this));
    });

    // Track-specific listeners (if this part also handles track abilities)
    if (this.document.type === 'track') {
      this._activateTrackListeners(html);
    }
    
    console.log("=== ABILITY LISTENERS ATTACHED ===");
  }

  /**
   * Attach formulae-related listeners (fundaments only)
   */
  _attachFormulaeListeners(html) {
    // Function testing for fundaments
    const testButton = html.querySelector('#test-functions');
    if (testButton) {
      testButton.addEventListener('click', this._onTestFunctions.bind(this));
    }
  }

  /**
   * Attach basics-related listeners  
   */
  _attachBasicsListeners(html) {
    // Knack menus (ancestry only)
    html.querySelectorAll('[data-action="add-knack-menu"]').forEach(btn => {
      btn.addEventListener('click', this._onAddKnackMenu.bind(this));
    });
    
    html.querySelectorAll('[data-action="delete-knack-menu"]').forEach(btn => {
      btn.addEventListener('click', this._onDeleteKnackMenu.bind(this));
    });
    
    html.querySelectorAll('input[name*="knackMenus"][name*="selectionCount"]').forEach(input => {
      input.addEventListener('change', this._onKnackMenuSelectionCountChange.bind(this));
    });
  }

  /**
   * Attach effects-related listeners
   */
  _attachEffectsListeners(html) {
    // Effect management would go here if needed
    // Currently handled by core Foundry systems
  }

  /**
   * Activate track-specific listeners
   * @param {HTMLElement} html - The sheet HTML
   * @private
   */
  _activateTrackListeners(html) {
    html.querySelectorAll('[data-action="add-tier-ability"]').forEach(btn => {
      btn.addEventListener('click', this._onAddTierAbility.bind(this));
    });
    
    html.querySelectorAll('[data-action="delete-tier-ability"]').forEach(btn => {
      btn.addEventListener('click', this._onDeleteTierAbility.bind(this));
    });
    
    html.querySelectorAll('input[name*="tiers.tier"][name*="grantedAbilities"], select[name*="tiers.tier"][name*="grantedAbilities"]').forEach(input => {
      input.addEventListener('change', this._onTierAbilityFieldChange.bind(this));
    });
  }

  /**
   * Handle lock state for items
   * @param {HTMLElement} html - The sheet HTML
   * @private
   */
  _handleLockState(html) {
    const isLocked = this.document.actor && this.document.getFlag('zwolf-epic', 'locked');
    const isEquipment = this.document.type === 'equipment';

    if (isLocked && !isEquipment) {
      html.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
      html.querySelectorAll('button').forEach(btn => {
        if (!btn.classList.contains('close')) btn.disabled = true;
      });
    }
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  /** @override */
  async _onSubmitForm(formConfig, event, formData) {
    console.log("=== V2 FORM SUBMISSION DEBUG ===");
    
    let submitData = formData?.object || formData || {};
    
    if (!submitData || Object.keys(submitData).length === 0) {
      if (event?.target) {
        const form = event.target.form || event.target.closest('form');
        if (form) {
          const fd = new FormData(form);
          const extracted = Object.fromEntries(fd.entries());
          console.log("Extracted form data:", extracted);
          
          // IMPORTANT: Don't use expandObject yet, keep it flat for processing
          submitData = extracted;
        }
      }
    }
    
    if (!submitData || Object.keys(submitData).length === 0) {
      console.warn("No form data to process");
      return;
    }
    
    const form = event?.target?.form || event?.target?.closest('form');
    
    // Store scroll position before any changes
    const scrollContainer = this.element.querySelector('.window-content');
    const scrollTop = scrollContainer?.scrollTop || 0;
    
    // Convert number fields explicitly while data is still flat
    if (form) {
      const numberInputs = form.querySelectorAll('input[data-dtype="Number"], input[type="number"]');
      
      numberInputs.forEach(input => {
        const fieldPath = input.name;
        if (submitData[fieldPath] !== null && submitData[fieldPath] !== undefined && submitData[fieldPath] !== '') {
          const parsedValue = Number(submitData[fieldPath]);
          const finalValue = input.step && input.step !== '1' ? parsedValue : Math.floor(parsedValue);
          submitData[fieldPath] = isNaN(finalValue) ? 0 : finalValue;
          console.log(`Converted ${fieldPath} to number:`, submitData[fieldPath]);
        }
      });
    }
    
    // Handle multi-select fields BEFORE expanding
    if (form) {
      ItemDataProcessor.processMultiSelectFields(form, submitData);
    }
    
    // NOW expand the object
    submitData = foundry.utils.expandObject(submitData);
    console.log("Expanded submitData:", submitData);
    
    // Check if this form submission includes any granted abilities data  
    const flatKeys = Object.keys(foundry.utils.flattenObject(submitData));
    const hasGrantedAbilityData = flatKeys.some(key => key.includes('grantedAbilities'));
    
    // Only process granted abilities if they're actually being edited
    if (hasGrantedAbilityData) {
      if (this.document.type === 'track') {
        const hasBaseAbilityData = flatKeys.some(key => 
          key.includes('grantedAbilities') && !key.includes('tiers.tier')
        );
        
        if (hasBaseAbilityData) {
          submitData = ItemDataProcessor.preserveGrantedAbilities(submitData, this.document.system.grantedAbilities);
        }
        
        submitData = ItemDataProcessor.preserveTrackTierAbilities(submitData, this.document.system);
      } else {
        submitData = ItemDataProcessor.preserveGrantedAbilities(submitData, this.document.system.grantedAbilities);
      }
    }

    console.log("Final form data before update:", submitData);

    try {
      await this.document.update(submitData, { 
        render: false,
        diff: true
      });
      console.log("Document updated successfully");
      
      // Restore scroll position after the update
      if (scrollContainer) {
        requestAnimationFrame(() => {
          scrollContainer.scrollTop = scrollTop;
        });
      }
    } catch (error) {
      console.error("Failed to update document:", error);
      ui.notifications.error("Failed to save changes: " + error.message);
    }
  }

  /* -------------------------------------------- */
  /*  Event Handler Methods                       */
  /* -------------------------------------------- */

  /**
   * Handle adding a new granted ability
   * @param {Event} event - The originating click event
   * @private
   */
  async _onAddAbility(event) {
    event.preventDefault();
    console.log("Before adding ability:");
    console.log("Current abilities:", JSON.stringify(this.document.system.grantedAbilities, null, 2));
    
    try {
      await this.document.addGrantedAbility();
      console.log("After adding ability:");
      console.log("New abilities:", JSON.stringify(this.document.system.grantedAbilities, null, 2));
    } catch (error) {
      console.error("Failed to add ability:", error);
    }
  }

  /**
   * Handle deleting a granted ability
   * @param {Event} event - The originating click event
   * @private
   */
  async _onDeleteAbility(event) {
    event.preventDefault();
    console.log("=== DELETE ABILITY DEBUG ===");
    console.log("Event target:", event.currentTarget);
    console.log("Dataset:", event.currentTarget.dataset);
    
    const index = parseInt(event.currentTarget.dataset.abilityIndex);
    console.log("Parsed index:", index);
    
    if (isNaN(index)) {
      console.error("Invalid ability index for deletion:", event.currentTarget.dataset.abilityIndex);
      ui.notifications.error("Invalid ability index");
      return;
    }
    
    try {
      console.log("=== BEFORE DELETION DEBUG ===");
      console.log("Current abilities:", JSON.stringify(this.document.system.grantedAbilities, null, 2));
      
      const currentAbilities = foundry.utils.deepClone(this.document.system.grantedAbilities || {});
      console.log("Cloned abilities:", JSON.stringify(currentAbilities, null, 2));
      
      // Check if the ability exists
      const stringIndex = index.toString();
      if (!currentAbilities.hasOwnProperty(stringIndex) && !currentAbilities.hasOwnProperty(index)) {
        console.warn("Ability at index", index, "does not exist in abilities object");
        console.log("Available indices:", Object.keys(currentAbilities));
        ui.notifications.warn("Ability not found at index " + index);
        return;
      }
      
      // Remove the ability - try both string and number keys
      if (currentAbilities.hasOwnProperty(stringIndex)) {
        delete currentAbilities[stringIndex];
        console.log("Deleted ability at string index:", stringIndex);
      } else if (currentAbilities.hasOwnProperty(index)) {
        delete currentAbilities[index];
        console.log("Deleted ability at numeric index:", index);
      }
      
      console.log("=== AFTER DELETION DEBUG ===");
      console.log("Abilities after deletion:", JSON.stringify(currentAbilities, null, 2));
      
      // FIXED: Use a more aggressive approach to force the update to stick
      const updateData = {
        "system.grantedAbilities": currentAbilities
      };
      console.log("Update data:", JSON.stringify(updateData, null, 2));
      
      // Method 1: Try direct database update with explicit diff
      const currentData = this.document.toObject();
      currentData.system.grantedAbilities = currentAbilities;
      
      console.log("Updating with explicit data replacement");
      const result = await this.document.update(updateData, {
        diff: false,  // Don't use diff, replace entirely
        recursive: false,  // Don't merge recursively
        render: false  // Don't auto-render yet
      });
      console.log("Update result:", result);
      
      // Force a complete data refresh and re-render
      await this.document._initialize();  // Force re-initialize from database
      
      // Wait a moment then manually re-render
      setTimeout(async () => {
        await this.render(true, { focus: false });  // Force full re-render
        
        console.log("=== POST-UPDATE VERIFICATION ===");
        console.log("Document abilities after forced update:", JSON.stringify(this.document.system.grantedAbilities, null, 2));
        
        // Verify the deletion actually stuck
        const stillExists = this.document.system.grantedAbilities && 
                          (this.document.system.grantedAbilities[index] || 
                           this.document.system.grantedAbilities[stringIndex]);
        
        if (stillExists) {
          console.error("Deletion failed - ability still exists after update");
          ui.notifications.error("Failed to delete ability - it was restored by the system");
        } else {
          console.log("Deletion successful - ability no longer exists");
          ui.notifications.info("Ability deleted successfully");
        }
      }, 100);
      
    } catch (error) {
      console.error("Failed to delete ability:", error);
      console.error("Error stack:", error.stack);
      ui.notifications.error("Failed to delete ability: " + error.message);
    }
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
    
    // Skip description fields - they're handled by the V2 editor system automatically
    if (fieldName === 'description') return;
    
    await this.document.updateGrantedAbilityField(abilityIndex, fieldName, input.value);
  }

  /**
   * Handle adding a new knack menu
   * @param {Event} event - The originating click event
   * @private
   */
  async _onAddKnackMenu(event) {
    event.preventDefault();
    await this.document.addKnackMenu();
  }

  /**
   * Handle deleting a knack menu
   * @param {Event} event - The originating click event
   * @private
   */
  async _onDeleteKnackMenu(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.menuIndex);
    await this.document.removeKnackMenu(index);
  }

  /**
   * Handle changes to knack menu selection counts
   * @param {Event} event - The originating change event
   * @private
   */
  async _onKnackMenuSelectionCountChange(event) {
    // Let the normal form handling take care of the update first
    setTimeout(async () => {
      await this.document.updateKnacksProvided();
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
    await this.document.addTierAbility(tier);
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
    await this.document.removeTierAbility(tier, abilityIndex);
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
    
    await this.document.updateTierAbilityField(tier, abilityIndex, fieldName, input.value);
  }

  /**
   * Handle testing fundament functions
   * @param {Event} event - The originating click event
   * @private
   */
  async _onTestFunctions(event) {
    event.preventDefault();
    
    const testLevel = parseInt(document.getElementById('test-level').value) || 3;
    const testVitalityBoost = parseInt(document.getElementById('test-vitality-boost').value) || 0;
    const resultsDiv = document.getElementById('function-test-results');
    
    // Get the current function selections from the form (or use defaults)
    const vitalityFunction = this.element.querySelector('select[name="system.vitalityFunction"]')?.value || 'standard';
    const coastFunction = this.element.querySelector('select[name="system.coastFunction"]')?.value || 'standard';
    
    let html = `<div class="test-result"><strong>Test Results for Level ${testLevel}, Vitality Boosts: ${testVitalityBoost}:</strong></div>`;
    
    try {
      // Calculate vitality using the selected function
      const vitality = calculateVitality(vitalityFunction, testLevel, {}, {}, testVitalityBoost);
      html += `<div class="test-result vitality">Vitality Points (${vitalityFunction}): ${vitality}</div>`;
    } catch (error) {
      html += `<div class="test-result error">Vitality Function Error: ${error.message}</div>`;
    }
    
    try {
      // Calculate coast using the selected function  
      const coast = calculateCoast(coastFunction, testLevel, {}, {});
      html += `<div class="test-result coast">Coast Number (${coastFunction}): ${coast}</div>`;
    } catch (error) {
      html += `<div class="test-result error">Coast Function Error: ${error.message}</div>`;
    }
    
    resultsDiv.innerHTML = html;
  }

  /* -------------------------------------------- */
  /*  Tab Navigation & Rendering                  */
  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    
    EditorSaveHandler.activateEditors(this);
    
    // Restore the previously active tab, or default to first tab
    const tabs = this.element.querySelector('.sheet-tabs');
    const firstTab = tabs?.querySelector('.item[data-tab]');
    const tabToActivate = this._activeTab || firstTab?.dataset.tab;
    
    if (tabToActivate) {
        this._activateTab(tabToActivate);
    }

    // Add tab click listeners
    this.element.querySelectorAll('.sheet-tabs .item[data-tab]').forEach(tab => {
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        this._activateTab(event.currentTarget.dataset.tab);
      });
    });
  
    // // Set up cleanup hooks
    // this._setupCleanupHooks();
  
    // Restore scroll if flagged
    if (this._scrollToRestore !== undefined) {
      const scrollTop = this._scrollToRestore;
      delete this._scrollToRestore;
      
      requestAnimationFrame(() => {
        const scrollableTab = this.element.querySelector('div.tab.configure');
        if (scrollableTab) {
          scrollableTab.scrollTop = scrollTop;
        }
      });
    }
  }

  /**
   * Activate a specific tab
   * @param {string} tabName - The tab to activate
   * @private
   */
  _activateTab(tabName) {
    this._activeTab = tabName; // Remember the active tab
    
    // Hide all tabs
    this.element.querySelectorAll('.tab').forEach(tab => tab.style.display = 'none');
    
    // Show the selected tab
    const activeTab = this.element.querySelector(`.tab[data-tab="${tabName}"]`);
    if (activeTab) {
        activeTab.style.display = 'block';
    }
    
    // Update tab navigation
    this.element.querySelectorAll('.sheet-tabs .item').forEach(nav => nav.classList.remove('active'));
    const activeNav = this.element.querySelector(`.sheet-tabs .item[data-tab="${tabName}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }
  }

  /** @override */
  async render(force, options) {
    // Always force getData refresh when rendering (V2 equivalent)
    if (this.rendered) {
      this._data = null;
    }
    return super.render(force, options);
  }

  /**
   * Attach image picker functionality to the header
   * @param {HTMLElement} html - The header HTML element
   * @private
   */
  _attachImagePicker(html) {
    const imgElement = html.querySelector('img[data-edit="img"]');
    if (imgElement) {
      imgElement.addEventListener('click', this._onEditImage.bind(this));
      // Make sure the image is clickable
      imgElement.style.cursor = 'pointer';
    }
  }

  /**
   * Handle clicking on the item image to open file picker
   * @param {Event} event - The originating click event
   * @private
   */
  async _onEditImage(event) {
    event.preventDefault();
    
    const current = this.document.img;
    const fp = new FilePicker({
      type: "image",
      current: current,
      callback: (path) => {
        this.document.update({ img: path });
      },
      top: this.position.top + 40,
      left: this.position.left + 10
    });
    
    return fp.browse();
  }
  
  // /**
  //  * Attach universal form submission listeners to all inputs
  //  * @param {HTMLElement} html - The HTML element to attach listeners to
  //  * @private
  //  */
  _attachUniversalFormListeners(html) {}

  // 4. Add new method for preparing summary-specific data
  /**
   * Prepare data specifically for the Summary tab
   * @param {Object} context - Sheet context
   * @param {Object} itemData - Item data
   * @private
   */
  async _prepareSummaryData(context, itemData) {
    // Helper function to safely get nested values
    const getSafeValue = (obj, path, defaultValue = null) => {
      return path.split('.').reduce((acc, part) => acc?.[part], obj) ?? defaultValue;
    };
    
    // Helper function to format tags (handles both arrays and strings)
    const formatTags = (tags) => {
      if (!tags) return '';
      if (Array.isArray(tags)) return tags.join(', ');
      return tags.toString();
    };
    
    // Format tags for display
    if (itemData.system.tags) {
      itemData.system.tags = formatTags(itemData.system.tags);
    }
    
    if (itemData.system.characterTags) {
      itemData.system.characterTags = formatTags(itemData.system.characterTags);
    }
    
    // Prepare type-specific summary data
    switch (this.document.type) {
      case 'track':
        // Process track tiers for summary display
        if (itemData.system.tiers) {
          context.tiersProcessed = {};
          for (const [tierKey, tierData] of Object.entries(itemData.system.tiers)) {
            const tierNum = tierKey.replace('tier', '');
            
            // Format tier character tags
            if (tierData.characterTags) {
              tierData.characterTags = formatTags(tierData.characterTags);
            }
            
            context.tiersProcessed[tierNum] = {
              talentMenu: tierData.talentMenu || '',
              enrichedTalentMenu: await HtmlEnricher.enrichContent(
                tierData.talentMenu || "",
                this.document,
                `${tierKey} talent menu summary`
              ),
              characterTags: tierData.characterTags || '',
              sideEffects: tierData.sideEffects || {},
              grantedAbilitiesCount: tierData.grantedAbilities ? 
                Object.keys(tierData.grantedAbilities).length : 0
            };
          }
        }
        break;
        
      case 'equipment':
        // Format equipment placement for summary
        if (itemData.system.placement) {
          context.placementFormatted = CONFIG.ZWOLF?.placements?.[itemData.system.placement] || 
                                      itemData.system.placement;
        }
        if (itemData.system.requiredPlacement) {
          context.requiredPlacementFormatted = CONFIG.ZWOLF?.placements?.[itemData.system.requiredPlacement] || 
                                              itemData.system.requiredPlacement;
        }
        break;
        
      case 'ancestry':
        // Format size options for summary
        if (itemData.system.sizeOptions && Array.isArray(itemData.system.sizeOptions)) {
          context.formattedSizeOptions = itemData.system.sizeOptions
            .map(size => CONFIG.ZWOLF?.sizes?.[size] || size)
            .join(', ');
        }
        break;
    }
    
    // Count granted abilities for summary
    if (itemData.system.grantedAbilities) {
      const abilities = itemData.system.grantedAbilities;
      if (typeof abilities === 'object') {
        const validAbilities = Object.values(abilities).filter(a => a && a.name);
        context.grantedAbilitiesCount = validAbilities.length;
        
        // Group abilities by type for summary
        context.abilitiesByType = {
          active: validAbilities.filter(a => a.type === 'active').length,
          passive: validAbilities.filter(a => a.type === 'passive').length,
          reaction: validAbilities.filter(a => a.type === 'reaction').length
        };
      }
    }
    
    // Process side effects for summary display
    if (itemData.system.sideEffects) {
      context.hasSideEffects = Object.values(itemData.system.sideEffects)
        .some(v => v !== null && v !== undefined && v !== '' && v !== 0);
      
      // Add formatted granted proficiency for display
      if (itemData.system.sideEffects.grantedProficiency) {
        const profKey = itemData.system.sideEffects.grantedProficiency;
        const proficiency = CONFIG.ZWOLF.proficiencies[profKey];
        if (proficiency) {
          context.grantedProficiencyLabel = game.i18n.localize(proficiency.label);
          context.grantedProficiencyType = proficiency.type;
        }
      }
    }
    
    // Format tags for summary (ensure they're always arrays or strings)
    if (itemData.system.tags) {
      context.formattedTags = Array.isArray(itemData.system.tags) ? 
        itemData.system.tags.join(', ') : itemData.system.tags;
    }
    
    if (itemData.system.characterTags) {
      context.formattedCharacterTags = Array.isArray(itemData.system.characterTags) ? 
        itemData.system.characterTags.join(', ') : itemData.system.characterTags;
    }
    
    // Add computed values for summary
    context.summaryData = {
      hasAbilities: context.grantedAbilitiesCount > 0,
      hasEffects: (this.document.effects?.size || 0) > 0,
      hasTiers: this.document.type === 'track' && itemData.system.tiers,
      hasDescription: !!itemData.system.description,
      hasRequirements: !!itemData.system.required,
      hasSideEffects: context.hasSideEffects
    };
  }

  // 6. Add summary listeners method (minimal since it's read-only)
  /**
   * Attach summary-related listeners
   * @param {HTMLElement} html - The sheet HTML
   * @private
   */
  _attachSummaryListeners(html) {
    // Summary is read-only, but we might want collapsible sections
    html.querySelectorAll('.summary-section h3').forEach(header => {
      header.style.cursor = 'pointer';
      header.addEventListener('click', (event) => {
        const section = event.currentTarget.closest('.summary-section');
        section.classList.toggle('collapsed');
      });
    });
    
    // Add click-to-copy for item ID
    const idElement = html.querySelector('.item-id .summary-value');
    if (idElement) {
      idElement.style.cursor = 'pointer';
      idElement.title = 'Click to copy ID';
      idElement.addEventListener('click', async (event) => {
        const id = event.currentTarget.textContent;
        await navigator.clipboard.writeText(id);
        ui.notifications.info(`Copied item ID: ${id}`);
      });
    }
  }
}