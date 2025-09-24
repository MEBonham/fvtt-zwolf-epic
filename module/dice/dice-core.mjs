/**
 * Z-Wolf Epic Core Dice Logic
 * Handles the core 3d12 + modifier dice mechanics with Boosts/Jinxes
 */

import { ZWOLF_CONSTANTS } from './dice-constants.mjs';

export class ZWolfDiceCore {
  /**
   * Perform a Z-Wolf Epic roll
   * @param {Object} options - Roll options
   * @param {number} options.netBoosts - Net boosts (positive) or jinxes (negative)
   * @param {number} options.modifier - Modifier to add to the key die
   * @param {number} options.targetNumber - Target number to beat
   * @param {string} options.flavor - Flavor text for the roll
   * @param {Actor} options.actor - Actor making the roll
   * @returns {Promise<Object>} The completed roll with details
   */
  static async roll({netBoosts = 0, modifier = 0, targetNumber = null, flavor = "", actor = null} = {}) {
    try {
      // Validate inputs
      netBoosts = this._validateNetBoosts(netBoosts);
      modifier = this._validateModifier(modifier);
      
      // Calculate dice count and create roll
      const diceCount = ZWOLF_CONSTANTS.BASE_DICE_COUNT + Math.abs(netBoosts);
      const roll = new Roll(`${diceCount}d12`);
      await roll.evaluate();
      
      // Process dice results
      const rollResult = this._processDiceResults(roll, netBoosts, modifier);
      
      // Determine success if target number provided
      const success = targetNumber ? rollResult.finalResult >= targetNumber : null;
      
      return {
        roll,
        success,
        targetNumber,
        flavor: flavor || ZWOLF_CONSTANTS.MESSAGES.DEFAULT_FLAVOR,
        actor,
        netBoosts,
        modifier,
        ...rollResult
      };
    } catch (error) {
      console.error("Z-Wolf Epic | Error during roll:", error);
      ui.notifications.error("Roll failed. Check console for details.");
      throw error;
    }
  }

  /**
   * Quick skill roll
   * @param {Actor} actor - The actor making the roll
   * @param {string} skillName - Name of the skill
   * @param {string} attributeName - Name of the attribute
   * @param {number} netBoosts - Net boosts/jinxes for this roll (optional)
   * @returns {Promise<Object>} The completed roll
   */
  static async rollSkill(actor, skillName, attributeName, netBoosts = null) {
    if (!actor) {
      ui.notifications.warn(ZWOLF_CONSTANTS.MESSAGES.NO_ACTOR);
      return null;
    }
    
    const skill = actor.system.skills?.[skillName];
    const attribute = actor.system.attributes?.[attributeName];
    
    if (!skill || !attribute) {
      ui.notifications.warn(ZWOLF_CONSTANTS.MESSAGES.INVALID_SKILL_ATTRIBUTE);
      return null;
    }
    
    const modifier = skill.value + attribute.value;
    const flavor = this._formatSkillFlavor(skillName, attributeName);
    
    return this.roll({ netBoosts, modifier, flavor, actor });
  }
  
  /**
   * Quick attribute roll
   * @param {Actor} actor - The actor making the roll
   * @param {string} attributeName - Name of the attribute
   * @param {number} netBoosts - Net boosts/jinxes for this roll (optional)
   * @returns {Promise<Object>} The completed roll
   */
  static async rollAttribute(actor, attributeName, netBoosts = null) {
    if (!actor) {
      ui.notifications.warn(ZWOLF_CONSTANTS.MESSAGES.NO_ACTOR);
      return null;
    }
    
    const attribute = actor.system.attributes?.[attributeName];
    if (!attribute) {
      ui.notifications.warn(ZWOLF_CONSTANTS.MESSAGES.INVALID_ATTRIBUTE);
      return null;
    }
    
    const modifier = attribute.value;
    const flavor = this._formatAttributeFlavor(attributeName);
    
    return this.roll({ netBoosts, modifier, flavor, actor });
  }

