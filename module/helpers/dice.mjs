/**
 * Z-Wolf Epic Dice System
 * Handles the 3d12 + modifier dice mechanics with Boosts/Jinxes
 */

export class ZWolfDice {
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
  static async roll({netBoosts = null, modifier = 0, targetNumber = null, flavor = "", actor = null} = {}) {
    // If netBoosts not provided, get from the UI control
    if (netBoosts === null) {
      netBoosts = ZWolfUI.getNetBoosts();
    }
    
    // Base dice count is 3, add absolute value of net boosts/jinxes
    const baseDice = 3;
    const diceCount = baseDice + Math.abs(netBoosts);
    
    // Create and evaluate the roll
    const roll = new Roll(`${diceCount}d12`);
    await roll.evaluate();
    
    // Process dice results
    const rollResult = this._processDiceResults(roll, netBoosts, modifier);
    
    // Determine success if target number provided
    const success = targetNumber ? rollResult.finalResult >= targetNumber : null;
    
    // Create chat message
    await this._createChatMessage({
      ...rollResult,
      targetNumber,
      success,
      flavor,
      actor,
      roll,
      netBoosts,
      modifier
    });
    
    // Reset net boosts if auto-reset is enabled
    if (game.settings.get(game.system.id, 'autoResetBoosts')) {
      ZWolfUI.setNetBoosts(0);
    }
    
    return {
      roll,
      success,
      ...rollResult
    };
  }

