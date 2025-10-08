/**
 * Extended Item document for Z-Wolf Epic
 */
export class ZWolfItem extends Item {

  // ========================================
  // FOUNDRY LIFECYCLE OVERRIDES
  // ========================================

  /** @override */
  prepareData() {
    super.prepareData();
    // No additional preparation needed for items currently
  }
  
  /** @override */
  getRollData() {
    if (!this.actor) return super.getRollData();
    return this.actor.getRollData();
  }

  // ========================================
  // CHAT METHODS
  // ========================================

  /**
   * Post this item to chat
   * @returns {Promise<ChatMessage>}
   */
  async roll() {
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${this.type}] ${this.name}`;

    return ChatMessage.create({
      speaker: speaker,
      rollMode: rollMode,
      flavor: label,
      content: await this._getChatContent()
    });
  }

  /**
   * Get enriched content for chat display
   * @returns {Promise<string>} HTML content for chat
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
      console.error("Z-Wolf Epic | Error enriching chat content:", error);
      return `<div class="item-chat">
        <strong>${this.name}</strong>
        <div class="item-description">${description}</div>
      </div>`;
    }
  }

  // ========================================
  // GRANTED ABILITIES MANAGEMENT
  // ========================================

  /**
   * Add a new granted ability
   * @returns {Promise<void>}
   */
  async addGrantedAbility() {
    const abilities = this.system.grantedAbilities || {};
    
    // Find next available index
    const indices = Object.keys(abilities).map(k => parseInt(k)).filter(n => !isNaN(n));
    const nextIndex = indices.length > 0 ? Math.max(...indices) + 1 : 0;
    
    // Create new ability with item name as default
    abilities[nextIndex] = {
      name: this.name,
      tags: "",
      type: "passive",
      description: ""
    };
    
    await this.update({ "system.grantedAbilities": abilities });
  }

  /**
   * Remove a granted ability by index
   * @param {number} index - Index of ability to remove
   * @returns {Promise<void>}
   */
  async removeGrantedAbility(index) {
    const abilities = foundry.utils.deepClone(this.system.grantedAbilities || {});
    delete abilities[index];
    await this.update({ "system.grantedAbilities": abilities });
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
        tags: "",
        type: "passive",
        description: ""
      });
    }

    abilities[index][field] = typeof value === 'string' ? value : "";
    await this.update({ "system.grantedAbilities": abilities });
  }

  // ========================================
  // TRACK TIER ABILITIES MANAGEMENT
  // ========================================

  /**
   * Add a tier ability to a track item
   * @param {number} tier - Tier number (1-5)
   * @param {Object} abilityData - Optional initial ability data
   * @returns {Promise<void>}
   */
  async addTierAbility(tier, abilityData = {}) {
    if (this.type !== 'track' || tier < 1 || tier > 5) return;

    const newAbility = {
      name: abilityData.name || this.name,
      tags: abilityData.tags || "",
      type: abilityData.type || "passive",
      description: abilityData.description || ""
    };

    // Get current abilities as object
    const currentAbilities = foundry.utils.getProperty(
      this.system, 
      `tiers.tier${tier}.grantedAbilities`
    ) || {};
    
    // Find next available index
    const indices = Object.keys(currentAbilities).map(k => parseInt(k)).filter(n => !isNaN(n));
    const nextIndex = indices.length > 0 ? Math.max(...indices) + 1 : 0;
    
    // Add to abilities object
    const updatedAbilities = foundry.utils.duplicate(currentAbilities);
    updatedAbilities[nextIndex] = newAbility;

    const tierPath = `system.tiers.tier${tier}.grantedAbilities`;
    await this.update({ [tierPath]: updatedAbilities });
  }

  /**
   * Remove a tier ability from a track item
   * @param {number} tier - Tier number (1-5)
   * @param {number} abilityIndex - Index of ability to remove
   * @returns {Promise<void>}
   */
  async removeTierAbility(tier, abilityIndex) {
    if (this.type !== 'track' || tier < 1 || tier > 5) return;
    
    const tierPath = `system.tiers.tier${tier}.grantedAbilities`;
    const deletePath = `${tierPath}.-=${abilityIndex}`;
    
    // Use Foundry's deletion syntax
    await this.update({ [deletePath]: null });
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
    if (this.type !== 'track' || tier < 1 || tier > 5) return;

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

    abilities[abilityIndex][field] = typeof value === 'string' ? value : "";

    const tierPath = `system.tiers.tier${tier}.grantedAbilities`;
    await this.update({ [tierPath]: abilities });
  }

  // ========================================
  // KNACK MENU MANAGEMENT (ANCESTRY)
  // ========================================

  /**
   * Add a new knack menu (ancestry items only)
   * @param {Object} menuData - Optional initial menu data
   * @returns {Promise<void>}
   */
  async addKnackMenu(menuData = {}) {
    if (this.type !== 'ancestry') return;

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
    if (this.type !== 'ancestry') return;

    const menus = foundry.utils.duplicate(this.system.knackMenus || []);
    
    if (index >= 0 && index < menus.length) {
      menus.splice(index, 1);
      await this.update({ "system.knackMenus": menus });
      await this.updateKnacksProvided();
    }
  }

  /**
   * Update a knack menu field
   * @param {number} index - Index of menu to update
   * @param {string} field - Field name to update
   * @param {*} value - New value
   * @returns {Promise<void>}
   */
  async updateKnackMenuField(index, field, value) {
    if (this.type !== 'ancestry') return;

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
   * Update knacksProvided field when knack menus change
   * Only applies to ancestry and talent items
   * @returns {Promise<void>}
   */
  async updateKnacksProvided() {
    if (!['ancestry', 'talent'].includes(this.type)) return;

    const knackMenus = this.system.knackMenus || [];
    const totalKnacksProvided = knackMenus.reduce((sum, menu) => {
      return sum + (parseInt(menu.selectionCount) || 0);
    }, 0);
    
    // Only update if value changed
    if (this.system.knacksProvided !== totalKnacksProvided) {
      await this.update({ "system.knacksProvided": totalKnacksProvided });
    }
  }

  // ========================================
  // SOURCE ITEM TRACKING
  // ========================================

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
}
