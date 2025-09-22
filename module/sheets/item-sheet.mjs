const TextEditorImpl = foundry.applications.ux.TextEditor.implementation;

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class ZWolfItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["zwolf-epic", "sheet", "item"],
      width: 700, // Increased width from 520
      height: 600, // Increased height for new tabs
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "basics" }],
      scrollY: [".sheet-body"]
    });
  }

  /** @override */
  get template() {
    const path = "systems/zwolf-epic/templates/item";
    return `${path}/item-${this.item.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
  // console.log("=== GETDATA DEBUG ===");
  // console.log("Before super.getData() - item.system.tags:", this.item.system.tags);
  // console.log("Item type:", this.item.type);
  
  const context = super.getData();
  
  // console.log("After super.getData() - item.system.tags:", this.item.system.tags);
  // console.log("Context data tags:", context.data?.tags);
  
// // Fix array corruption that occurs in super.getData()
// const fixArrayCorruption = (obj) => {
//   for (const [key, value] of Object.entries(obj || {})) {
//     if (Array.isArray(value)) {
//       // Fix corrupted array elements
//       for (let i = 0; i < value.length; i++) {
//         if (value[i] && typeof value[i] === 'string' && value[i].includes('[object Object]')) {
//           // Split on corruption and rejoin properly
//           const parts = value[i].split('[object Object]').filter(part => part.trim().length > 0);
//           value.splice(i, 1, ...parts);
//         }
//       }
//     } else if (typeof value === 'object' && value !== null) {
//       fixArrayCorruption(value);
//     }
//   }
// };

// // Apply fix to both the context data and the original item
// fixArrayCorruption(context.data);
// fixArrayCorruption(this.item.system);

    const itemData = this.item.toObject(false);

    context.editable = this.isEditable;
    context.owner = this.item.isOwner;
    
    // Ensure grantedAbilities exists and is an array
    if (!itemData.system.grantedAbilities) {
      itemData.system.grantedAbilities = [];
    }

    // Validate each ability has required properties
    if (Array.isArray(itemData.system.grantedAbilities)) {
      itemData.system.grantedAbilities = itemData.system.grantedAbilities.map((ability, index) => {
        return {
          name: ability.name || "",
          tags: typeof ability.tags === 'string' ? ability.tags : 
                (Array.isArray(ability.tags) ? ability.tags.join(', ') : ""), // Convert arrays to strings
          type: ability.type || "passive",
          description: ability.description || ""
        };
      });
    } else {
      itemData.system.grantedAbilities = [];
    }

    // Enrich description for granted abilities
    if (itemData.system.grantedAbilities && Array.isArray(itemData.system.grantedAbilities)) {
      for (let i = 0; i < itemData.system.grantedAbilities.length; i++) {
        const ability = itemData.system.grantedAbilities[i];
        
        if (ability.description) {
          try {
            itemData.system.grantedAbilities[i].enrichedDescription = await TextEditorImpl.enrichHTML(
              ability.description,
              {
                secrets: this.item.isOwner,
                documents: true,
                links: true,
                async: true,
                rollData: this.item.getRollData(),
                relativeTo: this.item
              }
            );
          } catch (error) {
            console.error(`Error enriching ability ${i} description:`, error);
            itemData.system.grantedAbilities[i].enrichedDescription = ability.description;
          }
        } else {
          itemData.system.grantedAbilities[i].enrichedDescription = "";
        }
      }
    }

    // Handle knacks calculation for ancestries and tracks
    if ((this.item.type === 'ancestry' || this.item.type === 'talent') && this.item.system.required) {
      const totalKnacksProvided = this._calculateKnacksProvided(itemData.system.knackMenus || []);
      itemData.system.knacksProvided = totalKnacksProvided;
      context.calculatedKnacksProvided = totalKnacksProvided;
    }

    // Handle Track-specific data
    if (this.item.type === 'track') {
      await this._getTrackData(context, itemData);
    }

    // Enrich description for display
    try {
      context.enrichedDescription = await TextEditorImpl.enrichHTML(
        this.item.system.description || "",
        {
          secrets: this.item.isOwner,
          documents: true,
          links: true,
          async: true,
          rollData: this.item.getRollData(),
          relativeTo: this.item
        }
      );
    } catch (error) {
      console.error("Error enriching main description:", error);
      context.enrichedDescription = this.item.system.description || "";
    }

    // Enrich required field for ancestries
    if ((this.item.type === 'ancestry' || this.item.type === 'talent') && this.item.system.required) {
      try {
        context.enrichedRequired = await TextEditorImpl.enrichHTML(
          this.item.system.required,
          {
            secrets: this.item.isOwner,
            documents: true,
            links: true,
            async: true,
            rollData: this.item.getRollData(),
            relativeTo: this.item
          }
        );
      } catch (error) {
        console.error("Error enriching required field:", error);
        context.enrichedRequired = this.item.system.required;
      }
    }

    context.system = itemData.system;
    context.flags = itemData.flags;
    context.config = CONFIG.ZWOLF;

    if (this.item.type === 'ancestry') {
      await this._getAncestryData(context, itemData);
    }

    return context;
  }

  /* -------------------------------------------- */

  async _getTrackData(context, itemData) {
    // Enrich tier-specific talent menu descriptions
    for (let tierNum = 1; tierNum <= 5; tierNum++) {
      const tierData = itemData.system.tiers?.[`tier${tierNum}`];
      
      // Enrich talent menu descriptions
      if (tierData?.talentMenu?.description) {
        try {
          const enrichedDescription = await TextEditorImpl.enrichHTML(
            tierData.talentMenu.description,
            {
              secrets: this.item.isOwner,
              documents: true,  // Enable document link enrichment
              links: true,      // Enable link processing
              async: true,
              rollData: this.item.getRollData(),
              relativeTo: this.item  // Provide context for relative links
            }
          );
          itemData.system.tiers[`tier${tierNum}`].talentMenu.enrichedDescription = enrichedDescription;
        } catch (error) {
          console.error(`Error enriching tier ${tierNum} talent menu description:`, error);
          itemData.system.tiers[`tier${tierNum}`].talentMenu.enrichedDescription = tierData.talentMenu.description;
        }
      }
      
      // Enrich granted abilities for this tier
      if (tierData?.grantedAbilities && Array.isArray(tierData.grantedAbilities)) {
        for (let i = 0; i < tierData.grantedAbilities.length; i++) {
          const ability = tierData.grantedAbilities[i];
          if (ability.description) {
            try {
              const enrichedDescription = await TextEditorImpl.enrichHTML(
                ability.description,
                {
                  secrets: this.item.isOwner,
                  documents: true,  // Enable document link enrichment
                  links: true,      // Enable link processing
                  async: true,
                  rollData: this.item.getRollData(),
                  relativeTo: this.item  // Provide context for relative links
                }
              );
              itemData.system.tiers[`tier${tierNum}`].grantedAbilities[i].enrichedDescription = enrichedDescription;
            } catch (error) {
              console.error(`Error enriching tier ${tierNum} ability ${i} description:`, error);
              itemData.system.tiers[`tier${tierNum}`].grantedAbilities[i].enrichedDescription = ability.description;
            }
          }
        }
      }
    }
  }
    
  /* -------------------------------------------- */

  /**
   * Calculate the total knacks provided by summing all selection counts from knack menus
   * @param {Object|Array} knackMenus - Knack menus (object or array)
   * @returns {number} - Total knacks provided
   * @private
   */
  _calculateKnacksProvided(knackMenus) {
    if (!knackMenus) {
      return 0;
    }
    
    // Handle both object and array formats
    let menusArray;
    if (Array.isArray(knackMenus)) {
      menusArray = knackMenus;
    } else if (typeof knackMenus === 'object') {
      menusArray = Object.values(knackMenus);
    } else {
      return 0;
    }
    
    return menusArray.reduce((total, menu) => {
      const selectionCount = parseInt(menu?.selectionCount) || 0;
      return total + selectionCount;
    }, 0);
  }

  /* -------------------------------------------- */

  /**
   * Update knacksProvided field when knack menus change
   * @private
   */
  async _updateKnacksProvided() {
    if (this.item.type === 'ancestry') {
      const knackMenus = this.item.system.knackMenus || [];
      const totalKnacksProvided = this._calculateKnacksProvided(knackMenus);
      
      // Only update if the value has changed to avoid unnecessary updates
      if (this.item.system.knacksProvided !== totalKnacksProvided) {
        await this.item.update({ "system.knacksProvided": totalKnacksProvided });
      }
    }
  }
    
  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    if (!this.options.editable) return;
  
    // Handle adding granted abilities
    html.on('click', '[data-action="add-ability"]', this._onAddAbility.bind(this));

    // Handle deleting granted abilities
    html.on('click', '[data-action="delete-ability"]', this._onDeleteAbility.bind(this));

    // Handle changes to granted ability fields
    html.on('change', 'input[name*="system.grantedAbilities"], textarea[name*="system.grantedAbilities"], select[name*="system.grantedAbilities"]', this._onAbilityFieldChange.bind(this));

    // Handle adding knack menus (ancestry only)
    html.on('click', '[data-action="add-knack-menu"]', this._onAddKnackMenu.bind(this));

    // Handle deleting knack menus (ancestry only)
    html.on('click', '[data-action="delete-knack-menu"]', this._onDeleteKnackMenu.bind(this));

    // Handle changes to knack menu selection counts (ancestry only)  
    html.on('change', 'input[name*="knackMenus"][name*="selectionCount"]', this._onKnackMenuSelectionCountChange.bind(this));

    // Handle array input changes for visual feedback only
    // NOTE: Actual processing is handled by _onChangeInput override
    // IMPORTANT: This line is intentionally commented out to fix the [object Object] bug
    // html.on('change', 'input[name*="properties"], input[name*="ancestryTags"], input[name*="characterTags"], input[name="system.tags"]', this._onArrayInputChange.bind(this));

    // Handle function testing for fundaments
    html.on('click', '#test-functions', this._onTestFunctions.bind(this));

    // Track-specific listeners
    if (this.item.type === 'track') {
      this._activateTrackListeners(html);
    }

    // Lock handling
    const isLocked = this.item.actor && this.item.getFlag('zwolf-epic', 'locked');
    const isEquipment = this.item.type === 'equipment';

    if (isLocked && !isEquipment) {
      html.find('input, select, textarea').prop('disabled', true);
      html.find('button').not('.close').prop('disabled', true);
    }
  }

  /* -------------------------------------------- */

  _activateTrackListeners(html) {
    // Handle adding tier abilities
    html.on('click', '[data-action="add-tier-ability"]', this._onAddTierAbility.bind(this));
    
    // Handle deleting tier abilities
    html.on('click', '[data-action="delete-tier-ability"]', this._onDeleteTierAbility.bind(this));
    
    // Handle changes to tier ability fields
    html.on('change', 'input[name*="tiers.tier"][name*="grantedAbilities"], select[name*="tiers.tier"][name*="grantedAbilities"]', this._onTierAbilityFieldChange.bind(this));
  }

  /* -------------------------------------------- */

  /** @override */
  async render(force, options) {
    // Always force getData refresh when rendering
    if (this._state === Application.RENDER_STATES.RENDERED) {
      this._data = null; // Clear cached data
    }
    return super.render(force, options);
  }

  /* -------------------------------------------- */

  /**
   * Handle adding a new granted ability with the new structure
   * @param {Event} event - The originating click event
   * @private
   */
  async _onAddAbility(event) {
    event.preventDefault();
    console.log("Adding new ability for:", this.item.type);
    
    const newAbility = {
      name: "",
      tags: "", // Store as string, not array
      type: "passive",
      description: ""
    };

    // Ensure we're working with an array
    let abilities = this.item.system.grantedAbilities;
    if (!Array.isArray(abilities)) {
      abilities = [];
    }
    
    // Create a proper duplicate of the array
    const updatedAbilities = foundry.utils.duplicate(abilities);
    updatedAbilities.push(newAbility);

    console.log("Updating with abilities:", updatedAbilities);
    await this.item.update({ "system.grantedAbilities": updatedAbilities });
  }

  /* -------------------------------------------- */

  /**
   * Preserve granted abilities structure when updating from form data
   * This prevents the editor from corrupting the abilities array
   * @param {Object} formData - The raw form data
   * @returns {Object} - The processed form data with preserved abilities
   * @private
   */
  async _preserveGrantedAbilities(formData) {
    const processedData = foundry.utils.duplicate(formData);
    
    // Get the current abilities array as our base
    const currentAbilities = foundry.utils.duplicate(this.item.system.grantedAbilities || []);
    console.log("Current abilities at start:", currentAbilities);
    
    // Track which abilities have been updated from the form
    const updatedAbilities = foundry.utils.duplicate(currentAbilities);
    let hasAbilityUpdates = false;
    
    // Process all form data keys to find ability-related updates
    Object.keys(processedData).forEach(key => {
      const abilityMatch = key.match(/^system\.grantedAbilities\.(\d+)\.(.+)$/);
      if (abilityMatch) {
        const index = parseInt(abilityMatch[1]);
        const field = abilityMatch[2];
        const value = processedData[key];
        
        console.log(`Found ability update: index=${index}, field=${field}, value=`, value);
        
        // Ensure we have an ability object at this index
        while (updatedAbilities.length <= index) {
          updatedAbilities.push({
            name: "",
            tags: "",
            type: "passive",
            description: ""
          });
        }
        
        // Update the specific field
        updatedAbilities[index][field] = value;
        hasAbilityUpdates = true;
        
        // Remove the individual field update from form data
        // We'll replace it with the complete array
        delete processedData[key];
      }
    });
    
    // If we had any ability updates, replace with the complete updated array
    if (hasAbilityUpdates) {
      console.log("Updated abilities array:", updatedAbilities);
      processedData['system.grantedAbilities'] = updatedAbilities;
    }
    
    // Handle tier abilities for tracks similarly
    if (this.item.type === 'track') {
      processedData = await this._preserveTrackTierAbilities(processedData);
    }
    
    console.log("Processed form data:", processedData);
    return processedData;
  }

  /**
   * Preserve track tier abilities structure
   * @param {Object} formData - The form data to process
   * @returns {Object} - The processed form data
   * @private
   */
  async _preserveTrackTierAbilities(formData) {
    const processedData = foundry.utils.duplicate(formData);
    
    // Handle each tier (1-5)
    for (let tierNum = 1; tierNum <= 5; tierNum++) {
      const currentTierAbilities = foundry.utils.duplicate(
        foundry.utils.getProperty(this.item.system, `tiers.tier${tierNum}.grantedAbilities`) || []
      );
      
      const updatedTierAbilities = foundry.utils.duplicate(currentTierAbilities);
      let hasTierUpdates = false;
      
      // Process form data for this tier
      Object.keys(processedData).forEach(key => {
        const tierAbilityMatch = key.match(new RegExp(`^system\\.tiers\\.tier${tierNum}\\.grantedAbilities\\.(\\d+)\\.(.+)$`));
        if (tierAbilityMatch) {
          const index = parseInt(tierAbilityMatch[1]);
          const field = tierAbilityMatch[2];
          const value = processedData[key];
          
          console.log(`Found tier ${tierNum} ability update: index=${index}, field=${field}, value=`, value);
          
          // Ensure we have an ability object at this index
          while (updatedTierAbilities.length <= index) {
            updatedTierAbilities.push({
              name: "",
              tags: "",
              type: "passive",
              description: ""
            });
          }
          
          // Update the specific field
          updatedTierAbilities[index][field] = value;
          hasTierUpdates = true;
          
          // Remove the individual field update from form data
          delete processedData[key];
        }
      });
      
      // If we had any tier ability updates, replace with the complete updated array
      if (hasTierUpdates) {
        console.log(`Updated tier ${tierNum} abilities:`, updatedTierAbilities);
        processedData[`system.tiers.tier${tierNum}.grantedAbilities`] = updatedTierAbilities;
      }
    }
    
    return processedData;
  }

  /**
   * Handle changes to granted ability fields - UPDATED VERSION
   * @param {Event} event - The originating change event
   * @private
   */
  async _onAbilityFieldChange(event) {
    event.preventDefault();
    const input = event.currentTarget;
    const value = input.value;
    const field = input.name;
    
    console.log("Ability field change:", field, "=", value);
    
    // Extract ability index and field name from input name
    const match = field.match(/system\.grantedAbilities\.(\d+)\.(.+)/);
    if (!match) {
      console.log("Field name didn't match expected pattern:", field);
      return;
    }
    
    const abilityIndex = parseInt(match[1]);
    const fieldName = match[2];
    
    // Skip description fields - they're handled by the editor system
    if (fieldName === 'description') {
      console.log("Skipping description field - handled by editor");
      return;
    }
    
    console.log(`Updating ability ${abilityIndex}, field ${fieldName}`);
    
    // Get current abilities array
    let abilities = foundry.utils.duplicate(this.item.system.grantedAbilities || []);
    
    // Ensure the ability exists at this index
    if (!abilities[abilityIndex]) {
      abilities[abilityIndex] = {
        name: "",
        tags: "",
        type: "passive",
        description: ""
      };
    }
    
    // Handle tags field - always store as string
    if (fieldName === 'tags') {
      abilities[abilityIndex][fieldName] = typeof value === 'string' ? value : "";
    } else {
      abilities[abilityIndex][fieldName] = value;
    }
    
    console.log("Updated abilities array:", abilities);
    
    // Update the item
    await this.item.update({ "system.grantedAbilities": abilities });
  }

  /* -------------------------------------------- */

  // Add this method to handle editor saves properly for tracks
  async _onEditorSave(target, element, content) {
    console.log("=== EDITOR SAVE DEBUG ===");
    console.log("Target:", target);
    console.log("Content:", content);
    console.log("Item type:", this.item.type);

    // Handle Track-specific editor saves
    if (this.item.type === 'track') {
      const trackResult = await this._onTrackEditorSave(target, element, content);
      if (trackResult !== undefined) {
        return trackResult;
      }
    }

    // Handle Ancestry-specific editor saves
    if (this.item.type === 'ancestry') {
      const ancestryResult = await this._onAncestryEditorSave(target, element, content);
      if (ancestryResult !== undefined) {
        return ancestryResult;
      }
    }
    
    // Check if this is a granted ability description
    if (target && target.includes('grantedAbilities') && target.includes('description')) {
      console.log("This is a granted ability description save!");
      
      const match = target.match(/system\.grantedAbilities\.(\d+)\.description/);
      if (match) {
        const index = parseInt(match[1]);
        console.log("Updating ability", index, "with content:", content);
        
        // Get current abilities array - use fresh data from the item
        const currentAbilities = this.item.system.grantedAbilities || [];
        
        // Verify the ability exists at this index
        if (index >= 0 && index < currentAbilities.length) {
          // Use a direct path update instead of manipulating the entire array
          const updatePath = `system.grantedAbilities.${index}.description`;
          
          try {
            await this.item.update({ [updatePath]: content });
            console.log("Direct update successful!");
          } catch (error) {
            console.error("Direct update failed:", error);
            
            // Fallback: use array manipulation as backup
            const abilities = foundry.utils.duplicate(currentAbilities);
            abilities[index].description = content;
            await this.item.update({ "system.grantedAbilities": abilities });
            console.log("Fallback update successful!");
          }
        } else {
          console.error(`Ability at index ${index} does not exist. Current abilities length: ${currentAbilities.length}`);
          
          // If for some reason the ability doesn't exist, create it
          const abilities = foundry.utils.duplicate(currentAbilities);
          
          // Only pad to the exact index needed
          for (let i = abilities.length; i <= index; i++) {
            abilities.push({ 
              name: "", 
              tags: "", 
              type: "passive", 
              description: "" 
            });
          }
          
          abilities[index].description = content;
          await this.item.update({ "system.grantedAbilities": abilities });
          console.log("Created missing ability and updated!");
        }
        
        return;
      }
    }
    
    // For other fields, call the parent method
    const result = await super._onEditorSave(target, element, content);
    
    return result;
  }

  /**
   * Handle changes to tag inputs (comma-separated values)
   * @param {Event} event - The originating change event
   * @private
   */
  _onTagInputChange(event) {
    const input = event.currentTarget;
    const value = input.value;
    
    // Convert comma-separated string to array
    const arrayValue = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    
    // Update the form data with the array
    const updateKey = input.name;
    this.item.update({ [updateKey]: arrayValue });
  }

  /* -------------------------------------------- */

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
    
    // Mock character data for testing
    const mockData = {
      level: testLevel,
      vitalityBoostCount: testVitalityBoost,
      attributes: {
        agility: 2,
        fortitude: 2,
        perception: 2,
        willpower: 2
      },
      skills: {
        acumen: 1,
        athletics: 1,
        brawn: 1,
        dexterity: 1,
        glibness: 1,
        influence: 1,
        insight: 1,
        stealth: 1
      }
    };

    let results = `<div class="test-result"><strong>Test Results for Level ${testLevel}, Vitality Boosts: ${testVitalityBoost}:</strong></div>`;
    
    // Test vitality function
    try {
      const vitalityFunction = this.item.system.vitalityFunction || "";
      if (vitalityFunction.trim()) {
        const vitalityResult = this._evaluateFunction(vitalityFunction, mockData);
        results += `<div class="test-result vitality">Vitality Points: ${vitalityResult}</div>`;
      } else {
        results += `<div class="test-result error">No vitality function defined</div>`;
      }
    } catch (error) {
      results += `<div class="test-result error">Vitality Function Error: ${error.message}</div>`;
    }
    
    // Test coast function
    try {
      const coastFunction = this.item.system.coastFunction || "";
      if (coastFunction.trim()) {
        const coastResult = this._evaluateFunction(coastFunction, mockData);
        results += `<div class="test-result coast">Coast Number: ${coastResult}</div>`;
      } else {
        results += `<div class="test-result error">No coast function defined</div>`;
      }
    } catch (error) {
      results += `<div class="test-result error">Coast Function Error: ${error.message}</div>`;
    }
    
    resultsDiv.innerHTML = results;
  }

  /* -------------------------------------------- */

  /**
   * Safely evaluate a function string with provided data
   * @param {string} functionString - The JavaScript function code
   * @param {object} data - The data to make available to the function
   * @returns {*} The result of the function
   * @private
   */
  _evaluateFunction(functionString, data) {
    // Extract variables from data for the function scope
    const { level, attributes, skills, vitalityBoostCount } = data;
    
    // Create a safe function wrapper
    const functionWrapper = `
      (function() {
        ${functionString}
      })();
    `;
    
    // Evaluate the function in a controlled scope
    return eval(functionWrapper);
  }

  /* -------------------------------------------- */

  // /**
  //  * Handle rich text editor saves - fixed version
  //  * @param {string} target - The target field being saved
  //  * @param {HTMLElement} element - The editor element
  //  * @param {string} content - The saved content
  //  * @private
  //  */
  // async _onEditorSave(target, element, content) {

  //   // Handle Ancestry-specific editor saves
  //   if (this.item.type === 'ancestry') {
  //     const ancestryResult = await this._onAncestryEditorSave(target, element, content);
  //     if (ancestryResult !== undefined) {
  //       return ancestryResult;
  //     }
  //   }
    
  //   // Handle Track-specific editor saves
  //   if (this.item.type === 'track') {
  //     const trackResult = await this._onTrackEditorSave(target, element, content);
  //     if (trackResult !== undefined) {
  //       return trackResult;
  //     }
  //   }
    
  //   // Check if this is a granted ability description
  //   if (target && target.includes('grantedAbilities') && target.includes('description')) {
  //     console.log("This is a granted ability description save!");
      
  //     const match = target.match(/system\.grantedAbilities\.(\d+)\.description/);
  //     if (match) {
  //       const index = parseInt(match[1]);
  //       console.log("Updating ability", index, "with content:", content);
        
  //       // Get current abilities array - use fresh data from the item
  //       const currentAbilities = this.item.system.grantedAbilities || [];
        
  //       // Verify the ability exists at this index
  //       if (index >= 0 && index < currentAbilities.length) {
  //         // Use a direct path update instead of manipulating the entire array
  //         const updatePath = `system.grantedAbilities.${index}.description`;
          
  //         try {
  //           await this.item.update({ [updatePath]: content });
  //           console.log("Direct update successful!");
  //         } catch (error) {
  //           console.error("Direct update failed:", error);
            
  //           // Fallback: use array manipulation as backup
  //           const abilities = foundry.utils.duplicate(currentAbilities);
  //           abilities[index].description = content;
  //           await this.item.update({ "system.grantedAbilities": abilities });
  //           console.log("Fallback update successful!");
  //         }
  //       } else {
  //         console.error(`Ability at index ${index} does not exist. Current abilities length: ${currentAbilities.length}`);
          
  //         // If for some reason the ability doesn't exist, create it
  //         const abilities = foundry.utils.duplicate(currentAbilities);
          
  //         // Only pad to the exact index needed
  //         for (let i = abilities.length; i <= index; i++) {
  //           abilities.push({ 
  //             name: "", 
  //             tags: "", 
  //             type: "passive", 
  //             description: "" 
  //           });
  //         }
          
  //         abilities[index].description = content;
  //         await this.item.update({ "system.grantedAbilities": abilities });
  //         console.log("Created missing ability and updated!");
  //       }
        
  //       return;
  //     }
  //   }
    
  //   // For other fields, call the parent method
  //   const result = await super._onEditorSave(target, element, content);
    
  //   return result;
  // }

  /* -------------------------------------------- */

  // Update the _onTrackEditorSave method to handle the required field
  async _onTrackEditorSave(target, element, content) {
    console.log("=== TRACK EDITOR SAVE DEBUG ===");
    console.log("Target:", target);
    console.log("Content:", content);
    
    // Handle required field specifically
    if (target === 'system.required') {
      console.log("Updating required field with content:", content);
      try {
        await this.item.update({ [target]: content });
        console.log("Required field update successful!");
        return true; // Signal that we handled this
      } catch (error) {
        console.error("Required field update failed:", error);
      }
    }
    
    // Check if this is a tier talent menu description
    if (target && target.includes('tiers.tier') && target.includes('talentMenu.description')) {
      console.log("This is a tier talent menu description save!");
      
      const match = target.match(/system\.tiers\.tier(\d+)\.talentMenu\.description/);
      if (match) {
        const tier = match[1];
        console.log(`Updating tier ${tier} talent menu with content:`, content);
        
        try {
          await this.item.update({ [`system.tiers.tier${tier}.talentMenu.description`]: content });
          console.log("Update successful!");
          return true; // Signal that we handled this
        } catch (error) {
          console.error("Update failed:", error);
        }
      }
    }
    
    // Check if this is a tier granted ability description
    if (target && target.includes('tiers.tier') && target.includes('grantedAbilities') && target.includes('description')) {
      console.log("This is a tier granted ability description save!");
      
      const match = target.match(/system\.tiers\.tier(\d+)\.grantedAbilities\.(\d+)\.description/);
      if (match) {
        const tier = match[1];
        const index = parseInt(match[2]);
        console.log(`Updating tier ${tier} ability ${index} with content:`, content);
        
        try {
          const tierPath = `system.tiers.tier${tier}.grantedAbilities`;
          const abilities = foundry.utils.duplicate(foundry.utils.getProperty(this.item.system, `tiers.tier${tier}.grantedAbilities`) || []);
          
          // Ensure the ability exists at this index with consistent structure
          while (abilities.length <= index) {
            abilities.push({ 
              name: "", 
              tags: "", // Changed from [] to "" for consistency
              type: "passive", 
              description: "" 
            });
          }
          
          // Update the description
          abilities[index].description = content;
          
          await this.item.update({ [tierPath]: abilities });
          console.log("Update successful!");
          return true; // Signal that we handled this
        } catch (error) {
          console.error("Update failed:", error);
        }
      }
    }
    
    return undefined; // Signal that we didn't handle this
  }

  /* -------------------------------------------- */

  /**
   * Handle deleting a granted ability
   * @param {Event} event - The originating click event
   * @private
   */
  async _onDeleteAbility(event) {
    event.preventDefault();
    console.log("Deleting ability for:", this.item.type);
    
    const index = parseInt(event.currentTarget.dataset.abilityIndex);
    let abilities = this.item.system.grantedAbilities;
    
    // Ensure we're working with an array
    if (!Array.isArray(abilities)) {
      abilities = [];
    }
    
    const updatedAbilities = foundry.utils.duplicate(abilities);
    updatedAbilities.splice(index, 1);
    
    console.log("Updated abilities after delete:", updatedAbilities);
    
    await this.item.update({ "system.grantedAbilities": updatedAbilities });
  }

  /**
   * Handle adding a new tier ability
   * @param {Event} event - The originating click event
   * @private
   */
  async _onAddTierAbility(event) {
    event.preventDefault();
    const tier = event.currentTarget.dataset.tier;
    console.log(`Adding tier ability to tier ${tier}`);
    
    const newAbility = {
      name: "",
      tags: "", // Store as string, not array
      type: "passive",
      description: ""
    };
    
    const tierPath = `system.tiers.tier${tier}.grantedAbilities`;
    const currentAbilities = foundry.utils.getProperty(this.item.system, `tiers.tier${tier}.grantedAbilities`) || [];
    
    const updatedAbilities = foundry.utils.duplicate(currentAbilities);
    updatedAbilities.push(newAbility);
    
    await this.item.update({ [tierPath]: updatedAbilities });
  }

  /**
   * Handle changes to tier ability fields
   * @param {Event} event - The originating change event
   * @private
   */
  async _onTierAbilityFieldChange(event) {
    event.preventDefault();
    const input = event.currentTarget;
    const value = input.value;
    const field = input.name;
    
    console.log("Tier ability field change:", field, "=", value);
    
    // Extract tier, ability index and field name from input name
    // Expected format: system.tiers.tier1.grantedAbilities.0.name
    const match = field.match(/system\.tiers\.tier(\d+)\.grantedAbilities\.(\d+)\.(.+)/);
    if (!match) {
      console.log("Field name didn't match expected pattern:", field);
      return;
    }
    
    const tier = match[1];
    const abilityIndex = parseInt(match[2]);
    const fieldName = match[3];
    
    console.log(`Updating tier ${tier}, ability ${abilityIndex}, field ${fieldName}`);
    
    // Get current abilities array for this tier
    let abilities = foundry.utils.duplicate(foundry.utils.getProperty(this.item.system, `tiers.tier${tier}.grantedAbilities`) || []);
    
    // Ensure the ability exists at this index
    if (!abilities[abilityIndex]) {
      abilities[abilityIndex] = {
        name: "",
        tags: "", // Store as string, not array
        type: "passive",
        description: ""
      };
    }
    
    // Handle tags field - always store as string
    if (fieldName === 'tags') {
      // Ensure we're storing a clean string
      abilities[abilityIndex][fieldName] = typeof value === 'string' ? value : "";
    } else {
      // Handle regular string fields
      abilities[abilityIndex][fieldName] = value;
    }
    
    console.log("Updated tier abilities array:", abilities);
    
    // Update the item
    await this.item.update({ [`system.tiers.tier${tier}.grantedAbilities`]: abilities });
  }

  /**
   * Handle deleting a tier ability
   * @param {Event} event - The originating click event
   * @private
   */
  async _onDeleteTierAbility(event) {
    event.preventDefault();
    const tier = event.currentTarget.dataset.tier;
    const abilityIndex = parseInt(event.currentTarget.dataset.abilityIndex);
    console.log(`Deleting tier ability ${abilityIndex} from tier ${tier}`);
    
    const tierPath = `system.tiers.tier${tier}.grantedAbilities`;
    const currentAbilities = foundry.utils.getProperty(this.item.system, `tiers.tier${tier}.grantedAbilities`) || [];
    
    const updatedAbilities = foundry.utils.duplicate(currentAbilities);
    updatedAbilities.splice(abilityIndex, 1);
    
    await this.item.update({ [tierPath]: updatedAbilities });
  }

  /* -------------------------------------------- */

  /**
   * Handle adding a new knack menu
   * @param {Event} event - The originating click event
   * @private
   */
  async _onAddKnackMenu(event) {
    event.preventDefault();
    
    const newMenu = {
      name: "",
      description: "",      // Rich text description
      selectionCount: 1,
      knackIds: []         // Keep for backwards compatibility
    };

    const menus = foundry.utils.duplicate(this.item.system.knackMenus || []);
    menus.push(newMenu);

    await this.item.update({ "system.knackMenus": menus });
    
    // Update knacksProvided after adding a menu
    await this._updateKnacksProvided();
  }

  /* -------------------------------------------- */

  /**
   * Handle deleting a knack menu
   * @param {Event} event - The originating click event
   * @private
   */
  async _onDeleteKnackMenu(event) {
    event.preventDefault();
    
    const index = parseInt(event.currentTarget.dataset.menuIndex);
    const menus = foundry.utils.duplicate(this.item.system.knackMenus || []);
    
    menus.splice(index, 1);
    
    await this.item.update({ "system.knackMenus": menus });
    
    // Update knacksProvided after deleting a menu
    await this._updateKnacksProvided();
  }

  /* -------------------------------------------- */

  /**
   * Handle changes to knack menu selection counts
   * @param {Event} event - The originating change event
   * @private
   */
  async _onKnackMenuSelectionCountChange(event) {
    // Let the normal form handling take care of the update first
    setTimeout(async () => {
      await this._updateKnacksProvided();
    }, 100);
  }

  /* -------------------------------------------- */

  /**
   * Handle multi-select changes immediately
   * @param {Event} event - The originating change event
   * @private
   */
  async _onSizeOptionsChange(event) {
    event.preventDefault();
    const select = event.currentTarget;
    const selectedValues = Array.from(select.selectedOptions).map(option => option.value);
    
    console.log("Size options changed:", selectedValues);
    
    // Update immediately to prevent loss of selection
    await this.item.update({ "system.sizeOptions": selectedValues });
  }

  /* -------------------------------------------- */

  /**
   * Handle changes to array inputs - provides visual feedback only
   * @param {Event} event - The originating change event
   * @private
   */
  _onArrayInputChange(event) {
    const input = event.currentTarget;
    const value = input.value;
    
    // Provide visual feedback for valid/invalid format
    if (value.trim() && !value.match(/^[^,]+(,[^,]+)*$/)) {
      input.style.borderColor = 'orange';
      input.title = 'Format: item1, item2, item3';
    } else {
      input.style.borderColor = '';
      input.title = '';
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle Track-specific data processing in _updateObject
   * @param {Object} formData - The form data
   * @returns {Object} - The processed form data
   * @private
   */
  async _updateTrackObject(formData) {
    console.log("=== TRACK UPDATE OBJECT DEBUG ===");
    console.log("Form data keys:", Object.keys(formData));
    
    // Handle tier granted ability tags
    Object.keys(formData).forEach(key => {
      if (key.includes('tiers.tier') && key.includes('grantedAbilities') && key.includes('tags') && typeof formData[key] === 'string') {
        formData[key] = formData[key].split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
    });
    
    console.log("Processed track form data:", formData);
    
    return formData;
  }

  // New method to handle ancestry-specific data enrichment
  async _getAncestryData(context, itemData) {
    console.log("Processing ancestry-specific data");
    
    // Enrich knack menu descriptions
    if (itemData.system.knackMenus && Array.isArray(itemData.system.knackMenus)) {
      for (let i = 0; i < itemData.system.knackMenus.length; i++) {
        const menu = itemData.system.knackMenus[i];
        if (menu.description) {
          try {
            const enrichedDescription = await TextEditorImpl.enrichHTML(
              menu.description,
              {
                secrets: this.item.isOwner,
                documents: true,  // Enable document link enrichment
                links: true,      // Enable link processing
                async: true,
                rollData: this.item.getRollData(),
                relativeTo: this.item  // Provide context for relative links
              }
            );
            itemData.system.knackMenus[i].enrichedDescription = enrichedDescription;
          } catch (error) {
            console.error(`Error enriching knack menu ${i} description:`, error);
            itemData.system.knackMenus[i].enrichedDescription = menu.description;
          }
        } else {
          itemData.system.knackMenus[i].enrichedDescription = "";
        }
      }
    }
  }

  // New method to handle ancestry editor saves
  async _onAncestryEditorSave(target, element, content) {
    console.log("=== ANCESTRY EDITOR SAVE DEBUG ===");
    console.log("Target:", target);
    console.log("Content:", content);
    
    // Check if this is a knack menu description
    if (target && target.includes('knackMenus') && target.includes('description')) {
      console.log("This is a knack menu description save!");
      
      const match = target.match(/system\.knackMenus\.(\d+)\.description/);
      if (match) {
        const index = parseInt(match[1]);
        console.log(`Updating knack menu ${index} with content:`, content);
        
        try {
          await this.item.update({ [`system.knackMenus.${index}.description`]: content });
          console.log("Update successful!");
          return true; // Signal that we handled this
        } catch (error) {
          console.error("Update failed:", error);
        }
      }
    }
    
    return undefined; // Signal that we didn't handle this
  }

  // /**
  //  * Override the core _onChangeInput method to handle array fields properly
  //  * This is called by Foundry when form fields change (including on blur)
  //  */
  // async _onChangeInput(event) {
  //   const input = event.target;
  //   const field = input.name;
  //   const value = input.value;
    
  //   // Check if this is an array field that needs special handling
  //   const arrayFields = [
  //     'system.tags',
  //     'system.ancestryTags', 
  //     'system.characterTags',
  //     'system.weapon.properties'
  //   ];
    
  //   const isArrayField = arrayFields.includes(field) || 
  //                       field.includes('grantedAbilities') && field.includes('tags') ||
  //                       field.includes('knackIds');
    
  //   if (isArrayField && typeof value === 'string') {
  //     // Convert comma-separated string to array
  //     const arrayValue = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
      
  //     // Update the item directly with the array value
  //     try {
  //       await this.item.update({ [field]: arrayValue });
  //       return; // Don't call parent method
  //     } catch (error) {
  //       console.error("Array field update failed:", error);
  //     }
  //   }
    
  //   // For granted abilities tags, handle specially
  //   if (field.includes('grantedAbilities') && field.includes('tags')) {
  //     const match = field.match(/system\.grantedAbilities\.(\d+)\.tags/);
  //     if (match) {
  //       const index = parseInt(match[1]);
  //       const arrayValue = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
        
  //       const abilities = foundry.utils.duplicate(this.item.system.grantedAbilities || []);
  //       if (abilities[index]) {
  //         abilities[index].tags = arrayValue;
  //         await this.item.update({ "system.grantedAbilities": abilities });
  //         return;
  //       }
  //     }
  //   }
    
  //   // For all other fields, call the parent method
  //   return super._onChangeInput(event);
  // }

  // Update the _updateObject method to be more careful with track data
  async _updateObject(event, formData) {
    console.log("=== UPDATE OBJECT DEBUG ===");
    console.log("Form data keys:", Object.keys(formData));
    console.log("Raw form data:", formData);
    console.log("Item type:", this.item.type);
    
    // For tracks, be very selective about what we process
    if (this.item.type === 'track') {
      // Only process granted abilities if we actually have granted ability form data
      const hasGrantedAbilityData = Object.keys(formData).some(key => 
        key.includes('grantedAbilities') && !key.includes('tiers.tier')
      );
      
      if (hasGrantedAbilityData) {
        formData = await this._preserveGrantedAbilities(formData);
      }
      
      // Handle track-specific processing
      formData = await this._updateTrackObject(formData);
    } else {
      // For non-track items, use the full preservation logic
      formData = await this._preserveGrantedAbilities(formData);
    }
    
    // Handle multi-select fields specially
    const form = this.form;
    const sizeOptionsSelect = form.querySelector('select[name="system.sizeOptions"]');
    
    if (sizeOptionsSelect) {
      const selectedValues = Array.from(sizeOptionsSelect.selectedOptions).map(option => option.value);
      formData['system.sizeOptions'] = selectedValues;
    }

    console.log("Final form data before parent update:", formData);

    // Call the parent update
    const result = await super._updateObject(event, formData);
    
    // Update knacksProvided after form submission for ancestry items
    if (this.item.type === 'ancestry') {
      await this._updateKnacksProvided();
    }
    
    return result;
  }
}
