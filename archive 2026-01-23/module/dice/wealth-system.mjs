/**
 * Z-Wolf Epic Wealth System
 * 
 * Handles wealth-based equipment purchases using d12 rolls.
 * Mechanics: Roll d12s equal to Wealth score, each 8+ is a success.
 * Cost = max(0, item price - successes)
 * 
 * Also handles gaining wealth from treasure/sales.
 * Gain = max(0, value inflow - successes)
 */

export class ZWolfWealth {
  
  /**
   * Attempt to purchase an item with wealth
   * @param {Actor} actor - The actor attempting the purchase
   * @param {Item} item - The equipment item to purchase
   * @returns {Promise<boolean>} True if purchase was completed, false if cancelled
   */
  static async attemptPurchase(actor, item) {
    if (!actor || !item) {
      ui.notifications.error("Invalid actor or item for purchase.");
      return false;
    }
    
    // Validate item type
    if (!['equipment', 'commodity'].includes(item.type)) {
      ui.notifications.warn("Only equipment and commodity items can be purchased.");
      return false;
    }
    
    const wealth = actor.system.wealth || 0;
    const price = item.system.price || 0;
    
    // If price is 0, just give it to them
    if (price === 0) {
      ui.notifications.info(`${item.name} is free!`);
      return await this._completePurchase(actor, item, 0);
    }
    
    // Roll wealth dice
    const rollResult = await this._rollWealth(wealth, price, actor, item);
    
    // Calculate wealth loss
    const wealthLoss = Math.max(0, price - rollResult.successes);
    
    // Check if purchase would result in negative wealth
    if (wealth - wealthLoss < 0) {
      await this._createFailureChatMessage(actor, item, wealth, price, rollResult.successes, wealthLoss);
      ui.notifications.warn(`Insufficient wealth to purchase ${item.name}.`);
      return false;
    }
    
    // Show confirmation dialog
    const confirmed = await this._showPurchaseDialog(actor, item, rollResult, wealthLoss);
    
    if (confirmed) {
      return await this._completePurchase(actor, item, wealthLoss);
    }
    
    return false;
  }
  
  /**
   * Attempt to gain wealth from treasure/sales
   * @param {Actor} actor - The actor gaining wealth
   * @returns {Promise<boolean>} True if wealth gain was completed, false if cancelled
   */
  static async attemptGainWealth(actor) {
    if (!actor) {
      ui.notifications.error("No actor specified for wealth gain.");
      return false;
    }
    
    // Show dialog to get the value inflow
    const valueInflow = await this._showValueInflowDialog();
    
    if (valueInflow === null || valueInflow === undefined) {
      return false; // User cancelled
    }
    
    const wealth = actor.system.wealth || 0;
    
    // If value is 0, nothing happens
    if (valueInflow === 0) {
      ui.notifications.info("No wealth to gain.");
      return false;
    }
    
    // Roll wealth dice
    const rollResult = await this._rollWealthGain(wealth, valueInflow, actor);
    
    // Calculate wealth gain
    const wealthGain = Math.max(0, valueInflow - rollResult.successes);
    
    // Show confirmation dialog
    const confirmed = await this._showGainWealthDialog(actor, rollResult, wealthGain, valueInflow);
    
    if (confirmed) {
      return await this._completeWealthGain(actor, wealthGain);
    }
    
    return false;
  }
  
  /**
   * Attempt to lose wealth from gifts/donations/bribes
   * @param {Actor} actor - The actor losing wealth
   * @returns {Promise<boolean>} True if wealth loss was completed, false if cancelled
   */
  static async attemptLoseWealth(actor) {
    if (!actor) {
      ui.notifications.error("No actor specified for wealth loss.");
      return false;
    }
    
    // Show dialog to get the value outflow
    const valueOutflow = await this._showValueOutflowDialog();
    
    if (valueOutflow === null || valueOutflow === undefined) {
      return false; // User cancelled
    }
    
    const wealth = actor.system.wealth || 0;
    
    // If value is 0, nothing happens
    if (valueOutflow === 0) {
      ui.notifications.info("No wealth to lose.");
      return false;
    }
    
    // Roll wealth dice (same as purchasing)
    const rollResult = await this._rollWealthLoss(wealth, valueOutflow, actor);
    
    // Calculate wealth loss
    const wealthLoss = Math.max(0, valueOutflow - rollResult.successes);
    
    // Check if loss would result in negative wealth
    if (wealth - wealthLoss < 0) {
      await this._createLossFailureChatMessage(actor, wealth, valueOutflow, rollResult.successes, wealthLoss);
      ui.notifications.warn(`Insufficient wealth for this expenditure.`);
      return false;
    }
    
    // Show confirmation dialog
    const confirmed = await this._showLoseWealthDialog(actor, rollResult, wealthLoss, valueOutflow);
    
    if (confirmed) {
      return await this._completeWealthLoss(actor, wealthLoss);
    }
    
    return false;
  }
  
