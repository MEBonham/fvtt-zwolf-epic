// /helpers/actor-data-calculator.mjs - All data preparation and calculation logic

/**
 * Actor Data Calculator
 * Centralized calculation and data preparation for actor sheets
 */
export class ActorDataCalculator {
  
  constructor(actor) {
    this.actor = actor;
  }

  // ========================================
  // MAIN SHEET DATA PREPARATION
  // ========================================

  prepareSheetData(context) {
    const actorData = this.actor;
    
    // Initialize context
    context.system = actorData.system || {};
    context.flags = actorData.flags || {};
    
    const level = context.system.level ?? 0;
    
    // Handle spawns specially - they mirror their base creature
    if (this.actor.type === 'spawn') {
      context.availableBaseCreatures = this._getAvailableBaseCreatures();
      
      if (!this._prepareSpawnData(context)) {
        // No base creature - use minimal defaults
        this._applyDefaultData(context);
      }
    } 
    // Handle normal actors
    else {
      const progressionOnlyLevel = this._getProgressionOnlyLevel();
      context.progressionBonuses = this._calculateProgressionBonuses(level, progressionOnlyLevel);
      
      // Foundation items and side effects
      this._addFoundationItems(context);
      const sideEffects = this._applySideEffects(context.ancestry, context.fundament, this.actor.items);
      context.sideEffects = sideEffects;
      
      // Calculate target numbers
      context.tns = this._calculateTargetNumbers(context.progressionBonuses, sideEffects);
      
      // Organize stats and abilities
      context.progressions = this._organizeByProgression(context.system, context.progressionBonuses, sideEffects);
      context.abilityCategories = this._categorizeGrantedAbilities();
      context.calculatedValues = this._calculateFundamentValues(level, context.fundament);
    }
    
    // Handle mooks
    if (this.actor.type === 'mook') {
      context.availableBaseCreatures = this._getAvailableBaseCreatures();
      this._prepareBaseCreatureData(context);
    }
    
    // Common calculations for all types
    this._addStatLabels(context);
    this._calculateSlots(context);
    
    if (['pc', 'npc', 'eidolon'].includes(this.actor.type)) {
      context.buildPoints = this._calculateTotalBP(context.system, context.ancestry, context.fundament);
    }
    
    // Additional data
    context.characterTags = this._calculateCharacterTags();
    context.languageLimit = this._calculateLanguageLimit();
    context.equipment = this._prepareEquipment();
    context.inventoryTotals = this._calculateInventoryTotals(context.equipment);
    
    // Ensure required flags
    context.system.buildPointsLocked = context.system.buildPointsLocked || false;
    this._ensureAbilityCategories(context);
    
    return context;
  }

  // ========================================
  // SPAWN & MOOK HANDLING
  // ========================================

  /**
   * Prepare spawn data - spawns mirror their base creature
   * @returns {boolean} Success
   * @private
   */
  _prepareSpawnData(context) {
    if (!context.system.baseCreatureId) {
      console.warn(`Z-Wolf Epic | Spawn ${this.actor.name} has no base creature assigned`);
      return false;
    }
    
    const baseCreature = game.actors.get(context.system.baseCreatureId);
    if (!baseCreature) {
      console.warn(`Z-Wolf Epic | Spawn ${this.actor.name} references non-existent base creature: ${context.system.baseCreatureId}`);
      return false;
    }
    
    context.baseCreature = baseCreature;
    
    // Create calculator for base creature
    const baseCalculator = new ActorDataCalculator(baseCreature);
    const baseContext = { system: baseCreature.system, flags: baseCreature.flags };
    
    // Get base creature's data
    const baseProgressionOnlyLevel = baseCalculator._getProgressionOnlyLevel();
    context.progressionBonuses = baseCalculator._calculateProgressionBonuses(
      baseCreature.system.level ?? 0,
      baseProgressionOnlyLevel
    );
    
    baseCalculator._addFoundationItems(baseContext);
    context.ancestry = baseContext.ancestry;
    context.fundament = baseContext.fundament;
    
    const baseSideEffects = baseCalculator._applySideEffects(
      baseContext.ancestry,
      baseContext.fundament,
      baseCreature.items
    );
    context.sideEffects = baseSideEffects;
    
    // Calculate values from base creature
    context.tns = baseCalculator._calculateTargetNumbers(context.progressionBonuses, baseSideEffects);
    context.progressions = baseCalculator._organizeByProgression(
      baseCreature.system,
      context.progressionBonuses,
      baseSideEffects
    );
    context.calculatedValues = {
      maxVitality: baseCreature.system.vitalityPoints.max,
      coastNumber: baseCreature.system.coastNumber,
      maxStamina: baseCreature.system.staminaPoints.max
    };
    context.abilityCategories = baseCalculator._categorizeGrantedAbilities();
    
    console.log(`Z-Wolf Epic | Spawn ${this.actor.name} mirroring base creature ${baseCreature.name}`);
    return true;
  }

