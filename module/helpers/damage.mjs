/**
 * Z-Wolf Epic Damage System
 * Handles damage types, resistances, and damage application
 */

export class ZWolfDamage {
  
  /**
   * Apply damage to an actor, considering resistances
   * @param {Actor} actor - The actor taking damage
   * @param {number} amount - Base damage amount
   * @param {string} damageType - Type of damage being dealt
   * @param {Object} options - Additional options
   * @returns {Object} Applied damage details
   */
  static async applyDamage(actor, amount, damageType = "physical", options = {}) {
    if (!actor || amount <= 0) return { applied: 0, resisted: 0 };
    
    // Get the actor's resistance level for this damage type
    const resistance = actor.system.resistances?.[damageType] || 0;
    
    // Calculate modified damage based on resistance
    let modifiedDamage = amount;
    let resistanceText = "";
    
    switch(resistance) {
      case -2: // Vulnerable 2x
        modifiedDamage = amount * 2;
        resistanceText = "Vulnerable (2x damage)";
        break;
      case -1: // Vulnerable
        modifiedDamage = Math.floor(amount * 1.5);
        resistanceText = "Vulnerable (+50% damage)";
        break;
      case 0: // Normal
        modifiedDamage = amount;
        break;
      case 1: // Resistant
        modifiedDamage = Math.floor(amount * 0.5);
        resistanceText = "Resistant (-50% damage)";
        break;
      case 2: // Very Resistant
        modifiedDamage = Math.floor(amount * 0.25);
        resistanceText = "Very Resistant (-75% damage)";
        break;
      case 3: // Immune
        modifiedDamage = 0;
        resistanceText = "Immune (no damage)";
        break;
    }
    
    // Apply the damage
    const currentHp = actor.system.vitality.value;
    const newHp = Math.max(0, currentHp - modifiedDamage);
    
    await actor.update({
      "system.vitality.value": newHp
    });
    
    // Create a chat message about the damage
    if (!options.silent) {
      await this._createDamageMessage(actor, amount, modifiedDamage, damageType, resistanceText);
    }
    
    // Check for conditions based on vitality
    await this._checkVitalityConditions(actor, newHp);
    
    return {
      applied: modifiedDamage,
      resisted: amount - modifiedDamage,
      resistance: resistanceText,
      damageType: damageType
    };
  }
  
  /**
   * Create a damage roll with type
   * @param {string} formula - Dice formula for damage
   * @param {string} damageType - Type of damage
   * @param {Actor} actor - Actor dealing the damage
   * @param {Object} rollData - Data for the roll
   * @returns {Roll} The damage roll
   */
  static async rollDamage(formula, damageType = "physical", actor = null, rollData = {}) {
    const roll = new Roll(formula, rollData);
    await roll.evaluate();
    
    // Get damage type configuration
    const typeConfig = CONFIG.ZWOLF.damageTypes[damageType];
    const typeLabel = game.i18n.localize(typeConfig?.label || "Physical");
    const typeColor = typeConfig?.color || "#808080";
    
    // Create the chat message
    const messageData = {
      speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
      flavor: `<div class="damage-type" style="color: ${typeColor}; font-weight: bold;">
                ${typeLabel} Damage
              </div>`,
      roll: roll,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      flags: {
        "zwolf-epic": {
          damageType: damageType,
          isDamage: true
        }
      }
    };
    
    await ChatMessage.create(messageData);
    
    return roll;
  }
  
  /**
   * Create a chat message about damage taken
   * @private
   */
  static async _createDamageMessage(actor, baseDamage, appliedDamage, damageType, resistanceText) {
    const typeConfig = CONFIG.ZWOLF.damageTypes[damageType];
    const typeLabel = game.i18n.localize(typeConfig?.label || "Physical");
    const typeColor = typeConfig?.color || "#808080";
    
    let content = `
      <div class="zwolf-damage-applied">
        <h3>${actor.name} Takes Damage!</h3>
        <div class="damage-details">
          <div class="damage-type" style="color: ${typeColor};">
            <strong>${typeLabel} Damage:</strong> ${baseDamage}
          </div>
    `;
    
    if (resistanceText) {
      content += `
        <div class="resistance-info">
          <em>${resistanceText}</em>
        </div>
      `;
    }
    
    content += `
          <div class="damage-final">
            <strong>Damage Taken:</strong> ${appliedDamage}
          </div>
          <div class="vitality-remaining">
            <strong>Vitality Remaining:</strong> ${actor.system.vitality.value}/${actor.system.vitality.max}
          </div>
        </div>
      </div>
    `;
    
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: content
    });
  }
  
  /**
   * Check and apply vitality-based conditions
   * @private
   */
  static async _checkVitalityConditions(actor, newHp) {
    const maxHp = actor.system.vitality.max;
    const percentHp = (newHp / maxHp) * 100;
    
    const updates = {};
    
    // Clear previous vitality conditions
    updates["system.conditions.bruised"] = false;
    updates["system.conditions.wounded"] = false;
    updates["system.conditions.dying"] = false;
    updates["system.conditions.dropped"] = false;
    updates["system.conditions.dead"] = false;
    
    // Apply appropriate condition based on vitality
    if (newHp <= 0) {
      updates["system.conditions.dead"] = true;
    } else if (newHp === 1) {
      updates["system.conditions.dying"] = true;
    } else if (percentHp <= 10) {
      updates["system.conditions.dropped"] = true;
    } else if (percentHp <= 25) {
      updates["system.conditions.wounded"] = true;
    } else if (percentHp <= 50) {
      updates["system.conditions.bruised"] = true;
    }
    
    // Only update if conditions changed
    const hasChanges = Object.entries(updates).some(([key, value]) => {
      const currentValue = foundry.utils.getProperty(actor, key);
      return currentValue !== value;
    });
    
    if (hasChanges) {
      await actor.update(updates);
      
      // Create status effects for visual indication
      await this._updateStatusEffects(actor, updates);
    }
  }
  
  /**
   * Update status effects on tokens
   * @private
   */
  static async _updateStatusEffects(actor, conditions) {
    const tokens = actor.getActiveTokens();
    
    for (const token of tokens) {
      // Remove all condition effects first
      const existingEffects = token.document.effects.filter(e => 
        Object.keys(CONFIG.ZWOLF.conditions).includes(e)
      );
      
      for (const effect of existingEffects) {
        await token.toggleEffect(effect, { active: false });
      }
      
      // Add active condition effects
      for (const [condition, active] of Object.entries(conditions)) {
        if (active) {
          const conditionKey = condition.split('.').pop();
          const conditionConfig = CONFIG.ZWOLF.conditions[conditionKey];
          if (conditionConfig?.icon) {
            await token.toggleEffect(conditionConfig.icon, { active: true });
          }
        }
      }
    }
  }
  
  /**
   * Add damage application to chat messages
   */
  static addChatListeners(html) {
    html.on('click', '.damage-apply', this._onApplyDamage.bind(this));
  }
  
  /**
   * Handle clicking apply damage from chat
   * @private
   */
  static async _onApplyDamage(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const messageId = button.closest('.message').dataset.messageId;
    const message = game.messages.get(messageId);
    
    if (!message?.rolls?.length) return;
    
    const roll = message.rolls[0];
    const damageType = message.flags?.["zwolf-epic"]?.damageType || "physical";
    
    // Get selected tokens
    const targets = game.user.targets;
    if (targets.size === 0) {
      ui.notifications.warn("Please select a target token to apply damage.");
      return;
    }
    
    // Apply damage to all targets
    for (const token of targets) {
      await this.applyDamage(token.actor, roll.total, damageType);
    }
  }
}
