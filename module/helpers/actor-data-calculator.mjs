// /helpers/actor-data-calculator.mjs - All data preparation and calculation logic

export class ActorDataCalculator {
  
  constructor(actor) {
    this.actor = actor;
  }

  /**
   * Main method to prepare all sheet data
   */
  prepareSheetData(context) {
    // Get the actor data
    const actorData = this.actor;
    
    // Add system data to context
    context.system = actorData.system || {};
    context.flags = actorData.flags || {};
    
    // Get character level
    const level = context.system.level ?? 0;
    
    // Calculate progression-related data
    const progressionOnlyLevel = this._getProgressionOnlyLevel(actorData);
    context.progressionBonuses = this._calculateProgressionBonuses(level, progressionOnlyLevel);
    
    // Get foundation items
    this._addFoundationItems(context);
    
    // Apply side effects and calculate target numbers
    const sideEffects = this._applySideEffects(context.ancestry, context.fundament, this.actor.items);
    context.sideEffects = sideEffects;
    
    context.tns = {
      toughness: 6 + context.progressionBonuses[sideEffects.toughnessTNProgression],
      destiny: 6 + context.progressionBonuses[sideEffects.destinyTNProgression],
      improvised: 6 + context.progressionBonuses.mediocre,
      healing: 6 + context.progressionBonuses.moderate,
      challenge: 6 + context.progressionBonuses.specialty
    };
    
    // Organize stats by progression
    context.progressions = this._organizeByProgression(context.system, context.progressionBonuses, sideEffects);
    
    // Add labels
    this._addStatLabels(context);
    
    // Calculate slots
    this._calculateSlots(context);
    
    // Calculate Build Points
    context.buildPoints = this._calculateTotalBP(context.system, context.ancestry, context.fundament);
    
    // Gather granted abilities
    context.abilityCategories = this._categorizeGrantedAbilities();
    
    // Ensure all ability categories exist
    this._ensureAbilityCategories(context);
    
    // Calculate fundament-based values
    context.calculatedValues = this._calculateFundamentValues(level, context.fundament);
    
    // Calculate character tags
    context.characterTags = this._calculateCharacterTags();
    
    // Calculate language limit
    context.languageLimit = this._calculateLanguageLimit();
    
    // Prepare equipment
    context.equipment = this._prepareEquipment();
    context.inventoryTotals = this._calculateInventoryTotals(context.equipment);
    
    // Ensure build points locked flag
    if (!context.system.buildPointsLocked) {
      context.system.buildPointsLocked = false;
    }
    
    // Update vitality boost count
    this._updateVitalityBoostCount().then(wasUpdated => {
      if (wasUpdated && !this.actor.sheet._state.closed) {
        this.actor.sheet.render(false);
      }
    });
    
    console.log("Z-Wolf Epic | Final context data:", {
      progressionBonuses: context.progressionBonuses,
      abilityCategories: context.abilityCategories,
      calculatedValues: context.calculatedValues,
      equipment: context.equipment ? Object.keys(context.equipment) : 'undefined'
    });
    
    return context;
  }

  // =================================
  // FOUNDATION ITEMS
  // =================================

  _addFoundationItems(context) {
    // Get ancestry item if assigned
    if (context.system.ancestryId) {
      const ancestryItem = this.actor.items.get(context.system.ancestryId);
      if (ancestryItem && ancestryItem.type === 'ancestry') {
        context.ancestry = ancestryItem.toObject();
      }
    }

    // Get fundament item if assigned
    if (context.system.fundamentId) {
      const fundamentItem = this.actor.items.get(context.system.fundamentId);
      if (fundamentItem && fundamentItem.type === 'fundament') {
        context.fundament = fundamentItem.toObject();
      }
    }
  }

  // =================================
  // PROGRESSION CALCULATIONS
  // =================================

  _calculateProgressionBonuses(level, progressionOnlyLevel) {
    const totalLevel = level + progressionOnlyLevel;
    
    return {
      mediocre: Math.floor(0.6 * totalLevel - 0.3),
      moderate: Math.floor(0.8 * totalLevel),
      specialty: Math.floor(1 * totalLevel),
      awesome: Math.floor(1.2 * totalLevel + 0.80001)
    };
  }