  /**
   * Prepare base creature data for mooks (similar to spawns but different inheritance rules)
   * @private
   */
  _prepareBaseCreatureData(context) {
    if (!context.system.baseCreatureId) return;
    
    const baseCreature = game.actors.get(context.system.baseCreatureId);
    context.baseCreature = baseCreature;
    
    if (baseCreature && this.actor.type === 'spawn') {
      // Spawn logic (same as _prepareSpawnData)
      const baseCalculator = new ActorDataCalculator(baseCreature);
      const baseContext = { system: baseCreature.system };
      
      const baseProgressionOnlyLevel = baseCalculator._getProgressionOnlyLevel();
      context.baseProgressionBonuses = baseCalculator._calculateProgressionBonuses(
        baseCreature.system.level ?? 0,
        baseProgressionOnlyLevel
      );
      
      const baseAncestry = baseCreature.system.ancestryId ? baseCreature.items.get(baseCreature.system.ancestryId) : null;
      const baseFundament = baseCreature.system.fundamentId ? baseCreature.items.get(baseCreature.system.fundamentId) : null;
      const baseSideEffects = baseCalculator._applySideEffects(
        baseAncestry?.toObject(), 
        baseFundament?.toObject(), 
        baseCreature.items
      );
      
      context.tns = baseCalculator._calculateTargetNumbers(context.baseProgressionBonuses, baseSideEffects);
      context.progressions = baseCalculator._organizeByProgression(
        baseCreature.system, 
        context.baseProgressionBonuses, 
        baseSideEffects
      );
      context.calculatedValues = {
        maxVitality: baseCreature.system.vitalityPoints.max,
        coastNumber: baseCreature.system.coastNumber,
        maxStamina: baseCreature.system.staminaPoints.max
      };
      context.abilityCategories = baseCalculator._categorizeGrantedAbilities();
    }
  }

  /**
   * Apply default data when no base creature exists
   * @private
   */
  _applyDefaultData(context) {
    context.progressionBonuses = { mediocre: 0, moderate: 0, specialty: 0, awesome: 0 };
    context.tns = { toughness: 6, destiny: 6, improvised: 6, healing: 6, challenge: 6 };
    context.progressions = this._getEmptyProgressions();
    context.abilityCategories = {};
    context.calculatedValues = { maxVitality: 12, coastNumber: 4, maxStamina: 4 };
  }

  /**
   * Get available base creatures for dropdowns with filtering based on actor type
   * @returns {Array} Available actors
   * @private
   */
  _getAvailableBaseCreatures() {
    // Get all potential base creatures (PCs and NPCs)
    const potentialCreatures = game.actors.filter(a => ['pc', 'npc'].includes(a.type));
    
    // Determine what filtering is needed based on the current actor type
    const actorType = this.actor.type;
    
    // No filtering needed for types we don't recognize
    if (!['eidolon', 'spawn', 'mook'].includes(actorType)) {
      return potentialCreatures;
    }
    
    // Filter based on actor type
    return potentialCreatures.filter(creature => {
      switch (actorType) {
        case 'eidolon':
          // Eidolons require base creature to have "Gemini" track
          return creature.items.some(item => 
            item.type === 'track' && item.name === 'Gemini'
          );
          
        case 'spawn':
          // Spawns require base creature to have "Swarmer" track
          return creature.items.some(item => 
            item.type === 'track' && item.name.slice(0, 7) === 'Swarmer'
          );
          
        case 'mook':
          // Mooks require base creature to have "Shape Ally" talent
          return creature.items.some(item => 
            item.type === 'talent' && item.name === 'Shape Ally'
          );
          
        default:
          return true;
      }
    });
  }

  // ========================================
  // PROGRESSION CALCULATIONS
  // ========================================

  _calculateProgressionBonuses(level, progressionOnlyLevel) {
    const totalLevel = level + progressionOnlyLevel;
    
    return {
      mediocre: Math.floor(0.6 * totalLevel - 0.3),
      moderate: Math.floor(0.8 * totalLevel),
      specialty: Math.floor(1 * totalLevel),
      awesome: Math.floor(1.2 * totalLevel + 0.8001)
    };
  }

  _getProgressionOnlyLevel() {
    if (this.actor.items) {
      return this.actor.items.some(item => item.name === "Progression Enhancement") ? 1 : 0;
    }
    return 0;
  }

  _getEmptyProgressions() {
    return {
      mediocre: { name: "Mediocre", bonus: 0, stats: [] },
      moderate: { name: "Moderate", bonus: 0, stats: [] },
      specialty: { name: "Specialty", bonus: 0, stats: [] },
      awesome: { name: "Awesome", bonus: 0, stats: [] }
    };
  }

