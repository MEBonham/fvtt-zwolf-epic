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
    
    // Apply base creature inheritance for mooks/spawns
    if (['mook', 'spawn'].includes(this.type)) {
      this._applyBaseCreatureInheritance();
    }
    
    // Calculate other derived values like knacks, build points, etc.
    this._prepareDerivedValues();

    // Apply vision side effects to actor system data
    this._applyVisionSideEffects();

    // Add virtual default items
    this._addVirtualItems();
  }

  /**
   * Prepare derived data for character-type actors
   * Calculates max vitality and stamina from fundaments
   * @private
   */
  _prepareCharacterDerivedData() {
    const level = this.system.level || 0;
    const vitalityBoostCount = this.system.vitalityBoostCount || 0;

    // Initialize vitality and stamina objects if they don't exist
    if (!this.system.vitalityPoints) {
      this.system.vitalityPoints = { value: 0, max: 0 };
    }
    
    if (!this.system.staminaPoints) {
      this.system.staminaPoints = { value: 0, max: 0 };
    }

    // Calculate max vitality from fundament (boost count calculated automatically)
    const maxVitality = this._calculateMaxVitality(level);
    this.system.vitalityPoints.max = maxVitality;
    
    // Calculate max stamina (always 4 for now)
    const maxStamina = this._calculateMaxStamina(level);
    this.system.staminaPoints.max = maxStamina;
    
    // Calculate coast number separately (can be different from stamina)
    const coastNumber = this._calculateCoastNumber(level);
    this.system.coastNumber = coastNumber;
    
    // Ensure current values don't exceed max
    if (this.system.vitalityPoints.value > maxVitality) {
      this.system.vitalityPoints.value = maxVitality;
    }
    
    if (this.system.staminaPoints.value > maxStamina) {
      this.system.staminaPoints.value = maxStamina;
    }
    
    console.log(`Z-Wolf Epic | Derived Data - Level: ${level}, Max VP: ${maxVitality}, Max SP: ${maxStamina}, Coast: ${coastNumber}`);
  }

  /**
   * Calculate maximum vitality points from fundament
   * @param {number} level - Character level
   * @param {number} vitalityBoostCount - Number of vitality boost items (optional, will be calculated if not provided)
   * @returns {number} Maximum vitality points
   * @private
   */
  _calculateMaxVitality(level, vitalityBoostCount = null) {
    const defaultVitality = 12;
    
    // Calculate vitality boost count in real-time if not provided
    if (vitalityBoostCount === null) {
      const extraVPItems = this.items.filter(item => {
        return item.name === "Extra VP";
      });
      vitalityBoostCount = extraVPItems.length;
    }
    
    // Get fundament item if assigned
    const fundamentId = this.system.fundamentId;
    
    if (!fundamentId) {
      return defaultVitality;
    }
    
    const fundament = this.items.get(fundamentId);
    
    if (!fundament || !fundament.system) {
      console.log("No valid fundament found, returning default:", defaultVitality);
      return defaultVitality;
    }

    // Get the vitality function key
    const vitalityFunctionKey = fundament.system.vitalityFunction;
    
    if (!vitalityFunctionKey || !vitalityFunctionKey.trim()) {
      console.log("No vitality function, returning default:", defaultVitality);
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
        const finalResult = Math.floor(result);
        return finalResult;
      }
    } catch (error) {
      console.error(`Z-Wolf Epic | Error calculating vitality:`, error);
    }

    return defaultVitality;
  }

  /**
   * Calculate maximum stamina points
   * Currently always returns 4 (no boosts implemented yet)
   * @param {number} level - Character level
   * @returns {number} Maximum stamina points
   * @private
   */
  _calculateMaxStamina(level) {
    // Stamina is always 4 for now (no boosts implemented yet)
    return 4;
  }

  /**
   * Calculate coast number from fundament
   * @param {number} level - Character level
   * @returns {number} Coast number
   * @private
   */
  _calculateCoastNumber(level) {
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
    
    // Calculate effective size
    this.system.effectiveSize = this._calculateEffectiveSize();
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

  /**
   * Apply vision side effects from items to actor system data
   * @private
   */
  _applyVisionSideEffects() {
    // Spawns inherit vision from base creature, don't calculate from own items
    if (this.type === 'spawn') {
      console.log(`Z-Wolf Epic | Spawn ${this.name} using inherited vision values`);
      return;
    }
    
    // Get ancestry and fundament
    const ancestry = this.system.ancestryId ? this.items.get(this.system.ancestryId) : null;
    const fundament = this.system.fundamentId ? this.items.get(this.system.fundamentId) : null;
    
    // ... rest of the existing method

  /**
   * Calculate the highest vision values from all items
   * @param {Object} ancestry - Ancestry item
   * @param {Object} fundament - Fundament item  
   * @param {Collection} allItems - All items on the actor
   * @returns {Object} Object with nightsight and darkvision values
   * @private
   */
  _calculateHighestVisionValues(ancestry, fundament, allItems) {
    let highestNightsight = 1; // Default 1m
    let highestDarkvision = 0.2; // Default 0.5m
    
    const checkVisionRadius = (item, type) => {
      if (!item?.system?.sideEffects) return;
      
      const value = parseFloat(item.system.sideEffects[type]);
      if (isNaN(value) || value === null || value === undefined) return;
      
      if (type === 'nightsightRadius' && value > highestNightsight) {
        highestNightsight = value;
        console.log(`Z-Wolf Epic | ${item.name} provides nightsight: ${value}m`);
      } else if (type === 'darkvisionRadius' && value > highestDarkvision) {
        highestDarkvision = value;
        console.log(`Z-Wolf Epic | ${item.name} provides darkvision: ${value}m`);
      }
    };
    
    // Check ancestry
    if (ancestry) {
      checkVisionRadius(ancestry, 'nightsightRadius');
      checkVisionRadius(ancestry, 'darkvisionRadius');
    }
    
    // Check fundament
    if (fundament) {
      checkVisionRadius(fundament, 'nightsightRadius');
      checkVisionRadius(fundament, 'darkvisionRadius');
    }
    
    // Check all other items (including tracks with tiers)
    if (allItems) {
      const characterLevel = this.system.level || 0;
      
      allItems.forEach(item => {
        if (item.type === 'ancestry' || item.type === 'fundament') return;
        
        // Handle track items with tier-based vision
        if (item.type === 'track') {
          const trackItems = this.items.filter(i => i.type === 'track');
          const trackSlotIndex = item.getFlag('zwolf-epic', 'slotIndex') ?? trackItems.findIndex(t => t.id === item.id);
          const unlockedTiers = this._getTrackTiersForLevel(trackSlotIndex, characterLevel);
          
          // Check base track vision
          checkVisionRadius(item, 'nightsightRadius');
          checkVisionRadius(item, 'darkvisionRadius');
          
          // Check tier-specific vision
          unlockedTiers.forEach(tierNumber => {
            const tierData = item.system.tiers?.[`tier${tierNumber}`];
            if (tierData?.sideEffects) {
              const tierItem = { name: `${item.name} (Tier ${tierNumber})`, system: { sideEffects: tierData.sideEffects } };
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
    }
    
    return {
      nightsight: highestNightsight,
      darkvision: highestDarkvision
    };
  }

  /**
   * Helper to get unlocked track tiers for a given level
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

  /** @override */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    
    // Initialize prototype token settings on creation
    this._initializePrototypeToken();
    this._setDefaultTokenDisposition();
  }

  // ========================================
  // VISION SYSTEM - SIMPLIFIED FOR V13
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
   * Now stored in system data instead of prototype token
   * @returns {number} The darkvision range in distance units
   */
  get darkvision() {
    return this.system.darkvision || 0;
  }

  /**
   * Set the actor's darkvision range
   * @param {number} value - The darkvision range in distance units
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
      bright: Infinity, // Always infinite in Z-Wolf Epic
      nightsight: this.nightsight,
      darkvision: this.darkvision
    };
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
          range: 0,  // No default sight range - only what vision system provides
          bright: Infinity  // Always infinite bright sight
        },
        detectionModes: [],  // Start empty - vision system will populate
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
   * Set token size based on actor's effective size from system data
   * @private
   */
  _setTokenSizeFromActorSize() {
    // Use effective size if available, otherwise fall back to base size
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

  /**
   * Calculate effective size including side effect modifications
   * @returns {string} The effective size key
   * @private
   */
  _calculateEffectiveSize() {
    const baseSize = this.system.size || "medium";
    const sizeOrder = ["diminutive", "tiny", "small", "medium", "large", "huge", "gargantuan", "colossal"];
    const baseSizeIndex = sizeOrder.indexOf(baseSize);
    
    if (baseSizeIndex === -1) {
      console.warn(`Z-Wolf Epic | Invalid base size: ${baseSize}`);
      return baseSize;
    }
    
    let totalSizeSteps = 0;
    
    // Helper to add size steps from an item
    const addSizeSteps = (item, source) => {
      if (!item?.system?.sideEffects?.sizeSteps) return;
      
      const steps = parseInt(item.system.sideEffects.sizeSteps);
      if (!isNaN(steps) && steps !== 0) {
        totalSizeSteps += steps;
        console.log(`Z-Wolf Epic | ${source} "${item.name}" provides ${steps} size steps`);
      }
    };
    
    // Check ancestry
    if (this.system.ancestryId) {
      const ancestry = this.items.get(this.system.ancestryId);
      if (ancestry) addSizeSteps(ancestry, "Ancestry");
    }
    
    // Check fundament
    if (this.system.fundamentId) {
      const fundament = this.items.get(this.system.fundamentId);
      if (fundament) addSizeSteps(fundament, "Fundament");
    }
    
    // Check all other items
    const characterLevel = this.system.level || 0;
    
    this.items.forEach(item => {
      if (item.type === 'ancestry' || item.type === 'fundament') return;
      
      // Handle track items with tier-based size steps
      if (item.type === 'track') {
        const trackItems = this.items.filter(i => i.type === 'track');
        const trackSlotIndex = item.getFlag('zwolf-epic', 'slotIndex') ?? trackItems.findIndex(t => t.id === item.id);
        const unlockedTiers = this._getTrackTiersForLevel(trackSlotIndex, characterLevel);
        
        // Check base track size steps
        addSizeSteps(item, "Track");
        
        // Check tier-specific size steps
        unlockedTiers.forEach(tierNumber => {
          const tierData = item.system.tiers?.[`tier${tierNumber}`];
          if (tierData?.sideEffects?.sizeSteps) {
            const tierItem = { 
              name: `${item.name} (Tier ${tierNumber})`, 
              system: { sideEffects: tierData.sideEffects } 
            };
            addSizeSteps(tierItem, "Track Tier");
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
      addSizeSteps(item, "Item");
    });
    
    // Calculate final size index
    const finalSizeIndex = Math.max(0, Math.min(sizeOrder.length - 1, baseSizeIndex + totalSizeSteps));
    const effectiveSize = sizeOrder[finalSizeIndex];
    
    if (totalSizeSteps !== 0) {
      console.log(`Z-Wolf Epic | Size calculation - Base: ${baseSize} (${baseSizeIndex}), Steps: ${totalSizeSteps}, Final: ${effectiveSize} (${finalSizeIndex})`);
    }
    
    return effectiveSize;
  }

  /**
   * Get the actor's effective size including side effect modifications
   * @returns {string} The effective size key
   */
  get effectiveSize() {
    return this._calculateEffectiveSize();
  }

  /**
   * Apply inherited properties from base creature for summoned actors
   * @private
   */
  _applyBaseCreatureInheritance() {
    // Only apply to mooks and spawns
    if (!['mook', 'spawn'].includes(this.type)) return;
    
    const baseCreatureId = this.system.baseCreatureId;
    if (!baseCreatureId) {
      console.log(`Z-Wolf Epic | ${this.name} has no base creature assigned`);
      return;
    }
    
    const baseCreature = game.actors.get(baseCreatureId);
    if (!baseCreature) {
      console.warn(`Z-Wolf Epic | ${this.name} references non-existent base creature: ${baseCreatureId}`);
      return;
    }
    
    // Inherit level
    if (this.system.level !== baseCreature.system.level) {
      this.system.level = baseCreature.system.level;
      console.log(`Z-Wolf Epic | ${this.name} inherited level ${this.system.level} from ${baseCreature.name}`);
    }
    
    // Inherit size (with modification for spawns)
    let inheritedSize;
    if (this.type === 'spawn') {
      // Spawns are two size categories smaller
      const sizeOrder = ["diminutive", "tiny", "small", "medium", "large", "huge", "gargantuan", "colossal"];
      const baseSizeIndex = sizeOrder.indexOf(baseCreature.system.size || "medium");
      const spawnSizeIndex = Math.max(0, baseSizeIndex - 2);
      inheritedSize = sizeOrder[spawnSizeIndex];
      
      if (this.system.size !== inheritedSize) {
        this.system.size = inheritedSize;
        console.log(`Z-Wolf Epic | Spawn ${this.name} inherited size ${inheritedSize} (2 steps smaller than ${baseCreature.system.size}) from ${baseCreature.name}`);
      }
    } else if (this.type === 'mook') {
      // Mooks keep the same size
      inheritedSize = baseCreature.system.size;
      if (this.system.size !== inheritedSize) {
        this.system.size = inheritedSize;
        console.log(`Z-Wolf Epic | Mook ${this.name} inherited size ${inheritedSize} from ${baseCreature.name}`);
      }
    }
    
    // Inherit tags - calculate them from the base creature's items
    const baseCreatureTags = this._calculateTagsFromCreature(baseCreature);
    if (this.system.tags !== baseCreatureTags) {
      this.system.tags = baseCreatureTags;
      console.log(`Z-Wolf Epic | ${this.name} inherited tags "${baseCreatureTags}" from ${baseCreature.name}`);
    }
    
    // Inherit vision for spawns - use the values calculated in base creature's system
    if (this.type === 'spawn') {
      const baseNightsight = baseCreature.nightsight || 1;
      const baseDarkvision = baseCreature.darkvision || 0.2;
      
      if (this.system.nightsight !== baseNightsight) {
        this.system.nightsight = baseNightsight;
        console.log(`Z-Wolf Epic | Spawn ${this.name} inherited nightsight ${baseNightsight}m from ${baseCreature.name}`);
      }
      
      if (this.system.darkvision !== baseDarkvision) {
        this.system.darkvision = baseDarkvision;
        console.log(`Z-Wolf Epic | Spawn ${this.name} inherited darkvision ${baseDarkvision}m from ${baseCreature.name}`);
      }
    }
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
      } else if (typeof tags === 'string') {
        return tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
      
      return [];
    };
    
    const getTrackTierForLevel = (trackSlotIndex, characterLevel) => {
      const tierLevels = [];
      for (let tier = 1; tier <= 5; tier++) {
        const tierLevel = trackSlotIndex + 1 + ((tier - 1) * 4);
        if (characterLevel >= tierLevel) {
          tierLevels.push(tier);
        }
      }
      return tierLevels;
    };
    
    // Collect tags from all items that have characterTags
    creature.items.forEach(item => {
      // Handle track items with tier-based character tags
      if (item.type === 'track') {
        const trackItems = creature.items.filter(i => i.type === 'track');
        const trackSlotIndex = item.getFlag('zwolf-epic', 'slotIndex') ?? trackItems.findIndex(t => t.id === item.id);
        const characterLevel = creature.system.level || 0;
        const unlockedTiers = getTrackTierForLevel(trackSlotIndex, characterLevel);
        
        // Collect character tags from unlocked tiers
        unlockedTiers.forEach(tierNumber => {
          const tierData = item.system.tiers?.[`tier${tierNumber}`];
          if (tierData && tierData.characterTags) {
            const tierTags = parseTags(tierData.characterTags);
            allTags.push(...tierTags);
          }
        });
      } 
      // Handle regular items with characterTags
      else if (item.system && item.system.characterTags) {
        const itemTags = parseTags(item.system.characterTags);
        allTags.push(...itemTags);
      }
    });
    
    // Remove duplicates and sort
    const uniqueTags = [...new Set(allTags)].sort();
    
    if (uniqueTags.length > 0) {
      return uniqueTags.join(', ');
    }
    
    // Default fallback
    return 'Humanoid';
  }
}

// Hook to update token sizes when effective size changes
Hooks.on('updateActor', (actor, data, options, userId) => {
  // Check if size or items that affect size were updated
  const sizeChanged = data.system?.size !== undefined;
  
  // If size potentially changed, recalculate and update tokens
  if (sizeChanged || actor.system.effectiveSize) {
    const effectiveSize = actor.effectiveSize;
    const sizeData = CONFIG.ZWOLF?.sizes?.[effectiveSize];
    
    if (sizeData) {
      const targetScale = sizeData.tokenScale;
      
      // Update all placed tokens for this actor
      actor.getActiveTokens().forEach(async token => {
        if (token.document.width !== targetScale || token.document.height !== targetScale) {
          await token.document.update({
            width: targetScale,
            height: targetScale
          });
          
          console.log(`Z-Wolf Epic | Updated token "${token.name}" size to ${effectiveSize} (${targetScale}x${targetScale})`);
        }
      });
    }
  }
});

// Hook to update spawns/mooks when their base creature changes
Hooks.on('updateActor', (actor, data, options, userId) => {
  // If this actor was updated, check if any spawns/mooks reference it
  const dependentActors = game.actors.filter(a => 
    ['mook', 'spawn'].includes(a.type) && 
    a.system.baseCreatureId === actor.id
  );
  
  if (dependentActors.length > 0) {
    console.log(`Z-Wolf Epic | Base creature ${actor.name} updated, refreshing ${dependentActors.length} dependent actors`);
    
    dependentActors.forEach(dependent => {
      // Trigger re-preparation of derived data
      dependent.prepareData();
      
      // Re-render open sheets
      if (dependent.sheet?.rendered) {
        dependent.sheet.render(false);
      }
    });
  }
});

// Hook to update spawns/mooks when their base creature changes
Hooks.on('updateActor', (actor, data, options, userId) => {
  // If this actor was updated, check if any spawns/mooks reference it
  const dependentActors = game.actors.filter(a => 
    ['mook', 'spawn'].includes(a.type) && 
    a.system.baseCreatureId === actor.id
  );
  
  if (dependentActors.length > 0) {
    console.log(`Z-Wolf Epic | Base creature ${actor.name} updated, refreshing ${dependentActors.length} dependent actors`);
    
    dependentActors.forEach(dependent => {
      // Trigger re-preparation of derived data
      dependent.prepareData();
      
      // Re-render open sheets
      if (dependent.sheet?.rendered) {
        dependent.sheet.render(false);
      }
    });
  }
});