import { getDefaultItemsForActor, generateProficienciesDescription } from "../data/default-items.mjs";

/**
 * Extended Actor document for Z-Wolf Epic
 */
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
    
    // Apply base creature inheritance for mooks/spawns
    if (['mook', 'spawn'].includes(this.type)) {
      this._applyBaseCreatureInheritance();
    }
    
    // Calculate other derived values
    this._prepareDerivedValues();
    
    // Apply vision side effects
    this._applyVisionSideEffects();
    
    // Add virtual default items
    this._addVirtualItems();
  }

  /** @override */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    this._initializePrototypeToken();
    this._setDefaultTokenDisposition();
  }

  // ========================================
  // CALCULATION HELPERS - STATIC METHODS
  // ========================================

  /**
   * Calculate vitality points based on function key
   * @param {string} functionKey - "standard" or "hardy"
   * @param {number} level - Character level
   * @param {number} vitalityBoostCount - Number of vitality boost items
   * @returns {number} Calculated vitality points
   * @static
   */
  static calculateVitality(functionKey, level, vitalityBoostCount) {
    const functions = {
      standard: (lvl, boosts) => 4 * (lvl + boosts),
      hardy: (lvl, boosts) => 5 * (lvl + boosts + 1)
    };
    
    const func = functions[functionKey] || functions.standard;
    return func(level, vitalityBoostCount);
  }

  /**
   * Calculate coast number based on function key
   * @param {string} functionKey - "standard" or "cunning"
   * @param {number} level - Character level
   * @returns {number} Calculated coast number
   * @static
   */
  static calculateCoast(functionKey, level) {
    const functions = {
      standard: () => 4,
      cunning: (lvl) => 5 + [7, 11, 16].filter(x => x <= lvl).length
    };
    
    const func = functions[functionKey] || functions.standard;
    return func(level);
  }

  // ========================================
  // CHARACTER DERIVED DATA
  // ========================================

  /**
   * Prepare derived data for character-type actors
   * Calculates max vitality and stamina from fundaments
   * @private
   */
  _prepareCharacterDerivedData() {
    const level = this.system.level || 0;
    
    // Initialize vitality and stamina objects if needed
    if (!this.system.vitalityPoints) {
      this.system.vitalityPoints = { value: 0, max: 0 };
    }
    if (!this.system.staminaPoints) {
      this.system.staminaPoints = { value: 0, max: 0 };
    }

    // Calculate maximums
    this.system.vitalityPoints.max = this._calculateMaxVitality(level);
    this.system.staminaPoints.max = this._calculateMaxStamina(level);
    this.system.coastNumber = this._calculateCoastNumber(level);
    
    // Clamp current values
    this.system.vitalityPoints.value = Math.min(
      this.system.vitalityPoints.value, 
      this.system.vitalityPoints.max
    );
    this.system.staminaPoints.value = Math.min(
      this.system.staminaPoints.value,
      this.system.staminaPoints.max
    );
  }

  /**
   * Calculate maximum vitality points from fundament
   * @param {number} level - Character level
   * @returns {number} Maximum vitality points
   * @private
   */
  _calculateMaxVitality(level) {
    const DEFAULT_VITALITY = 12;
    
    // Count vitality boost items
    const vitalityBoostCount = this.items.filter(i => i.name === "Extra VP").length;
    
    // Get fundament
    const fundament = this.system.fundamentId ? this.items.get(this.system.fundamentId) : null;
    if (!fundament?.system?.vitalityFunction) {
      return DEFAULT_VITALITY;
    }

    try {
      const result = ZWolfActor.calculateVitality(
        fundament.system.vitalityFunction,
        level,
        vitalityBoostCount
      );
      return Math.floor(result) || DEFAULT_VITALITY;
    } catch (error) {
      console.error(`Z-Wolf Epic | Error calculating vitality:`, error);
      return DEFAULT_VITALITY;
    }
  }

  /**
   * Calculate maximum stamina points
   * Currently always returns 4
   * @param {number} level - Character level  
   * @returns {number} Maximum stamina points
   * @private
   */
  _calculateMaxStamina(level) {
    return 4;
  }

  /**
   * Calculate coast number from fundament
   * @param {number} level - Character level
   * @returns {number} Coast number
   * @private
   */
  _calculateCoastNumber(level) {
    const DEFAULT_COAST = 4;
    
    const fundament = this.system.fundamentId ? this.items.get(this.system.fundamentId) : null;
    if (!fundament?.system?.coastFunction) {
      return DEFAULT_COAST;
    }

    try {
      const result = ZWolfActor.calculateCoast(
        fundament.system.coastFunction,
        level
      );
      return Math.floor(result) || DEFAULT_COAST;
    } catch (error) {
      console.error(`Z-Wolf Epic | Error calculating coast:`, error);
      return DEFAULT_COAST;
    }
  }

  /**
   * Prepare other derived values that depend on items
   * @private
   */
  _prepareDerivedValues() {
    if (!['pc', 'npc', 'eidolon'].includes(this.type)) return;
    
    this.system.totalKnacksProvided = this._calculateTotalKnacksProvided();
    this.system.effectiveSize = this._calculateEffectiveSize();
  }

  /**
   * Calculate total knacks provided by ancestry, fundament, and talents
   * @returns {number}
   * @private
   */
  _calculateTotalKnacksProvided() {
    let total = 0;
    
    // Ancestry
    if (this.system.ancestryId) {
      const ancestry = this.items.get(this.system.ancestryId);
      total += parseInt(ancestry?.system?.knacksProvided) || 0;
    }
    
    // Fundament
    if (this.system.fundamentId) {
      const fundament = this.items.get(this.system.fundamentId);
      total += parseInt(fundament?.system?.knacksProvided) || 0;
    }
    
    // Talents
    this.items.filter(i => i.type === 'talent').forEach(talent => {
      total += parseInt(talent.system?.knacksProvided) || 0;
    });
    
    return total;
  }

  // ========================================
  // VISION SYSTEM
  // ========================================

  /**
   * Apply vision side effects from items to actor system data
   * @private
   */
  _applyVisionSideEffects() {
    // Spawns inherit vision from base creature
    if (this.type === 'spawn') return;
    
    const ancestry = this.system.ancestryId ? this.items.get(this.system.ancestryId) : null;
    const fundament = this.system.fundamentId ? this.items.get(this.system.fundamentId) : null;
    
    const { nightsight, darkvision } = this._calculateHighestVisionValues(
      ancestry,
      fundament,
      this.items
    );
    
    this.system.nightsight = nightsight;
    this.system.darkvision = darkvision;
  }

  /**
   * Calculate the highest vision values from all items
   * @param {Item} ancestry - Ancestry item
   * @param {Item} fundament - Fundament item  
   * @param {Collection} allItems - All items on the actor
   * @returns {Object} Object with nightsight and darkvision values
   * @private
   */
  _calculateHighestVisionValues(ancestry, fundament, allItems) {
    let highestNightsight = 1; // Default 1m
    let highestDarkvision = 0.2; // Default 0.2m
    
    const checkVisionRadius = (item, type) => {
      if (!item?.system?.sideEffects) return;
      
      const value = parseFloat(item.system.sideEffects[type]);
      if (isNaN(value) || value === null || value === undefined) return;
      
      if (type === 'nightsightRadius' && value > highestNightsight) {
        highestNightsight = value;
      } else if (type === 'darkvisionRadius' && value > highestDarkvision) {
        highestDarkvision = value;
      }
    };
    
    // Check ancestry and fundament
    if (ancestry) {
      checkVisionRadius(ancestry, 'nightsightRadius');
      checkVisionRadius(ancestry, 'darkvisionRadius');
    }
    if (fundament) {
      checkVisionRadius(fundament, 'nightsightRadius');
      checkVisionRadius(fundament, 'darkvisionRadius');
    }
    
    // Check all other items
    const characterLevel = this.system.level || 0;
    
    allItems.forEach(item => {
      if (item.type === 'ancestry' || item.type === 'fundament') return;
      
      // Handle track items with tier-based vision
      if (item.type === 'track') {
        const trackItems = this.items.filter(i => i.type === 'track');
        const trackSlotIndex = item.getFlag('zwolf-epic', 'slotIndex') ?? 
                               trackItems.findIndex(t => t.id === item.id);
        const unlockedTiers = this._getTrackTiersForLevel(trackSlotIndex, characterLevel);
        
        checkVisionRadius(item, 'nightsightRadius');
        checkVisionRadius(item, 'darkvisionRadius');
        
        unlockedTiers.forEach(tierNumber => {
          const tierData = item.system.tiers?.[`tier${tierNumber}`];
          if (tierData?.sideEffects) {
            const tierItem = { 
              name: `${item.name} (Tier ${tierNumber})`, 
              system: { sideEffects: tierData.sideEffects } 
            };
            checkVisionRadius(tierItem, 'nightsightRadius');
            checkVisionRadius(tierItem, 'darkvisionRadius');
          }
        });
        return;
      }
      
      // Equipment placement filtering
      if (item.type === 'equipment') {
        const requiredPlacement = item.system.requiredPlacement;
        const currentPlacement = item.system.placement;
        
        if (requiredPlacement && requiredPlacement !== '' && requiredPlacement !== currentPlacement) {
          return;
        }
      }
      
      // Regular item vision check
      checkVisionRadius(item, 'nightsightRadius');
      checkVisionRadius(item, 'darkvisionRadius');
    });
    
    return {
      nightsight: highestNightsight,
      darkvision: highestDarkvision
    };
  }

  /**
   * Get the actor's nightsight range
   * @returns {number} The nightsight range in distance units
   */
  get nightsight() {
    return this.system.nightsight || 0;
  }

  /**
   * Set the actor's nightsight range
   * @param {number} value - The nightsight range
   */
  async setNightsight(value) {
    return this.update({"system.nightsight": value});
  }

  /**
   * Get the actor's darkvision range
   * @returns {number} The darkvision range in distance units
   */
  get darkvision() {
    return this.system.darkvision || 0;
  }

  /**
   * Set the actor's darkvision range
   * @param {number} value - The darkvision range
   */
  async setDarkvision(value) {
    return this.update({"system.darkvision": value});
  }

  /**
   * Get all vision ranges for this actor
   * @returns {Object} Object containing all vision ranges
   */
  get visionRanges() {
    return {
      bright: Infinity,
      nightsight: this.nightsight,
      darkvision: this.darkvision
    };
  }

  // ========================================
  // SIZE CALCULATIONS
  // ========================================

  /**
   * Calculate effective size including side effect modifications
   * @returns {string} The effective size key
   * @private
   */
  _calculateEffectiveSize() {
    const baseSize = this.system.size || "medium";
    const sizeOrder = ["diminutive", "tiny", "small", "medium", "large", "huge", "gargantuan", "colossal", "titanic"];
    const baseSizeIndex = sizeOrder.indexOf(baseSize);
    
    if (baseSizeIndex === -1) {
      console.warn(`Z-Wolf Epic | Invalid base size: ${baseSize}`);
      return baseSize;
    }
    
    let totalSizeSteps = 0;
    
    // Helper to add size steps from an item
    const addSizeSteps = (item) => {
      if (!item?.system?.sideEffects?.sizeSteps) return;
      
      const steps = parseInt(item.system.sideEffects.sizeSteps);
      if (!isNaN(steps) && steps !== 0) {
        totalSizeSteps += steps;
      }
    };
    
    // Check ancestry and fundament
    if (this.system.ancestryId) {
      const ancestry = this.items.get(this.system.ancestryId);
      if (ancestry) addSizeSteps(ancestry);
    }
    if (this.system.fundamentId) {
      const fundament = this.items.get(this.system.fundamentId);
      if (fundament) addSizeSteps(fundament);
    }
    
    // Check all other items
    const characterLevel = this.system.level || 0;
    
    this.items.forEach(item => {
      if (item.type === 'ancestry' || item.type === 'fundament') return;
      
      // Handle track items with tier-based size steps
      if (item.type === 'track') {
        const trackItems = this.items.filter(i => i.type === 'track');
        const trackSlotIndex = item.getFlag('zwolf-epic', 'slotIndex') ?? 
                               trackItems.findIndex(t => t.id === item.id);
        const unlockedTiers = this._getTrackTiersForLevel(trackSlotIndex, characterLevel);
        
        addSizeSteps(item);
        
        unlockedTiers.forEach(tierNumber => {
          const tierData = item.system.tiers?.[`tier${tierNumber}`];
          if (tierData?.sideEffects?.sizeSteps) {
            const tierItem = { 
              system: { sideEffects: tierData.sideEffects } 
            };
            addSizeSteps(tierItem);
          }
        });
        return;
      }
      
      // Equipment placement filtering
      if (item.type === 'equipment') {
        const requiredPlacement = item.system.requiredPlacement;
        const currentPlacement = item.system.placement;
        
        if (requiredPlacement && requiredPlacement !== '' && requiredPlacement !== currentPlacement) {
          return;
        }
      }
      
      // Regular item size steps check
      addSizeSteps(item);
    });
    
    // Calculate final size index
    const finalSizeIndex = Math.max(0, Math.min(sizeOrder.length - 1, baseSizeIndex + totalSizeSteps));
    return sizeOrder[finalSizeIndex];
  }

  /**
   * Get the actor's effective size including side effect modifications
   * @returns {string} The effective size key
   */
  get effectiveSize() {
    return this._calculateEffectiveSize();
  }

  // ========================================
  // BASE CREATURE INHERITANCE (MOOKS/SPAWNS)
  // ========================================

  /**
   * Apply inherited properties from base creature for summoned actors
   * @private
   */
  _applyBaseCreatureInheritance() {
    const baseCreatureId = this.system.baseCreatureId;
    if (!baseCreatureId) return;
    
    const baseCreature = game.actors.get(baseCreatureId);
    if (!baseCreature) {
      console.warn(`Z-Wolf Epic | ${this.name} references non-existent base creature: ${baseCreatureId}`);
      return;
    }
    
    // Inherit level
    this.system.level = baseCreature.system.level;
    
    // Inherit size (with modification for spawns)
    if (this.type === 'spawn') {
      this.system.size = this._calculateSpawnSize(baseCreature.system.size);
    } else if (this.type === 'mook') {
      this.system.size = baseCreature.system.size;
    }
    
    // Inherit tags
    this.system.tags = this._calculateTagsFromCreature(baseCreature);
    
    // Inherit vision for spawns
    if (this.type === 'spawn') {
      this.system.nightsight = baseCreature.nightsight || 1;
      this.system.darkvision = baseCreature.darkvision || 0.2;
    }
  }

  /**
   * Calculate spawn size (two categories smaller than base)
   * @param {string} baseSize - Base creature size
   * @returns {string} Spawn size
   * @private
   */
  _calculateSpawnSize(baseSize) {
    const sizeOrder = ["diminutive", "tiny", "small", "medium", "large", "huge", "gargantuan", "colossal", "titanic"];
    const baseSizeIndex = sizeOrder.indexOf(baseSize || "medium");
    const spawnSizeIndex = Math.max(0, baseSizeIndex - 2);
    return sizeOrder[spawnSizeIndex];
  }

  /**
   * Calculate character tags from a creature's items
   * @param {Actor} creature - The creature to calculate tags from
   * @returns {string} Comma-separated tags
   * @private
   */
  _calculateTagsFromCreature(creature) {
    const allTags = [];
    
    const parseTags = (tags) => {
      if (!tags) return [];
      if (Array.isArray(tags)) {
        return tags.filter(tag => tag && tag.trim().length > 0);
      }
      if (typeof tags === 'string') {
        return tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
      return [];
    };
    
    const characterLevel = creature.system.level || 0;
    
    creature.items.forEach(item => {
      // Handle track items with tier-based character tags
      if (item.type === 'track') {
        const trackItems = creature.items.filter(i => i.type === 'track');
        const trackSlotIndex = item.getFlag('zwolf-epic', 'slotIndex') ?? 
                               trackItems.findIndex(t => t.id === item.id);
        const unlockedTiers = this._getTrackTiersForLevel(trackSlotIndex, characterLevel);
        
        unlockedTiers.forEach(tierNumber => {
          const tierData = item.system.tiers?.[`tier${tierNumber}`];
          if (tierData?.characterTags) {
            const tierTags = parseTags(tierData.characterTags);
            allTags.push(...tierTags);
          }
        });
      } else if (item.system?.characterTags) {
        const itemTags = parseTags(item.system.characterTags);
        allTags.push(...itemTags);
      }
    });
    
    // Remove duplicates and sort
    const uniqueTags = [...new Set(allTags)].sort();
    return uniqueTags.length > 0 ? uniqueTags.join(', ') : 'Humanoid';
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
        texture: { src: this.img },
        displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
        sight: {
          enabled: true,
          range: 0,
          bright: Infinity
        },
        detectionModes: [],
        "flags.zwolf-epic.initialized": true
      };

      // Set bars based on actor type
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
   * @private
   */
  _setDefaultTokenSettings() {
    if (this.prototypeToken.name !== this.name) {
      this.prototypeToken.updateSource({ name: this.name });
    }
  }
  
  /**
   * Set token size based on actor's effective size
   * @private
   */
  _setTokenSizeFromActorSize() {
    const size = this.system.effectiveSize || this.system.size || "medium";
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
      disposition: dispositionMap[this.type] || CONST.TOKEN_DISPOSITIONS.NEUTRAL,
      actorLink: this.type === "pc"
    };
    
    this.prototypeToken.updateSource(updates);
  }

  // ========================================
  // VIRTUAL ITEMS
  // ========================================

  /**
   * Add virtual default items that all actors have
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

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get unlocked track tiers for a given level
   * @param {number} trackSlotIndex - Index of the track slot
   * @param {number} characterLevel - Character level
   * @returns {Array<number>} Array of unlocked tier numbers
   * @private
   */
  _getTrackTiersForLevel(trackSlotIndex, characterLevel) {
    const tierLevels = [];
    for (let tier = 1; tier <= 5; tier++) {
      const tierLevel = trackSlotIndex + 1 + ((tier - 1) * 4);
      if (characterLevel >= tierLevel) {
        tierLevels.push(tier);
      }
    }
    return tierLevels;
  }

  /**
   * Check if this actor is a summoned creature
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

// ========================================
// HOOKS FOR ACTOR UPDATES
// ========================================

/**
 * Update token sizes when actor effective size changes
 */
Hooks.on('updateActor', (actor, data, options, userId) => {
  const sizeChanged = data.system?.size !== undefined;
  
  if (sizeChanged || actor.system.effectiveSize) {
    const effectiveSize = actor.effectiveSize;
    const sizeData = CONFIG.ZWOLF?.sizes?.[effectiveSize];
    
    if (sizeData) {
      const targetScale = sizeData.tokenScale;
      
      actor.getActiveTokens().forEach(async token => {
        if (token.document.width !== targetScale || token.document.height !== targetScale) {
          await token.document.update({
            width: targetScale,
            height: targetScale
          });
        }
      });
    }
  }
});

/**
 * Update spawns/mooks when their base creature changes
 */
Hooks.on('updateActor', (actor, data, options, userId) => {
  const dependentActors = game.actors.filter(a => 
    ['mook', 'spawn'].includes(a.type) && 
    a.system.baseCreatureId === actor.id
  );
  
  if (dependentActors.length > 0) {
    dependentActors.forEach(dependent => {
      dependent.prepareData();
      if (dependent.sheet?.rendered) {
        dependent.sheet.render(false);
      }
    });
  }
});