  // ========================================
  // FOUNDATION ITEMS
  // ========================================

  _addFoundationItems(context) {
    // Get ancestry
    if (context.system.ancestryId) {
      const ancestryItem = this.actor.items.get(context.system.ancestryId);
      if (ancestryItem?.type === 'ancestry') {
        context.ancestry = ancestryItem.toObject();
      }
    }

    // Get fundament
    if (context.system.fundamentId) {
      const fundamentItem = this.actor.items.get(context.system.fundamentId);
      if (fundamentItem?.type === 'fundament') {
        context.fundament = fundamentItem.toObject();
      }
    }
  }

  // ========================================
  // SIDE EFFECTS CALCULATION
  // ========================================

  _applySideEffects(ancestry = null, fundament = null, allItems = null) {
    const progressionLevels = {
      '': 0,
      'mediocre': 1,
      'moderate': 2,
      'specialty': 3,
      'awesome': 4
    };
    
    // Initialize tracking
    const highest = {
      speed: { level: 0, progression: null, source: null },
      toughness: { level: 1, progression: 'mediocre', source: 'default' },
      destiny: { level: 2, progression: 'moderate', source: 'default' },
      nightsight: { radius: this.actor.system.vision?.nightsightRadius || 1, source: 'default' },
      darkvision: { radius: this.actor.system.vision?.darkvisionRadius || 0.2, source: 'default' }
    };
    
    // Helper to check progression side effects
    const checkProgression = (itemName, sideEffects, type) => {
      if (!sideEffects?.[type] || sideEffects[type] === '') return;
      
      const progression = sideEffects[type];
      const level = progressionLevels[progression] || 0;
      
      console.log(`Z-Wolf Epic | ${itemName} provides ${type}: ${progression} (level ${level})`);
      
      const targetKey = type.replace('TNProgression', '').replace('Progression', '').toLowerCase();
      if (highest[targetKey] && level > highest[targetKey].level) {
        highest[targetKey] = { level, progression, source: itemName };
      }
    };
    
    // Helper to check vision side effects
    const checkVisionRadius = (itemName, sideEffects, type) => {
      if (!sideEffects?.[type] || sideEffects[type] === null || sideEffects[type] === undefined) return;
      
      const radius = parseFloat(sideEffects[type]) || 0;
      console.log(`Z-Wolf Epic | ${itemName} provides ${type}: ${radius}m`);
      
      const visionKey = type.replace('Radius', '').toLowerCase();
      if (highest[visionKey] && radius > highest[visionKey].radius) {
        highest[visionKey] = { radius, source: itemName };
      }
    };
    
    // Check all side effect types for an item
    const checkAllSideEffects = (itemName, sideEffects) => {
      if (!sideEffects) return;
      
      checkProgression(itemName, sideEffects, 'speedProgression');
      checkProgression(itemName, sideEffects, 'toughnessTNProgression');
      checkProgression(itemName, sideEffects, 'destinyTNProgression');
      checkVisionRadius(itemName, sideEffects, 'nightsightRadius');
      checkVisionRadius(itemName, sideEffects, 'darkvisionRadius');
    };
    
    // Check ancestry and fundament
    if (ancestry?.system?.sideEffects) {
      checkAllSideEffects(ancestry.name, ancestry.system.sideEffects);
    }
    if (fundament?.system?.sideEffects) {
      checkAllSideEffects(fundament.name, fundament.system.sideEffects);
    }
    
    // Check all other items
    if (allItems) {
      const characterLevel = this.actor.system.level || 0;
      
      allItems.forEach(item => {
        if (item.type === 'ancestry' || item.type === 'fundament') return;
        
        // Skip equipment not in required placement
        if (item.type === 'equipment' && !this._isEquipmentActive(item)) return;
        
        // Handle track items with tier-based side effects
        if (item.type === 'track') {
          this._processTrackSideEffects(item, characterLevel, checkAllSideEffects);
        } else {
          // Regular item side effects
          checkAllSideEffects(item.name, item.system?.sideEffects);
        }
      });
    }
    
    // Build final side effects object
    return {
      speedProgression: highest.speed.progression,
      speedProgressionSource: highest.speed.source,
      toughnessTNProgression: highest.toughness.progression,
      toughnessTNProgressionSource: highest.toughness.source,
      destinyTNProgression: highest.destiny.progression,
      destinyTNProgressionSource: highest.destiny.source,
      nightsightRadius: highest.nightsight.radius,
      nightsightRadiusSource: highest.nightsight.source,
      darkvisionRadius: highest.darkvision.radius,
      darkvisionRadiusSource: highest.darkvision.source
    };
  }

