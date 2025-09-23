export class ZWolfActor extends Actor {
  
  // ========================================
  // FOUNDRY LIFECYCLE OVERRIDES
  // ========================================
  
  /** @override */
  prepareData() {
    super.prepareData();
  }
  
  /** @override */
  prepareBaseData() {
    super.prepareBaseData();
    this._setDefaultTokenSettings();
    this._setTokenSizeFromActorSize();
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this._syncVisionToPrototypeToken();
  }
  
  /** @override */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    this._setDefaultTokenDisposition();
  }
  
  /** @override */
  getRollData() {
    const data = super.getRollData();
    
    // Add system data based on template structure
    data.attributes = this.system.attributes || {};
    data.skills = this.system.skills || {};
    data.level = this.system.level || 1;
    data.vitalityPoints = this.system.vitalityPoints || {};
    
    // Add type-specific data
    if (["pc", "npc"].includes(this.type)) {
      data.wealth = this.system.wealth || 0;
      data.staminaPoints = this.system.staminaPoints || {};
    }
    if (this.type === "pc") {
      data.karmaPoints = this.system.karmaPoints || {};
      data.staminaPoints = this.system.staminaPoints || {};
    }
    
    return data;
  }

  // ========================================
  // VISION SYSTEM
  // ========================================

  /**
   * Get the actor's nightsight range (vision in dim light conditions)
   * @returns {number} The nightsight range in distance units
   */
  get nightsight() {
    return this.system.nightsight || 0;
  }

  /**
   * Set the actor's nightsight range
   * @param {number} value - The nightsight range in distance units
   */
  async setNightsight(value) {
    return this.update({"system.nightsight": value});
  }

  /**
   * Get the actor's darkvision range (vision in darkness)
   * This pulls from the prototype token's dim vision range
   * @returns {number} The darkvision range in distance units
   */
  get darkvision() {
    return this.prototypeToken.sight?.range || 0;
  }

  /**
   * Set the actor's darkvision range
   * This updates the prototype token's dim vision range
   * @param {number} value - The darkvision range in distance units
   */
  async setDarkvision(value) {
    return this.update({"prototypeToken.sight.range": value});
  }

  /**
   * Get all vision ranges for this actor
   * @returns {Object} Object containing all vision ranges
   */
  get visionRanges() {
    return {
      bright: Infinity, // Always infinite in Z-Wolf Epic
      nightsight: this.nightsight,
      darkvision: this.darkvision
    };
  }

  /**
   * Apply vision settings to prototype token based on actor vision data
   * Called during prepareDerivedData to ensure prototype token stays in sync
   * @private
   */
  _syncVisionToPrototypeToken() {
    // Sync darkvision to sight.range
    if (this.prototypeToken.sight?.range !== this.darkvision) {
      this.prototypeToken.updateSource({
        "sight.range": this.darkvision
      });
    }
    
    // Sync nightsight to prototype token flags
    const currentNightsight = this.prototypeToken.getFlag('zwolf-epic', 'nightsight');
    if (currentNightsight !== this.nightsight) {
      this.prototypeToken.updateSource({
        "flags.zwolf-epic.nightsight": this.nightsight
      });
    }
  }

  // ========================================
  // TOKEN CONFIGURATION
  // ========================================
  
  /**
   * Set default prototype token settings if not already set
   * @private
   */
  _setDefaultTokenSettings() {
    if (!this.prototypeToken.name) {
      const tokenConfig = {
        name: this.name,
        displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
        sight: {
          enabled: true,
          range: 0
        }
      };

      // Only show bars for pc and npc types
      if (["pc", "npc"].includes(this.type)) {
        tokenConfig.displayBars = CONST.TOKEN_DISPLAY_MODES.ALWAYS;
        tokenConfig.bar1 = { attribute: "vitalityPoints" };
        tokenConfig.bar2 = { attribute: null }; // Explicitly no second bar
      } else {
        tokenConfig.displayBars = CONST.TOKEN_DISPLAY_MODES.NONE;
        tokenConfig.bar1 = { attribute: null };
        tokenConfig.bar2 = { attribute: null };
      }

      this.prototypeToken.updateSource(tokenConfig);
    }
  }
  
  /**
   * Set token size based on actor size from system data
   * @private
   */
  _setTokenSizeFromActorSize() {
    const size = this.system.size || "medium";
    const sizeData = CONFIG.ZWOLF?.sizes?.[size];
    
    if (sizeData && !this.prototypeToken.width) {
      this.prototypeToken.updateSource({
        width: sizeData.tokenScale,
        height: sizeData.tokenScale
      });
    }
  }

  /**
   * Set appropriate token disposition based on actor type
   * @private
   */
  _setDefaultTokenDisposition() {
    const dispositionMap = {
      pc: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
      npc: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
      eidolon: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
      mook: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
      spawn: CONST.TOKEN_DISPOSITIONS.HOSTILE
    };
    
    const updates = {
      disposition: dispositionMap[this.type] || CONST.TOKEN_DISPOSITIONS.NEUTRAL
    };
    
    // Set actor link based on type
    if (this.type === "pc") {
      updates.actorLink = true;
    } else {
      updates.actorLink = false;
    }
    
    this.prototypeToken.updateSource(updates);
  }

  // ========================================
  // ACTOR PROPERTIES & UTILITIES
  // ========================================
  
  /**
   * Check if this actor is a summoned creature (eidolon, mook, or spawn)
   * @returns {boolean}
   */
  get isSummoned() {
    return ["eidolon", "mook", "spawn"].includes(this.type);
  }
  
  /**
   * Check if this actor is a player character
   * @returns {boolean}
   */
  get isPC() {
    return this.type === "pc";
  }
  
  /**
   * Get the actor's effective level for calculations
   * @returns {number}
   */
  get effectiveLevel() {
    return this.system.level || 1;
  }
}
