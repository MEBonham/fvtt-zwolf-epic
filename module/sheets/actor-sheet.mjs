/**
 * Z-Wolf Epic Character Sheet
 * Location: /sheets/actor-sheet.mjs
 */

import { ZWolfDice } from "../helpers/dice.mjs";

const TextEditorImpl = foundry.applications.ux.TextEditor.implementation;

export class ZWolfActorSheet extends ActorSheet {

  _processingCustomDrop = false;  
  
  // Static constants for the sheet
  static PROGRESSION_ITEM_NAME = "Progression Enhancement"; // Change this to your item's exact name
  static VITALITY_BOOST_ITEM_NAME = "Extra VP";

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["zwolf-epic", "sheet", "actor"],
      width: 800,
      height: 680,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "overview" }]
    });
  }

  /** @override */
  get template() {
    // Return different templates based on actor type
    const actorType = this.actor.type;
    
    // PCs and NPCs both use the character sheet template
    if (actorType === 'pc' || actorType === 'npc') {
      return `systems/zwolf-epic/templates/actor/actor-character-sheet.html`;
    }
    
    // Other actor types use their specific templates
    return `systems/zwolf-epic/templates/actor/actor-${actorType}-sheet.html`;
  }

  /** @override */
  getData(options) {
    // Get the base data - use parent's getData
    const context = super.getData(options);
    
    // Get the actor data - Foundry v11+ uses this.actor directly
    const actorData = this.actor;
    
    // Add system data to context
    context.system = actorData.system || {};
    context.flags = actorData.flags || {};
    
    // Get character level (default to 0 if not set)
    const level = context.system.level ?? 0;  // Use nullish coalescing to allow 0
    
    // Calculate progressionOnlyLevel (check for special item or flag)
    const progressionOnlyLevel = this._getProgressionOnlyLevel(actorData);
    this._updateVitalityBoostCount().then(wasUpdated => {
      if (wasUpdated && !this._state.closed) {
        // Re-render if the count changed and sheet is still open
        this.render(false);
      }
    });
    
    // Calculate progression bonuses using the formulas
    context.progressionBonuses = this._calculateProgressionBonuses(level, progressionOnlyLevel);
    
    // === NEW: Foundation Items ===
    // Get ancestry item if assigned
    if (context.system.ancestryId) {
      const ancestryItem = this.actor.items.get(context.system.ancestryId);
      if (ancestryItem && ancestryItem.type === 'ancestry') {
        const ancestryObj = ancestryItem.toObject();
        context.ancestry = ancestryObj; // Put it at context level, not context.system
      }
    }

    // Get fundament item if assigned
    if (context.system.fundamentId) {
      const fundamentItem = this.actor.items.get(context.system.fundamentId);
      if (fundamentItem && fundamentItem.type === 'fundament') {
        const fundamentObj = fundamentItem.toObject();
        context.fundament = fundamentObj; // Put it at context level, not context.system
      }
    }

    // Apply side effects from ancestry
    const sideEffects = this._applySideEffects(context.ancestry, context.fundament, this.actor.items);
    context.sideEffects = sideEffects;
    
    // Calculate Target Numbers based on progression bonuses AND side effects
    context.tns = {
      toughness: 6 + context.progressionBonuses[sideEffects.toughnessTNProgression],
      destiny: 6 + context.progressionBonuses[sideEffects.destinyTNProgression],
      improvised: 6 + context.progressionBonuses.mediocre,
      healing: 6 + context.progressionBonuses.moderate,
      challenge: 6 + context.progressionBonuses.specialty
    };
    
    // Organize stats by progression, including side effects
    context.progressions = this._organizeByProgression(context.system, context.progressionBonuses, sideEffects);
    
    // Add labels for attributes and skills
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

    // Calculate knack slots
    const totalKnacksProvided = this.calculateTotalKnacksProvided();
    context.knackSlots = this.prepareSlots('knack', totalKnacksProvided);
    
    // Calculate track slots
    const trackSlotCount = Math.min(4, context.system.level || 0);
    context.trackSlots = this.prepareSlots('track', trackSlotCount);
    
    // Calculate talent slots
    context.talentSlots = this.prepareSlots('talent', context.system.level || 0);

    // Calculate Build Points
    context.buildPoints = this._calculateTotalBP(context.system, context.ancestry, context.fundament);
    
    // Gather and categorize all granted abilities from items
    context.abilityCategories = this._categorizeGrantedAbilities();
    
    // SAFETY CHECK: Ensure all ability categories exist and have length property
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
    
    // Merge with defaults to ensure all categories exist
    context.abilityCategories = { ...defaultCategories, ...context.abilityCategories };

    // Calculate Fundament-based Values
    context.calculatedValues = this._calculateFundamentValues(level, context.fundament);
    
    // In getData method, after getting ancestry:
    context.characterTags = this._calculateCharacterTags();

    // Calculate language limit
    context.languageLimit = this._calculateLanguageLimit();
    
    // Prepare equipment for inventory tab
    context.equipment = this._prepareEquipment();

    // Calculate total equipment value, weight, and bulk
    context.inventoryTotals = this._calculateInventoryTotals(context.equipment);

    // Ensure buildPointsLocked is available in the template
    if (!context.system.buildPointsLocked) {
      context.system.buildPointsLocked = false;
    }
    
    console.log("Z-Wolf Epic | Final context data:", {
      progressionBonuses: context.progressionBonuses,
      abilityCategories: context.abilityCategories,
      calculatedValues: context.calculatedValues,
      equipment: context.equipment ? Object.keys(context.equipment) : 'undefined'
    });
    
    return context;
  }

  /**
   * Calculate progression bonuses based on level and progressionOnlyLevel
   * @param {number} level - Character level (0-20)
   * @param {number} progressionOnlyLevel - Special progression level (0 or 1)
   * @returns {Object} Object containing calculated bonuses for each progression
   */
  _calculateProgressionBonuses(level, progressionOnlyLevel) {
    const totalLevel = level + progressionOnlyLevel;
    
    return {
      mediocre: Math.floor(0.6 * totalLevel - 0.3),
      moderate: Math.floor(0.8 * totalLevel),
      specialty: Math.floor(1 * totalLevel),
      awesome: Math.floor(1.2 * totalLevel + 0.80001)
    };
  }
  
  /**
   * Enhanced _applySideEffects method that filters equipment based on placement
   */
  _applySideEffects(ancestry = null, fundament = null, allItems = null) {
    // Define progression hierarchy for comparison
    const progressionLevels = {
      '': 0,           // No upgrade
      'mediocre': 1,
      'moderate': 2,
      'specialty': 3,
      'awesome': 4
    };
    
    const sideEffects = {
      speedProgression: null,
      speedProgressionSource: null,
      toughnessTNProgression: 'mediocre',  // Default
      toughnessTNProgressionSource: 'default',
      destinyTNProgression: 'moderate',     // Default
      destinyTNProgressionSource: 'default',
      // Vision radius side effects
      nightsightRadius: this.actor.system.vision?.nightsightRadius || 1, // Default 1m
      nightsightRadiusSource: 'default',
      darkvisionRadius: this.actor.system.vision?.darkvisionRadius || 0.5, // Default 0.5m
      darkvisionRadiusSource: 'default'
    };
    
    // Track the highest level found for each upgrade type
    let highestSpeed = { level: 0, progression: null, source: null };
    let highestToughness = { level: 1, progression: 'mediocre', source: 'default' }; // Start with mediocre
    let highestDestiny = { level: 2, progression: 'moderate', source: 'default' };   // Start with moderate
    let highestNightsight = { radius: sideEffects.nightsightRadius, source: 'default' };
    let highestDarkvision = { radius: sideEffects.darkvisionRadius, source: 'default' };
    
    // Helper function to check and update highest progression
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
    
    // Helper function to check and update highest vision radius
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
      allItems.forEach(item => {
        // Skip ancestry and fundament as we already checked them
        if (item.type === 'ancestry' || item.type === 'fundament') return;
        
        // NEW: Equipment placement filtering
        if (item.type === 'equipment') {
          const requiredPlacement = item.system.requiredPlacement;
          const currentPlacement = item.system.placement;
          
          // If equipment has a required placement and it doesn't match current placement, skip its effects
          if (requiredPlacement && requiredPlacement !== '' && requiredPlacement !== currentPlacement) {
            console.log(`Z-Wolf Epic | Skipping ${item.name} side effects - required placement "${requiredPlacement}" != current placement "${currentPlacement}"`);
            return;
          }
        }
        
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
      console.log(`Z-Wolf Epic | Speed upgraded to ${highestSpeed.progression} by ${highestSpeed.source}`);
    }
    
    sideEffects.toughnessTNProgression = highestToughness.progression;
    sideEffects.toughnessTNProgressionSource = highestToughness.source;
    if (highestToughness.source !== 'default') {
      console.log(`Z-Wolf Epic | Toughness TN upgraded to ${highestToughness.progression} by ${highestToughness.source}`);
    }
    
    sideEffects.destinyTNProgression = highestDestiny.progression;
    sideEffects.destinyTNProgressionSource = highestDestiny.source;
    if (highestDestiny.source !== 'default') {
      console.log(`Z-Wolf Epic | Destiny TN upgraded to ${highestDestiny.progression} by ${highestDestiny.source}`);
    }
    
    // Apply the highest vision radius found for each type
    sideEffects.nightsightRadius = highestNightsight.radius;
    sideEffects.nightsightRadiusSource = highestNightsight.source;
    if (highestNightsight.source !== 'default') {
      console.log(`Z-Wolf Epic | Nightsight radius upgraded to ${highestNightsight.radius}m by ${highestNightsight.source}`);
    }
    
    sideEffects.darkvisionRadius = highestDarkvision.radius;
    sideEffects.darkvisionRadiusSource = highestDarkvision.source;
    if (highestDarkvision.source !== 'default') {
      console.log(`Z-Wolf Epic | Darkvision radius upgraded to ${highestDarkvision.radius}m by ${highestDarkvision.source}`);
    }
    
    return sideEffects;
  }

  /**
   * Check if the character has the specific item that grants progressionOnlyLevel
   * @param {Actor} actorData - The actor data
   * @returns {number} 1 if the character has the item, 0 otherwise
   */
  _getProgressionOnlyLevel(actorData) {
    // Check if the actor has any items
    if (actorData.items) {
      // Look for the specific item by name
      const hasProgressionItem = actorData.items.some(item => 
        item.name === ZWolfActorSheet.PROGRESSION_ITEM_NAME
      );
      
      if (hasProgressionItem) {
        return 1;
      }
    }
    
    // Default to 0 if the progression item is not found
    return 0;
  }

  /**
   * Organize attributes and skills by their progression
   */
  _organizeByProgression(system, bonuses, sideEffects = null) {
    const progressions = {
      mediocre: {
        name: "Mediocre",
        bonus: bonuses.mediocre,
        stats: []
      },
      moderate: {
        name: "Moderate",
        bonus: bonuses.moderate,
        stats: []
      },
      specialty: {
        name: "Specialty",
        bonus: bonuses.specialty,
        stats: []
      },
      awesome: {
        name: "Awesome",
        bonus: bonuses.awesome,
        stats: []
      }
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
        upgraded: true  // Mark as upgraded by side effects
      });
    }
    
    return progressions;
  }

  /**
   * Calculate values based on fundament functions
   * @param {number} level - Character level
   * @param {Object} fundament - The fundament item object
   * @returns {Object} Object containing calculated vitality and coast values
   */
  _calculateFundamentValues(level, fundament = null) {
    const defaultValues = {
      maxVitality: 10, // Default fallback
      coastNumber: 4   // Default fallback
    };

    // If no fundament is assigned, return defaults
    if (!fundament || !fundament.system) {
      console.log("Z-Wolf Epic | No fundament assigned, using default values");
      return defaultValues;
    }

    // Get vitality boost count from actor system
    const vitalityBoostCount = this.actor.system.vitalityBoostCount || 0;

    // Prepare data for function execution
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

  /**
   * Safely evaluate a function string with provided data
   * @param {string} functionString The JavaScript function code
   * @param {object} data The data to make available to the function
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

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    
    if (!this.isEditable) return;

    // Add dice roll handlers FIRST (before accordion handlers)
    html.find('.progression-die').click(ev => {
      ev.preventDefault();
      ev.stopPropagation();
      this._onProgressionDiceRoll(ev);
    });

    // Add accordion click handlers
    html.find('.progression-header').click(ev => {
      ev.preventDefault();
      const header = ev.currentTarget;
      const group = $(header).closest('.progression-group');
      const wasExpanded = group.hasClass('expanded');
      
      html.find('.progression-group').removeClass('expanded');
      
      if (!wasExpanded) {
        group.addClass('expanded');
      }
    });

    // Add stat roll click handlers
    html.find('.stat-rollable').click(ev => {
      ev.preventDefault();
      this._onStatRoll(ev);
    });

    // Speed roll handler for header speed die
    html.find('.speed-roll-die').click(ev => {
      ev.preventDefault();
      ev.stopPropagation();
      this._onSpeedRoll(ev);
    });

    // Add progression change handlers
    html.find('.progression-slider').on('input change', ev => {
      this._onProgressionSliderChange(ev);
    });

    // **NEW: Apply lock state immediately after listeners are set up**
    const isLocked = this.actor.system.buildPointsLocked || false;
    this._updateSliderStates(isLocked);

    // Add level change handler
    const levelInput = html.find('input[name="system.level"], input[name="data.level"], .level-input, input.level');
    console.log("Z-Wolf Epic | Level input found:", levelInput.length, "elements");
    
    if (levelInput.length > 0) {
      levelInput.on('change', ev => {
        console.log("Z-Wolf Epic | Level changed to:", ev.currentTarget.value);
        this._onLevelChange(ev);
      });
    } else {
      console.warn("Z-Wolf Epic | No level input field found. Check your HTML template.");
    }

    // Foundation Drop Zone Handlers
    html.find('.foundation-drop-zone').on('dragover', this._onDragOver.bind(this));
    html.find('.foundation-drop-zone').on('drop', this._onFoundationDrop.bind(this));
    html.find('.foundation-drop-zone').on('dragleave', this._onDragLeave.bind(this));

    // Slot Drop Zone Handlers
    html.find('.knack-drop-zone, .track-drop-zone, .talent-drop-zone').on('dragover', this._onSlotDragOver.bind(this));
    html.find('.knack-drop-zone, .track-drop-zone, .talent-drop-zone').on('drop', this._onSlotDrop.bind(this));
    html.find('.knack-drop-zone, .track-drop-zone, .talent-drop-zone').on('dragleave', this._onDragLeave.bind(this));
    
    // Equipment Drop Zone Handlers
    html.find('.equipment-drop-zone').on('dragover', this._onEquipmentDragOver.bind(this));
    html.find('.equipment-drop-zone').on('drop', this._onEquipmentDrop.bind(this));
    html.find('.equipment-drop-zone').on('dragleave', this._onDragLeave.bind(this));
    
    // UNIFIED ITEM DELETION HANDLER
    // This replaces all the individual delete handlers
    html.find('.item-control.item-delete, .item-control.item-remove').click(this._onUnifiedItemDelete.bind(this));
    
    // Item edit handlers (these can stay separate as they don't delete)
    html.find('.item-control.item-edit').click(ev => {
      ev.preventDefault();
      const element = ev.currentTarget;
      const itemElement = element.closest('[data-item-id], .slotted-item');
      const itemId = itemElement?.dataset.itemId;
      const item = this.actor.items.get(itemId);
      
      if (item) {
        item.sheet.render(true);
      }
    });

    // Disable controls for locked items (except equipment)
    html.find('.item').each((i, element) => {
      const itemId = element.dataset.itemId;
      const item = this.actor.items.get(itemId);
      
      const isLocked = item?.getFlag('zwolf-epic', 'locked');
      const isEquipment = item?.type === 'equipment';
      
      if (isLocked && !isEquipment) {
        $(element).find('input, select, textarea, button')
          .not('.item-delete, .item-remove')  // Keep delete buttons enabled
          .prop('disabled', true)
          .addClass('locked');
      }
    });

    // NEW: Build Points Lock Button Handler
    html.find('.build-points-lock-btn').click(ev => {
      ev.preventDefault();
      this._onBuildPointsLockToggle(ev);
    });

    // Build Points Lock Button Handler
    html.find('.build-points-lock-btn').click(ev => {
      ev.preventDefault();
      this._onBuildPointsLockToggle(ev);
    });

    // Rest Button Handlers
    html.find('.short-rest-btn').click(ev => {
      ev.preventDefault();
      this._onShortRest(ev);
    });

    html.find('.extended-rest-btn').click(ev => {
      ev.preventDefault();
      this._onExtendedRest(ev);
    });

    // REMOVED ALL CUSTOM EDITOR HANDLING - Let Foundry handle editors normally
    // The {{editor}} helpers in the HTML template will handle everything automatically
    
    // Register for both create and delete events
    Hooks.on('createItem', this._vitalityBoostHook);
    Hooks.on('deleteItem', this._vitalityBoostHook);

    // Set up a more reliable item deletion hook
    // Store the hook ID so we can clean it up later
    if (this._itemDeleteHook) {
      Hooks.off('deleteItem', this._itemDeleteHook);
    }

    // NEW: Equipment placement change handler
    html.find('.equipment-placement-select').change(ev => {
      this._onEquipmentPlacementChange(ev);
    });
    
    this._itemDeleteHook = Hooks.on('deleteItem', (item, options, userId) => {
      // Only react if this is an item from our actor and we're the current user
      if (item.actor?.id === this.actor.id && userId === game.user.id) {
        console.log(`Z-Wolf Epic | Item ${item.name} deleted via hook, checking for re-render needs`);
        
        const hadGrantedAbilities = item.system?.grantedAbilities?.length > 0;
        const wasProgressionItem = item.name === ZWolfActorSheet.PROGRESSION_ITEM_NAME;
        const providedKnacks = item.system?.knacksProvided > 0;
        const wasFoundationItem = ['ancestry', 'fundament'].includes(item.type);
        
        if (hadGrantedAbilities || wasProgressionItem || providedKnacks || wasFoundationItem) {
          console.log(`Z-Wolf Epic | Item ${item.name} with special properties was deleted, re-rendering sheet`);
          // Re-render after a brief delay to ensure the item is fully deleted
          setTimeout(() => {
            if (!this._state.closed) { // Check if sheet is still open
              this.render(false);
            }
          }, 100);
        }
      }
    });
  }

  /**
   * Handle drag over events for foundation drop zones
   */
  _onDragOver(event) {
    event.preventDefault();
    const dropZone = event.currentTarget;
    
    try {
      // Get the dragged data
      const data = TextEditorImpl.getDragEventData(event.originalEvent || event);
      
      if (data.type === 'Item') {
        // Get the expected item type from the drop zone
        const expectedType = dropZone.dataset.itemType;
        
        // For validation, we need to get the actual item
        // This is async, but we can't await in dragover, so we do basic validation
        dropZone.classList.remove('invalid-drop');
        dropZone.classList.add('drag-over');
      }
    } catch (err) {
      console.log("Z-Wolf Epic | Drag over error (this is normal):", err);
      dropZone.classList.add('invalid-drop');
    }
  }

  /**
   * Handle drag leave events for foundation drop zones
   */
  _onDragLeave(event) {
    const dropZone = event.currentTarget;
    dropZone.classList.remove('drag-over', 'invalid-drop');
  }

  /**
   * Handle dropping items onto foundation slots
   */
  async _onFoundationDrop(event) {
    this._processingCustomDrop = true;
    event.preventDefault();
    event.stopPropagation();
    
    try {
      const dropZone = event.currentTarget;
      dropZone.classList.remove('drag-over', 'invalid-drop');
      
      try {
        // Get the dragged data
        const data = TextEditorImpl.getDragEventData(event.originalEvent || event);
        
        if (data.type !== 'Item') return;
        
        // Get the item being dropped
        const item = await fromUuid(data.uuid);
        if (!item) {
          ui.notifications.error("Could not find the dropped item.");
          return;
        }
        
        // Get the expected item type and slot from the drop zone
        const expectedType = dropZone.dataset.itemType;
        const slot = dropZone.dataset.slot;
        
        // Validate item type
        if (item.type !== expectedType) {
          ui.notifications.warn(`This slot only accepts ${expectedType} items.`);
          return;
        }
        
        console.log(`Z-Wolf Epic | Dropping ${item.name} (${expectedType}) into ${slot} slot`);
        
        // STEP 1: Remove ALL existing items of this type first
        const existingItems = this.actor.items.filter(i => i.type === expectedType);
        console.log(`Z-Wolf Epic | Found ${existingItems.length} existing ${expectedType} items to remove`);
        
        if (existingItems.length > 0) {
          const itemIds = existingItems.map(i => i.id);
          console.log(`Z-Wolf Epic | Deleting items:`, itemIds);
          await this.actor.deleteEmbeddedDocuments("Item", itemIds);
        }
        
        // STEP 2: Clear the old ID reference
        let updateData = {};
        updateData[`system.${slot}Id`] = null;
        await this.actor.update(updateData);
        
        // STEP 3: Create the new item (only if it's not already on this actor)
        let actorItem;
        if (item.actor?.id !== this.actor.id) {
          console.log(`Z-Wolf Epic | Creating new ${expectedType} item: ${item.name}`);
          const itemData = item.toObject();
          const createdItems = await this.actor.createEmbeddedDocuments("Item", [itemData]);
          actorItem = createdItems[0];
        } else {
          // Item is already on this actor, just use it
          actorItem = item;
        }

        // After successfully assigning an ancestry, validate the size
        if (expectedType === 'ancestry') {
          // Give a brief moment for the update to complete
          setTimeout(async () => {
            const sizeChanged = await this._validateActorSize();
            if (sizeChanged) {
              this.render(false); // Re-render to show the new size options
            }
          }, 100);
        }
        
        // STEP 4: Set the new ID reference
        updateData = {};
        updateData[`system.${slot}Id`] = actorItem.id;
        await this.actor.update(updateData);
        
        // STEP 5: Lock the item
        await actorItem.setFlag('zwolf-epic', 'locked', true);
        
        ui.notifications.info(`${item.name} has been set as your ${expectedType}.`);
        this.render(false);
        
      } catch (err) {
        console.error("Z-Wolf Epic | Foundation drop error:", err);
        ui.notifications.error("Failed to assign the item to this slot.");
      }
    } finally {
      console.log("Z-Wolf Epic | _onSlotDrop FINALLY - resetting flag after 500ms");
      setTimeout(() => {
        console.log("Z-Wolf Epic | _onSlotDrop flag reset to false");
        this._processingCustomDrop = false;
      }, 500);
    }
  }

  /** @override */
  async close(options) {
    // Clean up our hooks
    if (this._itemDeleteHook) {
      Hooks.off('deleteItem', this._itemDeleteHook);
      this._itemDeleteHook = null;
    }
    
    if (this._vitalityBoostHook) {
      Hooks.off('createItem', this._vitalityBoostHook);
      Hooks.off('deleteItem', this._vitalityBoostHook);
      this._vitalityBoostHook = null;
    }

    // Clean up editor states
    this.element.find('.editor-content[data-edit]').removeClass('editor-active');
    
    return super.close(options);
  }

  /**
   * Handle editing foundation items
   */
  async _onFoundationItemEdit(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.closest('.slotted-item').dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (item) {
      item.sheet.render(true);
    }
  }

  /**
   * Unified handler for all item deletions
   * This handles foundation items (ancestry/fundament), slot items (knack/track/talent), and regular items
   */
  async _onUnifiedItemDelete(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const element = event.currentTarget;
    const itemElement = element.closest('[data-item-id], .slotted-item');
    
    if (!itemElement) {
      ui.notifications.error('Could not find item to delete');
      return;
    }
    
    const itemId = itemElement.dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (!item) {
      ui.notifications.error('Could not find item to delete');
      return;
    }
    
    console.log(`Z-Wolf Epic | Unified delete triggered for: ${item.name} (${item.type})`);
    
    // Determine what type of deletion this is
    const isFoundationItem = this._isFoundationItem(item);
    const isSlotItem = ['knack', 'track', 'talent'].includes(item.type);
    
    let confirmMessage = `Delete ${item.name}?`;
    
    if (isFoundationItem) {
      const foundationType = item.type;
      confirmMessage = `Remove ${item.name} as your ${foundationType}? This will also delete the item from your character.`;
    } else if (isSlotItem) {
      confirmMessage = `Remove ${item.name} from your character? This will delete the item entirely.`;
    }
    
    // Show confirmation dialog
    const confirmed = await Dialog.confirm({
      title: "Delete Item",
      content: `<p>${confirmMessage}</p>`,
      yes: () => true,
      no: () => false,
      defaultYes: false
    });
    
    if (!confirmed) return;
    
    try {
      // Handle foundation items (ancestry/fundament)
      if (isFoundationItem) {
        await this._handleFoundationItemDeletion(item);
      } 
      // Handle slot items and regular items
      else {
        await this._handleRegularItemDeletion(item);
      }
      
      // Check if this item had granted abilities or other special properties
      const hadGrantedAbilities = item.system?.grantedAbilities?.length > 0;
      const wasProgressionItem = item.name === ZWolfActorSheet.PROGRESSION_ITEM_NAME;
      const providedKnacks = item.system?.knacksProvided > 0;
      
      if (isFoundationItem && item.type === 'ancestry') {
        // Validate size after ancestry removal
        setTimeout(async () => {
          await this._validateActorSize();
          this.render(false);
        }, 100);
      }
      
      // Show success message
      ui.notifications.info(`${item.name} has been deleted.`);
      
      // Force re-render if the item affected calculated values
      if (hadGrantedAbilities || wasProgressionItem || providedKnacks || isFoundationItem) {
        console.log(`Z-Wolf Epic | Item ${item.name} affected calculated values, forcing re-render`);
        // Use a slight delay to ensure the deletion is fully processed
        setTimeout(() => {
          this.render(false);
        }, 50);
      }
      
    } catch (error) {
      console.error("Z-Wolf Epic | Error deleting item:", error);
      ui.notifications.error(`Failed to delete ${item.name}: ${error.message}`);
    }
  }

  // ADD THIS HELPER METHOD to your ZWolfActorSheet class
  /**
   * Check if an item is currently assigned as a foundation item (ancestry or fundament)
   */
  _isFoundationItem(item) {
    if (item.type === 'ancestry') {
      return this.actor.system.ancestryId === item.id;
    } else if (item.type === 'fundament') {
      return this.actor.system.fundamentId === item.id;
    }
    return false;
  }

  // ADD THIS HELPER METHOD to your ZWolfActorSheet class
  /**
   * Handle deletion of foundation items (ancestry/fundament)
   */
  async _handleFoundationItemDeletion(item) {
    console.log(`Z-Wolf Epic | Handling foundation item deletion: ${item.name}`);
    
    // Clear the reference in actor data first
    const updateData = {};
    if (item.type === 'ancestry') {
      updateData['system.ancestryId'] = null;
    } else if (item.type === 'fundament') {
      updateData['system.fundamentId'] = null;
    }
    
    if (Object.keys(updateData).length > 0) {
      await this.actor.update(updateData);
      console.log(`Z-Wolf Epic | Cleared foundation reference for ${item.type}`);
    }
    
    // Then delete the item
    await item.delete();
  }

  /**
   * Handle regular item deletion
   * PRESERVED from working version
   */
  async _handleRegularItemDeletion(item) {
    console.log(`Z-Wolf Epic | Handling regular item deletion: ${item.name}`);
    
    // Simply delete the item - slots will automatically adjust
    await item.delete();
  }

  /**
   * Handle drag over events for slot drop zones
   * MERGED VERSION - preserves working functionality
   */
  _onSlotDragOver(event) {
    event.preventDefault();
    const dropZone = event.currentTarget;
    
    try {
      // Get the dragged data - using TextEditorImpl as in working version
      const data = TextEditorImpl.getDragEventData(event.originalEvent || event);
      
      if (data.type === 'Item') {
        // Get the expected item type from the drop zone
        const expectedType = dropZone.dataset.itemType;
        
        dropZone.classList.remove('invalid-drop');
        dropZone.classList.add('drag-over');
      }
    } catch (err) {
      console.log("Z-Wolf Epic | Slot drag over error (this is normal):", err);
      dropZone.classList.add('invalid-drop');
    }
  }

  /**
   * Handle dropping items onto slots 
   * MERGED VERSION - working functionality + talent slot tracking
   */
  async _onSlotDrop(event) {
    console.log("Z-Wolf Epic | _onSlotDrop START - setting flag to true");
    this._processingCustomDrop = true;
    event.preventDefault();
    event.stopPropagation();
    
    try {
      const dropZone = event.currentTarget;
      dropZone.classList.remove('drag-over', 'invalid-drop');
      
      try {
        // Use TextEditorImpl as in working version
        const data = TextEditorImpl.getDragEventData(event.originalEvent || event);
        
        if (data.type !== 'Item') return;
        
        const item = await fromUuid(data.uuid);
        if (!item) {
          ui.notifications.error("Could not find the dropped item.");
          return;
        }
        
        const expectedType = dropZone.dataset.itemType;
        const slot = dropZone.dataset.slot;
        
        if (item.type !== expectedType) {
          ui.notifications.warn(`This slot only accepts ${expectedType} items.`);
          return;
        }
        
        // Parse slot index from slot string (e.g., "talent-4" -> 4)
        const slotIndex = parseInt(slot.split('-')[1]);
        
        // Check slot capacity using working version logic
        const currentItems = this.actor.items.filter(i => i.type === expectedType);
        const maxSlots = this._getMaxSlotsForType(expectedType);
        
        // ENHANCED: Different logic for talents vs other items
        let existingItem = null;
        
        if (expectedType === 'talent') {
          // For talents, check if there's already an item in this specific slot
          existingItem = currentItems.find(i => i.getFlag('zwolf-epic', 'slotIndex') === slotIndex);
          
          // Validate slot index is within bounds
          if (slotIndex >= maxSlots) {
            ui.notifications.warn(`Invalid talent slot ${slotIndex + 1}. Maximum slots: ${maxSlots}.`);
            return;
          }
        } else {
          // For knacks and tracks, use sequential logic (working version)
          existingItem = currentItems[slotIndex];
          
          if (currentItems.length >= maxSlots && !existingItem) {
            ui.notifications.warn(`You have reached the maximum number of ${expectedType} slots.`);
            return;
          }
        }
        
        // Create or get the item on the actor if it's not already owned
        let actorItem;
        if (item.actor?.id !== this.actor.id) {
          // Always create a new copy when dragging from external sources
          const itemData = item.toObject();
          const createdItems = await this.actor.createEmbeddedDocuments("Item", [itemData]);
          actorItem = createdItems[0];
        } else {
          actorItem = item;
        }
        
        // Handle replacement if needed
        if (existingItem && existingItem.id !== actorItem.id) {
          await existingItem.delete();
          ui.notifications.info(`Replaced ${existingItem.name} with ${item.name}.`);
        } else if (!existingItem) {
          ui.notifications.info(`${item.name} has been added as a ${expectedType}.`);
        }
        
        // Set locked flag
        await actorItem.setFlag('zwolf-epic', 'locked', true);
        
        // ENHANCED: For talents, store the specific slot index
        if (expectedType === 'talent') {
          await actorItem.setFlag('zwolf-epic', 'slotIndex', slotIndex);
          console.log(`Z-Wolf Epic | Set talent ${item.name} to slot index ${slotIndex}`);
        }
        
        this.render(false);
      } catch (err) {
        console.error("Z-Wolf Epic | Slot drop error:", err);
        ui.notifications.error("Failed to assign the item to this slot.");
      }
    } finally {
      // Keep the flag set for a longer period to ensure _onDropItem doesn't run
      console.log("Z-Wolf Epic | _onSlotDrop FINALLY - resetting flag after 500ms");
      setTimeout(() => {
        console.log("Z-Wolf Epic | _onSlotDrop flag reset to false");
        this._processingCustomDrop = false;
      }, 500); // Increased from 100ms to 500ms
    }
  }

  /**
   * Get maximum slots for a given item type
   * ENHANCED to work with both approaches
   */
  _getMaxSlotsForType(itemType) {
    switch (itemType) {
      case 'knack':
        return this.calculateTotalKnacksProvided();
      case 'track':
        return Math.min(4, this.actor.system.level || 0);
      case 'talent':
        return this.actor.system.level || 0;
      default:
        return 0;
    }
  }

  /**
   * Handle editing slot items
   */
  async _onSlotItemEdit(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.closest('.slotted-item').dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (item) {
      item.sheet.render(true);
    }
  }

  /**
   * Handle drag over events for equipment drop zones
   */
  _onEquipmentDragOver(event) {
    event.preventDefault();
    const dropZone = event.currentTarget;
    
    try {
      // Get the dragged data
      const data = TextEditorImpl.getDragEventData(event.originalEvent || event);
      
      if (data.type === 'Item') {
        dropZone.classList.remove('invalid-drop');
        dropZone.classList.add('drag-over');
      }
    } catch (err) {
      console.log("Z-Wolf Epic | Equipment drag over error (this is normal):", err);
      dropZone.classList.add('invalid-drop');
    }
  }

  /**
   * Handle dropping equipment items
   */
  async _onEquipmentDrop(event) {
    this._processingCustomDrop = true;
    event.preventDefault();
    event.stopPropagation();
    
    try {
      const dropZone = event.currentTarget;
      dropZone.classList.remove('drag-over', 'invalid-drop');
      
      try {
        const data = TextEditorImpl.getDragEventData(event.originalEvent || event);
        
        if (data.type !== 'Item') return;
        
        const item = await fromUuid(data.uuid);
        if (!item) {
          ui.notifications.error("Could not find the dropped item.");
          return;
        }
        
        // Only accept equipment items
        if (item.type !== 'equipment') {
          ui.notifications.warn("Only equipment items can be added to inventory.");
          return;
        }
        
        console.log(`Z-Wolf Epic | Dropping equipment: ${item.name}`);
        
        // Create or get the item on the actor if it's not already owned
        let actorItem;
        if (item.actor?.id !== this.actor.id) {
          // Always create a new copy when dragging from external sources
          const itemData = item.toObject();
          const createdItems = await this.actor.createEmbeddedDocuments("Item", [itemData]);
          actorItem = createdItems[0];
        } else {
          actorItem = item;
        }
        
        // Equipment items don't get locked (unlike talents/knacks/tracks)
        // This allows players to freely edit their equipment
        
        ui.notifications.info(`${item.name} has been added to your inventory.`);
        this.render(false);
        
      } catch (err) {
        console.error("Z-Wolf Epic | Equipment drop error:", err);
        ui.notifications.error("Failed to add the item to inventory.");
      }
    } finally {
      setTimeout(() => {
        this._processingCustomDrop = false;
      }, 500);
    }
  }

  /**
   * Handle rolling dice from progression headers
   */
  async _onProgressionDiceRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const progression = element.dataset.progression;
    const bonus = parseInt(element.dataset.bonus) || 0;
    
    // Create flavor text
    const progressionName = progression.charAt(0).toUpperCase() + progression.slice(1);
    const flavor = `${progressionName} Progression Roll`;
    
    // Get current net boosts from the UI
    const netBoosts = ZWolfDice.getNetBoosts();
    
    // Roll using the ZWolfDice system
    await ZWolfDice.roll({
      netBoosts: netBoosts,
      modifier: bonus,
      flavor: flavor,
      actor: this.actor
    });
  }