  /**
   * Roll wealth dice to attempt purchase
   * @param {number} wealth - Actor's wealth score
   * @param {number} price - Item price
   * @param {Actor} actor - The actor
   * @param {Item} item - The item
   * @returns {Promise<Object>} Roll result with successes and details
   * @private
   */
  static async _rollWealth(wealth, price, actor, item) {
    const diceCount = Math.max(0, wealth);
    
    if (diceCount === 0) {
      // No wealth, automatic failure
      await this._createWealthChatMessage({
        actor,
        item,
        wealth,
        price,
        diceCount: 0,
        results: [],
        successes: 0,
        wealthLoss: price
      });
      
      return { successes: 0, results: [], roll: null };
    }
    
    // Roll the dice
    const roll = new Roll(`${diceCount}d12`);
    await roll.evaluate();
    
    const results = roll.dice[0].results.map(r => r.result);
    const successes = results.filter(r => r >= 8).length;
    const wealthLoss = Math.max(0, price - successes);
    
    // Create chat message showing the roll
    await this._createWealthChatMessage({
      actor,
      item,
      wealth,
      price,
      diceCount,
      results,
      successes,
      wealthLoss,
      roll
    });
    
    return { successes, results, roll };
  }
  
  /**
   * Roll wealth dice for gaining wealth
   * @param {number} wealth - Actor's wealth score
   * @param {number} valueInflow - Value of the treasure/sale
   * @param {Actor} actor - The actor
   * @returns {Promise<Object>} Roll result with successes and details
   * @private
   */
  static async _rollWealthGain(wealth, valueInflow, actor) {
    const diceCount = Math.max(0, wealth);
    
    if (diceCount === 0) {
      // No wealth, full gain
      await this._createWealthGainChatMessage({
        actor,
        wealth,
        valueInflow,
        diceCount: 0,
        results: [],
        successes: 0,
        wealthGain: valueInflow
      });
      
      return { successes: 0, results: [], roll: null };
    }
    
    // Roll the dice
    const roll = new Roll(`${diceCount}d12`);
    await roll.evaluate();
    
    const results = roll.dice[0].results.map(r => r.result);
    const successes = results.filter(r => r >= 8).length;
    const wealthGain = Math.max(0, valueInflow - successes);
    
    // Create chat message showing the roll
    await this._createWealthGainChatMessage({
      actor,
      wealth,
      valueInflow,
      diceCount,
      results,
      successes,
      wealthGain,
      roll
    });
    
    return { successes, results, roll };
  }
  
  /**
   * Roll wealth dice for losing wealth (gift/donation/bribe)
   * @param {number} wealth - Actor's wealth score
   * @param {number} valueOutflow - Value of the gift/donation/bribe
   * @param {Actor} actor - The actor
   * @returns {Promise<Object>} Roll result with successes and details
   * @private
   */
  static async _rollWealthLoss(wealth, valueOutflow, actor) {
    const diceCount = Math.max(0, wealth);
    
    if (diceCount === 0) {
      // No wealth, full loss
      await this._createWealthLossChatMessage({
        actor,
        wealth,
        valueOutflow,
        diceCount: 0,
        results: [],
        successes: 0,
        wealthLoss: valueOutflow
      });
      
      return { successes: 0, results: [], roll: null };
    }
    
    // Roll the dice
    const roll = new Roll(`${diceCount}d12`);
    await roll.evaluate();
    
    const results = roll.dice[0].results.map(r => r.result);
    const successes = results.filter(r => r >= 8).length;
    const wealthLoss = Math.max(0, valueOutflow - successes);
    
    // Create chat message showing the roll
    await this._createWealthLossChatMessage({
      actor,
      wealth,
      valueOutflow,
      diceCount,
      results,
      successes,
      wealthLoss,
      roll
    });
    
    return { successes, results, roll };
  }
  
