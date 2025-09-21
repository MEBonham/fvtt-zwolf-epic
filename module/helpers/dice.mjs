/**
 * Z-Wolf Epic Dice System
 * Handles the 3d12 + modifier dice mechanics with Boosts/Jinxes
 */

export class ZWolfDice {
  /**
   * Manually initialize the boost controls (for debugging)
   */
  static initializeUI() {
    console.log("Z-Wolf Epic | Manual UI initialization");
    
    // Remove any existing controls
    document.querySelectorAll('.zwolf-boost-control').forEach(el => {
      console.log("Z-Wolf Epic | Removing existing control");
      el.remove();
    });
    
    // Find the chat panel
    const sidebar = document.getElementById('sidebar');
    const chatTab = sidebar?.querySelector('.tab[data-tab="chat"]');
    
    if (!chatTab) {
      console.error("Z-Wolf Epic | Chat tab not found");
      return;
    }
    
    // Create the control element directly without innerHTML
    const controlElement = document.createElement('div');
    controlElement.className = 'zwolf-boost-control';
    controlElement.innerHTML = `
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
    `;
    
    // Try multiple insertion points
    const chatForm = chatTab.querySelector('#chat-form');
    
    try {
      if (chatForm && chatForm.parentNode) {
        // Insert after the chat form
        chatForm.parentNode.insertBefore(controlElement, chatForm.nextSibling);
        console.log("Z-Wolf Epic | Control inserted after chat form");
      } else {
        // Fallback: add to end of chat tab
        chatTab.appendChild(controlElement);
        console.log("Z-Wolf Epic | Control appended to chat tab");
      }
    } catch (error) {
      console.error("Z-Wolf Epic | Error inserting control:", error);
    }
    
    // Initialize event handlers with the working function after DOM is ready
    setTimeout(() => {
      this.attachTestEvents();
      this.updateNetBoostsDisplay();
      console.log("Z-Wolf Epic | Event handlers initialized using attachTestEvents");
    }, 100);
  }
  
  /**
   * Test function to verify controls are working
   */
  static testControls() {
    console.log("Z-Wolf Epic | Testing controls...");
    
    // Test getting current value
    const current = this.getNetBoosts();
    console.log("Current Net Boosts:", current);
    
    // Test setting value
    this.setNetBoosts(3);
    console.log("Set to 3, new value:", this.getNetBoosts());
    
    // Test update display
    this.updateNetBoostsDisplay();
    
    // Test if elements exist
    console.log("Elements exist:", {
      control: !!document.querySelector('.zwolf-boost-control'),
      input: !!document.getElementById('zwolf-net-boosts'),
      plusBtn: !!document.getElementById('zwolf-boost-plus'),
      minusBtn: !!document.getElementById('zwolf-boost-minus')
    });
    
    // Reset to 0
    this.setNetBoosts(0);
    console.log("Reset to 0");
  }
  
