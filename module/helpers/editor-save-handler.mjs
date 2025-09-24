// module/helpers/editor-save-handler.mjs

/**
 * Helper class for handling rich text editor saves
 */
export class EditorSaveHandler {

  /**
   * Handle rich text editor saves for items
   * @param {ZWolfItem} item - The item being edited
   * @param {string} target - The target field being saved
   * @param {HTMLElement} element - The editor element
   * @param {string} content - The saved content
   * @returns {Promise<boolean>} - True if handled, false if not
   */
  static async handleEditorSave(item, target, element, content) {
    console.log("=== EDITOR SAVE DEBUG ===");
    console.log("Target:", target);
    console.log("Content:", content);
    console.log("Item type:", item.type);

    // Handle Track-specific editor saves
    if (item.type === 'track') {
      const trackResult = await this._handleTrackEditorSave(item, target, content);
      if (trackResult) return true;
    }

    // Handle Ancestry-specific editor saves
    if (item.type === 'ancestry') {
      const ancestryResult = await this._handleAncestryEditorSave(item, target, content);
      if (ancestryResult) return true;
    }
    
    // Handle granted ability descriptions (any item type)
    if (target && target.includes('grantedAbilities') && target.includes('description')) {
      return await this._handleGrantedAbilityDescription(item, target, content);
    }
    
    return false; // Not handled by this helper
  }

  /**
   * Handle track-specific editor saves
   * @param {ZWolfItem} item - The track item
   * @param {string} target - The target field
   * @param {string} content - The content to save
   * @returns {Promise<boolean>} - True if handled
   * @private
   */
  static async _handleTrackEditorSave(item, target, content) {
    // Handle required field specifically
    if (target === 'system.required') {
      console.log("Updating required field with content:", content);
      try {
        await item.update({ [target]: content });
        console.log("Required field update successful!");
        return true;
      } catch (error) {
        console.error("Required field update failed:", error);
        return false;
      }
    }
    
    // Check if this is a tier talent menu description
    if (target && target.includes('tiers.tier') && target.includes('talentMenu.description')) {
      console.log("This is a tier talent menu description save!");
      
      const match = target.match(/system\.tiers\.tier(\d+)\.talentMenu\.description/);
      if (match) {
        const tier = match[1];
        console.log(`Updating tier ${tier} talent menu with content:`, content);
        
        try {
          await item.update({ [`system.tiers.tier${tier}.talentMenu.description`]: content });
          console.log("Update successful!");
          return true;
        } catch (error) {
          console.error("Update failed:", error);
          return false;
        }
      }
    }
    
    // Check if this is a tier granted ability description
    if (target && target.includes('tiers.tier') && target.includes('grantedAbilities') && target.includes('description')) {
      return await this._handleTierAbilityDescription(item, target, content);
    }
    
    return false;
  }

  /**
   * Handle tier ability description saves
   * @param {ZWolfItem} item - The track item
   * @param {string} target - The target field
   * @param {string} content - The content to save
   * @returns {Promise<boolean>} - True if handled
   * @private
   */
  static async _handleTierAbilityDescription(item, target, content) {
    console.log("This is a tier granted ability description save!");
    
    const match = target.match(/system\.tiers\.tier(\d+)\.grantedAbilities\.(\d+)\.description/);
    if (match) {
      const tier = match[1];
      const index = parseInt(match[2]);
      console.log(`Updating tier ${tier} ability ${index} with content:`, content);
      
      try {
        const tierPath = `system.tiers.tier${tier}.grantedAbilities`;
        const abilities = foundry.utils.duplicate(
          foundry.utils.getProperty(item.system, `tiers.tier${tier}.grantedAbilities`) || []
        );
        
        // Ensure the ability exists at this index with consistent structure
        while (abilities.length <= index) {
          abilities.push({ 
            name: "", 
            tags: "",
            type: "passive", 
            description: "" 
          });
        }
        
        // Update the description
        abilities[index].description = content;
        
        await item.update({ [tierPath]: abilities });
        console.log("Update successful!");
        return true;
      } catch (error) {
        console.error("Update failed:", error);
        return false;
      }
    }
    
    return false;
  }

  /**
   * Handle ancestry-specific editor saves
   * @param {ZWolfItem} item - The ancestry item
   * @param {string} target - The target field
   * @param {string} content - The content to save
   * @returns {Promise<boolean>} - True if handled
   * @private
   */
  static async _handleAncestryEditorSave(item, target, content) {
    console.log("=== ANCESTRY EDITOR SAVE DEBUG ===");
    console.log("Target:", target);
    console.log("Content:", content);
    
    // Check if this is a knack menu description
    if (target && target.includes('knackMenus') && target.includes('description')) {
      console.log("This is a knack menu description save!");
      
      const match = target.match(/system\.knackMenus\.(\d+)\.description/);
      if (match) {
        const index = parseInt(match[1]);
        console.log(`Updating knack menu ${index} with content:`, content);
        
        try {
          await item.update({ [`system.knackMenus.${index}.description`]: content });
          console.log("Update successful!");
          return true;
        } catch (error) {
          console.error("Update failed:", error);
          return false;
        }
      }
    }
    
    return false;
  }

  /**
   * Handle granted ability description saves
   * @param {ZWolfItem} item - The item
   * @param {string} target - The target field
   * @param {string} content - The content to save
   * @returns {Promise<boolean>} - True if handled
   * @private
   */
  static async _handleGrantedAbilityDescription(item, target, content) {
    console.log("This is a granted ability description save!");
    
    const match = target.match(/system\.grantedAbilities\.(\d+)\.description/);
    if (match) {
      const index = parseInt(match[1]);
      console.log("Updating ability", index, "with content:", content);
      
      // Get current abilities array - use fresh data from the item
      const currentAbilities = item.system.grantedAbilities || [];
      
      // Verify the ability exists at this index
      if (index >= 0 && index < currentAbilities.length) {
        // Use a direct path update instead of manipulating the entire array
        const updatePath = `system.grantedAbilities.${index}.description`;
        
        try {
          await item.update({ [updatePath]: content });
          console.log("Direct update successful!");
          return true;
        } catch (error) {
          console.error("Direct update failed:", error);
          
          // Fallback: use array manipulation as backup
          const abilities = foundry.utils.duplicate(currentAbilities);
          abilities[index].description = content;
          await item.update({ "system.grantedAbilities": abilities });
          console.log("Fallback update successful!");
          return true;
        }
      } else {
        console.error(`Ability at index ${index} does not exist. Current abilities length: ${currentAbilities.length}`);
        
        // If for some reason the ability doesn't exist, create it
        const abilities = foundry.utils.duplicate(currentAbilities);
        
        // Only pad to the exact index needed
        for (let i = abilities.length; i <= index; i++) {
          abilities.push({ 
            name: "", 
            tags: "", 
            type: "passive", 
            description: "" 
          });
        }
        
        abilities[index].description = content;
        await item.update({ "system.grantedAbilities": abilities });
        console.log("Created missing ability and updated!");
        return true;
      }
    }
    
    return false;
  }
}