  /**
   * Create a chat message for the wealth roll
   * @param {Object} data - Roll data
   * @private
   */
  static async _createWealthChatMessage(data) {
    const { actor, item, wealth, price, diceCount, results, successes, wealthLoss, roll } = data;
    
    // Create tooltip with full dice results
    const resultsTooltip = results.map(r => {
      const isSuccess = r >= 8;
      return `${r}${isSuccess ? ' ✓' : ''}`;
    }).join(', ');
    
    let content = `
      <div class="zwolf-wealth-roll">
        <div class="wealth-header">
          <strong>${actor.name}</strong> attempts to shop for <strong>${item.name}</strong>
        </div>
        <div class="wealth-details">
          <div class="wealth-stat">
            <span class="label">Wealth Score:</span>
            <span class="value">${wealth}</span>
          </div>
          <div class="wealth-stat">
            <span class="label">Item Price:</span>
            <span class="value">${price}</span>
          </div>
        </div>
    `;
    
    if (diceCount > 0) {
      content += `
        <div class="wealth-roll-results" title="${resultsTooltip}">
          <div class="dice-rolled">
            <strong>Rolled ${diceCount}d12:</strong> ${successes} Success${successes !== 1 ? 'es' : ''} (8+)
          </div>
        </div>
      `;
    } else {
      content += `
        <div class="wealth-roll-results">
          <div class="no-wealth">
            <em>No wealth to spend!</em>
          </div>
        </div>
      `;
    }
    
    content += `
        <div class="wealth-cost">
          <strong>Wealth Loss if Purchased:</strong> 
          <span class="cost-value">${wealthLoss}</span>
        </div>
      </div>
    `;
    
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      sound: CONFIG.sounds.dice
    };
    
    if (roll) {
      messageData.rolls = [roll];
    }
    