  /**
   * Process track item side effects including tiers
   * @private
   */
  _processTrackSideEffects(trackItem, characterLevel, checkCallback) {
    const trackSlotIndex = this._getTrackSlotIndex(trackItem);
    const unlockedTiers = TrackUtils.getUnlockedTiers(trackSlotIndex, characterLevel);
    
    console.log(`Z-Wolf Epic | Track "${trackItem.name}" in slot ${trackSlotIndex} has unlocked tiers: [${unlockedTiers.join(', ')}]`);
    
    // Check base track side effects
    checkCallback(trackItem.name, trackItem.system?.sideEffects);
    
    // Check tier-specific side effects
    unlockedTiers.forEach(tierNumber => {
      const tierData = trackItem.system.tiers?.[`tier${tierNumber}`];
      if (tierData?.sideEffects) {
        const tierSourceName = `${trackItem.name} (Tier ${tierNumber})`;
        checkCallback(tierSourceName, tierData.sideEffects);
      }
    });
  }

  // ========================================
  // TARGET NUMBERS
  // ========================================

  _calculateTargetNumbers(bonuses, sideEffects) {
    return {
      toughness: 6 + bonuses[sideEffects.toughnessTNProgression],
      destiny: 6 + bonuses[sideEffects.destinyTNProgression],
      improvised: 6 + bonuses.mediocre,
      healing: 6 + bonuses.moderate,
      challenge: 6 + bonuses.specialty
    };
  }

  // ========================================
  // STAT ORGANIZATION
  // ========================================

  _organizeByProgression(system, bonuses, sideEffects = null) {
    const progressions = {
      mediocre: { name: "Mediocre", bonus: bonuses.mediocre, stats: [] },
      moderate: { name: "Moderate", bonus: bonuses.moderate, stats: [] },
      specialty: { name: "Specialty", bonus: bonuses.specialty, stats: [] },
      awesome: { name: "Awesome", bonus: bonuses.awesome, stats: [] }
    };
    
    // Ensure system data exists
    system.attributes = system.attributes || this._getDefaultAttributes();
    system.skills = system.skills || this._getDefaultSkills();
    
    // Organize attributes
    const attributes = ['agility', 'fortitude', 'perception', 'willpower'];
    attributes.forEach(attr => {
      const progression = system.attributes[attr]?.progression || 'moderate';
      progressions[progression].stats.push({
        name: attr.charAt(0).toUpperCase() + attr.slice(1),
        type: 'attribute',
        key: attr,
        value: bonuses[progression]
      });
    });
    
    // Organize skills
    const skills = ['acumen', 'athletics', 'brawn', 'dexterity', 'glibness', 'influence', 'insight', 'stealth'];
    skills.forEach(skill => {
      const progression = system.skills[skill]?.progression || 'mediocre';
      progressions[progression].stats.push({
        name: skill.charAt(0).toUpperCase() + skill.slice(1),
        type: 'skill',
        key: skill,
        value: bonuses[progression]
      });
    });
    
    // Add Speed if enhanced
    if (sideEffects?.speedProgression) {
      const speedProgression = sideEffects.speedProgression;
      progressions[speedProgression].stats.push({
        name: 'Speed',
        type: 'speed',
        key: 'speed',
        value: bonuses[speedProgression],
        upgraded: true
      });
    }
    
    return progressions;
  }

  _getDefaultAttributes() {
    return {
      agility: { value: 0, progression: 'moderate' },
      fortitude: { value: 0, progression: 'moderate' },
      perception: { value: 0, progression: 'moderate' },
      willpower: { value: 0, progression: 'moderate' }
    };
  }

  _getDefaultSkills() {
    return {
      acumen: { value: 0, progression: 'mediocre' },
      athletics: { value: 0, progression: 'mediocre' },
      brawn: { value: 0, progression: 'mediocre' },
      dexterity: { value: 0, progression: 'mediocre' },
      glibness: { value: 0, progression: 'mediocre' },
      influence: { value: 0, progression: 'mediocre' },
      insight: { value: 0, progression: 'mediocre' },
      stealth: { value: 0, progression: 'mediocre' }
    };
  }

  _addStatLabels(context) {
    context.attributeLabels = {
      agility: "Agility",
      fortitude: "Fortitude",
      perception: "Perception",
      willpower: "Willpower"
    };
    
    context.skillLabels = {
      acumen: "Acumen",
      athletics: "Athletics",
      brawn: "Brawn",
      dexterity: "Dexterity",
      glibness: "Glibness",
      influence: "Influence",
      insight: "Insight",
      stealth: "Stealth"
    };
  }

  // ========================================
  // GRANTED ABILITIES
  // ========================================