  /**
   * Simple test to attach events
   */
  static attachTestEvents() {
    console.log("Attaching test events...");
    
    // Init button first
    const initBtn = document.getElementById('zwolf-init-handlers');
    if (initBtn) {
      initBtn.onclick = function() {
        console.log("Manual init triggered");
        ZWolfDice.attachTestEvents();
      };
    }
    
    const plusBtn = document.getElementById('zwolf-boost-plus');
    if (plusBtn) {
      plusBtn.onclick = function() {
        console.log("Plus clicked!");
        const input = document.getElementById('zwolf-net-boosts');
        if (input) {
          const current = parseInt(input.value || 0);
          input.value = Math.min(10, current + 1);
          ZWolfDice.updateNetBoostsDisplay();
        }
      };
      console.log("Plus button onclick attached");
    } else {
      console.log("Plus button not found");
    }
    
    const minusBtn = document.getElementById('zwolf-boost-minus');
    if (minusBtn) {
      minusBtn.onclick = function() {
        console.log("Minus clicked!");
        const input = document.getElementById('zwolf-net-boosts');
        if (input) {
          const current = parseInt(input.value || 0);
          input.value = Math.max(-10, current - 1);
          ZWolfDice.updateNetBoostsDisplay();
        }
      };
      console.log("Minus button onclick attached");
    } else {
      console.log("Minus button not found");
    }
    
    const resetBtn = document.getElementById('zwolf-boost-reset');
    if (resetBtn) {
      resetBtn.onclick = function() {
        console.log("Reset clicked!");
        const input = document.getElementById('zwolf-net-boosts');
        if (input) {
          input.value = 0;
          ZWolfDice.updateNetBoostsDisplay();
        }
      };
      console.log("Reset button onclick attached");
    }
    
    // Quick boost buttons
    const quickButtons = document.querySelectorAll('.zwolf-quick-boost');
    quickButtons.forEach(btn => {
      btn.onclick = function() {
        const value = parseInt(btn.dataset.value);
        console.log("Quick boost clicked:", value);
        const input = document.getElementById('zwolf-net-boosts');
        if (input) {
          input.value = value;
          ZWolfDice.updateNetBoostsDisplay();
        }
      };
    });
    console.log("Quick boost buttons attached:", quickButtons.length);
    
    // Input field
    const input = document.getElementById('zwolf-net-boosts');
    if (input) {
      input.onchange = function() {
        console.log("Input changed:", this.value);
        ZWolfDice.updateNetBoostsDisplay();
      };
      input.onkeydown = function(e) {
        e.stopPropagation();
      };
      console.log("Input handlers attached");
    }

    // Quick Roll
    const quickRollBtn = document.getElementById('zwolf-quick-roll');
    if (quickRollBtn) {
      quickRollBtn.onclick = async function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("Quick roll button clicked!");
        const netBoosts = ZWolfDice.getNetBoosts();
        console.log("Rolling with net boosts:", netBoosts);
        
        try {
          await ZWolfDice.roll({
            netBoosts: netBoosts,
            modifier: 0,
            flavor: "Quick Z-Wolf Roll"
          });
          console.log("Roll completed!");
        } catch (error) {
          console.error("Error during roll:", error);
        }
      };
      console.log("Quick roll button onclick attached");
    } else {
      console.log("Quick roll button not found");
    }
  }
  
  /**
   * Initialize the boost control listeners
   * @param {number} netBoosts - Net boosts (positive) or jinxes (negative)
   * @param {number} modifier - Modifier to add to the key die
   * @param {number} targetNumber - Target number to beat
   * @param {string} flavor - Flavor text for the roll
   * @param {Actor} actor - Actor making the roll
   * @returns {Promise<Object>} The completed roll with details
   */
  static async roll({netBoosts = null, modifier = 0, targetNumber = null, flavor = "", actor = null} = {}) {
    // If netBoosts not provided, get from the UI control
    if (netBoosts === null) {
      netBoosts = this.getNetBoosts();
    }
    
    // Base dice count is 3, add absolute value of net boosts/jinxes
    const baseDice = 3;
    const diceCount = baseDice + Math.abs(netBoosts);
    
    // Create the roll formula
    const formula = `${diceCount}d12`;
    
    // Create and evaluate the roll
    const roll = new Roll(formula);
    await roll.evaluate();
    
    // Get all dice results and sort them
    const diceResults = roll.dice[0].results.map(r => r.result);
    const sortedDice = [...diceResults].sort((a, b) => a - b);
    
    // Determine the key die based on net boosts
    let keyDieIndex;
    let keyDie;
    let keyDiePosition;
    
    if (netBoosts > 0) {
      // Boosts: Key Die is second-highest
      keyDieIndex = sortedDice.length - 2;
      keyDie = sortedDice[keyDieIndex];
      keyDiePosition = "second-highest";
    } else if (netBoosts < 0) {
      // Jinxes: Key Die is second-lowest
      keyDieIndex = 1;
      keyDie = sortedDice[keyDieIndex];
      keyDiePosition = "second-lowest";
    } else {
      // No net boosts/jinxes: Key Die is median
      keyDieIndex = Math.floor(sortedDice.length / 2);
      keyDie = sortedDice[keyDieIndex];
      keyDiePosition = "median";
    }
    
    // Check for crit chances
    let critSuccessChance = false;
    let critFailureChance = false;
    
    // Check die above the Key Die for 12 (Crit Success chance)
    if (keyDieIndex < sortedDice.length - 1) {
      critSuccessChance = sortedDice[keyDieIndex + 1] === 12;
    }
    
    // Check die below the Key Die for 1 (Crit Failure chance)
    if (keyDieIndex > 0) {
      critFailureChance = sortedDice[keyDieIndex - 1] === 1;
    }
    
    // Calculate the final result
    const finalResult = keyDie + modifier;
    
    // Determine success if target number provided
    const success = targetNumber ? finalResult >= targetNumber : null;
    
    // Prepare the message data
    const messageData = {
      speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
      flavor: flavor || "Z-Wolf Epic Roll",
      roll: roll,
      content: await this._createRollContent({
        diceResults,
        sortedDice,
        keyDie,
        keyDieIndex,
        keyDiePosition,
        modifier,
        finalResult,
        targetNumber,
        success,
        formula: `${diceCount}d12 + ${modifier}`,
        netBoosts,
        critSuccessChance,
        critFailureChance
      }),
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      sound: CONFIG.sounds.dice
    };
    
    // Create the chat message
    await ChatMessage.create(messageData);
    
    // Reset net boosts to 0 after roll if auto-reset is enabled
    const systemId = game.system.id || 'zwolf-epic';
    if (game.settings.get(systemId, 'autoResetBoosts')) {
      this.setNetBoosts(0);
    }
    
    return {
      roll,
      keyDie,
      finalResult,
      success,
      diceResults,
      sortedDice,
      critSuccessChance,
      critFailureChance
    };
  }
  
  /**
   * Create the HTML content for the roll result
   * @private
   */
  static async _createRollContent({
    diceResults, 
    sortedDice, 
    keyDie, 
    keyDieIndex,
    keyDiePosition,
    modifier, 
    finalResult, 
    targetNumber, 
    success, 
    formula, 
    netBoosts,
    critSuccessChance,
    critFailureChance
  }) {
    // Create visual representation of sorted dice with key die highlighted
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
        <div class="roll-formula">${formula}</div>
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
   * @param {Actor} actor - The actor making the roll
   * @param {string} skillName - Name of the skill
   * @param {string} attributeName - Name of the attribute
   * @param {number} netBoosts - Net boosts/jinxes for this roll (optional)
   * @returns {Promise<Object>} The completed roll
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
    
    return this.roll({
      netBoosts,
      modifier,
      flavor,
      actor
    });
  }
  
  /**
   * Quick attribute roll
   * @param {Actor} actor - The actor making the roll
   * @param {string} attributeName - Name of the attribute
   * @param {number} netBoosts - Net boosts/jinxes for this roll (optional)
   * @returns {Promise<Object>} The completed roll
   */
  static async rollAttribute(actor, attributeName, netBoosts = null) {
    if (!actor) return ui.notifications.warn("No actor selected for roll");
    
    const attribute = actor.system.attributes[attributeName];
    
    if (!attribute) {
      return ui.notifications.warn("Invalid attribute");
    }
    
    const modifier = attribute.value;
    const flavor = `${attributeName.charAt(0).toUpperCase() + attributeName.slice(1)} Check`;
    
    return this.roll({
      netBoosts,
      modifier,
      flavor,
      actor
    });
  }
  
  /**
   * Get the current net boosts value from the UI
   * @returns {number} The current net boosts value
   */
  static getNetBoosts() {
    const value = parseInt($('#zwolf-net-boosts').val()) || 0;
    return value;
  }
  
  /**
   * Set the net boosts value in the UI
   * @param {number} value - The value to set
   */
  static setNetBoosts(value) {
    $('#zwolf-net-boosts').val(value);
    this.updateNetBoostsDisplay();
  }
  
  /**
   * Update the net boosts display to show current state
   */
  static updateNetBoostsDisplay() {
    const input = document.getElementById('zwolf-net-boosts');
    const label = document.querySelector('.zwolf-boost-label');
    const container = document.querySelector('.zwolf-boost-control');
    
    if (!input || !label) {
      console.log("Z-Wolf Epic | Display elements not found");
      return;
    }
    
    const value = parseInt(input.value) || 0;
    
    // Update label text
    if (value > 0) {
      label.textContent = `Boosts: ${value}`;
      if (container) {
        container.classList.remove('jinx-active');
        container.classList.add('boost-active');
      }
    } else if (value < 0) {
      label.textContent = `Jinxes: ${Math.abs(value)}`;
      if (container) {
        container.classList.remove('boost-active');
        container.classList.add('jinx-active');
      }
    } else {
      label.textContent = 'Net Boosts: 0';
      if (container) {
        container.classList.remove('boost-active', 'jinx-active');
      }
    }
    
    console.log("Z-Wolf Epic | Display updated:", label.textContent);
  }
  
  /**
   * Create the boost control UI element
   * @returns {string} HTML for the boost control
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
   * Initialize the boost control listeners
   */
  static initializeBoostControls() {
    // Use vanilla JS event listeners for better compatibility
    
    // Plus button
    document.addEventListener('click', (event) => {
      if (event.target.closest('#zwolf-boost-plus')) {
        const current = this.getNetBoosts();
        this.setNetBoosts(Math.min(10, current + 1));
      }
    });
    
    // Minus button
    document.addEventListener('click', (event) => {
      if (event.target.closest('#zwolf-boost-minus')) {
        const current = this.getNetBoosts();
        this.setNetBoosts(Math.max(-10, current - 1));
      }
    });
    
    // Reset button
    document.addEventListener('click', (event) => {
      if (event.target.closest('#zwolf-boost-reset')) {
        this.setNetBoosts(0);
      }
    });
    
    // Quick boost buttons
    document.addEventListener('click', (event) => {
      const quickButton = event.target.closest('.zwolf-quick-boost');
      if (quickButton) {
        const value = parseInt(quickButton.dataset.value);
        this.setNetBoosts(value);
      }
    });
    
    // D12 icon click for quick roll
    document.addEventListener('click', async (event) => {
      if (event.target.closest('#zwolf-quick-roll')) {
        console.log("D12 icon clicked - performing quick roll!");
        const netBoosts = this.getNetBoosts();
        await this.roll({
          netBoosts: netBoosts,
          modifier: 0,
          flavor: "Quick Z-Wolf Roll"
        });
      }
    });
    
    // Input change
    document.addEventListener('change', (event) => {
      if (event.target.id === 'zwolf-net-boosts') {
        this.updateNetBoostsDisplay();
      }
    });
  }
}

