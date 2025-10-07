/**
 * Register custom Handlebars helpers for Z-Wolf Epic
 */

export function registerHandlebarsHelpers() {
  
  // ========================================
  // STRING MANIPULATION
  // ========================================
  
  Handlebars.registerHelper('concat', function(...args) {
    // Remove the options hash from the end
    args.pop();
    return args.join('');
  });

  Handlebars.registerHelper('toLowerCase', function(str) {
    return str.toLowerCase();
  });

  Handlebars.registerHelper('capitalize', function(str) {
    if (!str || typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  Handlebars.registerHelper('extractNumber', function(str) {
    return str.replace(/\D/g, '');
  });

  Handlebars.registerHelper('contains', function(string, substring) {
    if (typeof string !== 'string' || typeof substring !== 'string') {
      return false;
    }
    return string.includes(substring);
  });

  // ========================================
  // ARRAY MANIPULATION
  // ========================================
  
  Handlebars.registerHelper('join', function(array, options) {
    if (!array) return '';
    if (!Array.isArray(array)) return String(array);
    
    const separator = options?.hash?.separator || ', ';
    
    const cleanArray = array
      .filter(item => item !== null && item !== undefined)
      .map(item => {
        const str = String(item);
        if (str.includes('[object Object]')) {
          const parts = str.split('[object Object]').filter(part => part.trim().length > 0);
          return parts.join(', ');
        }
        return str;
      })
      .filter(str => str.length > 0);
      
    return cleanArray.join(separator);
  });

  Handlebars.registerHelper('includes', function(array, value) {
    if (!array || !Array.isArray(array)) return false;
    return array.includes(value);
  });

  Handlebars.registerHelper('range', function(start, end) {
    const result = [];
    for (let i = start; i < end; i++) {
      result.push(i);
    }
    return result;
  });

  Handlebars.registerHelper('array', function(...items) {
    // Remove the options hash from the end
    items.pop();
    return items;
  });

  // ========================================
  // COMPARISON OPERATORS
  // ========================================
  
  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });

  Handlebars.registerHelper('ne', function(a, b) {
    return a !== b;
  });

  Handlebars.registerHelper('gt', function(a, b) {
    return a > b;
  });

  Handlebars.registerHelper('gte', function(a, b) {
    return a >= b;
  });

  Handlebars.registerHelper('lt', function(a, b) {
    return a < b;
  });

  Handlebars.registerHelper('lte', function(a, b) {
    return a <= b;
  });

  Handlebars.registerHelper('or', function() {
    return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
  });

  Handlebars.registerHelper('not', function(value) {
    return !value;
  });

  // ========================================
  // MATH OPERATIONS
  // ========================================
  
  Handlebars.registerHelper('add', function(a, b) {
    return parseInt(a) + parseInt(b);
  });

  Handlebars.registerHelper('math', function(lvalue, operator, rvalue) {
    lvalue = parseFloat(lvalue);
    rvalue = parseFloat(rvalue);
    
    return {
      '+': lvalue + rvalue,
      '-': lvalue - rvalue,
      '*': lvalue * rvalue,
      '/': lvalue / rvalue,
      '%': lvalue % rvalue
    }[operator];
  });

  Handlebars.registerHelper('mod', function(a, b) {
    return a % b;
  });

  // ========================================
  // FORM HELPERS
  // ========================================
  
  Handlebars.registerHelper('selected', function(option, value) {
    return (option === value) ? 'selected' : '';
  });

  Handlebars.registerHelper('checked', function(value) {
    return value ? 'checked' : '';
  });

  // ========================================
  // OBJECT/DATA ACCESS
  // ========================================
  
  Handlebars.registerHelper('lookup', function(obj, key) {
    if (!obj || key === undefined) return undefined;
    return obj[key];
  });

  Handlebars.registerHelper('hash', function(...args) {
    // Remove the options hash from the end
    const options = args.pop();
    return options.hash;
  });

  Handlebars.registerHelper('json', function(obj) {
    return JSON.stringify(obj);
  });

  Handlebars.registerHelper('getSourceItem', function(item) {
    return item.getSourceItem?.();
  });

  // ========================================
  // SYSTEM-SPECIFIC HELPERS
  // ========================================
  
  /**
   * Get ability type options for dropdown
   */
  Handlebars.registerHelper('getAbilityTypes', function() {
    return [
      { value: 'passive', label: 'ZWOLF.AbilityTypePassive' },
      { value: 'drawback', label: 'ZWOLF.AbilityTypeDrawback' },
      { value: 'exoticSenses', label: 'ZWOLF.AbilityTypeExoticSenses' },
      { value: 'dominantAction', label: 'ZWOLF.AbilityTypeDominantAction' },
      { value: 'swiftAction', label: 'ZWOLF.AbilityTypeSwiftAction' },
      { value: 'reaction', label: 'ZWOLF.AbilityTypeReaction' },
      { value: 'freeAction', label: 'ZWOLF.AbilityTypeFreeAction' },
      { value: 'strike', label: 'ZWOLF.AbilityTypeStrike' },
      { value: 'journey', label: 'ZWOLF.AbilityTypeJourney' },
      { value: 'miscellaneous', label: 'ZWOLF.AbilityTypeMiscellaneous' }
    ];
  });

  /**
   * Get equipment categories configuration
   */
  Handlebars.registerHelper('getEquipmentCategories', function() {
    return [
      { key: 'wielded', icon: 'fa-hand-rock', label: 'ZWOLF.Wielded' },
      { key: 'worn', icon: 'fa-tshirt', label: 'ZWOLF.Worn' },
      { key: 'readily_available', icon: 'fa-hand-paper', label: 'ZWOLF.ReadilyAvailable' },
      { key: 'stowed', icon: 'fa-box', label: 'ZWOLF.Stowed' },
      { key: 'not_carried', icon: 'fa-times-circle', label: 'ZWOLF.NotCarried' }
    ];
  });

  /**
   * Get localization key for size label
   */
  Handlebars.registerHelper('getSizeLabel', function(size) {
    const sizeLabels = {
      'diminutive': 'ZWOLF.Diminutive',
      'tiny': 'ZWOLF.Tiny',
      'small': 'ZWOLF.Small',
      'medium': 'ZWOLF.Medium',
      'large': 'ZWOLF.Large',
      'huge': 'ZWOLF.Huge',
      'gargantuan': 'ZWOLF.Gargantuan',
      'colossal': 'ZWOLF.Colossal',
      'titanic': 'ZWOLF.Titanic'
    };
    return sizeLabels[size] || 'ZWOLF.Medium';
  });

  /**
   * Get array of common size options
   */
  Handlebars.registerHelper('getCommonSizes', function() {
    return [
      'diminutive',
      'tiny',
      'small',
      'medium',
      'large',
      'huge',
      'gargantuan',
      'colossal',
      'titanic'
    ];
  });

  /**
   * Get placeholder text for actor name input based on actor type
   */
  Handlebars.registerHelper('getActorNamePlaceholder', function(actorType) {
    const placeholders = {
      'pc': 'ZWOLF.CharacterName',
      'npc': 'ZWOLF.NPCName',
      'mook': 'ZWOLF.MookName',
      'spawn': 'ZWOLF.SpawnName'
    };
    return placeholders[actorType] || 'ZWOLF.ActorName';
  });

  /**
   * Get the "No X" version of an ability category localization key
   */
  Handlebars.registerHelper('getNoAbilitiesKey', function(titleKey) {
    // Extract the last part (e.g., "PassiveAbilities" from "ZWOLF.PassiveAbilities")
    const parts = titleKey.split('.');
    const lastPart = parts[parts.length - 1];
    return `ZWOLF.No${lastPart}`;
  });

  /**
   * Check if actor has any equipment
   */
  Handlebars.registerHelper('hasAnyEquipment', function(equipment) {
    if (!equipment) return false;
    
    return equipment.wielded?.length > 0 ||
           equipment.worn?.length > 0 ||
           equipment.readily_available?.length > 0 ||
           equipment.stowed?.length > 0 ||
           equipment.not_carried?.length > 0;
  });

  /**
   * Format a bonus value with + or - sign
   */
  Handlebars.registerHelper('formatBonus', function(value) {
    const num = Number(value);
    if (isNaN(num)) return '+0';
    if (num >= 0) return `+${num}`;
    return String(num); // Negative numbers already have the minus sign
  });

  /**
   * Get CSS class for build points display
   */
  Handlebars.registerHelper('getBPClass', function(buildPoints) {
    if (!buildPoints) return '';
    
    if (buildPoints.total < 0) return 'negative';
    if (buildPoints.total > buildPoints.max) return 'over-max';
    if (buildPoints.total === buildPoints.max) return 'at-max';
    return '';
  });

  /**
   * Get numeric value for progression (for slider)
   */
  Handlebars.registerHelper('getProgressionValue', function(progression) {
    const values = {
      'mediocre': 1,
      'moderate': 2,
      'specialty': 3,
      'awesome': 4
    };
    return values[progression] || 2; // Default to moderate
  });

  /**
   * Ternary conditional helper (inline if/else)
   */
  Handlebars.registerHelper('ternary', function(condition, trueValue, falseValue) {
    return condition ? trueValue : falseValue;
  });
}
