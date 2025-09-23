// module/documents/Token.mjs

export default class ZWolfToken extends Token {

  /**
   * Get the token's base nightsight range (inherited from actor)
   * @returns {number} The base nightsight range
   */
  get baseNightsight() {
    // First check if token has custom nightsight override
    const tokenOverride = this.getFlag('zwolf-epic', 'nightsight-override');
    if (tokenOverride !== undefined) return tokenOverride;
    
    // Then check inherited from prototype token (which syncs from actor)
    const prototypeNightsight = this.getFlag('zwolf-epic', 'nightsight');
    if (prototypeNightsight !== undefined) return prototypeNightsight;
    
    // Finally fall back to actor's current value
    return this.actor?.nightsight || 0;
  }

  /**
   * Get the token's effective nightsight range (base + size bonus)
   * @returns {number} The effective nightsight range including size bonus
   */
  get nightsight() {
    const baseNightsight = this.baseNightsight;
    if (baseNightsight <= 0) return 0;
    
    // Calculate size bonus from token's physical radius
    const tokenWidthInGrids = this.document.width || 1;
    const tokenRadius = tokenWidthInGrids / 2;
    const gridSize = canvas.grid.size || 100;
    const sceneDistance = canvas.grid.distance || 5;
    const radiusInSceneUnits = (tokenRadius / gridSize) * sceneDistance;
    
    return baseNightsight + radiusInSceneUnits;
  }

  /**
   * Set the token's nightsight override (independent of actor)
   * @param {number} value - The nightsight override value, or null to use actor value
   */
  async setNightsightOverride(value) {
    if (value === null || value === undefined) {
      return this.unsetFlag('zwolf-epic', 'nightsight-override');
    }
    return this.setFlag('zwolf-epic', 'nightsight-override', value);
  }

    /**
     * Get the token's base darkvision range (without size bonus)
     * @returns {number} The base darkvision range
     */
    get baseDarkvision() {
    return this.document.sight?.range || 0;
    }

    /**
     * Get the token's effective darkvision range (base + size bonus)
     * @returns {number} The effective darkvision range including size bonus
     */
    get darkvision() {
    const baseDarkvision = this.baseDarkvision;
     
    // In gridless with 1m base units, token width directly equals diameter in meters
    // Token radius = half the width (which is the diameter)
    const tokenDiameterInMeters = this.document.width || 1; // Default to 1m for medium
    const radiusInSceneUnits = tokenDiameterInMeters / 2;
    
    // If no base darkvision, token can only see its own space
    if (baseDarkvision <= 0) {
        return radiusInSceneUnits; // Just the size bonus
    }
    
    // If has darkvision, add size bonus to base range
    return baseDarkvision + radiusInSceneUnits;
    }

  /**
   * Sync nightsight from actor to token
   * Called when token is created or when actor data changes
   */
  async syncNightsightFromActor() {
    if (!this.actor) return;

    const actorNightsight = this.actor.nightsight;
    const hasOverride = this.getFlag('zwolf-epic', 'nightsight-override') !== undefined;
    
    // Only sync if token doesn't have a custom override
    if (!hasOverride) {
      await this.setFlag('zwolf-epic', 'nightsight', actorNightsight);
    }
  }

  /** @override */
  async _onCreate(data, options, userId) {
    await super._onCreate(data, options, userId);
    
    // Sync nightsight from actor when token is first created
    if (game.user.id === userId) {
      await this.syncNightsightFromActor();
    }
  }

  /** @override */
  prepareData() {
    super.prepareData();

    // Ensure bright vision is always infinite for Z-Wolf Epic
    if (this.document.sight?.bright !== Infinity) {
      this.document.sight.bright = Infinity;
    }
  }

  /**
   * Get all vision ranges for this token
   * @returns {Object} Object containing all vision ranges
   */
  get visionRanges() {
    return {
      bright: Infinity,
      nightsight: this.nightsight, // This is the effective nightsight (base + size bonus)
      baseNightsight: this.baseNightsight, // This is just the inherited/base value
      darkvision: this.darkvision
    };
  }
}

// Hook to sync nightsight when actor data changes
Hooks.on('updateActor', (actor, data, options, userId) => {
  // Check if nightsight was updated
  if (data.system?.nightsight !== undefined) {
    // Update all tokens for this actor that don't have custom overrides
    actor.getActiveTokens().forEach(async token => {
      const hasOverride = token.getFlag('zwolf-epic', 'nightsight-override') !== undefined;
      if (!hasOverride) {
        await token.setFlag('zwolf-epic', 'nightsight', data.system.nightsight);
      }
    });
  }
});
