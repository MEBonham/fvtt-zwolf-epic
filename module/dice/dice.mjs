/**
 * Z-Wolf Epic Dice System - Main Entry Point
 * Coordinates all dice system functionality and provides public API
 */

import { ZWolfDiceCore } from './dice-core.mjs';
import { ZWolfUI } from './dice-ui.mjs';
import { ZWolfChat } from './dice-chat.mjs';
import { registerDiceHooks, getSetting, setSetting, isDebugMode, debugLog } from './dice-hooks.mjs';
import { ZWOLF_CONSTANTS } from './dice-constants.mjs';

/**
 * Main Z-Wolf Dice class that coordinates all functionality
 * This is the primary interface for the dice system
 */
export class ZWolfDice {
  /**
   * Perform a Z-Wolf Epic roll with full chat message creation
   * @param {Object} options - Roll options
   * @returns {Promise<Object>} The completed roll with details
   */
  static async roll(options = {}) {
    try {
      debugLog("Starting roll with options:", options);
      
      // Get net boosts from UI if not provided
      if (options.netBoosts === null || options.netBoosts === undefined) {
        options.netBoosts = ZWolfUI.getNetBoosts();
        debugLog("Got net boosts from UI:", options.netBoosts);
      }
      
      // Perform the core roll
      const rollResult = await ZWolfDiceCore.roll(options);
      
      // Create chat message
      await ZWolfChat.createChatMessage(rollResult);
      
      // Auto-reset boosts if enabled
      if (getSetting(ZWOLF_CONSTANTS.SETTINGS.AUTO_RESET_BOOSTS, true)) {
        ZWolfUI.setNetBoosts(0);
        debugLog("Auto-reset boosts to 0");
      }
      
      debugLog("Roll completed successfully:", rollResult);
      return rollResult;
      
    } catch (error) {
      console.error("Z-Wolf Epic | Error in main roll function:", error);
      throw error;
    }
  }

  /**
   * Quick skill roll - convenience method
   * @param {Actor} actor - The actor making the roll
   * @param {string} skillName - Name of the skill
   * @param {string} attributeName - Name of the attribute
   * @param {number} netBoosts - Net boosts/jinxes for this roll (optional)
   * @returns {Promise<Object>} The completed roll
   */
  static async rollSkill(actor, skillName, attributeName, netBoosts = null) {
    debugLog("Skill roll:", { actor: actor?.name, skillName, attributeName, netBoosts });
    
    const rollResult = await ZWolfDiceCore.rollSkill(actor, skillName, attributeName, netBoosts);
    if (rollResult) {
      await ZWolfChat.createChatMessage(rollResult);
      
      if (getSetting(ZWOLF_CONSTANTS.SETTINGS.AUTO_RESET_BOOSTS, true)) {
        ZWolfUI.setNetBoosts(0);
      }
    }
    
    return rollResult;
  }
  
  /**
   * Quick attribute roll - convenience method
   * @param {Actor} actor - The actor making the roll
   * @param {string} attributeName - Name of the attribute
   * @param {number} netBoosts - Net boosts/jinxes for this roll (optional)
   * @returns {Promise<Object>} The completed roll
   */
  static async rollAttribute(actor, attributeName, netBoosts = null) {
    debugLog("Attribute roll:", { actor: actor?.name, attributeName, netBoosts });
    
    const rollResult = await ZWolfDiceCore.rollAttribute(actor, attributeName, netBoosts);
    if (rollResult) {
      await ZWolfChat.createChatMessage(rollResult);
      
      if (getSetting(ZWOLF_CONSTANTS.SETTINGS.AUTO_RESET_BOOSTS, true)) {
        ZWolfUI.setNetBoosts(0);
      }
    }
    
    return rollResult;
  }

  /**
   * Get the current net boosts from the UI
   * @returns {number} Current net boosts value
   */
  static getNetBoosts() {
    return ZWolfUI.getNetBoosts();
  }

  /**
   * Set the net boosts in the UI
   * @param {number} value - The value to set
   */
  static setNetBoosts(value) {
    ZWolfUI.setNetBoosts(value);
  }

  /**
   * Perform multiple rolls and create a summary
   * @param {Array} rollConfigs - Array of roll configuration objects
   * @param {string} summaryTitle - Title for the roll summary
   * @returns {Promise<Array>} Array of roll results
   */
  static async rollMultiple(rollConfigs, summaryTitle = "Multiple Rolls") {
    debugLog("Multiple rolls:", { count: rollConfigs.length, summaryTitle });
    
    const results = [];
    
    for (const config of rollConfigs) {
      try {
        const rollResult = await ZWolfDiceCore.roll(config);
        results.push(rollResult);
      } catch (error) {
        console.error("Z-Wolf Epic | Error in multiple roll:", error);
        results.push({ error: error.message, config });
      }
    }
    
    // Create summary message
    await ZWolfChat.createRollSummary(results.filter(r => !r.error), summaryTitle);
    
    // Report any errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      await ZWolfChat.createNotification(
        `${errors.length} roll(s) failed. Check console for details.`, 
        'error'
      );
    }
    
    return results;
  }

  /**
   * Initialize the dice system
   * Call this to set up all hooks and UI elements
   */
  static initialize() {
    console.log("Z-Wolf Epic | Initializing dice system");
    
    try {
      // Register all Foundry hooks
      registerDiceHooks();
      
      // Make the dice system globally available for macros and console access
      window.ZWolfDice = ZWolfDice;
      
      console.log("Z-Wolf Epic | Dice system initialized successfully");
      
    } catch (error) {
      console.error("Z-Wolf Epic | Failed to initialize dice system:", error);
      ui.notifications.error("Z-Wolf Epic dice system failed to initialize. Check console for details.");
    }
  }

  /**
   * Get system version and information
   * @returns {Object} System information
   */
  static getSystemInfo() {
    return {
      version: "2.0.0",
      name: "Z-Wolf Epic Dice System",
      baseDice: ZWOLF_CONSTANTS.BASE_DICE_COUNT,
      maxBoosts: ZWOLF_CONSTANTS.MAX_BOOSTS,
      minBoosts: ZWOLF_CONSTANTS.MIN_BOOSTS,
      debugMode: isDebugMode()
    };
  }

  /**
   * Test the dice system functionality
   * Useful for debugging and verification
   */
  static async test() {
    console.log("Z-Wolf Epic | Running dice system tests...");
    
    try {
      // Test basic roll
      console.log("Testing basic roll...");
      await this.roll({ modifier: 5, flavor: "Test Roll" });
      
      // Test boost roll
      console.log("Testing boost roll...");
      await this.roll({ netBoosts: 2, modifier: 3, flavor: "Test Boost Roll" });
      
      // Test jinx roll
      console.log("Testing jinx roll...");
      await this.roll({ netBoosts: -1, modifier: 1, flavor: "Test Jinx Roll" });
      
      // Test UI functions
      console.log("Testing UI functions...");
      this.setNetBoosts(3);
      const boosts = this.getNetBoosts();
      console.log("Set boosts to 3, got:", boosts);
      this.setNetBoosts(0);
      
      console.log("Z-Wolf Epic | All tests completed successfully");
      await ZWolfChat.createNotification("Dice system test completed successfully!", "info");
      
    } catch (error) {
      console.error("Z-Wolf Epic | Test failed:", error);
      await ZWolfChat.createNotification("Dice system test failed. Check console for details.", "error");
    }
  }
}

// Auto-initialize when the module is loaded
ZWolfDice.initialize();