  _categorizeGrantedAbilities() {
    const categories = {
      passive: [],
      drawback: [],
      exoticSenses: [],
      dominantAction: [],
      swiftAction: [],
      reaction: [],
      freeAction: [],
      strike: [],
      journey: [],
      miscellaneous: []
    };

    const processedItems = new Set();

    // Process all items
    this.actor.items.forEach(item => {
      if (processedItems.has(item.id)) return;
      processedItems.add(item.id);
      
      // Skip equipment not in required placement
      if (item.type === 'equipment' && !this._isEquipmentActive(item)) return;
      
      // Handle track items separately
      if (item.type === 'track') {
        this._processTrackAbilities(item, categories);
      } else {
        this._processItemAbilities(item, categories);
      }
    });

    // Sort: non-virtual first, virtual last
    Object.keys(categories).forEach(categoryKey => {
      categories[categoryKey].sort((a, b) => {
        if (a.isVirtual && !b.isVirtual) return 1;
        if (!a.isVirtual && b.isVirtual) return -1;
        return 0;
      });
    });

    return categories;
  }

  /**
   * Process abilities from a regular item
   * @private
   */
  _processItemAbilities(item, categories) {
    const abilities = item.system?.grantedAbilities;
    if (!abilities) return;
    
    const abilitiesArray = Array.isArray(abilities) ? abilities : Object.values(abilities);
    
    abilitiesArray.forEach((ability) => {
      if (!ability?.name || !ability?.type) return;
      
      const categoryKey = ability.type;
      if (!categories.hasOwnProperty(categoryKey)) {
        console.warn(`Z-Wolf Epic | Unknown category "${categoryKey}" for ability "${ability.name}"`);
        return;
      }
      
      categories[categoryKey].push({
        name: ability.name,
        tags: ability.tags || '',
        description: ability.description || 'No description provided.',
        itemName: item.name,
        itemId: item.id,
        isVirtual: item.flags?.['zwolf-epic']?.isVirtual || false
      });
    });
  }

  /**
   * Process abilities from a track item including tiers
   * @private
   */
  _processTrackAbilities(trackItem, categories) {
    const characterLevel = this.actor.system.level || 0;
    const trackSlotIndex = this._getTrackSlotIndex(trackItem);
    const unlockedTiers = TrackUtils.getUnlockedTiers(trackSlotIndex, characterLevel);
    
    // Process base track abilities
    this._processItemAbilities(trackItem, categories);
    
    // Process tier abilities
    unlockedTiers.forEach(tierNumber => {
      const tierData = trackItem.system.tiers?.[`tier${tierNumber}`];
      if (!tierData?.grantedAbilities) return;
      
      const tierAbilitiesArray = Array.isArray(tierData.grantedAbilities)
        ? tierData.grantedAbilities
        : Object.values(tierData.grantedAbilities);
      
      tierAbilitiesArray.forEach((ability) => {
        if (!ability?.name || !ability?.type) return;
        
        const categoryKey = ability.type;
        if (!categories.hasOwnProperty(categoryKey)) {
          console.warn(`Z-Wolf Epic | Unknown category "${categoryKey}" for tier ability "${ability.name}"`);
          return;
        }
        
        categories[categoryKey].push({
          name: ability.name,
          tags: ability.tags || '',
          description: ability.description || 'No description provided.',
          itemName: `${trackItem.name} (Tier ${tierNumber})`,
          itemId: trackItem.id,
          tierSource: tierNumber
        });
      });
    });
  }

  _ensureAbilityCategories(context) {
    const defaultCategories = {
      passive: [],
      drawback: [],
      exoticSenses: [],
      dominantAction: [],
      swiftAction: [],
      reaction: [],
      freeAction: [],
      strike: [],
      journey: [],
      miscellaneous: []
    };
    
    context.abilityCategories = { ...defaultCategories, ...context.abilityCategories };
  }

  // ========================================
  // SLOTS CALCULATION
  // ========================================

  _calculateSlots(context) {
    const totalKnacksProvided = this.calculateTotalKnacksProvided();
    context.knackSlots = this.prepareSlots('knack', totalKnacksProvided);
    
    const trackSlotCount = Math.min(4, context.system.level || 0);
    context.trackSlots = this.prepareSlots('track', trackSlotCount);
    
    context.talentSlots = this.prepareSlots('talent', context.system.level || 0);
  }

  calculateTotalKnacksProvided() {
    let totalKnacks = 0;
    
    // From ancestry
    if (this.actor.system.ancestryId) {
      const ancestryItem = this.actor.items.get(this.actor.system.ancestryId);
      totalKnacks += ancestryItem?.system?.knacksProvided || 0;
    }
    
    // From fundament
    if (this.actor.system.fundamentId) {
      const fundamentItem = this.actor.items.get(this.actor.system.fundamentId);
      totalKnacks += fundamentItem?.system?.knacksProvided || 0;
    }
    
    // From talents
    const talentItems = this.actor.items.filter(item => item.type === 'talent');
    talentItems.forEach((talent) => {
      totalKnacks += talent.system?.knacksProvided || 0;
    });
    
    // From track tiers
    const characterLevel = this.actor.system.level || 0;
    const trackItems = this.actor.items.filter(item => item.type === 'track');
    
    trackItems.forEach(track => {
      const trackSlotIndex = this._getTrackSlotIndex(track);
      const unlockedTiers = TrackUtils.getUnlockedTiers(trackSlotIndex, characterLevel);
      
      unlockedTiers.forEach(tierNumber => {
        const tierData = track.system.tiers?.[`tier${tierNumber}`];
        if (tierData?.sideEffects?.knacksProvided) {
          totalKnacks += parseInt(tierData.sideEffects.knacksProvided) || 0;
        }
      });
    });
    
    return totalKnacks;
  }

