// /helpers/rest-handler.mjs - Rest functionality handling

export class RestHandler {
  
  constructor(actor) {
    this.actor = actor;
  }

  /**
   * Perform a Short Rest - subtracts 1 SP, restores VP to max, grants Suffused condition
   */
  async performShortRest() {
    const currentSP = this.actor.system.staminaPoints.value || 0;
    
    // Check if character has stamina to spend
    if (currentSP <= 0) {
      ui.notifications.warn("You don't have any Stamina Points to spend on a Short Rest.");
      return;
    }
    
    // Confirm the rest
    const confirmed = await Dialog.confirm({
      title: "Short Rest",
      content: `<p>Take a Short Rest?</p>
                <ul>
                  <li>Spend 1 Stamina Point (${currentSP} → ${currentSP - 1})</li>
                  <li>Restore Vitality Points to maximum</li>
                  <li>Gain Suffused condition</li>
                </ul>`,
      yes: () => true,
      no: () => false,
      defaultYes: true
    });
    
    if (!confirmed) return;
    
    try {
      // Calculate new values
      const newSP = currentSP - 1;
      const maxVP = this._getMaxVitality();
      
      // Update actor
      await this.actor.update({
        'system.staminaPoints.value': newSP,
        'system.vitalityPoints.value': maxVP
      });
      
      // Add Suffused condition
      await this._addCondition('suffused');
      
      ui.notifications.info("Short Rest completed. Vitality restored and Suffused condition applied.");
      
    } catch (error) {
      console.error("Z-Wolf Epic | Error during Short Rest:", error);
      ui.notifications.error("Failed to complete Short Rest.");
    }
  }

  /**
   * Perform an Extended Rest - restores SP & VP to max, grants Suffused, removes Bruised, reminds about Fortitude roll
   */
  async performExtendedRest() {
    // Confirm the rest
    const confirmed = await Dialog.confirm({
      title: "Extended Rest",
      content: `<p>Take an Extended Rest?</p>
                <ul>
                  <li>Restore Stamina Points to maximum</li>
                  <li>Restore Vitality Points to maximum</li>
                  <li>Gain Suffused condition</li>
                  <li>Remove Bruised condition (if present)</li>
                  <li>Reminder: Roll Fortitude to recover from Dying or Wounded</li>
                </ul>`,
      yes: () => true,
      no: () => false,
      defaultYes: true
    });
    
    if (!confirmed) return;
    
    try {
      // Calculate new values
      const maxSP = this.actor.system.staminaPoints.max || 0;
      const maxVP = this._getMaxVitality();
      
      // Update actor
      await this.actor.update({
        'system.staminaPoints.value': maxSP,
        'system.vitalityPoints.value': maxVP
      });
      
      // Add Suffused condition
      await this._addCondition('suffused');
      
      // Remove Bruised condition
      await this._removeCondition('bruised');
      
      // Show reminder about Fortitude roll for Dying/Wounded
      const hasDying = this.actor.effects.find(e => e.flags?.core?.statusId === 'dying');
      const hasWounded = this.actor.effects.find(e => e.flags?.core?.statusId === 'wounded');
      
      if (hasDying || hasWounded) {
        ui.notifications.info("Extended Rest completed. Remember to roll Fortitude to recover from Dying or Wounded conditions.");
      } else {
        ui.notifications.info("Extended Rest completed. All resources restored and Suffused condition applied.");
      }
      
    } catch (error) {
      console.error("Z-Wolf Epic | Error during Extended Rest:", error);
      ui.notifications.error("Failed to complete Extended Rest.");
    }
  }

  // =================================
  // PRIVATE HELPER METHODS
  // =================================

  /**
   * Get the actor's maximum vitality points
   * This uses the same calculation logic as the sheet
   */
  _getMaxVitality() {
    // Get fundament item if assigned
    const fundamentId = this.actor.system.fundamentId;
    const fundament = fundamentId ? this.actor.items.get(fundamentId) : null;
    
    const defaultVitality = 10;
    
    if (!fundament || !fundament.system) {
      return defaultVitality;
    }

    const level = this.actor.system.level || 0;
    const vitalityBoostCount = this.actor.system.vitalityBoostCount || 0;

    const functionData = {
      level: level,
      vitalityBoostCount: vitalityBoostCount,
      attributes: this.actor.system.attributes || {},
      skills: this.actor.system.skills || {}
    };

    // Calculate vitality if function exists
    if (fundament.system.vitalityFunction && fundament.system.vitalityFunction.trim()) {
      try {
        const vitalityResult = this._evaluateFunction(fundament.system.vitalityFunction, functionData);
        if (typeof vitalityResult === 'number' && !isNaN(vitalityResult) && vitalityResult > 0) {
          return Math.floor(vitalityResult);
        }
      } catch (error) {
        console.error(`Z-Wolf Epic | Error calculating vitality from fundament function:`, error);
      }
    }

    return defaultVitality;
  }

  /**
   * Safely evaluate a function string with provided data
   */
  _evaluateFunction(functionString, data) {
    const { level, attributes, skills, vitalityBoostCount } = data;
    
    const functionWrapper = `
      (function() {
        ${functionString}
      })();
    `;
    
    return eval(functionWrapper);
  }

  /**
   * Add a condition effect to the actor
   */
  async _addCondition(conditionId) {
    // Check if condition already exists
    const existingEffect = this.actor.effects.find(e => e.flags?.core?.statusId === conditionId);
    if (existingEffect) {
      console.log(`Z-Wolf Epic | ${conditionId} condition already exists`);
      return;
    }
    
    // Import config to get condition data
    const { ZWOLF } = await import("../helpers/config.mjs");
    const conditionData = ZWOLF.conditions[conditionId];
    
    if (!conditionData) {
      console.error(`Z-Wolf Epic | Unknown condition: ${conditionId}`);
      return;
    }
    
    // Create the effect
    const effectData = {
      name: conditionData.label,
      icon: conditionData.icon,
      flags: {
        core: {
          statusId: conditionId
        }
      },
      statuses: [conditionId]
    };
    
    await this.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
    console.log(`Z-Wolf Epic | Added ${conditionId} condition`);
  }

  /**
   * Remove a condition effect from the actor
   */
  async _removeCondition(conditionId) {
    const effect = this.actor.effects.find(e => e.flags?.core?.statusId === conditionId);
    if (effect) {
      await effect.delete();
      console.log(`Z-Wolf Epic | Removed ${conditionId} condition`);
    }
  }
}
