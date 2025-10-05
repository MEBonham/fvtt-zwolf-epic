import { ItemDataProcessor } from "../helpers/item-data-processor.mjs";

export class ZWolfItem extends Item {
  prepareData() {
    super.prepareData();
  }
  
  getRollData() {
    const rollData = super.getRollData();
    if (!rollData) return null;
    return rollData;
  }
  
  async roll() {
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${this.type}] ${this.name}`;

    ChatMessage.create({
      speaker: speaker,
      rollMode: rollMode,
      flavor: label,
      content: this.system.description ?? ''
    });
  }

  // module/documents/Item.mjs - Methods to add to your existing ZWolfItem class

  /**
   * Update knacksProvided field when knack menus change
   * Only applies to ancestry and talent items
   */
  async updateKnacksProvided() {
    if (!['ancestry', 'talent'].includes(this.type)) {
      return;
    }

    const knackMenus = this.system.knackMenus || [];
    const totalKnacksProvided = ItemDataProcessor.calculateKnacksProvided(knackMenus);
    
    // Only update if the value has changed to avoid unnecessary updates
    if (this.system.knacksProvided !== totalKnacksProvided) {
      await this.update({ "system.knacksProvided": totalKnacksProvided });
    }
  }

  /**
   * Add a new granted ability with proper structure
   * @param {Object} abilityData - Optional initial ability data
   * @returns {Promise<void>}
   */
  async addGrantedAbility() {
    const abilities = this.system.grantedAbilities || {};
    
    // Find the next available index
    const indices = Object.keys(abilities).map(k => parseInt(k)).filter(n => !isNaN(n));
    const nextIndex = indices.length > 0 ? Math.max(...indices) + 1 : 0;
    
    // Create new ability object with item name as default
    const newAbility = {
      name: this.name,  // Changed from "" to this.name
      tags: "",
      type: "passive",
      description: ""
    };
    
    // Add to abilities object
    abilities[nextIndex] = newAbility;
    
    // Update the document
    await this.update({
      [`system.grantedAbilities`]: abilities
    });
  }

  /**
   * Remove a granted ability by index
   * @param {number} index - Index of ability to remove
   * @returns {Promise<void>}
   */
  async removeGrantedAbility(index) {
    const abilities = foundry.utils.deepClone(this.system.grantedAbilities || {});
    
    // Remove the ability at the given index
    delete abilities[index];
    
    // Update the document
    await this.update({
      [`system.grantedAbilities`]: abilities
    });
  }

  /**
   * Update a specific granted ability field
   * @param {number} index - Index of ability to update
   * @param {string} field - Field name to update
   * @param {*} value - New value
   * @returns {Promise<void>}
   */
  async updateGrantedAbilityField(index, field, value) {
    const abilities = foundry.utils.duplicate(this.system.grantedAbilities || []);
    
    // Ensure ability exists at index
    while (abilities.length <= index) {
      abilities.push({
        name: "",
        tags: "", // Always a string
        type: "passive",
        description: ""
      });
    }

    // All fields are stored as strings now
    abilities[index][field] = typeof value === 'string' ? value : "";

    await this.update({ "system.grantedAbilities": abilities });
  }

  /**
   * Add a new knack menu (ancestry items only)
   * @param {Object} menuData - Optional initial menu data
   * @returns {Promise<void>}
   */
  async addKnackMenu(menuData = {}) {
    if (this.type !== 'ancestry') {
      return;
    }

    const newMenu = {
      name: menuData.name || "",
      description: menuData.description || "",
      selectionCount: menuData.selectionCount || 1,
      knackIds: menuData.knackIds || []
    };

    const menus = foundry.utils.duplicate(this.system.knackMenus || []);
    menus.push(newMenu);

    await this.update({ "system.knackMenus": menus });
    await this.updateKnacksProvided();
  }

  /**
   * Remove a knack menu by index (ancestry items only)
   * @param {number} index - Index of menu to remove
   * @returns {Promise<void>}
   */
  async removeKnackMenu(index) {
    if (this.type !== 'ancestry') {
      return;
    }

    const menus = foundry.utils.duplicate(this.system.knackMenus || []);
    
    if (index >= 0 && index < menus.length) {
      menus.splice(index, 1);
      await this.update({ "system.knackMenus": menus });
      await this.updateKnacksProvided();
    }
  }

  /**
   * Add a tier ability to a track item
   * @param {number} tier - Tier number (1-5)
   * @param {Object} abilityData - Optional initial ability data
   * @returns {Promise<void>}
   */
  async addTierAbility(tier, abilityData = {}) {
    console.log("=== ADD TIER ABILITY START ===");
    console.log("Item type:", this.type);
    console.log("Tier:", tier);
    console.log("Tier check passed:", this.type === 'track' && tier >= 1 && tier <= 5);
    
    if (this.type !== 'track' || tier < 1 || tier > 5) {
      console.log("Early return: invalid type or tier");
      return;
    }

    const newAbility = {
      name: abilityData.name || this.name,
      tags: abilityData.tags || "",
      type: abilityData.type || "passive",
      description: abilityData.description || ""
    };
    
    console.log("New ability:", newAbility);

    // Get current abilities as object, not array
    const currentAbilities = foundry.utils.getProperty(this.system, `tiers.tier${tier}.grantedAbilities`) || {};
    console.log("Current abilities:", currentAbilities);
    
    // Find the next available index
    const indices = Object.keys(currentAbilities).map(k => parseInt(k)).filter(n => !isNaN(n));
    const nextIndex = indices.length > 0 ? Math.max(...indices) + 1 : 0;
    
    console.log("Existing indices:", indices);
    console.log("Next index:", nextIndex);
    
    // Add to abilities object
    const updatedAbilities = foundry.utils.duplicate(currentAbilities);
    updatedAbilities[nextIndex] = newAbility;
    
    console.log("Updated abilities:", updatedAbilities);

    const tierPath = `system.tiers.tier${tier}.grantedAbilities`;
    console.log("Update path:", tierPath);
    console.log("Update data:", { [tierPath]: updatedAbilities });
    
    try {
      const result = await this.update({ [tierPath]: updatedAbilities });
      console.log("Update result:", result);
      console.log("=== ADD TIER ABILITY SUCCESS ===");
      return result;
    } catch (error) {
      console.error("=== ADD TIER ABILITY ERROR ===");
      console.error("Error:", error);
      console.error("Stack:", error.stack);
      throw error;
    }
  }

  /**
   * Remove a tier ability from a track item
   * @param {number} tier - Tier number (1-5)
   * @param {number} abilityIndex - Index of ability to remove
   * @returns {Promise<void>}
   */
  async removeTierAbility(tier, abilityIndex) {
    if (this.type !== 'track' || tier < 1 || tier > 5) {
      return;
    }
    
    console.log("=== REMOVE TIER ABILITY ===");
    console.log("Tier:", tier, "Index:", abilityIndex);
    
    const tierPath = `system.tiers.tier${tier}.grantedAbilities`;
    const deletePath = `${tierPath}.-=${abilityIndex}`;
    
    console.log("Delete path:", deletePath);
    
    // Use Foundry's deletion syntax
    const result = await this.update({ [deletePath]: null });
    
    console.log("Update result:", result);
    console.log("=== REMOVE COMPLETE ===");
    
    return result;
  }

  /**
   * Update a tier ability field
   * @param {number} tier - Tier number (1-5)
   * @param {number} abilityIndex - Index of ability to update
   * @param {string} field - Field name to update
   * @param {*} value - New value
   * @returns {Promise<void>}
   */
  async updateTierAbilityField(tier, abilityIndex, field, value) {
    if (this.type !== 'track' || tier < 1 || tier > 5) {
      return;
    }

    // Get current abilities as object
    const abilities = foundry.utils.duplicate(
      foundry.utils.getProperty(this.system, `tiers.tier${tier}.grantedAbilities`) || {}
    );

    // Ensure ability exists at index
    if (!abilities[abilityIndex]) {
      abilities[abilityIndex] = {
        name: "",
        tags: "",
        type: "passive",
        description: ""
      };
    }

    // Update the field
    abilities[abilityIndex][field] = typeof value === 'string' ? value : "";

    const tierPath = `system.tiers.tier${tier}.grantedAbilities`;
    await this.update({ [tierPath]: abilities });
  }

  /**
   * Update a knack menu field
   * @param {number} index - Index of menu to update
   * @param {string} field - Field name to update
   * @param {*} value - New value
   * @returns {Promise<void>}
   */
  async updateKnackMenuField(index, field, value) {
    if (this.type !== 'ancestry') {
      return;
    }

    const menus = foundry.utils.duplicate(this.system.knackMenus || []);
    
    if (index >= 0 && index < menus.length) {
      menus[index][field] = value;
      await this.update({ "system.knackMenus": menus });
      
      // Update knacks provided if selection count changed
      if (field === 'selectionCount') {
        await this.updateKnacksProvided();
      }
    }
  }

  /**
   * Get enriched content for chat display
   * @returns {Promise<string>} - HTML content for chat
   * @private
   */
  async _getChatContent() {
    const description = this.system.description || "";
    
    if (!description) {
      return `<div class="item-chat"><strong>${this.name}</strong></div>`;
    }

    try {
      const TextEditorImpl = foundry.applications.ux.TextEditor.implementation;
      const enriched = await TextEditorImpl.enrichHTML(description, {
        secrets: false,
        documents: true,
        links: true,
        async: true,
        rollData: this.getRollData()
      });
      
      return `<div class="item-chat">
        <strong>${this.name}</strong>
        <div class="item-description">${enriched}</div>
      </div>`;
    } catch (error) {
      console.error("Error enriching chat content:", error);
      return `<div class="item-chat">
        <strong>${this.name}</strong>
        <div class="item-description">${description}</div>
      </div>`;
    }
  }

  async _preUpdate(changed, options, user) {
    console.log("Item _preUpdate - changed data:", changed);
    console.log("Has sideEffects?", changed.system?.sideEffects);
    console.log("Has grantedProficiency?", changed.system?.sideEffects?.grantedProficiency);
    return super._preUpdate(changed, options, user);
  }

  /**
   * Get all Actor-embedded copies of this Item
   * @returns {Array<{actor: Actor, item: Item}>}
   */
  getEmbeddedCopies() {
    if (this.parent) return []; // Only works for world items
    
    const copies = [];
    for (let actor of game.actors) {
      for (let item of actor.items) {
        if (item.getFlag("zwolf-epic", "sourceId") === this.id) {
          copies.push({ actor, item });
        }
      }
    }
    return copies;
  }

  /**
   * Determine which fields should be synced based on item type
   * @returns {Array<string>} Field paths to sync
   */
  getSyncableFields() {
    // Fields that should NEVER sync (Actor-specific)
    const neverSync = ['quantity', 'placement'];
    
    // Base fields that sync for all items
    const baseFields = [
      'name',
      'img',
      'system.description',
      'system.grantedAbilities',
      'system.sideEffects',
      'system.tags'
    ];
    
    // Type-specific additions
    const typeSpecificFields = {
      ancestry: [
        'system.characterTags',
        'system.sizeOptions',
        'system.required',
        'system.knacksProvided',
        'system.knackMenu',
        'system.buildPoints'
      ],
      fundament: [
        'system.buildPoints',
        'system.knacksProvided',
        'system.requiredKnackTag',
        'system.vitalityFunction',
        'system.coastFunction'
      ],
      equipment: [
        'system.requiredPlacement',
        'system.price',
        'system.bulk',
        'system.structure'
      ],
      knack: [
        'system.characterTags',
        'system.required'
      ],
      track: [
        'system.required',
        'system.tiers'
      ],
      talent: [
        'system.characterTags',
        'system.required',
        'system.knacksProvided'
      ]
    };
    
    const typeFields = typeSpecificFields[this.type] || [];
    return [...baseFields, ...typeFields].filter(f => !neverSync.some(ns => f.includes(ns)));
  }

  /**
   * Push updates from this Item to all Actor copies
   * @param {Object} options - Options for the push operation
   * @param {Array<string>} options.fields - Specific fields to sync (defaults to all syncable)
   * @param {boolean} options.skipConfirm - Skip confirmation dialog
   * @returns {Promise<number>} Number of copies updated
   */
  async pushToActors(options = {}) {
    if (this.parent) {
      ui.notifications.warn("Can only push updates from world Items, not embedded copies");
      return 0;
    }
    
    const copies = this.getEmbeddedCopies();
    
    if (copies.length === 0) {
      ui.notifications.info(`No copies of "${this.name}" found on any Actors`);
      return 0;
    }
    
    // Determine which fields to sync
    const fieldsToSync = options.fields || this.getSyncableFields();
    
    // Build actor list for dialog
    const actorNames = [...new Set(copies.map(c => c.actor.name))].sort();
    const actorList = actorNames.length <= 10 
      ? actorNames.join(', ')
      : `${actorNames.slice(0, 10).join(', ')}, and ${actorNames.length - 10} more`;
    
    // Confirmation dialog (unless skipped)
    if (!options.skipConfirm) {
      const confirmed = await Dialog.confirm({
        title: "Push Updates to Actors",
        content: `
          <p>Update <strong>${copies.length}</strong> cop${copies.length === 1 ? 'y' : 'ies'} of <strong>"${this.name}"</strong>?</p>
          <p><strong>Affected Actors:</strong> ${actorList}</p>
          <p class="notification warning">
            <i class="fas fa-exclamation-triangle"></i>
            This will overwrite any manual changes made to these copies.
          </p>
          <details>
            <summary>Fields that will be updated (${fieldsToSync.length})</summary>
            <ul style="max-height: 200px; overflow-y: auto; font-size: 0.9em;">
              ${fieldsToSync.map(f => `<li>${f}</li>`).join('')}
            </ul>
          </details>
        `,
        options: { width: 480 }
      });
      
      if (!confirmed) return 0;
    }
    
    // Perform updates
    let updateCount = 0;
    const errors = [];
    
    for (let {actor, item} of copies) {
      try {
        const updateData = { _id: item.id };
        
        for (let fieldPath of fieldsToSync) {
          const value = foundry.utils.getProperty(this, fieldPath);
          if (value !== undefined) {
            foundry.utils.setProperty(updateData, fieldPath, foundry.utils.deepClone(value));
          }
        }
        
        await actor.updateEmbeddedDocuments("Item", [updateData]);
        updateCount++;
      } catch (error) {
        console.error(`Failed to update ${item.name} on ${actor.name}:`, error);
        errors.push(`${actor.name}: ${error.message}`);
      }
    }
    
    // Report results
    if (updateCount > 0) {
      ui.notifications.info(`Updated ${updateCount} cop${updateCount === 1 ? 'y' : 'ies'} of "${this.name}"`);
    }
    
    if (errors.length > 0) {
      ui.notifications.error(`Failed to update ${errors.length} items. Check console for details.`);
      console.error("Push to Actors errors:", errors);
    }
    
    return updateCount;
  }

  /**
   * Check if this is a copy of a world Item
   * @returns {Item|null} The source Item if this is a copy, null otherwise
   */
  getSourceItem() {
    if (!this.parent) return null; // World items have no source
    
    const sourceId = this.getFlag("zwolf-epic", "sourceId");
    if (!sourceId) return null;
    
    return game.items.get(sourceId);
  }
}
