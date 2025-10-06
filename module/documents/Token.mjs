// module/documents/Token.mjs
export default class ZWolfTokenDocument extends TokenDocument {

  /**
   * Override prepareBaseData to control detection modes
   * This is where we prevent Foundry from auto-adding basicSight and lightPerception
   */
  prepareBaseData() {
    // Sync vision from actor BEFORE calling super
    this._syncVisionFromActor();
    
    // Now call super, which will run Foundry's default preparation
    super.prepareBaseData();
  }

  /**
   * DON'T clean up in prepareDerivedData - it creates infinite loops
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    // Removed the cleanup code that was causing cascading prepare cycles
  }

  /**
   * Synchronize vision detection modes from actor
   * Based on PF1's approach - THIS IS THE KEY METHOD
   * @private
   */
  _syncVisionFromActor() {
    if (!this.actorId || !this.actor) return;
    
    // Check if custom vision rules flag is set (allows manual override)
    if (this.getFlag("zwolf-epic", "customVisionRules")) return;

    // Get vision capabilities from actor
    const nightsight = this.actor.system?.nightsight || 0;
    const darkvision = Math.max(1, this.actor.system?.darkvision || 0); // Minimum 1

    // Get base range from source data
    const baseRange = this._source.sight.range || 100;

    // Calculate max range token needs to see
    const maxRange = Math.max(baseRange, nightsight, darkvision);

    // CRITICAL: Clear the detection modes array FIRST
    // This prevents Foundry from auto-adding basicSight and lightPerception
    this.detectionModes = [];

    // Set vision mode to basic (no special visual effects)
    this.sight.visionMode = "basic";

    // Build detection modes array
    // We manually add ONLY the modes we want
    
    // 1. Bright light vision
    this.detectionModes.push({
      id: "brightVision",
      enabled: true,
      range: maxRange
    });

    // 2. Dim light vision (nightsight) - if actor has it
    if (nightsight > 0) {
      this.detectionModes.push({
        id: "lightVision",
        enabled: true,
        range: nightsight
      });
    }

    // 3. Darkvision for darkness
    this.detectionModes.push({
      id: "darkvision",
      enabled: true,
      range: darkvision
    });

    // Set overall sight range to the maximum
    this.sight.range = maxRange;

    console.log(`Z-Wolf Epic | Synced vision for ${this.name}:`, {
      nightsight,
      darkvision,
      maxRange,
      detectionModes: this.detectionModes.map(m => `${m.id}:${m.range}`)
    });
  }

  /**
   * Override token creation to apply actor size - V13 compatible
   * This runs when tokens are dropped on the canvas
   */
  static async _onCreateOperation(documents, operation, user) {
    // First let the parent method handle the basic creation
    const result = await super._onCreateOperation(documents, operation, user);
    
    // Then apply size adjustments for any new tokens
    const updates = [];
    
    for (const tokenDoc of documents) {
      const actor = tokenDoc.actor;
      if (!actor) continue;
      
      // Use effectiveSize instead of base size
      const actorSize = actor.system?.effectiveSize || actor.system?.size || "medium";
      const sizeData = CONFIG.ZWOLF?.sizes?.[actorSize];
      
      const updateData = {};
      let needsUpdate = false;
      
      if (sizeData) {
        // Check if token size needs updating
        const currentWidth = tokenDoc.width || 1;
        const currentHeight = tokenDoc.height || 1;
        const targetSize = sizeData.tokenScale;
        
        // Only update if size is different
        if (currentWidth !== targetSize || currentHeight !== targetSize) {
          updateData.width = targetSize;
          updateData.height = targetSize;
          needsUpdate = true;
          
          const baseSize = actor.system?.size || "medium";
          const sizeNote = (baseSize !== actorSize) ? ` (base: ${baseSize})` : '';
          console.log(`Z-Wolf Epic | Resizing token "${tokenDoc.name}" to ${actorSize} size${sizeNote} (${targetSize}x${targetSize})`);
        }
      }
      
      // Preserve lockRotation setting if it was set during creation
      if (tokenDoc.lockRotation === true) {
        updateData.lockRotation = true;
        needsUpdate = true;
        console.log(`Z-Wolf Epic | Preserving lockRotation for token "${tokenDoc.name}"`);
      }
      
      if (needsUpdate) {
        updates.push({
          _id: tokenDoc.id,
          ...updateData
        });
      }
    }
    
    // Apply updates if any are needed
    if (updates.length > 0) {
      await canvas.scene?.updateEmbeddedDocuments("Token", updates);
    }
    
    return result;
  }

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
    const tokenWidthInGrids = this.width || 1;
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
   * Get the token's base darkvision range (from actor system data)
   * @returns {number} The base darkvision range
   */
  get baseDarkvision() {
    // First check if token has custom darkvision override
    const tokenOverride = this.getFlag('zwolf-epic', 'darkvision-override');
    if (tokenOverride !== undefined) return tokenOverride;
    
    // Then get from actor system data
    return this.actor?.darkvision || 0;
  }

