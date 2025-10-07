// module/helpers/item-data-processor.mjs

/**
 * Helper class for processing and validating item data
 */
export class ItemDataProcessor {

  /**
   * Calculate the total knacks provided by summing all selection counts from knack menus
   * @param {Object|Array} knackMenus - Knack menus (object or array)
   * @returns {number} - Total knacks provided
   */
  static calculateKnacksProvided(knackMenus) {
    if (!knackMenus) {
      return 0;
    }
    
    // Handle both object and array formats
    let menusArray;
    if (Array.isArray(knackMenus)) {
      menusArray = knackMenus;
    } else if (typeof knackMenus === 'object') {
      menusArray = Object.values(knackMenus);
    } else {
      return 0;
    }
    
    return menusArray.reduce((total, menu) => {
      const selectionCount = parseInt(menu?.selectionCount) || 0;
      return total + selectionCount;
    }, 0);
  }

  /**
   * Ensure granted abilities array has proper structure
   * @param {Array|Object} abilities - Raw abilities array or object
   * @returns {Object} - Validated abilities as object (not array)
   */
  static validateGrantedAbilities(abilities) {
    // Always return an object, not an array - this matches your data structure
    const result = {};
    
    if (Array.isArray(abilities)) {
      // Convert array to object
      abilities.forEach((ability, index) => {
        if (ability) {  // Only include non-null/undefined abilities
          result[index.toString()] = {
            name: ability.name || "",
            tags: typeof ability.tags === 'string' ? ability.tags : "",
            type: ability.type || "passive", 
            description: ability.description || ""
          };
        }
      });
    } else if (abilities && typeof abilities === 'object') {
      // Clean up object, preserving existing structure
      Object.keys(abilities).forEach(key => {
        const index = parseInt(key);
        if (!isNaN(index) && abilities[key]) {  // Only include valid indices with data
          result[key] = {
            name: abilities[key].name || "",
            tags: typeof abilities[key].tags === 'string' ? abilities[key].tags : "",
            type: abilities[key].type || "passive",
            description: abilities[key].description || ""
          };
        }
      });
    }
    
    // Don't auto-fill missing indices - let deletions stay deleted
    return result;
  }

  /**
   * Process form data to preserve granted abilities structure
   * @param {Object} formData - The raw form data
   * @param {Array} currentAbilities - Current abilities from item
   * @returns {Object} - Processed form data
   */
  static preserveGrantedAbilities(formData, currentAbilities) {
    const processedData = foundry.utils.duplicate(formData);
    
    // Get the current abilities array as our base
    const updatedAbilities = foundry.utils.duplicate(currentAbilities || []);
    let hasAbilityUpdates = false;
    
    // Process all form data keys to find ability-related updates
    Object.keys(processedData).forEach(key => {
      const abilityMatch = key.match(/^system\.grantedAbilities\.(\d+)\.(.+)$/);
      if (abilityMatch) {
        const index = parseInt(abilityMatch[1]);
        const field = abilityMatch[2];
        const value = processedData[key];
        
        // Ensure we have an ability object at this index
        while (updatedAbilities.length <= index) {
          updatedAbilities.push({
            name: "",
            tags: "",
            type: "passive",
            description: ""
          });
        }
        
        // Update the specific field
        updatedAbilities[index][field] = value;
        hasAbilityUpdates = true;
        
        // Remove the individual field update from form data
        delete processedData[key];
      }
    });
    
    // If we had any ability updates, replace with the complete updated array
    if (hasAbilityUpdates) {
      processedData['system.grantedAbilities'] = updatedAbilities;
    }
    
    return processedData;
  }

  /**
   * Process track-specific tier abilities
   * @param {Object} formData - Form data to process
   * @param {Object} currentTierData - Current tier data from item
   * @returns {Object} - Processed form data
   */
  static preserveTrackTierAbilities(formData, currentTierData) {
    const processedData = foundry.utils.duplicate(formData);
  console.log("preserveGrantedAbilities input:", formData);
  console.log("preserveGrantedAbilities output:", processedData);
    
    // Handle each tier (1-5)
    for (let tierNum = 1; tierNum <= 5; tierNum++) {
      const currentTierAbilities = foundry.utils.duplicate(
        foundry.utils.getProperty(currentTierData, `tiers.tier${tierNum}.grantedAbilities`) || []
      );
      
      const updatedTierAbilities = foundry.utils.duplicate(currentTierAbilities);
      let hasTierUpdates = false;
      
      // Process form data for this tier
      Object.keys(processedData).forEach(key => {
        const tierAbilityMatch = key.match(new RegExp(`^system\\.tiers\\.tier${tierNum}\\.grantedAbilities\\.(\\d+)\\.(.+)$`));
        if (tierAbilityMatch) {
          const index = parseInt(tierAbilityMatch[1]);
          const field = tierAbilityMatch[2];
          const value = processedData[key];
          
          // Ensure we have an ability object at this index
          while (updatedTierAbilities.length <= index) {
            updatedTierAbilities.push({
              name: "",
              tags: "",
              type: "passive",
              description: ""
            });
          }
          
          // Update the specific field
          updatedTierAbilities[index][field] = value;
          hasTierUpdates = true;
          
          // Remove the individual field update from form data
          delete processedData[key];
        }
      });
      
      // If we had any tier ability updates, replace with the complete updated array
      if (hasTierUpdates) {
        processedData[`system.tiers.tier${tierNum}.grantedAbilities`] = updatedTierAbilities;
      }
    }
    
    return processedData;
  }

  /**
   * Handle multi-select form fields (only for sizeOptions)
   * @param {HTMLFormElement} form - The form element
   * @param {Object} formData - Form data to modify
   */
  static processMultiSelectFields(form, formData) {
    const sizeOptionsSelect = form.querySelector('select[name="system.sizeOptions"]');
    
    if (sizeOptionsSelect) {
      const selectedValues = Array.from(sizeOptionsSelect.selectedOptions).map(option => option.value);
      formData['system.sizeOptions'] = selectedValues;
    }
  }

  /**
   * Safely evaluate a function string with provided data
   * @param {string} functionString - The JavaScript function code
   * @param {object} data - The data to make available to the function
   * @returns {*} The result of the function
   */
  static evaluateFunction(functionString, data) {
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
}