// Initialize the Z-Wolf Dice System
Hooks.once('init', () => {
  console.log("Z-Wolf Epic | Initializing Dice System");
  
  // Register game settings with the system ID (adjust if your system has a different ID)
  const systemId = game.system.id || 'zwolf-epic';
  
  game.settings.register(systemId, 'autoResetBoosts', {
    name: 'Auto-Reset Boosts',
    hint: 'Automatically reset Net Boosts to 0 after each roll',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true  // Changed from false to true
  });
  
  // Add CSS styles
  const style = document.createElement('style');
  style.textContent = `
    /* Z-Wolf Boost Control Panel */
    .zwolf-boost-control {
      background: rgba(0, 0, 0, 0.8);
      border: 1px solid #444;
      border-radius: 5px;
      padding: 10px;
      margin: 5px;
      color: #fff;
      width: calc(100% - 10px);
      box-sizing: border-box;
      position: relative;
      z-index: 100;
    }
    
    .zwolf-boost-control button {
      cursor: pointer !important;
      pointer-events: auto !important;
      position: relative;
      z-index: 101;
    }
    
    .zwolf-boost-control input {
      cursor: text !important;
      pointer-events: auto !important;
      position: relative;
      z-index: 101;
    }
    
    .zwolf-boost-control.boost-active {
      border-color: #4a90e2;
      box-shadow: 0 0 5px rgba(74, 144, 226, 0.3);
    }
    
    .zwolf-boost-control.jinx-active {
      border-color: #e24a4a;
      box-shadow: 0 0 5px rgba(226, 74, 74, 0.3);
    }
    
    .zwolf-boost-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-weight: bold;
    }
    
    .zwolf-boost-header i {
      color: #4a90e2;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 1.2em;
    }
    
    .zwolf-icon-button {
      background: none;
      border: none;
      color: #4a90e2;
      cursor: pointer !important;
      pointer-events: auto !important;
      padding: 0;
      margin: 0;
      position: relative;
      z-index: 102;
    }

    .zwolf-icon-button:hover {
      color: #6bb3ff;
      transform: rotate(15deg);
      text-shadow: 0 0 8px rgba(74, 144, 226, 0.8);
    }
    
    .zwolf-boost-inputs {
      display: flex;
      gap: 4px;
      margin-bottom: 8px;
    }
    
    .zwolf-boost-inputs button {
      flex: 0 0 30px;
      height: 28px;
      border: 1px solid #444;
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border-radius: 3px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .zwolf-boost-inputs button:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: #4a90e2;
    }
    
    #zwolf-net-boosts {
      flex: 1;
      text-align: center;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid #444;
      color: #fff;
      border-radius: 3px;
      padding: 0 5px;
    }
    
    .zwolf-boost-quick {
      display: flex;
      gap: 4px;
    }
    
    .zwolf-quick-boost {
      flex: 1;
      padding: 4px;
      border: 1px solid #444;
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.9em;
      transition: all 0.2s;
    }
    
    .zwolf-quick-boost:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    .zwolf-quick-boost[data-value^="-"] {
      border-color: #e24a4a;
      color: #ff9999;
    }
    
    .zwolf-quick-boost[data-value^="-"]:hover {
      background: rgba(226, 74, 74, 0.2);
    }
    
    .zwolf-quick-boost:not([data-value^="-"]) {
      border-color: #4a90e2;
      color: #99ccff;
    }
    
    .zwolf-quick-boost:not([data-value^="-"]):hover {
      background: rgba(74, 144, 226, 0.2);
    }
    
    /* Roll Result Styles */
    .zwolf-roll {
      padding: 10px;
      border: 1px solid #444;
      border-radius: 5px;
      margin: 5px 0;
    }
    
    .zwolf-roll .die-result {
      display: inline-block;
      min-width: 30px;
      padding: 3px 6px;
      margin: 2px;
      border: 1px solid #666;
      border-radius: 3px;
      text-align: center;
      background: rgba(255, 255, 255, 0.1);
    }
    
    .zwolf-roll .key-die {
      border-color: #4a90e2;
      background: rgba(74, 144, 226, 0.3);
      font-weight: bold;
      box-shadow: 0 0 5px rgba(74, 144, 226, 0.5);
    }
    
    .zwolf-roll .crit-trigger {
      border-color: #ffa500;
      background: rgba(255, 165, 0, 0.2);
    }
    
    .zwolf-roll .boost-jinx-info.boost {
      color: #4a90e2;
    }
    
    .zwolf-roll .boost-jinx-info.jinx {
      color: #e24a4a;
    }
    
    .zwolf-roll .crit-chances {
      margin-top: 10px;
      padding: 5px;
      text-align: center;
    }
    
    .zwolf-roll .crit-success {
      color: #00ff00;
      text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00;
      font-weight: bold;
    }
    
    .zwolf-roll .crit-failure {
      color: #ff0000;
      text-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000;
      font-weight: bold;
    }
    
    .zwolf-roll .crit-both {
      color: #ffd700;
      text-shadow: 0 0 10px #ffd700, 0 0 20px #ffd700;
      font-weight: bold;
    }
    
    .zwolf-roll.crit-success-chance {
      border-color: #00ff00;
      box-shadow: 0 0 5px rgba(0, 255, 0, 0.3);
    }
    
    .zwolf-roll.crit-failure-chance {
      border-color: #ff0000;
      box-shadow: 0 0 5px rgba(255, 0, 0, 0.3);
    }
    
    .zwolf-roll.crit-both {
      border-color: #ffd700;
      box-shadow: 0 0 5px rgba(255, 215, 0, 0.3);
    }
    
    .zwolf-roll .original-order {
      font-size: 0.9em;
      color: #999;
      margin-top: 5px;
    }
    
    .zwolf-roll .final-result {
      font-size: 1.2em;
      color: #4a90e2;
    }
    
    .zwolf-roll .roll-outcome.success {
      color: #00ff00;
      font-weight: bold;
    }
    
    .zwolf-roll .roll-outcome.failure {
      color: #ff0000;
      font-weight: bold;
    }
  `;
  document.head.appendChild(style);
});

