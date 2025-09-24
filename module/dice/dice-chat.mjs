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
        roll: rollData.roll,
        content: await this._createRollContent(rollData),
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
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
   * Create the HTML content for the roll result
   * @private
   * @param {Object} rollData - The roll result data
   * @returns {Promise<string>} HTML content for the chat message
   */
  static async _createRollContent(rollData) {
    const {
      diceResults, sortedDice, keyDie, keyDieIndex, keyDiePosition,
      modifier, finalResult, targetNumber, success, netBoosts,
      critSuccessChance, critFailureChance
    } = rollData;
    
    // Create visual representation of sorted dice
    const sortedDiceDisplay = this._createDiceDisplay(sortedDice, keyDieIndex, critSuccessChance, critFailureChance, keyDiePosition);
    
    // Determine overall crit status class
    const critClass = this._determineCritClass(critSuccessChance, critFailureChance);
    
    // Build boosts/jinxes display
    const boostJinxDisplay = this._createBoostJinxDisplay(netBoosts);
    
    // Build main content
    let content = this._buildMainContent({
      critClass,
      diceCount: sortedDice.length,
      modifier,
      boostJinxDisplay,
      sortedDiceDisplay,
      diceResults,
      keyDiePosition,
      keyDie,
      finalResult
    });
    
    // Add crit chance notifications
    content += this._createCritNotifications(critSuccessChance, critFailureChance);
    
    // Add target and outcome if applicable
    content += this._createTargetOutcome(targetNumber, success);
    
    content += `</div>`;
    
    return content;
  }

  /**
   * Create visual representation of dice with highlighting
   * @private
   */
  static _createDiceDisplay(sortedDice, keyDieIndex, critSuccessChance, critFailureChance, keyDiePosition) {
    return sortedDice.map((die, index) => {
      const isKey = index === keyDieIndex;
      const isAboveKey = index === keyDieIndex + 1;
      const isBelowKey = index === keyDieIndex - 1;
      
      let classes = [ZWOLF_CONSTANTS.CSS_CLASSES.DIE_RESULT];
      let title = '';
      
      if (isKey) {
        classes.push(ZWOLF_CONSTANTS.CSS_CLASSES.KEY_DIE);
        title = `Key Die (${keyDiePosition})`;
      } else if (isAboveKey && critSuccessChance) {
        classes.push(ZWOLF_CONSTANTS.CSS_CLASSES.CRIT_TRIGGER);
        title = 'Crit Success Trigger!';
      } else if (isBelowKey && critFailureChance) {
        classes.push(ZWOLF_CONSTANTS.CSS_CLASSES.CRIT_TRIGGER);
        title = 'Crit Failure Trigger!';
      }
      
      return `<span class="${classes.join(' ')}" title="${title}">${die}</span>`;
    }).join(' ');
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
   * Create the boosts/jinxes display section
   * @private
   */
  static _createBoostJinxDisplay(netBoosts) {
    if (netBoosts === 0) return '';
    
    const boostType = netBoosts > 0 ? 'Boosts' : 'Jinxes';
    const boostColor = netBoosts > 0 ? 'boost' : 'jinx';
    
    return `
      <div class="boost-jinx-info ${boostColor}">
        <strong>Net ${boostType}:</strong> ${Math.abs(netBoosts)}
      </div>
    `;
  }

  /**
   * Build the main content structure
   * @private
   */
  static _buildMainContent({critClass, diceCount, modifier, boostJinxDisplay, sortedDiceDisplay, diceResults, keyDiePosition, keyDie, finalResult}) {
    return `
      <div class="zwolf-roll ${critClass}">
        <div class="roll-formula">${diceCount}d12 + ${modifier}</div>
        ${boostJinxDisplay}
        <div class="dice-results">
          <strong>Dice (sorted):</strong> ${sortedDiceDisplay}
        </div>
        <div class="original-order">
          <strong>Original roll:</strong> ${diceResults.join(', ')}
        </div>
        <div class="key-die-info">
          <strong>Key Die (${keyDiePosition}):</strong> ${keyDie} + ${modifier} modifier = <strong class="final-result">${finalResult}</strong>
        </div>
    `;
  }

  /**
   * Create critical chance notification section
   * @private
   */
  static _createCritNotifications(critSuccessChance, critFailureChance) {
    if (!critSuccessChance && !critFailureChance) return '';
    
    let content = `<div class="crit-chances">`;
    
    if (critSuccessChance && critFailureChance) {
      content += `<strong class="crit-both">${ZWOLF_CONSTANTS.CRIT_MESSAGES.WILD_CARD}</strong>`;
    } else if (critSuccessChance) {
      content += `<strong class="crit-success">${ZWOLF_CONSTANTS.CRIT_MESSAGES.SUCCESS}</strong>`;
    } else if (critFailureChance) {
      content += `<strong class="crit-failure">${ZWOLF_CONSTANTS.CRIT_MESSAGES.FAILURE}</strong>`;
    }
    
    content += `</div>`;
    return content;
  }

  /**
   * Create target number and outcome section
   * @private
   */
  static _createTargetOutcome(targetNumber, success) {
    if (targetNumber === null) return '';
    
    return `
      <div class="roll-target">
        <strong>Target:</strong> ${targetNumber}
      </div>
      <div class="roll-outcome ${success ? 'success' : 'failure'}">
        <strong>${success ? 'SUCCESS!' : 'FAILURE'}</strong>
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
      type: CONST.CHAT_MESSAGE_TYPES.OOC
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
      type: CONST.CHAT_MESSAGE_TYPES.OOC
    };
    
    return await ChatMessage.create(messageData);
  }
}
