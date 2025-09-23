export class ZWolfItem extends Item {
  
  /** @override */
  prepareData() {
    super.prepareData();
  }
  
  /** @override */
  prepareBaseData() {
    super.prepareBaseData();
    this._prepareTypeSpecificData();
  }
  
  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this._calculateDerivedValues();
  }
  
  /** @override */
  getRollData() {
    const rollData = super.getRollData();
    if (!rollData) return null;
    
    // Add item-specific roll data
    rollData.tags = this.system.tags || [];
    rollData.buildPoints = this.system.buildPoints || 0;
    
    if (this.actor) {
      rollData.actor = this.actor.getRollData();
    }
    
    return rollData;
  }
  
  /**
   * Roll this item to chat
   * @param {Object} options - Rolling options
   * @returns {Promise<ChatMessage>}
   */
  async roll(options = {}) {
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = options.rollMode || game.settings.get('core', 'rollMode');
    const label = `[${this.type.capitalize()}] ${this.name}`;
    
    const chatData = {
      speaker: speaker,
      rollMode: rollMode,
      flavor: label,
      content: await this._getChatContent()
    };
    
    return ChatMessage.create(chatData);
  }
  
  /**
   * Prepare type-specific data during base data preparation
   * @private
   */
  _prepareTypeSpecificData() {
    switch (this.type) {
      case "equipment":
        this._prepareEquipmentData();
        break;
      case "track":
        this._prepareTrackData();
        break;
      case "ancestry":
        this._prepareAncestryData();
        break;
      case "fundament":
        this._prepareFundamentData();
        break;
    }
  }
  
  /**
   * Calculate derived values for the item
   * @private
   */
  _calculateDerivedValues() {
    // Calculate total bulk for equipment
    if (this.type === "equipment") {
      this.system.totalBulk = (this.system.bulk || 0) * (this.system.quantity || 1);
    }
    
    // Calculate build point costs for character options
    if (["ancestry", "fundament", "knack", "talent"].includes(this.type)) {
      this.system.effectiveBuildPoints = this._calculateEffectiveBuildPoints();
    }
  }
  
  /**
   * Prepare equipment-specific data
   * @private
   */
  _prepareEquipmentData() {
    // Ensure placement is valid
    const validPlacements = ["stowed", "readied", "worn"];
    if (!validPlacements.includes(this.system.placement)) {
      this.system.placement = "stowed";
    }
    
    // Set default structure if not set
    if (!this.system.structure) {
      this.system.structure = 10;
    }
  }
  
  /**
   * Prepare track-specific data
   * @private
   */
  _prepareTrackData() {
    // Ensure all tiers exist
    for (let i = 1; i <= 5; i++) {
      const tierKey = `tier${i}`;
      if (!this.system.tiers[tierKey]) {
        this.system.tiers[tierKey] = {
          talentMenu: {},
          grantedAbilities: {},
          characterTags: [],
          sideEffects: this._getDefaultSideEffects()
        };
      }
    }
  }
  
  /**
   * Prepare ancestry-specific data
   * @private
   */
  _prepareAncestryData() {
    // Ensure size options include at least medium
    if (!this.system.sizeOptions || this.system.sizeOptions.length === 0) {
      this.system.sizeOptions = ["medium"];
    }
    
    // Initialize knack menus if not present
    if (!this.system.knackMenus) {
      this.system.knackMenus = [];
    }
  }
  
  /**
   * Prepare fundament-specific data
   * @private
   */
  _prepareFundamentData() {
    // Set default vitality and coast functions if empty
    if (!this.system.vitalityFunction) {
      this.system.vitalityFunction = "12";
    }
    if (!this.system.coastFunction) {
      this.system.coastFunction = "4";
    }
  }
  
  /**
   * Calculate effective build points considering modifiers
   * @private
   * @returns {number}
   */
  _calculateEffectiveBuildPoints() {
    let points = this.system.buildPoints || 0;
    
    // Add any build point modifiers from side effects or other sources
    // This could be extended based on your game's rules
    
    return points;
  }
  
  /**
   * Get default side effects structure
   * @private
   * @returns {Object}
   */
  _getDefaultSideEffects() {
    return {
      speedProgression: "",
      toughnessTNProgression: "",
      destinyTNProgression: "",
      nightsightRadius: null,
      darkvisionRadius: null,
      knacksProvided: 0
    };
  }
  
  /**
   * Generate chat content for this item
   * @private
   * @returns {Promise<string>}
   */
  async _getChatContent() {
    const description = this.system.description || "No description available.";
    
    let content = `<div class="zwolf-item-chat">`;
    content += `<div class="item-description">${description}</div>`;
    
    // Add type-specific information
    switch (this.type) {
      case "equipment":
        content += this._getEquipmentChatInfo();
        break;
      case "knack":
      case "talent":
        content += this._getAbilityChatInfo();
        break;
      case "track":
        content += this._getTrackChatInfo();
        break;
    }
    
    content += `</div>`;
    return content;
  }
  
  /**
   * Get equipment-specific chat information
   * @private
   * @returns {string}
   */
  _getEquipmentChatInfo() {
    let info = `<div class="equipment-info">`;
    if (this.system.bulk > 0) {
      info += `<div><strong>Bulk:</strong> ${this.system.bulk}</div>`;
    }
    if (this.system.price > 0) {
      info += `<div><strong>Price:</strong> ${this.system.price}</div>`;
    }
    info += `</div>`;
    return info;
  }
  
  /**
   * Get ability (knack/talent) chat information
   * @private
   * @returns {string}
   */
  _getAbilityChatInfo() {
    let info = ``;
    if (this.system.tags && this.system.tags.length > 0) {
      info += `<div><strong>Tags:</strong> ${this.system.tags.join(", ")}</div>`;
    }
    return info;
  }
  
  /**
   * Get track-specific chat information
   * @private
   * @returns {string}
   */
  _getTrackChatInfo() {
    return `<div><em>Track with 5 tiers of advancement</em></div>`;
  }
  
  /**
   * Check if this item has side effects
   * @returns {boolean}
   */
  get hasSideEffects() {
    const sideEffects = this.system.sideEffects;
    if (!sideEffects) return false;
    
    return Object.values(sideEffects).some(effect => 
      effect !== "" && effect !== null && effect !== 0
    );
  }
  
  /**
   * Check if this item grants abilities
   * @returns {boolean}
   */
  get grantsAbilities() {
    const abilities = this.system.grantedAbilities;
    return abilities && Object.keys(abilities).length > 0;
  }
  
  /**
   * Get all tags associated with this item
   * @returns {Array<string>}
   */
  get allTags() {
    const tags = [...(this.system.tags || [])];
    if (this.system.characterTags) {
      tags.push(...this.system.characterTags);
    }
    if (this.system.ancestryTags) {
      tags.push(...this.system.ancestryTags);
    }
    return [...new Set(tags)]; // Remove duplicates
  }
}