// Add the boost control to the chat interface
Hooks.on('renderSidebarTab', (app, html, data) => {
  if (app.id !== "chat") return;
  
  console.log("Z-Wolf Epic | Chat sidebar rendered, adding boost controls");
  
  // Ensure html is a jQuery object
  const $html = html instanceof jQuery ? html : $(html);
  
  // Check if controls already exist
  if ($html.find('.zwolf-boost-control').length > 0) {
    console.log("Z-Wolf Epic | Controls already present, skipping");
    return;
  }
  
  const controlHtml = ZWolfDice.createBoostControl();
  
  // Create jQuery element from HTML string
  const $control = $(controlHtml);
  
  // Always insert after the chat form (below chat input)
  const chatForm = $html.find('#chat-form');
  if (chatForm.length > 0) {
    chatForm.after($control);
  } else {
    // Fallback if chat form not found
    $html.append($control);
  }
  
  // Initialize controls after a short delay to ensure DOM is ready
  setTimeout(() => {
    ZWolfDice.initializeBoostControls();
    ZWolfDice.updateNetBoostsDisplay();
    console.log("Z-Wolf Epic | Boost controls initialized");
  }, 100);
});

// Also hook into ready to ensure controls are added
Hooks.once('ready', () => {
  console.log("Z-Wolf Epic | System ready");
  
  // Add controls if chat tab is already visible
  const chatTab = document.querySelector('#sidebar .tab[data-tab="chat"]');
  if (chatTab && !chatTab.querySelector('.zwolf-boost-control')) {
    console.log("Z-Wolf Epic | Adding controls on ready");
    ZWolfDice.initializeUI();
  } else if (chatTab && chatTab.querySelector('.zwolf-boost-control')) {
    console.log("Z-Wolf Epic | Controls already present, initializing handlers");
    // Use attachTestEvents which we know works
    setTimeout(() => {
      ZWolfDice.attachTestEvents();
    }, 500);
  }
});