  prepareSlots(itemType, slotCount) {
    const slots = [];
    
    if (itemType === 'talent') {
      return this._prepareTalentSlots(slotCount);
    } else if (itemType === 'track') {
      return this._prepareTrackSlots(slotCount);
    } else {
      return this._prepareSequentialSlots(itemType, slotCount);
    }
  }

  /**
   * Prepare talent slots with track association
   * @private
   */
  _prepareTalentSlots(slotCount) {
    const slots = [];
    
    // Get track assignments
    const trackItems = this.actor.items.filter(item => item.type === 'track');
    const assignedTracks = new Map();
    
    trackItems.forEach(track => {
      const slotIndex = this._getTrackSlotIndex(track);
      if (slotIndex < 4) {
        assignedTracks.set(slotIndex + 1, track);
      }
    });
    
    // Helper to get track info for a talent slot
    const getTrackInfo = (talentSlotNumber) => {
      const modResult = talentSlotNumber % 4;
      const trackNumber = modResult === 0 ? 4 : modResult;
      const assignedTrack = assignedTracks.get(trackNumber);
      
      return {
        trackNumber: trackNumber,
        trackName: assignedTrack ? assignedTrack.name : null,
        hasTrack: !!assignedTrack
      };
    };
    
    // Create all slots
    for (let i = 0; i < slotCount; i++) {
      const talentSlotNumber = i + 1;
      const trackInfo = getTrackInfo(talentSlotNumber);
      
      slots.push({
        index: i,
        item: null,
        talentNumber: talentSlotNumber,
        trackNumber: trackInfo.trackNumber,
        trackName: trackInfo.trackName,
        hasTrack: trackInfo.hasTrack
      });
    }
    
    // Fill slots with talent items
    const talentItems = this.actor.items.filter(item => item.type === 'talent');
    talentItems.forEach((talent) => {
      const slotIndex = talent.getFlag('zwolf-epic', 'slotIndex');
      
      if (slotIndex !== undefined && slotIndex < slotCount && slots[slotIndex] && !slots[slotIndex].item) {
        slots[slotIndex].item = talent.toObject();
      } else {
        // Find first available slot
        for (let i = 0; i < slotCount; i++) {
          if (!slots[i].item) {
            slots[i].item = talent.toObject();
            talent.setFlag('zwolf-epic', 'slotIndex', i);
            break;
          }
        }
      }
    });
    
    return slots;
  }

  /**
   * Prepare track slots (indexed like talents)
   * @private
   */
  _prepareTrackSlots(slotCount) {
    const slots = [];
    const items = this.actor.items.filter(item => item.type === 'track');
    
    // Create all slots
    for (let i = 0; i < slotCount; i++) {
      slots.push({ index: i, item: null });
    }
    
    // Fill slots based on stored slotIndex
    items.forEach((item) => {
      const slotIndex = this._getTrackSlotIndex(item);
      
      if (slotIndex < slotCount && slots[slotIndex] && !slots[slotIndex].item) {
        slots[slotIndex].item = item.toObject();
      } else {
        // Find first available slot
        for (let i = 0; i < slotCount; i++) {
          if (!slots[i].item) {
            slots[i].item = item.toObject();
            item.setFlag('zwolf-epic', 'slotIndex', i);
            break;
          }
        }
      }
    });
    
    return slots;
  }

  /**
   * Prepare sequential slots (for knacks)
   * @private
   */
  _prepareSequentialSlots(itemType, slotCount) {
    const slots = [];
    const items = this.actor.items.filter(item => item.type === itemType);
    
    for (let i = 0; i < slotCount; i++) {
      slots.push({
        index: i,
        item: items[i] ? items[i].toObject() : null
      });
    }
    
    return slots;
  }

  // ========================================
  // BUILD POINTS
  // ========================================

  _calculateTotalBP(system, ancestry = null, fundament = null) {
    const attributeBP = this._calculateAttributeBP(system.attributes || {});
    const skillBP = this._calculateSkillBP(system.skills || {}, system.attributes || {});
    const maxBP = this._calculateMaxBP(ancestry, fundament);
    
    return {
      attributes: attributeBP,
      skills: skillBP,
      total: attributeBP + skillBP,
      max: maxBP
    };
  }

