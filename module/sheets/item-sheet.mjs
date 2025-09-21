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
    console.log(`ItemSheet getData() called for ${this.item.type}:`, this.item.name);
    const context = super.getData();
    const itemData = this.item.toObject(false);

    context.editable = this.isEditable;
    context.owner = this.item.isOwner;
    
    console.log(`Item type: ${this.item.type}, editable: ${context.editable}`);
    
    // Ensure grantedAbilities exists and is an array
    if (!itemData.system.grantedAbilities) {
      console.log("No grantedAbilities found, creating empty array");
      itemData.system.grantedAbilities = [];
    }

    // Validate each ability has required properties
    if (Array.isArray(itemData.system.grantedAbilities)) {
      console.log(`Processing ${itemData.system.grantedAbilities.length} granted abilities`);
      itemData.system.grantedAbilities = itemData.system.grantedAbilities.map((ability, index) => {
        console.log(`Processing ability ${index}:`, ability);
        return {
          name: ability.name || "",
          tags: Array.isArray(ability.tags) ? ability.tags : [],
          type: ability.type || "passive",
          description: ability.description || ""
        };
      });
    } else {
      // Force it to be an empty array if it's not already an array
      console.log("grantedAbilities was not an array, forcing to empty array");
      itemData.system.grantedAbilities = [];
    }

    // Enrich description for granted abilities
    if (itemData.system.grantedAbilities && Array.isArray(itemData.system.grantedAbilities)) {
      for (let i = 0; i < itemData.system.grantedAbilities.length; i++) {
        const ability = itemData.system.grantedAbilities[i];
        console.log(`Enriching ability ${i} raw description:`, ability.description);
        
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

    // Enrich required field for ancestries and tracks
    if ((this.item.type === 'ancestry' || this.item.type === 'track') && this.item.system.required) {
      const totalKnacksProvided = this._calculateKnacksProvided(itemData.system.knackMenus || []);
      itemData.system.knacksProvided = totalKnacksProvided;
      context.calculatedKnacksProvided = totalKnacksProvided;
      console.log(`Ancestry knacksProvided calculated: ${totalKnacksProvided}`);
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
    if (this.item.type === 'ancestry' && this.item.system.required) {
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

    console.log("Final context for template:", {
      type: this.item.type,
      editable: context.editable,
      grantedAbilitiesCount: context.system.grantedAbilities?.length || 0,
      grantedAbilities: context.system.grantedAbilities
    });

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
    
    // Enrich overview and prerequisites with the same options
    if (this.item.system.overview) {
      try {
        context.enrichedOverview = await TextEditorImpl.enrichHTML(
          this.item.system.overview,
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
        console.error("Error enriching overview:", error);
        context.enrichedOverview = this.item.system.overview;
      }
    }
    
    if (this.item.system.prerequisites) {
      try {
        context.enrichedPrerequisites = await TextEditorImpl.enrichHTML(
          this.item.system.prerequisites,
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
        console.error("Error enriching prerequisites:", error);
        context.enrichedPrerequisites = this.item.system.prerequisites;
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

    console.log("Activating listeners for:", this.item.type, this.item.name);
    
    // Debug: Check if editors are being created properly
    const editors = html.find('.editor');
    console.log("Found editors:", editors.length);
    editors.each((index, element) => {
      console.log(`Editor ${index}:`, element);
      const target = element.getAttribute('data-edit') || element.closest('[data-edit]')?.getAttribute('data-edit');
      console.log(`Editor ${index} target:`, target);
    });

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

    // Handle array input changes - updated to include tags
    html.on('change', 'input[name*="properties"], input[name*="ancestryTags"], input[name*="characterTags"], input[name*="knackIds"], input[name="system.tags"]', this._onArrayInputChange.bind(this));

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
    console.log(`Rendering ${this.item.type} sheet:`, this.item.name);
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
      tags: [],
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
   * Handle changes to granted ability fields
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
    // Expected format: system.grantedAbilities.0.name or system.grantedAbilities.0.tags
    const match = field.match(/system\.grantedAbilities\.(\d+)\.(.+)/);
    if (!match) {
      console.log("Field name didn't match expected pattern:", field);
      return;
    }
    
    const abilityIndex = parseInt(match[1]);
    const fieldName = match[2];
    
    console.log(`Updating ability ${abilityIndex}, field ${fieldName}`);
    
    // Get current abilities array
    let abilities = foundry.utils.duplicate(this.item.system.grantedAbilities || []);
    
    // Ensure the ability exists at this index
    if (!abilities[abilityIndex]) {
      abilities[abilityIndex] = {
        name: "",
        tags: [],
        type: "passive",
        description: ""
      };
    }
    
    // Handle different field types
    if (fieldName === 'tags') {
      // Convert comma-separated string to array
      abilities[abilityIndex][fieldName] = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    } else {
      // Handle regular string fields
      abilities[abilityIndex][fieldName] = value;
    }
    
    console.log("Updated abilities array:", abilities);
    
    // Update the item
    await this.item.update({ "system.grantedAbilities": abilities });
  }

  /* -------------------------------------------- */

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

  /**
   * Handle rich text editor saves - simple version
   * @param {string} target - The target field being saved
   * @param {HTMLElement} element - The editor element
   * @param {string} content - The saved content
   * @private
   */
  async _onEditorSave(target, element, content) {
  
    // Handle Ancestry-specific editor saves
    if (this.item.type === 'ancestry') {
      const ancestryResult = await this._onAncestryEditorSave(target, element, content);
      if (ancestryResult !== undefined) {
        return ancestryResult;
      }
    }
    
    // Handle Track-specific editor saves
    if (this.item.type === 'track') {
      const trackResult = await this._onTrackEditorSave(target, element, content);
      if (trackResult !== undefined) {
        return trackResult;
      }
    }
    
    // Check if this is a granted ability description
    if (target && target.includes('grantedAbilities') && target.includes('description')) {
      console.log("This is a granted ability description save!");
      
      const match = target.match(/system\.grantedAbilities\.(\d+)\.description/);
      if (match) {
        const index = parseInt(match[1]);
        console.log("Updating ability", index, "with content:", content);
        
        const abilities = foundry.utils.duplicate(this.item.system.grantedAbilities || []);
        
        // Ensure the ability exists at this index
        while (abilities.length <= index) {
          abilities.push({ name: "", tags: [], type: "passive", description: "" });
        }
        
        // Update the description
        abilities[index].description = content;
        
        console.log("Updated abilities array:", abilities);
        
        // Update the item directly
        try {
          await this.item.update({ "system.grantedAbilities": abilities });
          console.log("Update successful!");
        } catch (error) {
          console.error("Update failed:", error);
        }
        
        return;
      }
    }
    
    // For other fields, call the parent method
    const result = await super._onEditorSave(target, element, content);
    
    return result;
  }

  /* -------------------------------------------- */

  async _onTrackEditorSave(target, element, content) {
    console.log("=== TRACK EDITOR SAVE DEBUG ===");
    console.log("Target:", target);
    console.log("Content:", content);
    
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
          
          // Ensure the ability exists at this index
          while (abilities.length <= index) {
            abilities.push({ name: "", tags: [], type: "passive", description: "" });
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
    
    // Handle overview, prerequisites, and required
    if (target === 'system.overview' || target === 'system.prerequisites' || target === 'system.required') {
      console.log(`Updating ${target} with content:`, content);
      try {
        await this.item.update({ [target]: content });
        console.log("Update successful!");
        return true; // Signal that we handled this
      } catch (error) {
        console.error("Update failed:", error);
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
      tags: [],
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
        tags: [],
        type: "passive",
        description: ""
      };
    }
    
    // Handle different field types
    if (fieldName === 'tags') {
      // Convert comma-separated string to array
      abilities[abilityIndex][fieldName] = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    } else {
      // Handle regular string fields
      abilities[abilityIndex][fieldName] = value;
    }
    
    console.log("Updated tier abilities array:", abilities);
    
    // Update the item
    await this.item.update({ [`system.tiers.tier${tier}.grantedAbilities`]: abilities });
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
   * Handle changes to array inputs (comma-separated values)
   * @param {Event} event - The originating change event
   * @private
   */
  _onArrayInputChange(event) {
    const input = event.currentTarget;
    const value = input.value;
    
    console.log("Array input change:", input.name, "=", value);
    
    // Don't update immediately - let _updateObject handle it
    // Just validate the input format if needed
    
    // Optional: Add visual feedback for valid/invalid format
    if (value.trim() && !value.match(/^[^,]+(,[^,]+)*$/)) {
      input.style.borderColor = 'orange';
      input.title = 'Format: item1, item2, item3';
    } else {
      input.style.borderColor = '';
      input.title = '';
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    console.log("=== UPDATE OBJECT DEBUG ===");
    console.log("Item type:", this.item.type);
    console.log("Form data keys:", Object.keys(formData));
    
    // Handle Track-specific data processing
    if (this.item.type === 'track') {
      formData = await this._updateTrackObject(formData);
    }
    
    // Handle multi-select fields specially
    const form = this.form;
    const sizeOptionsSelect = form.querySelector('select[name="system.sizeOptions"]');
    
    if (sizeOptionsSelect) {
      const selectedValues = Array.from(sizeOptionsSelect.selectedOptions).map(option => option.value);
      formData['system.sizeOptions'] = selectedValues;
      console.log("Multi-select size options:", selectedValues);
    }

    // Handle granted abilities specially to prevent data loss
    const grantedAbilitiesData = {};
    Object.keys(formData).forEach(key => {
      if (key.startsWith('system.grantedAbilities.')) {
        grantedAbilitiesData[key] = formData[key];
        delete formData[key]; // Remove from main formData to handle separately
      }
    });

    console.log("Granted abilities data extracted:", grantedAbilitiesData);

    // Process granted abilities data
    if (Object.keys(grantedAbilitiesData).length > 0) {
      const abilities = foundry.utils.duplicate(this.item.system.grantedAbilities || []);
      
      Object.keys(grantedAbilitiesData).forEach(key => {
        const match = key.match(/system\.grantedAbilities\.(\d+)\.(.+)/);
        if (match) {
          const index = parseInt(match[1]);
          const field = match[2];
          const value = grantedAbilitiesData[key];
          
          console.log(`Processing ability ${index}, field ${field}, value:`, value);
          
          // Ensure ability object exists
          if (!abilities[index]) {
            abilities[index] = {
              name: "",
              tags: [],
              type: "passive",
              description: ""
            };
          }
          
          // Handle tag fields specially
          if (field === 'tags' && typeof value === 'string') {
            abilities[index][field] = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
          } else {
            abilities[index][field] = value;
          }
        }
      });
      
      console.log("Final processed abilities:", abilities);
      formData['system.grantedAbilities'] = abilities;
    }

    // Handle array fields that come in as comma-separated strings
    const arrayFields = [
      'system.weapon.properties',
      'system.ancestryTags', 
      'system.characterTags',
      'system.tags'
    ];

    // Process array fields - ensure we're working with the actual form values
    for (const field of arrayFields) {
      if (formData[field] !== undefined) {
        if (typeof formData[field] === 'string') {
          // Convert comma-separated string to array
          const arrayValue = formData[field].split(',').map(s => s.trim()).filter(s => s.length > 0);
          formData[field] = arrayValue;
          console.log(`Converted ${field} to array:`, arrayValue);
        } else if (Array.isArray(formData[field])) {
          // If it's already an array, clean it up
          formData[field] = formData[field].map(s => String(s).trim()).filter(s => s.length > 0);
          console.log(`Cleaned array ${field}:`, formData[field]);
        }
      }
    }

    // Handle knack menu knackIds arrays
    Object.keys(formData).forEach(key => {
      if (key.includes('knackIds') && typeof formData[key] === 'string') {
        formData[key] = formData[key].split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
    });

    // Handle damage parts for weapons
    if (formData['system.weapon.damage.parts'] && typeof formData['system.weapon.damage.parts'] === 'string') {
      const parts = formData['system.weapon.damage.parts'].split(',').map(s => s.trim()).filter(s => s.length > 0);
      formData['system.weapon.damage.parts'] = parts;
    }

    console.log("Final form data being sent to super._updateObject:", formData);

    // Call the parent update first
    const result = await super._updateObject(event, formData);
    
    // Update knacksProvided after form submission for ancestry items
    if (this.item.type === 'ancestry') {
      await this._updateKnacksProvided();
    }
    
    return result;
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
}