/**
   * Handle level changes - update the sheet to reflect new progression bonuses and fundament calculations
   */
  async _onLevelChange(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const newLevel = parseInt(element.value) || 0;
    
    console.log("Z-Wolf Epic | _onLevelChange triggered. New level:", newLevel);
    
    // Clamp level between 0 and 20
    const clampedLevel = Math.max(0, Math.min(20, newLevel));
    
    // Update the actor's level
    await this.actor.update({ 'system.level': clampedLevel });
    
    console.log("Z-Wolf Epic | Actor updated. Re-rendering sheet...");
    
    // Re-render the sheet to update progression bonuses and fundament calculations
    this.render(false);
  }

  /** @override */
  async _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    
    // Check if level was changed or fundament was assigned/changed
    if (changed.system?.level !== undefined || changed.system?.fundamentId !== undefined) {
      console.log("Z-Wolf Epic | Level or fundament updated via _onUpdate hook");
      // Re-render the sheet to update progression bonuses and fundament calculations
      this.render(false);
    }
  }

  /**
   * Handle rolling a stat
   */
  async _onStatRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const statKey = element.dataset.stat;
    const statType = element.dataset.type;
    const progression = element.dataset.progression;
    
    // Get the level and progressionOnlyLevel
    const level = this.actor.system.level ?? 0;  // Use nullish coalescing to allow 0
    const progressionOnlyLevel = this._getProgressionOnlyLevel(this.actor);
    
    // Calculate the bonuses
    const bonuses = this._calculateProgressionBonuses(level, progressionOnlyLevel);
    const modifier = bonuses[progression];
    
    // Create flavor text
    const statName = $(element).find('.stat-name').text();
    const flavor = `${statName} (${progression.charAt(0).toUpperCase() + progression.slice(1)})`;
    
    // Get current net boosts from the UI
    const netBoosts = ZWolfDice.getNetBoosts();
    
    // Roll using the ZWolfDice system
    await ZWolfDice.roll({
      netBoosts: netBoosts,
      modifier: modifier,
      flavor: flavor,
      actor: this.actor
    });
  }

    /**
   * Build Points calculation methods for Z-Wolf Epic Actor Sheet
   */

  /**
   * Calculate the Build Points cost for attributes
   * @param {Object} attributes - The actor's attributes object
   * @returns {number} Total BP cost for attributes
   */
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

  /**
   * Calculate the Build Points cost for skills
   * @param {Object} skills - The actor's skills object
   * @param {Object} attributes - The actor's attributes object (for base values)
   * @returns {number} Total BP cost for skills
   */
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
      
      // Base cost for the progression level
      const baseCost = baseCosts[skillProgression];
      
      // Additional cost for exceeding base value
      const excessCost = Math.max(0, skillValue - baseValue);
      
      total += baseCost + excessCost;
    });
    
    return total;
  }

  /**
   * Calculate total Build Points spent
   * @param {Object} system - The actor's system data
   * @param {Object} ancestry - The ancestry item object
   * @param {Object} fundament - The fundament item object
   * @returns {Object} Object containing attribute BP, skill BP, total BP, and max BP
   */
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

  /**
   * Calculate maximum Build Points from ancestry and fundament
   * @param {Object} ancestry - The ancestry item object
   * @param {Object} fundament - The fundament item object
   * @returns {number} Maximum BP available
   */
  _calculateMaxBP(ancestry, fundament) {
    let maxBP = 0;
    
    // Add BP from ancestry
    if (ancestry && ancestry.system && ancestry.system.buildPoints) {
      maxBP += ancestry.system.buildPoints;
    }
    
    // Add BP from fundament
    if (fundament && fundament.system && fundament.system.buildPoints) {
      maxBP += fundament.system.buildPoints;
    }
    
    return maxBP;
  }

  /**
   * Enhanced _categorizeGrantedAbilities method that filters equipment based on placement
   */
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

    // Keep track of processed items to avoid duplicates
    const processedItems = new Set();

    // Helper function to process abilities from an item
    const processItemAbilities = (item, source = 'item') => {
      // Skip if we've already processed this item
      if (processedItems.has(item.id)) {
        console.log(`Z-Wolf Epic | Skipping already processed item: ${item.name} (${item.id})`);
        return;
      }
      
      processedItems.add(item.id);
      console.log(`Z-Wolf Epic | Processing abilities from ${source}: ${item.name} (${item.type})`);
      
      // NEW: Equipment placement filtering for granted abilities
      if (item.type === 'equipment') {
        const requiredPlacement = item.system.requiredPlacement;
        const currentPlacement = item.system.placement;
        
        // If equipment has a required placement and it doesn't match current placement, skip its abilities
        if (requiredPlacement && requiredPlacement !== '' && requiredPlacement !== currentPlacement) {
          console.log(`Z-Wolf Epic | Skipping ${item.name} granted abilities - required placement "${requiredPlacement}" != current placement "${currentPlacement}"`);
          return;
        }
      }
      
      if (item.system && item.system.grantedAbilities && Array.isArray(item.system.grantedAbilities)) {
        console.log(`Z-Wolf Epic | Found ${item.system.grantedAbilities.length} granted abilities in ${item.name}`);
        
        item.system.grantedAbilities.forEach((ability, index) => {
          console.log(`Z-Wolf Epic | Processing ability ${index + 1}:`, ability);
          
          // Ensure the ability has required properties
          if (ability.name && ability.type) {
            const categoryKey = ability.type;
            
            console.log(`Z-Wolf Epic | Ability "${ability.name}" has type "${ability.type}" (category: ${categoryKey})`);
            
            // Only add to categories that we support
            if (categories.hasOwnProperty(categoryKey)) {
              const description = ability.description 
                ? (typeof ability.description === 'string' 
                  ? ability.description 
                  : TextEditorImpl.enrichHTML(ability.description))
                : 'No description provided.';

              // FIXED: Include the tags field properly
              categories[categoryKey].push({
                name: ability.name,
                tags: ability.tags || '', // Add the tags field
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

    // Process all items owned by the actor
    console.log(`Z-Wolf Epic | Processing ${this.actor.items.size} owned items`);
    this.actor.items.forEach(item => processItemAbilities(item, 'owned'));

    // Log final categories for debugging
    Object.keys(categories).forEach(category => {
      console.log(`Z-Wolf Epic | Final ${category} abilities count: ${categories[category].length}`);
      if (categories[category].length > 0) {
        console.log(`Z-Wolf Epic | ${category} abilities:`, categories[category].map(a => `${a.name} (from ${a.itemName}) [tags: ${a.tags || 'none'}]`));
      }
    });

    return categories;
  }

  /**
 * Calculate total knacks provided from ancestry, fundament, and all talents
 * @returns {number} Total knacks available
 */
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

  /**
   * Prepare slots array for items (knacks, tracks, talents)
   * ENHANCED to show which track provides each talent slot
   */
  prepareSlots(itemType, slotCount) {
    const slots = [];
    
    if (itemType === 'talent') {
      // Get all track items to determine which tracks are assigned
      const trackItems = this.actor.items.filter(item => item.type === 'track');
      const assignedTracks = new Map(); // Maps track number (1-4) to track item
      
      // Build a map of which track slots are filled
      trackItems.forEach(track => {
        const slotIndex = track.getFlag('zwolf-epic', 'slotIndex');
        if (slotIndex !== undefined && slotIndex < 4) {
          assignedTracks.set(slotIndex + 1, track); // Convert 0-based to 1-based
        } else {
          // Fall back to sequential placement for tracks without slotIndex
          for (let i = 1; i <= 4; i++) {
            if (!assignedTracks.has(i)) {
              assignedTracks.set(i, track);
              track.setFlag('zwolf-epic', 'slotIndex', i - 1); // Store 0-based index
              break;
            }
          }
        }
      });
      
      // Helper function to get track info for a talent slot
      const getTrackInfoForTalentSlot = (talentSlotNumber) => {
        // Calculate which track provides this talent (1-based)
        // Track 1 provides talents 1, 5, 9, 13, 17 (modulo 4 = 1)
        // Track 2 provides talents 2, 6, 10, 14, 18 (modulo 4 = 2)
        // Track 3 provides talents 3, 7, 11, 15, 19 (modulo 4 = 3)
        // Track 4 provides talents 4, 8, 12, 16, 20 (modulo 4 = 0)
        
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
        const talentSlotNumber = i + 1; // Convert to 1-based for display
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
      
      // Fill slots based on stored slotIndex, but fall back to sequential if not set
      talentItems.forEach((talent, sequentialIndex) => {
        const slotIndex = talent.getFlag('zwolf-epic', 'slotIndex');
        
        if (slotIndex !== undefined && slotIndex < slotCount && slots[slotIndex] && !slots[slotIndex].item) {
          // Use the stored slot index if valid and slot is empty
          slots[slotIndex].item = talent.toObject();
        } else {
          // Fall back to sequential placement for items without slotIndex or conflicts
          for (let i = 0; i < slotCount; i++) {
            if (!slots[i].item) {
              slots[i].item = talent.toObject();
              // Set the slotIndex flag for future consistency
              talent.setFlag('zwolf-epic', 'slotIndex', i);
              break;
            }
          }
        }
      });
      
      return slots;
    } else {
      // Original behavior for knacks and tracks (sequential filling)
      const items = this.actor.items.filter(item => item.type === itemType);
      
      for (let i = 0; i < slotCount; i++) {
        const slot = {
          index: i,
          item: null
        };
        
        if (items[i]) {
          slot.item = items[i].toObject();
        }
        
        slots.push(slot);
      }
      
      return slots;
    }
  }

  /**
   * Handle progression assignment change - UPDATED VERSION
   * Replace your existing _onProgressionSliderChange method with this
   */
  async _onProgressionSliderChange(event) {
    event.preventDefault();
  
    // Check if sliders are locked
    const isLocked = this.actor.system.buildPointsLocked || false;
    if (isLocked) {
      ui.notifications.warn("Build Points are locked. Click the lock button to make changes.");
      return;
    }
    
    const element = event.currentTarget;
    const statKey = element.dataset.stat;
    const statType = element.dataset.type;
    const sliderValue = parseInt(element.value);
    
    const progressionMap = {
      1: 'mediocre',
      2: 'moderate', 
      3: 'specialty',
      4: 'awesome'
    };
    
    const newProgression = progressionMap[sliderValue];
    
    let updatePath;
    if (statType === 'attribute') {
      updatePath = `system.attributes.${statKey}.progression`;
    } else if (statType === 'skill') {
      updatePath = `system.skills.${statKey}.progression`;
    }
    
    if (updatePath && newProgression) {
      await this.actor.update({ [updatePath]: newProgression });
      console.log(`Z-Wolf Epic | Updated ${statKey} (${statType}) to ${newProgression}`);
      
      // Re-render the sheet to update Build Points display
      this.render(false);
    }
  }

  /** @override */
  async _onDropItem(event, data) {
    console.log("Z-Wolf Epic | _onDropItem called, flag is:", this._processingCustomDrop);
    
    // Check if this drop is being handled by a custom drop zone
    if (this._processingCustomDrop) {
      console.log("Z-Wolf Epic | _onDropItem blocked - custom drop in progress");
      return false; // Return false to prevent default behavior
    }
    
    // Also check if the drop target is one of our custom drop zones
    const dropTarget = event.target.closest('.foundation-drop-zone, .knack-drop-zone, .track-drop-zone, .talent-drop-zone, .equipment-drop-zone');
    if (dropTarget) {
      console.log("Z-Wolf Epic | _onDropItem blocked - dropped on custom zone");
      return false; // Let the custom handler deal with it
    }
    
    console.log("Z-Wolf Epic | _onDropItem proceeding with default behavior");
    
    // For drops outside custom zones, run the default Foundry behavior
    const result = await super._onDropItem(event, data);
    
    // Your existing logic for handling special items
    const item = await fromUuid(data.uuid);
    
    if (item) {
      // Set locked flag for non-equipment items when added to actor
      if (item.type !== 'equipment') {
        await item.setFlag('zwolf-epic', 'locked', true);
      }
      
      // Check if the dropped item affects progressionOnlyLevel
      if (item.name === ZWolfActorSheet.PROGRESSION_ITEM_NAME) {
        this.render(false);
      }
    }
    
    return result;
  }

  /** @override */
  async _onDropItemDelete(item) {
    const result = await super._onDropItemDelete(item);
    
    // Check if the deleted item affects progressionOnlyLevel
    if (item.name === ZWolfActorSheet.PROGRESSION_ITEM_NAME) {
      // Re-render the sheet to update progression bonuses
      this.render(false);
    }
    
    return result;
  }

  /**
   * Handle toggling the build points lock state
   */
  async _onBuildPointsLockToggle(event) {
    event.preventDefault();
    const currentLockState = this.actor.system.buildPointsLocked || false;
    const newLockState = !currentLockState;
    
    // Update the actor's lock state
    await this.actor.update({ 'system.buildPointsLocked': newLockState });
    
    // Update the UI immediately (this will be called again in render, but that's okay)
    this._updateSliderStates(newLockState);
    
    // Show notification
    const message = newLockState ? "Build Points locked" : "Build Points unlocked";
    ui.notifications.info(message);
  }

  /**
   * Update the visual state of sliders and lock button
   * @param {boolean} locked - Whether the sliders should be locked
   */
  _updateSliderStates(locked) {
    const html = this.element;
    
    // Update all progression sliders
    const sliders = html.find('.progression-slider');
    sliders.prop('disabled', locked);
    
    if (locked) {
      sliders.addClass('locked');
    } else {
      sliders.removeClass('locked');
    }
    
    // Update lock button appearance
    const lockBtn = html.find('.build-points-lock-btn');
    const lockIcon = lockBtn.find('i');
    const lockLabel = lockBtn.find('.lock-label');
    
    if (locked) {
      lockBtn.removeClass('unlocked').addClass('locked');
      lockIcon.removeClass('fa-unlock').addClass('fa-lock');
      lockLabel.text('Locked');
      lockBtn.attr('title', 'Unlock progression sliders');
    } else {
      lockBtn.removeClass('locked').addClass('unlocked');
      lockIcon.removeClass('fa-lock').addClass('fa-unlock');
      lockLabel.text('Unlocked');
      lockBtn.attr('title', 'Lock progression sliders');
    }
  }

  /**
   * Validate and update actor size based on ancestry
   * Add this method to your ZWolfActorSheet class
   */
  async _validateActorSize() {
    const ancestry = this.actor.items.get(this.actor.system.ancestryId);
    const currentSize = this.actor.system.size;
    
    let validSizes = ['medium']; // Default fallback
    
    if (ancestry && ancestry.system.sizeOptions && ancestry.system.sizeOptions.length > 0) {
      validSizes = ancestry.system.sizeOptions;
    }
    
    // If current size is not in valid options, change to first valid option
    if (!validSizes.includes(currentSize)) {
      const newSize = validSizes[0];
      console.log(`Z-Wolf Epic | Invalid size "${currentSize}" for ancestry, changing to "${newSize}"`);
      
      await this.actor.update({ 'system.size': newSize });
      
      ui.notifications.info(`Size changed to ${newSize.charAt(0).toUpperCase() + newSize.slice(1)} to match ancestry restrictions.`);
      
      return true; // Indicates a change was made
    }
    
    return false; // No change needed
  }

  /**
   * Calculate character tags from all items that can provide them
   * @param {Object} ancestry - The ancestry item object (for backwards compatibility)
   * @returns {string} Comma-separated string of all character tags
   */
  _calculateCharacterTags(ancestry = null) {
    const allTags = [];
    
    // Collect tags from all items that have characterTags
    this.actor.items.forEach(item => {
      if (item.system && item.system.characterTags && Array.isArray(item.system.characterTags)) {
        const itemTags = item.system.characterTags.filter(tag => tag && tag.trim().length > 0);
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

  /**
   * Handle rolling Speed from the header
   */
  async _onSpeedRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const modifier = parseInt(element.dataset.modifier) || 0;
    const flavor = element.dataset.flavor || "Speed Check";
    
    // Get current net boosts from the UI
    const netBoosts = ZWolfDice.getNetBoosts();
    
    // Roll using the ZWolfDice system
    await ZWolfDice.roll({
      netBoosts: netBoosts,
      modifier: modifier,
      flavor: flavor,
      actor: this.actor
    });
  }

  /**
   * Count the number of items with the VITALITY_BOOST_ITEM_NAME
   * @returns {number} Count of vitality boost items
   */
  _countVitalityBoostItems() {
    const count = this.actor.items.filter(item => 
      item.name === ZWolfActorSheet.VITALITY_BOOST_ITEM_NAME
    ).length;
    
    console.log(`Z-Wolf Epic | Found ${count} vitality boost items`);
    return count;
  }

  /**
   * Update the actor's vitalityBoostCount to match the actual number of vitality boost items
   * @returns {Promise<boolean>} True if an update was made, false if no change needed
   */
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

  /**
   * Handle Short Rest - subtracts 1 SP, restores VP to max, grants Suffused condition
   */
  async _onShortRest(event) {
    event.preventDefault();
    
    const currentSP = this.actor.system.staminaPoints.value || 0;
    
    // Check if character has stamina to spend
    if (currentSP <= 0) {
      ui.notifications.warn("You don't have any Stamina Points to spend on a Short Rest.");
      return;
    }
    
    // Confirm the rest
    const confirmed = await Dialog.confirm({
      title: "Short Rest",
      content: `<p>Take a Short Rest?</p>
                <ul>
                  <li>Spend 1 Stamina Point (${currentSP} → ${currentSP - 1})</li>
                  <li>Restore Vitality Points to maximum</li>
                  <li>Gain Suffused condition</li>
                </ul>`,
      yes: () => true,
      no: () => false,
      defaultYes: true
    });
    
    if (!confirmed) return;
    
    try {
      // Calculate new values
      const newSP = currentSP - 1;
      const maxVP = this.getData().calculatedValues.maxVitality;
      
      // Update actor
      await this.actor.update({
        'system.staminaPoints.value': newSP,
        'system.vitalityPoints.value': maxVP
      });
      
      // Add Suffused condition
      await this._addCondition('suffused');
      
      ui.notifications.info("Short Rest completed. Vitality restored and Suffused condition applied.");
      
    } catch (error) {
      console.error("Z-Wolf Epic | Error during Short Rest:", error);
      ui.notifications.error("Failed to complete Short Rest.");
    }
  }

  /**
   * Handle Extended Rest - restores SP & VP to max, grants Suffused, removes Bruised, reminds about Fortitude roll
   */
  async _onExtendedRest(event) {
    event.preventDefault();
    
    // Confirm the rest
    const confirmed = await Dialog.confirm({
      title: "Extended Rest",
      content: `<p>Take an Extended Rest?</p>
                <ul>
                  <li>Restore Stamina Points to maximum</li>
                  <li>Restore Vitality Points to maximum</li>
                  <li>Gain Suffused condition</li>
                  <li>Remove Bruised condition (if present)</li>
                  <li>Reminder: Roll Fortitude to recover from Dying or Wounded</li>
                </ul>`,
      yes: () => true,
      no: () => false,
      defaultYes: true
    });
    
    if (!confirmed) return;
    
    try {
      // Calculate new values
      const maxSP = this.actor.system.staminaPoints.max || 0;
      const maxVP = this.getData().calculatedValues.maxVitality;
      
      // Update actor
      await this.actor.update({
        'system.staminaPoints.value': maxSP,
        'system.vitalityPoints.value': maxVP
      });
      
      // Add Suffused condition
      await this._addCondition('suffused');
      
      // Remove Bruised condition
      await this._removeCondition('bruised');
      
      // Show reminder about Fortitude roll for Dying/Wounded
      const hasDying = this.actor.effects.find(e => e.flags?.core?.statusId === 'dying');
      const hasWounded = this.actor.effects.find(e => e.flags?.core?.statusId === 'wounded');
      
      if (hasDying || hasWounded) {
        ui.notifications.info("Extended Rest completed. Remember to roll Fortitude to recover from Dying or Wounded conditions.");
      } else {
        ui.notifications.info("Extended Rest completed. All resources restored and Suffused condition applied.");
      }
      
    } catch (error) {
      console.error("Z-Wolf Epic | Error during Extended Rest:", error);
      ui.notifications.error("Failed to complete Extended Rest.");
    }
  }

  /**
   * Add a condition effect to the actor
   * @param {string} conditionId - The condition ID to add
   */
  async _addCondition(conditionId) {
    // Check if condition already exists
    const existingEffect = this.actor.effects.find(e => e.flags?.core?.statusId === conditionId);
    if (existingEffect) {
      console.log(`Z-Wolf Epic | ${conditionId} condition already exists`);
      return;
    }
    
    // Import config to get condition data
    const { ZWOLF } = await import("../helpers/config.mjs");
    const conditionData = ZWOLF.conditions[conditionId];
    
    if (!conditionData) {
      console.error(`Z-Wolf Epic | Unknown condition: ${conditionId}`);
      return;
    }
    
    // Create the effect
    const effectData = {
      name: conditionData.label,
      icon: conditionData.icon,
      flags: {
        core: {
          statusId: conditionId
        }
      },
      statuses: [conditionId]
    };
    
    await this.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
    console.log(`Z-Wolf Epic | Added ${conditionId} condition`);
  }

  /**
   * Remove a condition effect from the actor
   * @param {string} conditionId - The condition ID to remove
   */
  async _removeCondition(conditionId) {
    const effect = this.actor.effects.find(e => e.flags?.core?.statusId === conditionId);
    if (effect) {
      await effect.delete();
      console.log(`Z-Wolf Epic | Removed ${conditionId} condition`);
    }
  }

  /**
   * Calculate the maximum number of languages the character can know
   * Base is 2, plus 2 for each "Linguist" knack
   * @returns {number} Maximum number of languages
   */
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

  /**
   * Prepare equipment items for display
   * @returns {Object} Equipment items organized by placement
   */
  _prepareEquipment() {
    const equipment = {
      wielded: [],
      worn: [],
      readily_available: [],
      stowed: [],
      not_carried: []
    };

    // Get all equipment items
    const equipmentItems = this.actor.items.filter(item => item.type === 'equipment');

    // Categorize equipment by placement
    equipmentItems.forEach(item => {
      const itemData = item.toObject();
      const placement = itemData.system.placement || 'not_carried';
      
      if (equipment[placement]) {
        equipment[placement].push(itemData);
      } else {
        equipment.not_carried.push(itemData);
      }
    });

    return equipment;
  }

  /**
   * Calculate total bulk and max bulk of equipment
   * @param {Object} equipment Categorized equipment object
   * @returns {Object} Totals object with bulk, maxBulk, value, and weight
   */
  _calculateInventoryTotals(equipment) {
    let totalValue = 0;
    let totalWeight = 0;
    let totalBulk = 0;

    // Calculate carrying capacity (max bulk)
    // Base 10 + modifiers from character stats/items
    let maxBulk = 10;
    
    // Add size modifier: +/-4 for each size category larger/smaller than Medium
    const sizeModifiers = {
      'diminutive': -12,  // 3 steps smaller: -4 * 3 = -12
      'tiny': -8,         // 2 steps smaller: -4 * 2 = -8
      'small': -4,        // 1 step smaller: -4 * 1 = -4
      'medium': 0,        // baseline
      'large': 4,         // 1 step larger: +4 * 1 = +4
      'huge': 8,          // 2 steps larger: +4 * 2 = +8
      'gargantuan': 12    // 3 steps larger: +4 * 3 = +12
    };
    
    const characterSize = this.actor.system?.size || 'medium';
    maxBulk += sizeModifiers[characterSize] || 0;
    
    // Add Brawn Skill Progression bonus: +3 for each tier greater than Mediocre
    // Use optional chaining to safely access the progression
    const brawnProgression = this.actor.system?.skills?.brawn?.progression || 'mediocre';
    const brawnProgressionTiers = {
      'mediocre': 0,    // baseline
      'moderate': 3,    // 1 tier above mediocre: +3 * 1 = +3
      'specialty': 6,   // 2 tiers above mediocre: +3 * 2 = +6
      'awesome': 9      // 3 tiers above mediocre: +3 * 3 = +9
    };
    
    maxBulk += brawnProgressionTiers[brawnProgression] || 0;

    // NEW: Add Max Bulk boosts from equipment
    let totalMaxBulkBoost = 0;
    this.actor.items.forEach(item => {
      if (item.type === 'equipment' && item.system?.sideEffects?.maxBulkBoost) {
        const requiredPlacement = item.system.requiredPlacement;
        const currentPlacement = item.system.placement;
        
        // Only apply boost if equipment placement requirements are met
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

    // Calculate totals from carried equipment only (exclude not_carried)
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

  /**
   * Handle equipment placement changes
   */
  async _onEquipmentPlacementChange(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.closest('.equipment-item').dataset.itemId;
    const newPlacement = element.value;
    const item = this.actor.items.get(itemId);
    
    if (!item) {
      ui.notifications.error('Could not find equipment item to update.');
      return;
    }
    
    console.log(`Z-Wolf Epic | Changing ${item.name} placement to: ${newPlacement}`);
    
    try {
      await item.update({ 'system.placement': newPlacement });
      
      // Check if this item has side effects or granted abilities that might now apply/not apply
      const hasEffects = (item.system.sideEffects && Object.values(item.system.sideEffects).some(value => value && value !== '')) ||
                        (item.system.grantedAbilities && item.system.grantedAbilities.length > 0);
      
      if (hasEffects) {
        ui.notifications.info(`${item.name} placement changed. Recalculating character effects...`);
        // Re-render to apply/remove any conditional effects
        this.render(false);
      } else {
        ui.notifications.info(`${item.name} placement changed to ${this._getPlacementDisplayName(newPlacement)}.`);
      }
      
    } catch (error) {
      console.error("Z-Wolf Epic | Error updating equipment placement:", error);
      ui.notifications.error(`Failed to update ${item.name} placement: ${error.message}`);
    }
  }

  /**
   * Get display name for placement values
   */
  _getPlacementDisplayName(placement) {
    const displayNames = {
      'wielded': 'Wielded',
      'worn': 'Worn',
      'readily_available': 'Readily Available',
      'stowed': 'Stowed',
      'not_carried': 'Not Carried'
    };
    return displayNames[placement] || placement;
  }

  /**
   * Enhanced _prepareEquipment method with placement validation
   */
  _prepareEquipment() {
    const equipment = {
      wielded: [],
      worn: [],
      readily_available: [],
      stowed: [],
      not_carried: []
    };

    // Get all equipment items
    const equipmentItems = this.actor.items.filter(item => item.type === 'equipment');

    // Categorize equipment by placement
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
}