  _getProgressionOnlyLevel(actorData) {
    if (actorData.items) {
      const hasProgressionItem = actorData.items.some(item => 
        item.name === "Progression Enhancement"
      );
      
      if (hasProgressionItem) {
        return 1;
      }
    }
    
    return 0;
  }

  // =================================
  // SIDE EFFECTS CALCULATION
  // =================================

  _applySideEffects(ancestry = null, fundament = null, allItems = null) {
    const progressionLevels = {
      '': 0,
      'mediocre': 1,
      'moderate': 2,
      'specialty': 3,
      'awesome': 4
    };
    
    const sideEffects = {
      speedProgression: null,
      speedProgressionSource: null,
      toughnessTNProgression: 'mediocre',
      toughnessTNProgressionSource: 'default',
      destinyTNProgression: 'moderate',
      destinyTNProgressionSource: 'default',
      nightsightRadius: this.actor.system.vision?.nightsightRadius || 1,
      nightsightRadiusSource: 'default',
      darkvisionRadius: this.actor.system.vision?.darkvisionRadius || 0.5,
      darkvisionRadiusSource: 'default'
    };
    
    let highestSpeed = { level: 0, progression: null, source: null };
    let highestToughness = { level: 1, progression: 'mediocre', source: 'default' };
    let highestDestiny = { level: 2, progression: 'moderate', source: 'default' };
    let highestNightsight = { radius: sideEffects.nightsightRadius, source: 'default' };
    let highestDarkvision = { radius: sideEffects.darkvisionRadius, source: 'default' };
    
    // Helper functions
    const checkProgression = (itemName, itemSideEffects, type) => {
      if (!itemSideEffects || !itemSideEffects[type] || itemSideEffects[type] === '') {
        return;
      }
      
      const progression = itemSideEffects[type];
      const level = progressionLevels[progression] || 0;
      
      console.log(`Z-Wolf Epic | ${itemName} provides ${type}: ${progression} (level ${level})`);
      
      switch (type) {
        case 'speedProgression':
          if (level > highestSpeed.level) {
            highestSpeed = { level, progression, source: itemName };
          }
          break;
        case 'toughnessTNProgression':
          if (level > highestToughness.level) {
            highestToughness = { level, progression, source: itemName };
          }
          break;
        case 'destinyTNProgression':
          if (level > highestDestiny.level) {
            highestDestiny = { level, progression, source: itemName };
          }
          break;
      }
    };
    
    const checkVisionRadius = (itemName, itemSideEffects, type) => {
      if (!itemSideEffects || itemSideEffects[type] === null || itemSideEffects[type] === undefined) {
        return;
      }
      
      const radius = parseFloat(itemSideEffects[type]) || 0;
      
      console.log(`Z-Wolf Epic | ${itemName} provides ${type}: ${radius}m`);
      
      switch (type) {
        case 'nightsightRadius':
          if (radius > highestNightsight.radius) {
            highestNightsight = { radius, source: itemName };
          }
          break;
        case 'darkvisionRadius':
          if (radius > highestDarkvision.radius) {
            highestDarkvision = { radius, source: itemName };
          }
          break;
      }
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
    
    // Check ancestry for side effects
    if (ancestry && ancestry.system && ancestry.system.sideEffects) {
      checkProgression(ancestry.name, ancestry.system.sideEffects, 'speedProgression');
      checkProgression(ancestry.name, ancestry.system.sideEffects, 'toughnessTNProgression');
      checkProgression(ancestry.name, ancestry.system.sideEffects, 'destinyTNProgression');
      checkVisionRadius(ancestry.name, ancestry.system.sideEffects, 'nightsightRadius');
      checkVisionRadius(ancestry.name, ancestry.system.sideEffects, 'darkvisionRadius');
    }
    
    // Check fundament for side effects
    if (fundament && fundament.system && fundament.system.sideEffects) {
      checkProgression(fundament.name, fundament.system.sideEffects, 'speedProgression');
      checkProgression(fundament.name, fundament.system.sideEffects, 'toughnessTNProgression');
      checkProgression(fundament.name, fundament.system.sideEffects, 'destinyTNProgression');
      checkVisionRadius(fundament.name, fundament.system.sideEffects, 'nightsightRadius');
      checkVisionRadius(fundament.name, fundament.system.sideEffects, 'darkvisionRadius');
    }
    
    // Check all other items for side effects
    if (allItems) {
      const characterLevel = this.actor.system.level || 0;
      
      allItems.forEach(item => {
        if (item.type === 'ancestry' || item.type === 'fundament') return;
        
        // Handle track items with tier-based side effects
        if (item.type === 'track') {
          const trackItems = this.actor.items.filter(i => i.type === 'track');
          const trackSlotIndex = item.getFlag('zwolf-epic', 'slotIndex') ?? trackItems.findIndex(t => t.id === item.id);
          const unlockedTiers = getTrackTierForLevel(trackSlotIndex, characterLevel);
          
          console.log(`Z-Wolf Epic | Track "${item.name}" in slot ${trackSlotIndex} has unlocked tiers: [${unlockedTiers.join(', ')}]`);
          
          // Check base track side effects
          if (item.system && item.system.sideEffects) {
            checkProgression(item.name, item.system.sideEffects, 'speedProgression');
            checkProgression(item.name, item.system.sideEffects, 'toughnessTNProgression');
            checkProgression(item.name, item.system.sideEffects, 'destinyTNProgression');
            checkVisionRadius(item.name, item.system.sideEffects, 'nightsightRadius');
            checkVisionRadius(item.name, item.system.sideEffects, 'darkvisionRadius');
          }
          
          // Check tier-specific side effects
          unlockedTiers.forEach(tierNumber => {
            const tierData = item.system.tiers?.[`tier${tierNumber}`];
            
            if (tierData && tierData.sideEffects) {
              const tierSourceName = `${item.name} (Tier ${tierNumber})`;
              
              checkProgression(tierSourceName, tierData.sideEffects, 'speedProgression');
              checkProgression(tierSourceName, tierData.sideEffects, 'toughnessTNProgression');
              checkProgression(tierSourceName, tierData.sideEffects, 'destinyTNProgression');
              checkVisionRadius(tierSourceName, tierData.sideEffects, 'nightsightRadius');
              checkVisionRadius(tierSourceName, tierData.sideEffects, 'darkvisionRadius');
            }
          });
          
          return;
        }
        
        // Equipment placement filtering
        if (item.type === 'equipment') {
          const requiredPlacement = item.system.requiredPlacement;
          const currentPlacement = item.system.placement;
          
          if (requiredPlacement && requiredPlacement !== '' && requiredPlacement !== currentPlacement) {
            console.log(`Z-Wolf Epic | Skipping ${item.name} side effects - required placement "${requiredPlacement}" != current placement "${currentPlacement}"`);
            return;
          }
        }
        
        // Regular item side effects check
        if (item.system && item.system.sideEffects) {
          checkProgression(item.name, item.system.sideEffects, 'speedProgression');
          checkProgression(item.name, item.system.sideEffects, 'toughnessTNProgression');
          checkProgression(item.name, item.system.sideEffects, 'destinyTNProgression');
          checkVisionRadius(item.name, item.system.sideEffects, 'nightsightRadius');
          checkVisionRadius(item.name, item.system.sideEffects, 'darkvisionRadius');
        }
      });
    }
    
    // Apply the highest progression found for each type
    if (highestSpeed.progression) {
      sideEffects.speedProgression = highestSpeed.progression;
      sideEffects.speedProgressionSource = highestSpeed.source;
    }
    
    sideEffects.toughnessTNProgression = highestToughness.progression;
    sideEffects.toughnessTNProgressionSource = highestToughness.source;
    
    sideEffects.destinyTNProgression = highestDestiny.progression;
    sideEffects.destinyTNProgressionSource = highestDestiny.source;
    
    sideEffects.nightsightRadius = highestNightsight.radius;
    sideEffects.nightsightRadiusSource = highestNightsight.source;
    
    sideEffects.darkvisionRadius = highestDarkvision.radius;
    sideEffects.darkvisionRadiusSource = highestDarkvision.source;
    
    return sideEffects;
  }

  // =================================
  // STAT ORGANIZATION
  // =================================

  _organizeByProgression(system, bonuses, sideEffects = null) {
    const progressions = {
      mediocre: { name: "Mediocre", bonus: bonuses.mediocre, stats: [] },
      moderate: { name: "Moderate", bonus: bonuses.moderate, stats: [] },
      specialty: { name: "Specialty", bonus: bonuses.specialty, stats: [] },
      awesome: { name: "Awesome", bonus: bonuses.awesome, stats: [] }
    };
    
    // Ensure system.attributes exists
    if (!system.attributes) {
      system.attributes = {
        agility: { value: 0, progression: 'moderate' },
        fortitude: { value: 0, progression: 'moderate' },
        perception: { value: 0, progression: 'moderate' },
        willpower: { value: 0, progression: 'moderate' }
      };
    }
    
    // Ensure system.skills exists
    if (!system.skills) {
      system.skills = {
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
    
    // Organize attributes (default to Moderate)
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
    
    // Organize skills (default to Mediocre)
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
    
    // Add Speed based on side effects
    if (sideEffects && sideEffects.speedProgression) {
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

  // =================================
  // SLOTS CALCULATION
  // =================================

  _calculateSlots(context) {
    // Calculate knack slots
    const totalKnacksProvided = this.calculateTotalKnacksProvided();
    context.knackSlots = this.prepareSlots('knack', totalKnacksProvided);
    
    // Calculate track slots
    const trackSlotCount = Math.min(4, context.system.level || 0);
    context.trackSlots = this.prepareSlots('track', trackSlotCount);
    
    // Calculate talent slots
    context.talentSlots = this.prepareSlots('talent', context.system.level || 0);
  }

  calculateTotalKnacksProvided() {
    let totalKnacks = 0;
    
    // Get knacks from ancestry
    if (this.actor.system.ancestryId) {
      const ancestryItem = this.actor.items.get(this.actor.system.ancestryId);
      if (ancestryItem && ancestryItem.system && ancestryItem.system.knacksProvided) {
        totalKnacks += ancestryItem.system.knacksProvided;
      }
    }
    
    // Get knacks from fundament
    if (this.actor.system.fundamentId) {
      const fundamentItem = this.actor.items.get(this.actor.system.fundamentId);
      if (fundamentItem && fundamentItem.system && fundamentItem.system.knacksProvided) {
        totalKnacks += fundamentItem.system.knacksProvided;
      }
    }
    
    // Get knacks from all talent items
    const talentItems = this.actor.items.filter(item => item.type === 'talent');
    talentItems.forEach((talent, index) => {
      if (talent.system && talent.system.knacksProvided) {
        totalKnacks += talent.system.knacksProvided;
      }
    });
    
    return totalKnacks;
  }

  prepareSlots(itemType, slotCount) {
    const slots = [];
    
    if (itemType === 'talent') {
      // Get all track items to determine which tracks are assigned
      const trackItems = this.actor.items.filter(item => item.type === 'track');
      const assignedTracks = new Map();
      
      // Build a map of which track slots are filled
      trackItems.forEach(track => {
        const slotIndex = track.getFlag('zwolf-epic', 'slotIndex');
        if (slotIndex !== undefined && slotIndex < 4) {
          assignedTracks.set(slotIndex + 1, track);
        } else {
          for (let i = 1; i <= 4; i++) {
            if (!assignedTracks.has(i)) {
              assignedTracks.set(i, track);
              track.setFlag('zwolf-epic', 'slotIndex', i - 1);
              break;
            }
          }
        }
      });
      
      // Helper function to get track info for a talent slot
      const getTrackInfoForTalentSlot = (talentSlotNumber) => {
        const modResult = talentSlotNumber % 4;
        const trackNumber = modResult === 0 ? 4 : modResult;
        const assignedTrack = assignedTracks.get(trackNumber);
        
        return {
          trackNumber: trackNumber,
          trackName: assignedTrack ? assignedTrack.name : null,
          hasTrack: !!assignedTrack
        };
      };
      
      // Get talent items
      const talentItems = this.actor.items.filter(item => item.type === 'talent');
      
      // Create all slots first
      for (let i = 0; i < slotCount; i++) {
        const talentSlotNumber = i + 1;
        const trackInfo = getTrackInfoForTalentSlot(talentSlotNumber);
        
        slots.push({
          index: i,
          item: null,
          talentNumber: talentSlotNumber,
          trackNumber: trackInfo.trackNumber,
          trackName: trackInfo.trackName,
          hasTrack: trackInfo.hasTrack
        });
      }
      
      // Fill slots based on stored slotIndex
      talentItems.forEach((talent, sequentialIndex) => {
        const slotIndex = talent.getFlag('zwolf-epic', 'slotIndex');
        
        if (slotIndex !== undefined && slotIndex < slotCount && slots[slotIndex] && !slots[slotIndex].item) {
          slots[slotIndex].item = talent.toObject();
        } else {
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
    } else {
      // Original behavior for knacks and tracks
      const items = this.actor.items.filter(item => item.type === itemType);
      
      for (let i = 0; i < slotCount; i++) {
        const slot = { index: i, item: null };
        
        if (items[i]) {
          slot.item = items[i].toObject();
        }
        
        slots.push(slot);
      }
      
      return slots;
    }
  }

  // =================================
  // BUILD POINTS CALCULATION
  // =================================

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
    
    if (ancestry && ancestry.system && ancestry.system.buildPoints) {
      maxBP += ancestry.system.buildPoints;
    }
    
    if (fundament && fundament.system && fundament.system.buildPoints) {
      maxBP += fundament.system.buildPoints;
    }
    
    return maxBP;
  }

  // =================================
  // GRANTED ABILITIES
  // =================================

  _categorizeGrantedAbilities() {
    const categories = {
      passive: [],
      exoticSenses: [],
      dominantAction: [],
      swiftAction: [],
      reaction: [],
      free: [],
      strike: [],
      journey: [],
      miscellaneous: []
    };

    const processedItems = new Set();

    const processItemAbilities = (item, source = 'item') => {
      if (processedItems.has(item.id)) {
        console.log(`Z-Wolf Epic | Skipping already processed item: ${item.name} (${item.id})`);
        return;
      }
      
      processedItems.add(item.id);
      console.log(`Z-Wolf Epic | Processing abilities from ${source}: ${item.name} (${item.type})`);
      
      // Equipment placement filtering for granted abilities
      if (item.type === 'equipment') {
        const requiredPlacement = item.system.requiredPlacement;
        const currentPlacement = item.system.placement;
        
        if (requiredPlacement && requiredPlacement !== '' && requiredPlacement !== currentPlacement) {
          console.log(`Z-Wolf Epic | Skipping ${item.name} granted abilities - required placement "${requiredPlacement}" != current placement "${currentPlacement}"`);
          return;
        }
      }
      
      if (item.system && item.system.grantedAbilities && Array.isArray(item.system.grantedAbilities)) {
        console.log(`Z-Wolf Epic | Found ${item.system.grantedAbilities.length} granted abilities in ${item.name}`);
        
        item.system.grantedAbilities.forEach((ability, index) => {
          console.log(`Z-Wolf Epic | Processing ability ${index + 1}:`, ability);
          
          if (ability.name && ability.type) {
            const categoryKey = ability.type;
            
            console.log(`Z-Wolf Epic | Ability "${ability.name}" has type "${ability.type}" (category: ${categoryKey})`);
            
            if (categories.hasOwnProperty(categoryKey)) {
              categories[categoryKey].push({
                name: ability.name,
                tags: ability.tags || '',
                description: ability.description || 'No description provided.',
                itemName: item.name,
                itemId: item.id
              });
              console.log(`Z-Wolf Epic | Added "${ability.name}" to ${categoryKey} category with tags: "${ability.tags || 'none'}"`);
            } else {
              console.warn(`Z-Wolf Epic | Unknown category "${categoryKey}" for ability "${ability.name}"`);
            }
          } else {
            console.warn(`Z-Wolf Epic | Ability missing required properties:`, ability);
          }
        });
      } else {
        console.log(`Z-Wolf Epic | No grantedAbilities found in ${item.name} (${source})`);
      }
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

    // Process all items owned by the actor
    console.log(`Z-Wolf Epic | Processing ${this.actor.items.size} owned items`);
    
    // First, process non-track items normally
    this.actor.items.forEach(item => {
      if (item.type !== 'track') {
        processItemAbilities(item, 'owned');
      }
    });

    // Then, process track items with tier-based abilities
    const trackItems = this.actor.items.filter(item => item.type === 'track');
    const characterLevel = this.actor.system.level || 0;
    
    console.log(`Z-Wolf Epic | Processing ${trackItems.length} track items for level ${characterLevel} character`);
    
    trackItems.forEach((track, trackSlotIndex) => {
      const actualSlotIndex = track.getFlag('zwolf-epic', 'slotIndex') ?? trackSlotIndex;
      const unlockedTiers = getTrackTierForLevel(actualSlotIndex, characterLevel);
      
      console.log(`Z-Wolf Epic | Track "${track.name}" in slot ${actualSlotIndex} has unlocked tiers: [${unlockedTiers.join(', ')}]`);
      
      // Process base track abilities
      processItemAbilities(track, `track-base`);
      
      // Process tier abilities for unlocked tiers
      unlockedTiers.forEach(tierNumber => {
        const tierData = track.system.tiers?.[`tier${tierNumber}`];
        
        if (tierData && tierData.grantedAbilities && Array.isArray(tierData.grantedAbilities)) {
          console.log(`Z-Wolf Epic | Processing ${tierData.grantedAbilities.length} abilities from ${track.name} tier ${tierNumber}`);
          
          tierData.grantedAbilities.forEach((ability, index) => {
            console.log(`Z-Wolf Epic | Processing tier ${tierNumber} ability ${index + 1}:`, ability);
            
            if (ability.name && ability.type) {
              const categoryKey = ability.type;
              
              if (categories.hasOwnProperty(categoryKey)) {
                categories[categoryKey].push({
                  name: ability.name,
                  tags: ability.tags || '',
                  description: ability.description || 'No description provided.',
                  itemName: `${track.name} (Tier ${tierNumber})`,
                  itemId: track.id,
                  tierSource: tierNumber
                });
                console.log(`Z-Wolf Epic | Added "${ability.name}" from ${track.name} tier ${tierNumber} to ${categoryKey} category`);
              } else {
                console.warn(`Z-Wolf Epic | Unknown category "${categoryKey}" for tier ability "${ability.name}"`);
              }
            } else {
              console.warn(`Z-Wolf Epic | Tier ability missing required properties:`, ability);
            }
          });
        }
      });
    });

    // Log final categories for debugging
    Object.keys(categories).forEach(category => {
      console.log(`Z-Wolf Epic | Final ${category} abilities count: ${categories[category].length}`);
      if (categories[category].length > 0) {
        console.log(`Z-Wolf Epic | ${category} abilities:`, categories[category].map(a => `${a.name} (from ${a.itemName}) [tags: ${a.tags || 'none'}]`));
      }
    });

    return categories;
  }

  _ensureAbilityCategories(context) {
    const defaultCategories = {
      passive: [],
      dominantAction: [],
      swiftAction: [],
      reaction: [],
      free: [],
      strike: [],
      journey: [],
      miscellaneous: []
    };
    
    context.abilityCategories = { ...defaultCategories, ...context.abilityCategories };
  }

  // =================================
  // FUNDAMENT VALUES
  // =================================

  _calculateFundamentValues(level, fundament = null) {
    const defaultValues = {
      maxVitality: 10,
      coastNumber: 4
    };

    if (!fundament || !fundament.system) {
      console.log("Z-Wolf Epic | No fundament assigned, using default values");
      return defaultValues;
    }

    const vitalityBoostCount = this.actor.system.vitalityBoostCount || 0;

    const functionData = {
      level: level,
      vitalityBoostCount: vitalityBoostCount,
      attributes: this.actor.system.attributes || {},
      skills: this.actor.system.skills || {}
    };

    const calculatedValues = { ...defaultValues };

    // Calculate vitality if function exists
    if (fundament.system.vitalityFunction && fundament.system.vitalityFunction.trim()) {
      try {
        const vitalityResult = this._evaluateFunction(fundament.system.vitalityFunction, functionData);
        if (typeof vitalityResult === 'number' && !isNaN(vitalityResult) && vitalityResult > 0) {
          calculatedValues.maxVitality = Math.floor(vitalityResult);
          console.log(`Z-Wolf Epic | Calculated max vitality: ${calculatedValues.maxVitality}`);
        } else {
          console.warn(`Z-Wolf Epic | Invalid vitality function result: ${vitalityResult}, using default`);
        }
      } catch (error) {
        console.error(`Z-Wolf Epic | Error calculating vitality from fundament function:`, error);
        ui.notifications.warn(`Error in vitality function: ${error.message}`);
      }
    }

    // Calculate coast number if function exists
    if (fundament.system.coastFunction && fundament.system.coastFunction.trim()) {
      try {
        const coastResult = this._evaluateFunction(fundament.system.coastFunction, functionData);
        if (typeof coastResult === 'number' && !isNaN(coastResult) && coastResult > 0) {
          calculatedValues.coastNumber = Math.floor(coastResult);
          console.log(`Z-Wolf Epic | Calculated coast number: ${calculatedValues.coastNumber}`);
        } else {
          console.warn(`Z-Wolf Epic | Invalid coast function result: ${coastResult}, using default`);
        }
      } catch (error) {
        console.error(`Z-Wolf Epic | Error calculating coast number from fundament function:`, error);
        ui.notifications.warn(`Error in coast function: ${error.message}`);
      }
    }

    return calculatedValues;
  }

  _evaluateFunction(functionString, data) {
    const { level, attributes, skills, vitalityBoostCount } = data;
    
    const functionWrapper = `
      (function() {
        ${functionString}
      })();
    `;
    
    return eval(functionWrapper);
  }

  // =================================
  // CHARACTER TAGS & LANGUAGES
  // =================================

  _calculateCharacterTags() {
    const allTags = [];
    
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
    
    const parseTags = (tags) => {
      if (!tags) return [];
      
      if (Array.isArray(tags)) {
        return tags.filter(tag => tag && tag.trim().length > 0);
      } else if (typeof tags === 'string') {
        return tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
      
      return [];
    };
    
    // Collect tags from all items that have characterTags
    this.actor.items.forEach(item => {
      // Handle track items with tier-based character tags
      if (item.type === 'track') {
        const trackItems = this.actor.items.filter(i => i.type === 'track');
        const trackSlotIndex = item.getFlag('zwolf-epic', 'slotIndex') ?? trackItems.findIndex(t => t.id === item.id);
        const characterLevel = this.actor.system.level || 0;
        const unlockedTiers = getTrackTierForLevel(trackSlotIndex, characterLevel);
        
        // Collect character tags from unlocked tiers
        unlockedTiers.forEach(tierNumber => {
          const tierData = item.system.tiers?.[`tier${tierNumber}`];
          if (tierData && tierData.characterTags) {
            const tierTags = parseTags(tierData.characterTags);
            allTags.push(...tierTags);
            
            if (tierTags.length > 0) {
              console.log(`Z-Wolf Epic | Found character tags from ${item.name} tier ${tierNumber}:`, tierTags);
            }
          }
        });
      } 
      // Handle regular items with characterTags
      else if (item.system && item.system.characterTags) {
        const itemTags = parseTags(item.system.characterTags);
        allTags.push(...itemTags);
        
        if (itemTags.length > 0) {
          console.log(`Z-Wolf Epic | Found character tags from ${item.name} (${item.type}):`, itemTags);
        }
      }
    });
    
    // Remove duplicates and sort
    const uniqueTags = [...new Set(allTags)].sort();
    
    if (uniqueTags.length > 0) {
      console.log(`Z-Wolf Epic | Final character tags:`, uniqueTags);
      return uniqueTags.join(', ');
    }
    
    // Default fallback
    return 'Humanoid';
  }

  _calculateLanguageLimit() {
    let linguistCount = 0;
    
    // Count "Linguist" knacks
    this.actor.items.forEach(item => {
      if (item.type === 'knack' && item.name.toLowerCase() === 'linguist') {
        linguistCount++;
      }
    });
    
    const limit = 2 + (linguistCount * 2);
    console.log(`Z-Wolf Epic | Language limit: ${limit} (base 2 + ${linguistCount} Linguist knacks)`);
    
    return limit;
  }

  // =================================
  // EQUIPMENT & INVENTORY
  // =================================

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
      
      // Add placement validation info to item data
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

    // Calculate carrying capacity (max bulk)
    let maxBulk = 10;
    
    // Add size modifier
    const sizeModifiers = {
      'diminutive': -12,
      'tiny': -8,
      'small': -4,
      'medium': 0,
      'large': 4,
      'huge': 8,
      'gargantuan': 12
    };
    
    const characterSize = this.actor.system?.size || 'medium';
    maxBulk += sizeModifiers[characterSize] || 0;
    
    // Add Brawn Skill Progression bonus
    const brawnProgression = this.actor.system?.skills?.brawn?.progression || 'mediocre';
    const brawnProgressionTiers = {
      'mediocre': 0,
      'moderate': 3,
      'specialty': 6,
      'awesome': 9
    };
    
    maxBulk += brawnProgressionTiers[brawnProgression] || 0;

    // Add Max Bulk boosts from equipment
    let totalMaxBulkBoost = 0;
    this.actor.items.forEach(item => {
      if (item.type === 'equipment' && item.system?.sideEffects?.maxBulkBoost) {
        const requiredPlacement = item.system.requiredPlacement;
        const currentPlacement = item.system.placement;
        
        if (!requiredPlacement || requiredPlacement === '' || requiredPlacement === currentPlacement) {
          const boost = parseInt(item.system.sideEffects.maxBulkBoost) || 0;
          if (boost > 0) {
            totalMaxBulkBoost += boost;
            console.log(`Z-Wolf Epic | ${item.name} provides +${boost} max bulk`);
          }
        }
      }
    });
    
    maxBulk += totalMaxBulkBoost;

    // Calculate totals from carried equipment only
    const carriedCategories = ['wielded', 'worn', 'readily_available', 'stowed'];
    
    carriedCategories.forEach(categoryName => {
      const category = equipment[categoryName] || [];
      category.forEach(item => {
        const quantity = item.system?.quantity || 1;
        totalValue += (item.system?.value || 0) * quantity;
        totalWeight += (item.system?.weight || 0) * quantity;
        totalBulk += (item.system?.bulk || 0) * quantity;
      });
    });

    return {
      value: totalValue,
      weight: totalWeight,
      bulk: totalBulk,
      maxBulk: Math.max(1, maxBulk)
    };
  }

  // =================================
  // VITALITY BOOST TRACKING
  // =================================

  _countVitalityBoostItems() {
    const count = this.actor.items.filter(item => 
      item.name === "Extra VP"
    ).length;
    
    console.log(`Z-Wolf Epic | Found ${count} vitality boost items`);
    return count;
  }

  async _updateVitalityBoostCount() {
    const actualCount = this._countVitalityBoostItems();
    const currentCount = this.actor.system.vitalityBoostCount || 0;
    
    if (actualCount !== currentCount) {
      console.log(`Z-Wolf Epic | Updating vitality boost count from ${currentCount} to ${actualCount}`);
      await this.actor.update({ 'system.vitalityBoostCount': actualCount });
      return true;
    }
    
    return false;
  }
}