    await ChatMessage.create(messageData);
  }
  
  /**
   * Create a chat message for wealth gain roll
   * @param {Object} data - Roll data
   * @private
   */
  static async _createWealthGainChatMessage(data) {
    const { actor, wealth, valueInflow, diceCount, results, successes, wealthGain, roll } = data;
    
    // Create tooltip with full dice results
    const resultsTooltip = results.length > 0 ? results.map(r => {
      const isSuccess = r >= 8;
      return `${r}${isSuccess ? ' ✓' : ''}`;
    }).join(', ') : 'No dice rolled';
    
    let content = `
      <div class="zwolf-wealth-roll gain">
        <div class="wealth-header">
          <strong>${actor.name}</strong> attempts to gain wealth
        </div>
        <div class="wealth-details">
          <div class="wealth-stat">
            <span class="label">Wealth Score:</span>
            <span class="value">${wealth}</span>
          </div>
          <div class="wealth-stat">
            <span class="label">Value Inflow:</span>
            <span class="value">${valueInflow}</span>
          </div>
        </div>
    `;
    
    if (diceCount > 0) {
      content += `
        <div class="wealth-roll-results" title="${resultsTooltip}">
          <div class="dice-rolled">
            <strong>Rolled ${diceCount}d12:</strong> ${successes} Success${successes !== 1 ? 'es' : ''} (8+)
          </div>
        </div>
      `;
    } else {
      content += `
        <div class="wealth-roll-results" title="${resultsTooltip}">
          <div class="no-wealth">
            <em>No existing wealth - full gain!</em>
          </div>
        </div>
      `;
    }
    
    content += `
        <div class="wealth-gain-amount">
          <strong>Potential Wealth Gain:</strong> 
          <span class="gain-value">+${wealthGain}</span>
        </div>
      </div>
    `;
    
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      sound: CONFIG.sounds.dice
    };
    
    if (roll) {
      messageData.rolls = [roll];
    }
    
    await ChatMessage.create(messageData);
  }
  
  /**
   * Create a chat message for wealth loss roll
   * @param {Object} data - Roll data
   * @private
   */
  static async _createWealthLossChatMessage(data) {
    const { actor, wealth, valueOutflow, diceCount, results, successes, wealthLoss, roll } = data;
    
    // Create tooltip with full dice results
    const resultsTooltip = results.length > 0 ? results.map(r => {
      const isSuccess = r >= 8;
      return `${r}${isSuccess ? ' ✓' : ''}`;
    }).join(', ') : 'No dice rolled';
    
    let content = `
      <div class="zwolf-wealth-roll loss">
        <div class="wealth-header">
          <strong>${actor.name}</strong> attempts to give away wealth
        </div>
        <div class="wealth-details">
          <div class="wealth-stat">
            <span class="label">Wealth Score:</span>
            <span class="value">${wealth}</span>
          </div>
          <div class="wealth-stat">
            <span class="label">Value Outflow:</span>
            <span class="value">${valueOutflow}</span>
          </div>
        </div>
    `;
    
    if (diceCount > 0) {
      content += `
        <div class="wealth-roll-results" title="${resultsTooltip}">
          <div class="dice-rolled">
            <strong>Rolled ${diceCount}d12:</strong> ${successes} Success${successes !== 1 ? 'es' : ''} (8+)
          </div>
        </div>
      `;
    } else {
      content += `
        <div class="wealth-roll-results" title="${resultsTooltip}">
          <div class="no-wealth">
            <em>No existing wealth - full loss!</em>
          </div>
        </div>
      `;
    }
    
    content += `
        <div class="wealth-cost">
          <strong>Wealth Loss if Completed:</strong> 
          <span class="cost-value">${wealthLoss}</span>
        </div>
      </div>
    `;
    
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      sound: CONFIG.sounds.dice
    };
    
    if (roll) {
      messageData.rolls = [roll];
    }
    
    await ChatMessage.create(messageData);
  }
  
  /**
   * Create a chat message for failed wealth loss (insufficient wealth)
   * @param {Actor} actor - The actor
   * @param {number} wealth - Current wealth
   * @param {number} valueOutflow - Value outflow
   * @param {number} successes - Number of successes rolled
   * @param {number} wealthLoss - Calculated wealth loss
   * @private
   */
  static async _createLossFailureChatMessage(actor, wealth, valueOutflow, successes, wealthLoss) {
    const content = `
      <div class="zwolf-wealth-roll failed">
        <div class="wealth-header">
          <strong>${actor.name}</strong> cannot afford this expenditure
        </div>
        <div class="wealth-details">
          <div class="wealth-stat">
            <span class="label">Current Wealth:</span>
            <span class="value">${wealth}</span>
          </div>
          <div class="wealth-stat">
            <span class="label">Value Outflow:</span>
            <span class="value">${valueOutflow}</span>
          </div>
        </div>
        <div class="wealth-roll-results">
          <div class="dice-rolled">
            <strong>Successes:</strong> ${successes} (need ${valueOutflow - wealth} more)
          </div>
        </div>
        <div class="wealth-failure">
          <i class="fas fa-times-circle"></i>
          <strong>Transaction Failed:</strong> Would require ${wealthLoss} wealth (only have ${wealth})
        </div>
      </div>
    `;
    
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content
    });
  }
  
  /**
   * Create a chat message for failed purchase (insufficient wealth)
   * @param {Actor} actor - The actor
   * @param {Item} item - The item
   * @param {number} wealth - Current wealth
   * @param {number} price - Item price
   * @param {number} successes - Number of successes rolled
   * @param {number} wealthLoss - Calculated wealth loss
   * @private
   */
  static async _createFailureChatMessage(actor, item, wealth, price, successes, wealthLoss) {
    const content = `
      <div class="zwolf-wealth-roll failed">
        <div class="wealth-header">
          <strong>${actor.name}</strong> cannot afford <strong>${item.name}</strong>
        </div>
        <div class="wealth-details">
          <div class="wealth-stat">
            <span class="label">Current Wealth:</span>
            <span class="value">${wealth}</span>
          </div>
          <div class="wealth-stat">
            <span class="label">Item Price:</span>
            <span class="value">${price}</span>
          </div>
        </div>
        <div class="wealth-roll-results">
          <div class="dice-rolled">
            <strong>Successes:</strong> ${successes} (need ${price - wealth} more)
          </div>
        </div>
        <div class="wealth-failure">
          <i class="fas fa-times-circle"></i>
          <strong>Purchase Failed:</strong> Would require ${wealthLoss} wealth (only have ${wealth})
        </div>
      </div>
    `;
    
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content
    });
  }
  
  /**
   * Show purchase confirmation dialog
   * @param {Actor} actor - The actor
   * @param {Item} item - The item
   * @param {Object} rollResult - Roll result data
   * @param {number} wealthLoss - Amount of wealth that will be lost
   * @returns {Promise<boolean>} True if confirmed
   * @private
   */
  static async _showPurchaseDialog(actor, item, rollResult, wealthLoss) {
    const currentWealth = actor.system.wealth || 0;
    const newWealth = currentWealth - wealthLoss;
    
    let content = `
      <div class="zwolf-purchase-dialog">
        <p>Complete the purchase of <strong>${item.name}</strong>?</p>
        <div class="purchase-summary">
          <div class="summary-row">
            <span class="label">Current Wealth:</span>
            <span class="value">${currentWealth}</span>
          </div>
          <div class="summary-row">
            <span class="label">Wealth Loss:</span>
            <span class="value loss">-${wealthLoss}</span>
          </div>
          <div class="summary-row total">
            <span class="label">New Wealth:</span>
            <span class="value">${newWealth}</span>
          </div>
        </div>
      </div>
    `;
    
    return await Dialog.confirm({
      title: `Purchase ${item.name}?`,
      content,
      yes: () => true,
      no: () => false,
      defaultYes: true
    });
  }
  
  /**
   * Show dialog to input value inflow amount
   * @returns {Promise<number|null>} The value inflow amount, or null if cancelled
   * @private
   */
  static async _showValueInflowDialog() {
    return new Promise((resolve) => {
      const dialog = new Dialog({
        title: "Gain Wealth",
        content: `
          <form>
            <div class="form-group">
              <label for="value-inflow">Value of treasure, gift, or sale:</label>
              <input type="number" id="value-inflow" name="value-inflow" min="0" value="0" autofocus />
            </div>
          </form>
        `,
        buttons: {
          ok: {
            icon: '<i class="fas fa-coins"></i>',
            label: "Roll for Gain",
            callback: (html) => {
              const value = parseInt(html.find('#value-inflow').val()) || 0;
              resolve(value);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "ok",
        close: () => resolve(null)
      });
      dialog.render(true);
    });
  }
  
  /**
   * Show dialog to input value outflow amount
   * @returns {Promise<number|null>} The value outflow amount, or null if cancelled
   * @private
   */
  static async _showValueOutflowDialog() {
    return new Promise((resolve) => {
      const dialog = new Dialog({
        title: "Lose Wealth",
        content: `
          <form>
            <div class="form-group">
              <label for="value-outflow">Value of gift, donation, or bribe:</label>
              <input type="number" id="value-outflow" name="value-outflow" min="0" value="0" autofocus />
            </div>
          </form>
        `,
        buttons: {
          ok: {
            icon: '<i class="fas fa-hand-holding-usd"></i>',
            label: "Roll for Loss",
            callback: (html) => {
              const value = parseInt(html.find('#value-outflow').val()) || 0;
              resolve(value);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "ok",
        close: () => resolve(null)
      });
      dialog.render(true);
    });
  }
  
  /**
   * Show confirmation dialog for wealth gain
   * @param {Actor} actor - The actor
   * @param {Object} rollResult - Roll result data
   * @param {number} wealthGain - Amount of wealth to gain
   * @param {number} valueInflow - Original value inflow
   * @returns {Promise<boolean>} True if confirmed
   * @private
   */
  static async _showGainWealthDialog(actor, rollResult, wealthGain, valueInflow) {
    const currentWealth = actor.system.wealth || 0;
    const newWealth = currentWealth + wealthGain;
    
    let content = `
      <div class="zwolf-purchase-dialog">
        <p>Confirm wealth gain?</p>
        <div class="purchase-summary">
          <div class="summary-row">
            <span class="label">Current Wealth:</span>
            <span class="value">${currentWealth}</span>
          </div>
          <div class="summary-row">
            <span class="label">Wealth Gain:</span>
            <span class="value gain">+${wealthGain}</span>
          </div>
          <div class="summary-row total">
            <span class="label">New Wealth:</span>
            <span class="value">${newWealth}</span>
          </div>
        </div>
      </div>
    `;
    
    return await Dialog.confirm({
      title: "Gain Wealth?",
      content,
      yes: () => true,
      no: () => false,
      defaultYes: true
    });
  }
  
  /**
   * Show confirmation dialog for wealth loss
   * @param {Actor} actor - The actor
   * @param {Object} rollResult - Roll result data
   * @param {number} wealthLoss - Amount of wealth to lose
   * @param {number} valueOutflow - Original value outflow
   * @returns {Promise<boolean>} True if confirmed
   * @private
   */
  static async _showLoseWealthDialog(actor, rollResult, wealthLoss, valueOutflow) {
    const currentWealth = actor.system.wealth || 0;
    const newWealth = currentWealth - wealthLoss;
    
    let content = `
      <div class="zwolf-purchase-dialog">
        <p>Confirm wealth expenditure?</p>
        <div class="purchase-summary">
          <div class="summary-row">
            <span class="label">Current Wealth:</span>
            <span class="value">${currentWealth}</span>
          </div>
          <div class="summary-row">
            <span class="label">Wealth Loss:</span>
            <span class="value loss">-${wealthLoss}</span>
          </div>
          <div class="summary-row total">
            <span class="label">New Wealth:</span>
            <span class="value">${newWealth}</span>
          </div>
        </div>
      </div>
    `;
    
    return await Dialog.confirm({
      title: "Lose Wealth?",
      content,
      yes: () => true,
      no: () => false,
      defaultYes: true
    });
  }
  
  /**
   * Complete the purchase by adding item and deducting wealth
   * @param {Actor} actor - The actor
   * @param {Item} item - The item to add
   * @param {number} wealthLoss - Amount of wealth to deduct
   * @returns {Promise<boolean>} True if successful
   * @private
   */
  static async _completePurchase(actor, item, wealthLoss) {
    try {
      // Create the item on the actor
      let actorItem;
      if (item.actor?.id !== actor.id) {
        const itemData = item.toObject();
        const createdItems = await actor.createEmbeddedDocuments("Item", [itemData]);
        actorItem = createdItems[0];
      } else {
        actorItem = item;
      }
      
      // Deduct wealth
      const currentWealth = actor.system.wealth || 0;
      const newWealth = currentWealth - wealthLoss;
      await actor.update({ "system.wealth": newWealth });
      
      // Create success message in chat
      const content = `
        <div class="zwolf-purchase-complete">
          <div class="purchase-success">
            <i class="fas fa-check-circle"></i>
            <strong>${actor.name}</strong> purchased <strong>${item.name}</strong>!
          </div>
          <div class="wealth-change">
            Wealth: ${currentWealth} → ${newWealth} (-${wealthLoss})
          </div>
        </div>
      `;
      
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content
      });
      
      ui.notifications.info(`${item.name} has been added to your inventory.`);
      
      return true;
      
    } catch (error) {
      console.error("Z-Wolf Epic | Error completing purchase:", error);
      ui.notifications.error("Failed to complete purchase.");
      return false;
    }
  }
  
  /**
   * Complete the wealth gain
   * @param {Actor} actor - The actor
   * @param {number} wealthGain - Amount of wealth to add
   * @returns {Promise<boolean>} True if successful
   * @private
   */
  static async _completeWealthGain(actor, wealthGain) {
    try {
      // Add wealth
      const currentWealth = actor.system.wealth || 0;
      const newWealth = currentWealth + wealthGain;
      await actor.update({ "system.wealth": newWealth });
      
      // Create success message in chat
      const content = `
        <div class="zwolf-wealth-gain-complete">
          <div class="gain-success">
            <i class="fas fa-coins"></i>
            <strong>${actor.name}</strong> gained wealth!
          </div>
          <div class="wealth-change">
            Wealth: ${currentWealth} → ${newWealth} (+${wealthGain})
          </div>
        </div>
      `;
      
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content
      });
      
      ui.notifications.info(`Gained ${wealthGain} wealth!`);
      
      return true;
      
    } catch (error) {
      console.error("Z-Wolf Epic | Error completing wealth gain:", error);
      ui.notifications.error("Failed to gain wealth.");
      return false;
    }
  }
  
  /**
   * Complete the wealth loss
   * @param {Actor} actor - The actor
   * @param {number} wealthLoss - Amount of wealth to deduct
   * @returns {Promise<boolean>} True if successful
   * @private
   */
  static async _completeWealthLoss(actor, wealthLoss) {
    try {
      // Deduct wealth
      const currentWealth = actor.system.wealth || 0;
      const newWealth = currentWealth - wealthLoss;
      await actor.update({ "system.wealth": newWealth });
      
      // Create success message in chat
      const content = `
        <div class="zwolf-wealth-loss-complete">
          <div class="loss-success">
            <i class="fas fa-hand-holding-usd"></i>
            <strong>${actor.name}</strong> gave away wealth!
          </div>
          <div class="wealth-change">
            Wealth: ${currentWealth} → ${newWealth} (-${wealthLoss})
          </div>
        </div>
      `;
      
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content
      });
      
      ui.notifications.info(`Lost ${wealthLoss} wealth.`);
      
      return true;
      
    } catch (error) {
      console.error("Z-Wolf Epic | Error completing wealth loss:", error);
      ui.notifications.error("Failed to lose wealth.");
      return false;
    }
  }
}