  /**
   * Process dice results to determine key die and crit chances
   * @private
   * @param {Roll} roll - The Foundry roll object
   * @param {number} netBoosts - Net boosts/jinxes
   * @param {number} modifier - Roll modifier
   * @returns {Object} Processed roll results
   */
  static _processDiceResults(roll, netBoosts, modifier) {
    const diceResults = roll.dice[0].results.map(r => r.result);
    const sortedDice = [...diceResults].sort((a, b) => a - b);
    
    // Determine key die position based on net boosts
    const { keyDieIndex, keyDiePosition } = this._determineKeyDie(sortedDice, netBoosts);
    const keyDie = sortedDice[keyDieIndex];
    const finalResult = keyDie + modifier;
    
    // Check for crit chances
    const critSuccessChance = this._checkCritSuccess(sortedDice, keyDieIndex);
    const critFailureChance = this._checkCritFailure(sortedDice, keyDieIndex);
    
    return {
      diceResults,
      sortedDice,
      keyDie,
      keyDieIndex,
      keyDiePosition,
      finalResult,
      critSuccessChance,
      critFailureChance
    };
  }

  /**
   * Determine key die index and position based on net boosts
   * @private
   */
  static _determineKeyDie(sortedDice, netBoosts) {
    let keyDieIndex, keyDiePosition;
    
    if (netBoosts > 0) {
      // Boosts: Key Die is second-highest
      keyDieIndex = sortedDice.length - 2;
      keyDiePosition = ZWOLF_CONSTANTS.KEY_DIE_POSITIONS.SECOND_HIGHEST;
    } else if (netBoosts < 0) {
      // Jinxes: Key Die is second-lowest
      keyDieIndex = 1;
      keyDiePosition = ZWOLF_CONSTANTS.KEY_DIE_POSITIONS.SECOND_LOWEST;
    } else {
      // No net boosts/jinxes: Key Die is median
      keyDieIndex = Math.floor(sortedDice.length / 2);
      keyDiePosition = ZWOLF_CONSTANTS.KEY_DIE_POSITIONS.MEDIAN;
    }
    
    return { keyDieIndex, keyDiePosition };
  }

  /**
   * Check for critical success chance
   * @private
   */
  static _checkCritSuccess(sortedDice, keyDieIndex) {
    return keyDieIndex < sortedDice.length - 1 && 
           sortedDice[keyDieIndex + 1] === ZWOLF_CONSTANTS.CRIT_SUCCESS_VALUE;
  }

  /**
   * Check for critical failure chance
   * @private
   */
  static _checkCritFailure(sortedDice, keyDieIndex) {
    return keyDieIndex > 0 && 
           sortedDice[keyDieIndex - 1] === ZWOLF_CONSTANTS.CRIT_FAILURE_VALUE;
  }

  /**
   * Validate net boosts value
   * @private
   */
  static _validateNetBoosts(netBoosts) {
    const value = parseInt(netBoosts) || 0;
    return Math.max(ZWOLF_CONSTANTS.MIN_BOOSTS, Math.min(ZWOLF_CONSTANTS.MAX_BOOSTS, value));
  }

  /**
   * Validate modifier value
   * @private
   */
  static _validateModifier(modifier) {
    return parseInt(modifier) || 0;
  }

  /**
   * Format skill roll flavor text
   * @private
   */
  static _formatSkillFlavor(skillName, attributeName) {
    const skill = skillName.charAt(0).toUpperCase() + skillName.slice(1);
    const attribute = attributeName.charAt(0).toUpperCase() + attributeName.slice(1);
    return `${skill} (${attribute})`;
  }

  /**
   * Format attribute roll flavor text
   * @private
   */
  static _formatAttributeFlavor(attributeName) {
    const attribute = attributeName.charAt(0).toUpperCase() + attributeName.slice(1);
    return `${attribute} Check`;
  }
}