  /**
   * Process dice results to determine key die and crit chances
   * @private
   */
  static _processDiceResults(roll, netBoosts, modifier) {
    const diceResults = roll.dice[0].results.map(r => r.result);
    const sortedDice = [...diceResults].sort((a, b) => a - b);
    
    // Determine key die position based on net boosts
    let keyDieIndex, keyDiePosition;
    
    if (netBoosts > 0) {
      keyDieIndex = sortedDice.length - 2; // Second-highest
      keyDiePosition = "second-highest";
    } else if (netBoosts < 0) {
      keyDieIndex = 1; // Second-lowest
      keyDiePosition = "second-lowest";
    } else {
      keyDieIndex = Math.floor(sortedDice.length / 2); // Median
      keyDiePosition = "median";
    }
    
    const keyDie = sortedDice[keyDieIndex];
    const finalResult = keyDie + modifier;
    
    // Check for crit chances
    const critSuccessChance = keyDieIndex < sortedDice.length - 1 && sortedDice[keyDieIndex + 1] === 12;
    const critFailureChance = keyDieIndex > 0 && sortedDice[keyDieIndex - 1] === 1;
    
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
   * Create chat message for roll result
   * @private
   */
  static async _createChatMessage(data) {
    const messageData = {
      speaker: data.actor ? ChatMessage.getSpeaker({ actor: data.actor }) : ChatMessage.getSpeaker(),
      flavor: data.flavor || "Z-Wolf Epic Roll",
      roll: data.roll,
      content: await this._createRollContent(data),
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      sound: CONFIG.sounds.dice
    };
    
    await ChatMessage.create(messageData);
  }
  
  /**
   * Create the HTML content for the roll result
   * @private
   */
  static async _createRollContent(data) {
    const {
      diceResults, sortedDice, keyDie, keyDieIndex, keyDiePosition,
      modifier, finalResult, targetNumber, success, netBoosts,
      critSuccessChance, critFailureChance
    } = data;
    
    // Create visual representation of sorted dice
    const sortedDiceDisplay = sortedDice.map((die, index) => {
      const isKey = index === keyDieIndex;
      const isAboveKey = index === keyDieIndex + 1;
      const isBelowKey = index === keyDieIndex - 1;
      
      let classes = ['die-result'];
      let title = '';
      
      if (isKey) {
        classes.push('key-die');
        title = `Key Die (${keyDiePosition})`;
      } else if (isAboveKey && critSuccessChance) {
        classes.push('crit-trigger');
        title = 'Crit Success Trigger!';
      } else if (isBelowKey && critFailureChance) {
        classes.push('crit-trigger');
        title = 'Crit Failure Trigger!';
      }
      
      return `<span class="${classes.join(' ')}" title="${title}">${die}</span>`;
    }).join(' ');
    
    // Determine crit status class
    let critClass = '';
    if (critSuccessChance && critFailureChance) {
      critClass = 'crit-both';
    } else if (critSuccessChance) {
      critClass = 'crit-success-chance';
    } else if (critFailureChance) {
      critClass = 'crit-failure-chance';
    }
    
    // Build boosts/jinxes display
    let boostJinxDisplay = '';
    if (netBoosts !== 0) {
      const boostType = netBoosts > 0 ? 'Boosts' : 'Jinxes';
      const boostColor = netBoosts > 0 ? 'boost' : 'jinx';
      boostJinxDisplay = `
        <div class="boost-jinx-info ${boostColor}">
          <strong>Net ${boostType}:</strong> ${Math.abs(netBoosts)}
        </div>
      `;
    }
    
    let content = `
      <div class="zwolf-roll ${critClass}">
        <div class="roll-formula">${sortedDice.length}d12 + ${modifier}</div>
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
    
    // Add crit chance notifications
    if (critSuccessChance || critFailureChance) {
      content += `<div class="crit-chances">`;
      if (critSuccessChance && critFailureChance) {
        content += `<strong class="crit-both">⚡ CRITICAL WILD CARD! ⚡</strong>`;
      } else if (critSuccessChance) {
        content += `<strong class="crit-success">✨ CRITICAL SUCCESS CHANCE! ✨</strong>`;
      } else if (critFailureChance) {
        content += `<strong class="crit-failure">💀 CRITICAL FAILURE CHANCE! 💀</strong>`;
      }
      content += `</div>`;
    }
    
    if (targetNumber !== null) {
      content += `
        <div class="roll-target">
          <strong>Target:</strong> ${targetNumber}
        </div>
        <div class="roll-outcome ${success ? 'success' : 'failure'}">
          <strong>${success ? 'SUCCESS!' : 'FAILURE'}</strong>
        </div>
      `;
    }
    
    content += `</div>`;
    return content;
  }
  
  /**
   * Quick skill roll
   */
  static async rollSkill(actor, skillName, attributeName, netBoosts = null) {
    if (!actor) return ui.notifications.warn("No actor selected for roll");
    
    const skill = actor.system.skills[skillName];
    const attribute = actor.system.attributes[attributeName];
    
    if (!skill || !attribute) {
      return ui.notifications.warn("Invalid skill or attribute");
    }
    
    const modifier = skill.value + attribute.value;
    const flavor = `${skillName.charAt(0).toUpperCase() + skillName.slice(1)} (${attributeName.charAt(0).toUpperCase() + attributeName.slice(1)})`;
    
    return this.roll({ netBoosts, modifier, flavor, actor });
  }
  
  /**
   * Quick attribute roll
   */
  static async rollAttribute(actor, attributeName, netBoosts = null) {
    if (!actor) return ui.notifications.warn("No actor selected for roll");
    
    const attribute = actor.system.attributes[attributeName];
    if (!attribute) {
      return ui.notifications.warn("Invalid attribute");
    }
    
    const modifier = attribute.value;
    const flavor = `${attributeName.charAt(0).toUpperCase() + attributeName.slice(1)} Check`;
    
    return this.roll({ netBoosts, modifier, flavor, actor });
  }
}

/**
 * Z-Wolf UI Management
 * Handles the boost/jinx control panel
 */
export class ZWolfUI {
  /**
   * Get the current net boosts value from the UI
   */
  static getNetBoosts() {
    const input = document.getElementById('zwolf-net-boosts');
    return parseInt(input?.value) || 0;
  }
  
  /**
   * Set the net boosts value in the UI
   */
  static setNetBoosts(value) {
    const input = document.getElementById('zwolf-net-boosts');
    if (input) {
      input.value = value;
      this.updateNetBoostsDisplay();
    }
  }
  
  /**
   * Update the net boosts display
   */
  static updateNetBoostsDisplay() {
    const input = document.getElementById('zwolf-net-boosts');
    const label = document.querySelector('.zwolf-boost-label');
    const container = document.querySelector('.zwolf-boost-control');
    
    if (!input || !label) return;
    
    const value = parseInt(input.value) || 0;
    
    // Update label text and styling
    if (value > 0) {
      label.textContent = `Boosts: ${value}`;
      container?.classList.remove('jinx-active');
      container?.classList.add('boost-active');
    } else if (value < 0) {
      label.textContent = `Jinxes: ${Math.abs(value)}`;
      container?.classList.remove('boost-active');
      container?.classList.add('jinx-active');
    } else {
      label.textContent = 'Net Boosts: 0';
      container?.classList.remove('boost-active', 'jinx-active');
    }
  }
  
  /**
   * Create the boost control HTML
   */
  static createBoostControl() {
    return `
      <div class="zwolf-boost-control">
        <div class="zwolf-boost-header">
          <button id="zwolf-quick-roll" class="zwolf-icon-button" title="Quick roll with current boosts">
            <i class="fas fa-dice-d12"></i>
          </button>
          <span class="zwolf-boost-label">Net Boosts: 0</span>
        </div>
        <div class="zwolf-boost-inputs">
          <button id="zwolf-boost-minus" title="Remove Boost / Add Jinx">
            <i class="fas fa-minus"></i>
          </button>
          <input type="number" id="zwolf-net-boosts" value="0" min="-10" max="10" title="Positive = Boosts, Negative = Jinxes"/>
          <button id="zwolf-boost-plus" title="Add Boost / Remove Jinx">
            <i class="fas fa-plus"></i>
          </button>
          <button id="zwolf-boost-reset" title="Reset to 0">
            <i class="fas fa-undo"></i>
          </button>
        </div>
        <div class="zwolf-boost-quick">
          <button class="zwolf-quick-boost" data-value="-3" title="3 Jinxes">-3</button>
          <button class="zwolf-quick-boost" data-value="-2" title="2 Jinxes">-2</button>
          <button class="zwolf-quick-boost" data-value="-1" title="1 Jinx">-1</button>
          <button class="zwolf-quick-boost" data-value="1" title="1 Boost">+1</button>
          <button class="zwolf-quick-boost" data-value="2" title="2 Boosts">+2</button>
          <button class="zwolf-quick-boost" data-value="3" title="3 Boosts">+3</button>
        </div>
      </div>
    `;
  }
  
  /**
   * Initialize event listeners for boost controls
   */
  static initializeEventListeners() {
    // Use event delegation for better performance and reliability
    document.addEventListener('click', async (event) => {
      const target = event.target.closest('button');
      if (!target) return;
      
      const id = target.id;
      const current = this.getNetBoosts();
      
      switch (id) {
        case 'zwolf-boost-plus':
          this.setNetBoosts(Math.min(10, current + 1));
          break;
          
        case 'zwolf-boost-minus':
          this.setNetBoosts(Math.max(-10, current - 1));
          break;
          
        case 'zwolf-boost-reset':
          this.setNetBoosts(0);
          break;
          
        case 'zwolf-quick-roll':
          event.preventDefault();
          event.stopPropagation();
          await ZWolfDice.roll({
            netBoosts: current,
            modifier: 0,
            flavor: "Quick Z-Wolf Roll"
          });
          break;
      }
      
      // Handle quick boost buttons
      if (target.classList.contains('zwolf-quick-boost')) {
        const value = parseInt(target.dataset.value);
        this.setNetBoosts(value);
      }
    });
    
    // Input change handler
    document.addEventListener('change', (event) => {
      if (event.target.id === 'zwolf-net-boosts') {
        this.updateNetBoostsDisplay();
      }
    });
    
    // Prevent input keydown from interfering with chat
    document.addEventListener('keydown', (event) => {
      if (event.target.id === 'zwolf-net-boosts') {
        event.stopPropagation();
      }
    });
  }
  
  /**
   * Add boost controls to the chat interface
   */
  static addToChat(html) {
    const $html = html instanceof jQuery ? html : $(html);
    
    // Check if controls already exist
    if ($html.find('.zwolf-boost-control').length > 0) {
      return;
    }
    
    const controlHtml = this.createBoostControl();
    const $control = $(controlHtml);
    
    // Insert after chat form
    const chatForm = $html.find('#chat-form');
    if (chatForm.length > 0) {
      chatForm.after($control);
    } else {
      $html.append($control);
    }
    
    // Initialize after short delay
    setTimeout(() => {
      this.updateNetBoostsDisplay();
    }, 100);
  }
}

// Initialize system on Foundry hooks
Hooks.once('init', () => {
  // Register settings
  game.settings.register(game.system.id, 'autoResetBoosts', {
    name: 'Auto-Reset Boosts',
    hint: 'Automatically reset Net Boosts to 0 after each roll',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true
  });
});

// Add controls when chat tab is rendered
Hooks.on('renderSidebarTab', (app, html, data) => {
  if (app.id === "chat") {
    ZWolfUI.addToChat(html);
  }
});

// Initialize event listeners once ready
Hooks.once('ready', () => {
  ZWolfUI.initializeEventListeners();
});