  _calculateAttributeBP(attributes) {
    const costs = {
      mediocre: -5,
      moderate: 0,
      specialty: 4,
      awesome: 8
    };
    
    let total = 0;
    const attributeKeys = ['agility', 'fortitude', 'perception', 'willpower'];
    
    attributeKeys.forEach(key => {
      const progression = attributes[key]?.progression || 'moderate';
      total += costs[progression];
    });
    
    return total;
  }

  _calculateSkillBP(skills, attributes) {
    const baseCosts = {
      mediocre: 0,
      moderate: 1,
      specialty: 2,
      awesome: 3
    };
    
    const progressionValues = {
      mediocre: 1,
      moderate: 2,
      specialty: 3,
      awesome: 4
    };
    
    // Get base values from attributes
    const attributeValues = {};
    Object.keys(attributes).forEach(key => {
      const progression = attributes[key]?.progression || 'moderate';
      attributeValues[key] = progressionValues[progression];
    });
    
    let total = 0;
    
    // Calculate cost for each skill
    const skillConfigs = {
      acumen: { base: attributeValues.willpower },
      athletics: { base: Math.max(attributeValues.agility, attributeValues.fortitude) },
      brawn: { base: attributeValues.fortitude },
      dexterity: { base: attributeValues.agility },
      glibness: { base: progressionValues[skills.insight?.progression || 'mediocre'] },
      influence: { base: attributeValues.willpower },
      insight: { base: attributeValues.perception },
      stealth: { base: attributeValues.agility }
    };
    
    Object.keys(skillConfigs).forEach(skillKey => {
      const skillProgression = skills[skillKey]?.progression || 'mediocre';
      const skillValue = progressionValues[skillProgression];
      const baseValue = skillConfigs[skillKey].base;
      
      const baseCost = baseCosts[skillProgression];
      const excessCost = Math.max(0, skillValue - baseValue);
      
      total += baseCost + excessCost;
    });
    
    return total;
  }

  _calculateMaxBP(ancestry, fundament) {
    let maxBP = 0;
    
    if (ancestry?.system?.buildPoints) {
      maxBP += ancestry.system.buildPoints;
    }
    
    if (fundament?.system?.buildPoints) {
      maxBP += fundament.system.buildPoints;
    }
    
    return maxBP;
  }

  // ========================================
  // FUNDAMENT VALUES
  // ========================================

  _calculateFundamentValues(level, fundament = null) {
    // Don't recalculate - use values already computed by Actor.prepareDerivedData()
    return {
      maxVitality: this.actor.system.vitalityPoints?.max || 12,
      coastNumber: this.actor.system.coastNumber || 4,
      maxStamina: this.actor.system.staminaPoints?.max || 4
    };
  }

  // ========================================
  // CHARACTER TAGS & LANGUAGES
  // ========================================

  _calculateCharacterTags() {
    // Spawns and mooks inherit tags
    if (['spawn', 'mook'].includes(this.actor.type)) {
      return this.actor.system.tags || 'Humanoid';
    }
    
    const allTags = [];
    const characterLevel = this.actor.system.level || 0;
    
    this.actor.items.forEach(item => {
      if (item.type === 'track') {
        // Process track tiers
        const trackSlotIndex = this._getTrackSlotIndex(item);
        const unlockedTiers = TrackUtils.getUnlockedTiers(trackSlotIndex, characterLevel);
        
        unlockedTiers.forEach(tierNumber => {
          const tierData = item.system.tiers?.[`tier${tierNumber}`];
          if (tierData?.characterTags) {
            const tierTags = TagUtils.parseTags(tierData.characterTags);
            allTags.push(...tierTags);
          }
        });
      } else if (item.system?.characterTags) {
        // Regular item tags
        const itemTags = TagUtils.parseTags(item.system.characterTags);
        allTags.push(...itemTags);
      }
    });
    
    // Remove duplicates and sort
    const uniqueTags = [...new Set(allTags)].sort();
    return uniqueTags.length > 0 ? uniqueTags.join(', ') : 'Humanoid';
  }

  _calculateLanguageLimit() {
    const linguistCount = this.actor.items.filter(item => 
      item.type === 'knack' && item.name.toLowerCase() === 'linguist'
    ).length;
    
    return 2 + (linguistCount * 2);
  }

  // ========================================
  // EQUIPMENT & INVENTORY
  // ========================================