  /**
   * Get the token's effective darkvision range (base + size bonus)
   * @returns {number} The effective darkvision range including size bonus
   */
  get darkvision() {
    const baseDarkvision = this.baseDarkvision;
     
    // In gridless with 1m base units, token width directly equals diameter in meters
    // Token radius = half the width (which is the diameter)
    const tokenDiameterInMeters = this.width || 1; // Default to 1m for medium
    const radiusInSceneUnits = tokenDiameterInMeters / 2;
    
    // If no base darkvision, token can only see its own space
    if (baseDarkvision <= 0) {
        return radiusInSceneUnits; // Just the size bonus
    }
    
    // If has darkvision, add size bonus to base range
    return baseDarkvision + radiusInSceneUnits;
  }

  /**
   * Set the token's darkvision override (independent of actor)
   * @param {number} value - The darkvision override value, or null to use actor value
   */
  async setDarkvisionOverride(value) {
    if (value === null || value === undefined) {
      return this.unsetFlag('zwolf-epic', 'darkvision-override');
    }
    return this.setFlag('zwolf-epic', 'darkvision-override', value);
  }

  /**
   * Sync vision values from actor to token flags
   * Called when token is created or when actor data changes
   */
  async syncVisionFromActor() {
    if (!this.actor) return;

    const actorNightsight = this.actor.nightsight;
    const actorDarkvision = this.actor.darkvision;
    const hasNightsightOverride = this.getFlag('zwolf-epic', 'nightsight-override') !== undefined;
    const hasDarkvisionOverride = this.getFlag('zwolf-epic', 'darkvision-override') !== undefined;
    
    const updates = {};
    
    // Only sync if token doesn't have custom overrides
    if (!hasNightsightOverride) {
      updates['flags.zwolf-epic.nightsight'] = actorNightsight;
    }
    
    if (!hasDarkvisionOverride) {
      updates['flags.zwolf-epic.darkvision'] = actorDarkvision;
    }
    
    if (Object.keys(updates).length > 0) {
      await this.update(updates);
    }
  }

  /** @override */
  async _onCreate(data, options, userId) {
    await super._onCreate(data, options, userId);
    
    // Sync vision from actor when token is first created
    if (game.user.id === userId) {
      await this.syncVisionFromActor();
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
      darkvision: this.darkvision, // This is the effective darkvision (base + size bonus)
      baseDarkvision: this.baseDarkvision // This is just the inherited/base value
    };
  }
}

// Hook to sync vision when actor data changes
Hooks.on('updateActor', (actor, data, options, userId) => {
  // Check if nightsight or darkvision was updated
  if (data.system?.nightsight !== undefined || data.system?.darkvision !== undefined) {
    // Update all tokens for this actor that don't have custom overrides
    actor.getActiveTokens().forEach(async token => {
      await token.document.syncVisionFromActor();
      // Token will automatically re-prepare when updated, no need to force it
    });
    
    // Update visibility after vision changes
    setTimeout(() => {
      ZWolfHybridVision._updateAllTokenVisibility();
    }, 50);
  }
});