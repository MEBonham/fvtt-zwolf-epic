/**
 * Z-Wolf Epic Chat Message Formatting
 * Handles the creation and formatting of roll result chat messages
 */

import { ZWOLF_CONSTANTS } from './dice-constants.mjs';

export class ZWolfChat {
  /**
   * Create a chat message for a roll result
   * @param {Object} rollData - The roll result data
   * @returns {Promise<ChatMessage>} The created chat message
   */
  static async createChatMessage(rollData) {
    try {
      const messageData = {
        speaker: rollData.actor ? ChatMessage.getSpeaker({ actor: rollData.actor }) : ChatMessage.getSpeaker(),
        flavor: rollData.flavor || ZWOLF_CONSTANTS.MESSAGES.DEFAULT_FLAVOR,
        roll: [rollData.roll],
        content: await this._createRollContent(rollData),
        sound: CONFIG.sounds.dice
      };
      
      return await ChatMessage.create(messageData);
    } catch (error) {
      console.error("Z-Wolf Epic | Error creating chat message:", error);
      ui.notifications.error("Failed to create chat message. Check console for details.");
      throw error;
    }
  }
  
  /**
   * Create the HTML content for the roll result (compact version)
   * @private
   * @param {Object} rollData - The roll result data
   * @returns {Promise<string>} HTML content for the chat message
   */
  static async _createRollContent(rollData) {
    const {
      diceResults, finalResult, flavor, targetNumber, success,
      critSuccessChance, critFailureChance
    } = rollData;
    
    // Create tooltip with original roll details
    const tooltipContent = this._createTooltipContent(rollData);
    
    // Determine overall crit status class
    const critClass = this._determineCritClass(critSuccessChance, critFailureChance);
    
    // Build compact main content
    let content = `
      <div class="zwolf-roll-compact ${critClass}">
        <div class="roll-main" title="${tooltipContent}">
          <div class="roll-stat">${flavor || 'Roll'}</div>
          <div class="roll-result-big">${finalResult}</div>
        </div>
    `;
    
    // Add crit notifications
    content += this._createCritNotifications(critSuccessChance, critFailureChance);
    
    // Add target and outcome if applicable
    content += this._createTargetOutcome(targetNumber, success);
    
    content += `</div>`;
    
    return content;
  }

  /**
   * Create tooltip content with detailed roll information
   * @private
   */
  static _createTooltipContent(rollData) {
    const { diceResults, sortedDice, keyDie, keyDiePosition, modifier, netBoosts } = rollData;
    
    let tooltip = `Original Roll: ${diceResults.join(', ')}`;
    tooltip += `\nSorted: ${sortedDice.join(', ')}`;
    tooltip += `\nKey Die (${keyDiePosition}): ${keyDie}`;
    if (modifier !== 0) tooltip += ` + ${modifier} modifier`;
    if (netBoosts !== 0) {
      const boostType = netBoosts > 0 ? 'Boosts' : 'Jinxes';
      tooltip += `\nNet ${boostType}: ${Math.abs(netBoosts)}`;
    }
    
    return tooltip;
  }

  /**
   * Determine the overall critical status CSS class
   * @private
   */
  static _determineCritClass(critSuccessChance, critFailureChance) {
    if (critSuccessChance && critFailureChance) {
      return ZWOLF_CONSTANTS.CSS_CLASSES.CRIT_BOTH;
    } else if (critSuccessChance) {
      return ZWOLF_CONSTANTS.CSS_CLASSES.CRIT_SUCCESS_CHANCE;
    } else if (critFailureChance) {
      return ZWOLF_CONSTANTS.CSS_CLASSES.CRIT_FAILURE_CHANCE;
    }
    return '';
  }

  /**
   * Create critical chance notification section (compact)
   * @private
   */
  static _createCritNotifications(critSuccessChance, critFailureChance) {
    if (!critSuccessChance && !critFailureChance) return '';
    
    let content = `<div class="crit-notification">`;
    
    if (critSuccessChance && critFailureChance) {
      content += `<span class="crit-both">${ZWOLF_CONSTANTS.CRIT_MESSAGES.WILD_CARD}</span>`;
    } else if (critSuccessChance) {
      content += `<span class="crit-success">${ZWOLF_CONSTANTS.CRIT_MESSAGES.SUCCESS}</span>`;
    } else if (critFailureChance) {
      content += `<span class="crit-failure">${ZWOLF_CONSTANTS.CRIT_MESSAGES.FAILURE}</span>`;
    }
    
    content += `</div>`;
    return content;
  }

  /**
   * Create target number and outcome section (compact)
   * @private
   */
  static _createTargetOutcome(targetNumber, success) {
    if (targetNumber === null) return '';
    
    return `
      <div class="roll-outcome-compact">
        <span class="target">vs ${targetNumber}</span>
        <span class="outcome ${success ? 'success' : 'failure'}">
          ${success ? 'SUCCESS' : 'FAILURE'}
        </span>
      </div>
    `;
  }

  /**
   * Create a simple notification message
   * @param {string} message - The message to display
   * @param {string} type - Message type (info, warning, error)
   */
  static async createNotification(message, type = 'info') {
    const messageData = {
      speaker: ChatMessage.getSpeaker(),
      content: `<div class="zwolf-notification zwolf-${type}">${message}</div>`,
      type: CONST.CHAT_MESSAGE_STYLES.OOC
    };
    
    return await ChatMessage.create(messageData);
  }

  /**
   * Create a roll summary for multiple rolls
   * @param {Array} rolls - Array of roll results
   * @param {string} title - Title for the summary
   */
  static async createRollSummary(rolls, title = "Roll Summary") {
    if (!rolls || rolls.length === 0) return;
    
    let content = `<div class="zwolf-roll-summary">`;
    content += `<h3>${title}</h3>`;
    
    rolls.forEach((roll, index) => {
      content += `
        <div class="summary-roll">
          <strong>Roll ${index + 1}:</strong> 
          ${roll.flavor} - Result: ${roll.finalResult}
          ${roll.success !== null ? ` (${roll.success ? 'Success' : 'Failure'})` : ''}
        </div>
      `;
    });
    
    content += `</div>`;
    
    const messageData = {
      speaker: ChatMessage.getSpeaker(),
      content: content,
      type: CONST.CHAT_MESSAGE_STYLES.OOC
    };
    
    return await ChatMessage.create(messageData);
  }
}
