import { calculateVitality, calculateCoast } from "../helpers/calculations.js";
import { getDefaultItemsForActor, generateProficienciesDescription } from "../data/default-items.mjs";

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
    
    // Calculate max vitality and stamina FIRST (before other derived values)
    if (['pc', 'npc', 'eidolon'].includes(this.type)) {
      this._prepareCharacterDerivedData();
    }
    
    // Calculate other derived values like knacks, build points, etc.
    this._prepareDerivedValues();
  
    // Add virtual default items - ADD THIS LINE
    this._addVirtualItems();
    
    // Sync vision to prototype token
    this._syncVisionToPrototypeToken();
  }

  /**
   * Prepare derived data for character-type actors
   * Calculates max vitality and stamina from fundaments
   * @private
   */
  _prepareCharacterDerivedData() {
    const level = this.system.level || 0;
    const vitalityBoostCount = this.system.vitalityBoostCount || 0;
    
    // Calculate max vitality from fundament
    const maxVitality = this._calculateMaxVitality(level, vitalityBoostCount);
    this.system.vitalityPoints.max = maxVitality;
    
    // Calculate max stamina from fundament
    const maxStamina = this._calculateMaxStamina(level);
    this.system.staminaPoints.max = maxStamina;
    
    // Update coast number to match max stamina
    this.system.coastNumber = maxStamina;
    
    // Ensure current values don't exceed max
    if (this.system.vitalityPoints.value > maxVitality) {
      this.system.vitalityPoints.value = maxVitality;
    }
    
    if (this.system.staminaPoints.value > maxStamina) {
      this.system.staminaPoints.value = maxStamina;
    }
    
    console.log(`Z-Wolf Epic | Derived Data - Level: ${level}, Max VP: ${maxVitality}, Max SP: ${maxStamina}`);
  }

  /**
   * Calculate maximum vitality points from fundament
   * @param {number} level - Character level
   * @param {number} vitalityBoostCount - Number of vitality boost items
   * @returns {number} Maximum vitality points
   * @private
   */
  _calculateMaxVitality(level, vitalityBoostCount) {
    const defaultVitality = 10;
    
    // Get fundament item if assigned
    const fundamentId = this.system.fundamentId;
    if (!fundamentId) {
      return defaultVitality;
    }
    
    const fundament = this.items.get(fundamentId);
    if (!fundament || !fundament.system) {
      return defaultVitality;
    }

    // Get the vitality function key
    const vitalityFunctionKey = fundament.system.vitalityFunction;
    if (!vitalityFunctionKey || !vitalityFunctionKey.trim()) {
      return defaultVitality;
    }

    // Use the imported calculation function
    try {
      const result = calculateVitality(
        vitalityFunctionKey,
        level,
        vitalityBoostCount
      );
      
      if (typeof result === 'number' && !isNaN(result) && result > 0) {
        return Math.floor(result);
      }
    } catch (error) {
      console.error(`Z-Wolf Epic | Error calculating vitality:`, error);
    }

    return defaultVitality;
  }

  /**
   * Calculate maximum stamina/coast from fundament
   * @param {number} level - Character level
   * @returns {number} Maximum stamina points
   * @private
   */
  _calculateMaxStamina(level) {
    const defaultCoast = 4;
    
    // Get fundament item if assigned
    const fundamentId = this.system.fundamentId;
    if (!fundamentId) {
      return defaultCoast;
    }
    
    const fundament = this.items.get(fundamentId);
    if (!fundament || !fundament.system) {
      return defaultCoast;
    }

    // Get the coast function key
    const coastFunctionKey = fundament.system.coastFunction;
    if (!coastFunctionKey || !coastFunctionKey.trim()) {
      return defaultCoast;
    }

    try {
      const result = calculateCoast(coastFunctionKey, level);
      
      if (typeof result === 'number' && !isNaN(result) && result > 0) {
        return Math.floor(result);
      }
    } catch (error) {
      console.error(`Z-Wolf Epic | Error calculating coast:`, error);
    }

    return defaultCoast;
  }

  /**
   * Prepare derived values that depend on items
   * @private
   */
  _prepareDerivedValues() {
    // Only calculate for character types
    if (!['pc', 'npc', 'eidolon'].includes(this.type)) return;
    
    // Calculate total knacks provided
    this.system.totalKnacksProvided = this._calculateTotalKnacksProvided();
    
    // You can add other derived calculations here as needed
  }

  /**
   * Calculate total knacks provided by ancestry, fundament, and talents
   * @returns {number}
   * @private
   */
  _calculateTotalKnacksProvided() {
    let totalKnacks = 0;
    
    // Get knacks from ancestry
    if (this.system.ancestryId) {
      const ancestryItem = this.items.get(this.system.ancestryId);
      if (ancestryItem?.system?.knacksProvided) {
        const knacks = parseInt(ancestryItem.system.knacksProvided) || 0;
        console.log(`Z-Wolf Epic | Ancestry "${ancestryItem.name}" provides ${knacks} knacks`);
        totalKnacks += knacks;
      }
    }
    
    // Get knacks from fundament
    if (this.system.fundamentId) {
      const fundamentItem = this.items.get(this.system.fundamentId);
      if (fundamentItem?.system?.knacksProvided) {
        const knacks = parseInt(fundamentItem.system.knacksProvided) || 0;
        console.log(`Z-Wolf Epic | Fundament "${fundamentItem.name}" provides ${knacks} knacks`);
        totalKnacks += knacks;
      }
    }
    
    // Get knacks from all talent items
    const talentItems = this.items.filter(item => item.type === 'talent');
    talentItems.forEach((talent) => {
      if (talent.system?.knacksProvided) {
        const knacks = parseInt(talent.system.knacksProvided) || 0;
        console.log(`Z-Wolf Epic | Talent "${talent.name}" provides ${knacks} knacks`);
        totalKnacks += knacks;
      }
    });
    
    console.log(`Z-Wolf Epic | Total knacks provided: ${totalKnacks}`);
    return totalKnacks;
  }

  /** @override */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    
    // Initialize prototype token settings on creation
    this._initializePrototypeToken();
    this._setDefaultTokenDisposition();
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
   * Initialize prototype token settings for new actors
   * @private
   */
  _initializePrototypeToken() {
    const needsInitialization = !this.prototypeToken.flags?.['zwolf-epic']?.initialized;
    
    if (needsInitialization) {
      const tokenConfig = {
        name: this.name,
        texture: {
          src: this.img  // Use actor image for token
        },
        displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
        sight: {
          enabled: true,
          range: 0
        },
        "flags.zwolf-epic.initialized": true
      };

      // Only show bars for pc and npc types
      if (["pc", "npc"].includes(this.type)) {
        tokenConfig.displayBars = CONST.TOKEN_DISPLAY_MODES.ALWAYS;
        tokenConfig.bar1 = { attribute: "vitalityPoints" };
        tokenConfig.bar2 = { attribute: null };
      } else {
        tokenConfig.displayBars = CONST.TOKEN_DISPLAY_MODES.NONE;
        tokenConfig.bar1 = { attribute: null };
        tokenConfig.bar2 = { attribute: null };
      }

      this.update({ prototypeToken: tokenConfig });
    }
  }

  /**
   * Set default prototype token settings if not already set
   * Called during prepareBaseData to keep token in sync
   * @private
   */
  _setDefaultTokenSettings() {
    // Just ensure the token name stays synced with actor name
    if (this.prototypeToken.name !== this.name) {
      this.prototypeToken.updateSource({ name: this.name });
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

  /** @override */
  async _preUpdate(changed, options, user) {
    console.log('🔵 Actor _preUpdate called with:', changed);
    console.trace();
    return super._preUpdate(changed, options, user);
  }

  /**
   * Add virtual default items that all actors have
   * These items are not stored in the database but appear in collections
   * @private
   */
  _addVirtualItems() {
    const virtualItems = getDefaultItemsForActor(this.type);
    
    virtualItems.forEach(itemData => {
      // Check if already exists
      if (this.items.has(itemData._id)) {
        const existingItem = this.items.get(itemData._id);
        
        // Update dynamic content on existing item
        if (itemData.flags?.['zwolf-epic']?.isDynamic && itemData._id === "ZWVirtualProfs00") {
          existingItem.system.grantedAbilities[0].description = generateProficienciesDescription(this);
        }
        return;
      }
      
      // Update dynamic content for new items
      if (itemData.flags?.['zwolf-epic']?.isDynamic && itemData._id === "ZWVirtualProfs00") {
        itemData.system.grantedAbilities[0].description = generateProficienciesDescription(this);
      }
      
      // Create virtual item
      const item = new CONFIG.Item.documentClass(itemData, { parent: this });
      this.items.set(item.id, item);
    });
  }
}