  _prepareEquipment() {
    const equipment = {
      wielded: [],
      worn: [],
      readily_available: [],
      stowed: [],
      not_carried: []
    };

    const equipmentItems = this.actor.items.filter(item => item.type === 'equipment');

    equipmentItems.forEach(item => {
      const itemData = item.toObject();
      const placement = itemData.system.placement || 'not_carried';
      const requiredPlacement = itemData.system.requiredPlacement || '';
      
      itemData.placementValid = !requiredPlacement || requiredPlacement === '' || requiredPlacement === placement;
      itemData.requiredPlacement = requiredPlacement;
      
      if (equipment[placement]) {
        equipment[placement].push(itemData);
      } else {
        equipment.not_carried.push(itemData);
      }
    });

    return equipment;
  }

  _calculateInventoryTotals(equipment) {
    let totalValue = 0;
    let totalWeight = 0;
    let totalBulk = 0;

    // Calculate max bulk
    let maxBulk = 10;
    
    // Size modifier (use effective size, not base size)
    const sizeModifiers = {
      'diminutive': -12, 'tiny': -8, 'small': -4, 'medium': 0,
      'large': 4, 'huge': 8, 'gargantuan': 12, 'colossal': 16,
      'titanic': 20
    };
    const effectiveSize = this.actor.system?.effectiveSize || this.actor.system?.size || 'medium';
    maxBulk += sizeModifiers[effectiveSize] || 0;
    
    // Brawn modifier
    const brawnProgression = this.actor.system?.skills?.brawn?.progression || 'mediocre';
    const brawnBonus = { 'mediocre': 0, 'moderate': 3, 'specialty': 6, 'awesome': 9 };
    maxBulk += brawnBonus[brawnProgression] || 0;
    
    // Max bulk boosts from equipment
    this.actor.items.forEach(item => {
      if (item.type === 'equipment' && this._isEquipmentActive(item)) {
        const boost = parseInt(item.system?.sideEffects?.maxBulkBoost) || 0;
        if (boost > 0) {
          maxBulk += boost;
        }
      }
    });
    
    // Calculate totals from carried equipment
    const carriedCategories = ['wielded', 'worn', 'readily_available', 'stowed'];
    
    carriedCategories.forEach(categoryName => {
      const category = equipment[categoryName] || [];
      category.forEach(item => {
        const quantity = parseInt(item.system?.quantity) || 1;
        totalValue += (parseFloat(item.system?.value) || 0) * quantity;
        totalWeight += (parseFloat(item.system?.weight) || 0) * quantity;
        
        let itemBulk = (parseFloat(item.system?.bulk) || 0) * quantity;
        
        // Clothing bulk reduction when worn
        if (categoryName === 'worn' && this._hasTag(item, 'clothing')) {
          const bulkReduction = 1 * quantity;
          itemBulk = Math.max(0, itemBulk - bulkReduction);
        }
        
        totalBulk += itemBulk;
      });
    });

    return {
      value: totalValue,
      weight: totalWeight,
      bulk: totalBulk,
      maxBulk: Math.max(1, maxBulk)
    };
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Check if equipment item is active (in correct placement)
   * @private
   */
  _isEquipmentActive(item) {
    if (item.type !== 'equipment') return true;
    
    const requiredPlacement = item.system.requiredPlacement;
    const currentPlacement = item.system.placement;
    
    return !requiredPlacement || requiredPlacement === '' || requiredPlacement === currentPlacement;
  }

  /**
   * Get track slot index with fallback
   * @private
   */
  _getTrackSlotIndex(trackItem) {
    const storedIndex = trackItem.getFlag('zwolf-epic', 'slotIndex');
    if (storedIndex !== undefined) return storedIndex;
    
    const trackItems = this.actor.items.filter(i => i.type === 'track');
    return trackItems.findIndex(t => t.id === trackItem.id);
  }

  /**
   * Check if item has a specific tag
   * @private
   */
  _hasTag(item, tagToFind) {
    if (!item.system?.tags) return false;
    
    const tags = typeof item.system.tags === 'string' 
      ? item.system.tags.split(',').map(t => t.trim().toLowerCase())
      : [];
    
    return tags.includes(tagToFind.toLowerCase());
  }
}

// ========================================
// UTILITY CLASSES
// ========================================

/**
 * Track utility functions
 */
class TrackUtils {
  /**
   * Get unlocked tiers for a track at given level
   */
  static getUnlockedTiers(trackSlotIndex, characterLevel) {
    const tierLevels = [];
    for (let tier = 1; tier <= 5; tier++) {
      const tierLevel = trackSlotIndex + 1 + ((tier - 1) * 4);
      if (characterLevel >= tierLevel) {
        tierLevels.push(tier);
      }
    }
    return tierLevels;
  }
}

/**
 * Tag utility functions
 */
class TagUtils {
  /**
   * Parse tags from various formats
   */
  static parseTags(tags) {
    if (!tags) return [];
    
    if (Array.isArray(tags)) {
      return tags.filter(tag => tag && tag.trim().length > 0);
    }
    
    if (typeof tags === 'string') {
      return tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }
    
    return [];
  }
}
