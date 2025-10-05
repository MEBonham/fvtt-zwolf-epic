/**
 * Z-Wolf Epic Vision System - Detection Mode Approach (Revised)
 * 
 * Uses Foundry's detection mode system properly:
 * - Basic sight for bright light (unlimited effective range)
 * - Custom "lightvision" detection mode for dim light (nightsight range)
 * - Built-in "darkvision" detection mode for darkness (darkvision range, min 1m)
 */

export class ZWolfVision {
  
  /**
   * Initialize the vision system hooks
   */
  static initialize() {
    // Register custom detection mode for dim light vision
    Hooks.once("setup", () => {
      ZWolfVision._registerDetectionModes();
    });
    
    // Hook into actor updates to sync vision changes
    Hooks.on("updateActor", (actor, changes, options, userId) => {
      ZWolfVision._onUpdateActor(actor, changes, options, userId);
    });
    
    // Hook into token creation to immediately apply Z-Wolf vision
    Hooks.on("createToken", (document, options, userId) => {
      if (document.object) {
        setTimeout(() => {
          ZWolfVision._refreshTokenVision(document.object).catch(error => {
            console.error("Z-Wolf Epic | Error applying vision to new token:", error);
          });
        }, 100);
      }
    });
    
    console.log("Z-Wolf Epic: Vision system initialized (detection mode approach)");
  }

  /**
   * Register custom detection modes
   * @private
   */
  static _registerDetectionModes() {
    // Create custom DetectionMode class for bright light
    class BrightVisionMode extends DetectionMode {
      /** @override */
      _canDetect(visionSource, target) {
        const point = target?.center || target;
        if (!point) return false;
        
        const lightLevel = canvas.effects.illumination?.getVisibility(point) ?? 0;
        console.log("BrightVision _canDetect - light level:", lightLevel);
        
        // Only detect in bright light (>= 0.5)
        return lightLevel >= 0.5;
      }
    }
    
    CONFIG.Canvas.detectionModes.brightVision = new BrightVisionMode({
      id: "brightVision",
      label: "Bright Light Vision",
      type: DetectionMode.DETECTION_TYPES.SIGHT,
      walls: true,
      angle: true
    });
    
    // Custom detection mode for seeing in dim light (nightsight)
    class LightVisionMode extends DetectionMode {
      /** @override */
      _canDetect(visionSource, target) {
        const point = target?.center || target;
        if (!point) return false;
        
        const lightLevel = canvas.effects.illumination?.getVisibility(point) ?? 0;
        console.log("LightVision _canDetect - light level:", lightLevel);
        
        // Only detect in dim light (> 0 but < 0.5)
        return lightLevel > 0 && lightLevel < 0.5;
      }
    }
    
    CONFIG.Canvas.detectionModes.lightVision = new LightVisionMode({
      id: "lightVision",
      label: "Light Vision (Dim Light)",
      type: DetectionMode.DETECTION_TYPES.SIGHT,
      walls: true,
      angle: true
    });
    
    console.log("Z-Wolf Epic: Registered brightVision and lightVision detection modes");
  }

  /**
   * Handle actor update events that affect vision
   * @param {Actor} actor - The actor document
   * @param {Object} changes - The changes that were applied
   * @param {Object} options - Update options
   * @param {string} userId - The user who made the change
   * @private
   */
  static _onUpdateActor(actor, changes, options, userId) {
    // Check if nightsight or darkvision changed
    if (changes.system?.nightsight !== undefined || changes.system?.darkvision !== undefined) {
      // Update all tokens for this actor
      actor.getActiveTokens().forEach(token => {
        ZWolfVision._refreshTokenVision(token).catch(error => {
          console.error("Z-Wolf Epic | Error updating actor token vision:", error);
        });
      });
    }
  }

  /**
   * Refresh vision for a specific token based on its actor's values
   * @param {Token} token - The token to refresh vision for
   * @private
   */
  static async _refreshTokenVision(token) {
    if (!token?.document?.actor) return;
    await ZWolfVision._applyVisionToToken(token);
  }

  /**
   * Apply vision configuration to a token based on actor's current values
   * @param {Token} token - The token to apply vision to
   * @private
   */
  static async _applyVisionToToken(token) {
    const actor = token.document.actor;
    const nightsight = actor.system?.nightsight || 0;
    const darkvision = Math.max(1, actor.system?.darkvision || 0); // Minimum 1
    
    // Set sight.range to the maximum capability
    // This is the hard limit - detection modes work within this
    const maxRange = Math.max(100, nightsight, darkvision);
    
    const updates = {
      'sight.enabled': true,
      'sight.range': maxRange,
      'sight.visionMode': "basic"
    };
    
    // Build detection modes array
    const detectionModes = [];
    
    // Add bright light vision (unlimited within sight.range)
    detectionModes.push({
      id: "brightVision",
      enabled: true,
      range: maxRange // Use the max range for bright light
    });
    
    // Add lightvision for dim light if nightsight > 0
    if (nightsight > 0) {
      detectionModes.push({
        id: "lightVision",
        enabled: true,
        range: nightsight
      });
    }
    
    // Add darkvision for darkness (everyone has at least 1m)
    detectionModes.push({
      id: "darkvision",
      enabled: true,
      range: darkvision
    });
    
    // Store capabilities as flags for reference
    await token.document.setFlag('zwolf-epic', 'nightsight', nightsight);
    await token.document.setFlag('zwolf-epic', 'darkvision', darkvision);

    // Apply updates - set detectionModes AFTER other updates to override defaults
    try {
      await token.document.update(updates);
      
      // Force override detection modes again after main update
      // This attempts to prevent Foundry from adding default modes
      await token.document.update({ 'detectionModes': detectionModes });
      console.log(`Z-Wolf Epic | Applied vision to ${token.name}:`, {
        nightsight,
        darkvision,
        maxRange,
        detectionModes: detectionModes.map(m => `${m.id}:${m.range}`)
      });
    } catch (error) {
      console.error(`Z-Wolf Epic | Failed to apply vision config to ${token.name}:`, error);
    }
  }

  /**
   * Utility method to get vision information for display in character sheets
   * @param {Actor} actor - The actor to get vision info for
   * @returns {Object} Object containing vision information for display
   */
  static getVisionDisplayInfo(actor) {
    const nightsight = actor.system?.nightsight || 0;
    const darkvision = Math.max(1, actor.system?.darkvision || 0);
    
    let capabilities = [];
    
    capabilities.push("Bright light (unlimited)");
    
    if (nightsight > 0) {
      capabilities.push(`Dim light within ${nightsight}m`);
    } else {
      capabilities.push("No enhanced dim light vision");
    }
    
    capabilities.push(`Darkness within ${darkvision}m`);
    
    return {
      nightsightRadius: nightsight,
      darkvisionRadius: darkvision,
      nightsightDisplay: nightsight > 0 ? `${nightsight}m` : "None",
      darkvisionDisplay: `${darkvision}m`,
      capabilities: capabilities.join(", "),
      summary: `Can see: ${capabilities.join(", ")}`
    };
  }

  /**
   * Debug function to check what detection modes are active for a token
   * @param {Token} token - Token to check
   * @returns {Object} Debug information
   */
  static debugTokenVision(token) {
    if (!token?.actor) return { error: "No token or actor" };
    
    const nightsight = token.actor.system?.nightsight || 0;
    const darkvision = Math.max(1, token.actor.system?.darkvision || 0);
    
    return {
      actorNightsight: nightsight,
      actorDarkvision: darkvision,
      sightConfig: {
        enabled: token.document.sight.enabled,
        range: token.document.sight.range,
        visionMode: token.document.sight.visionMode
      },
      detectionModes: token.document.detectionModes,
      explanation: `Should see bright light unlimited, dim light to ${nightsight}m, darkness to ${darkvision}m`
    };
  }

  /**
   * Apply Z-Wolf vision to all tokens in the scene
   */
  static async applyVisionToAllTokens() {
    if (!canvas.scene) {
      console.warn("Z-Wolf Epic | No active scene");
      return;
    }
    
    const tokens = canvas.tokens.placeables;
    console.log(`Z-Wolf Epic | Applying vision to ${tokens.length} tokens...`);
    
    for (const token of tokens) {
      if (token.actor) {
        await ZWolfVision._applyVisionToToken(token);
      }
    }
    
    console.log("Z-Wolf Epic | Vision applied to all tokens");
  }

  /**
   * Remove Z-Wolf vision from all tokens (restore to defaults)
   */
  static async removeVisionFromAllTokens() {
    if (!canvas.scene) {
      console.warn("Z-Wolf Epic | No active scene");
      return;
    }
    
    const tokens = canvas.tokens.placeables;
    console.log(`Z-Wolf Epic | Removing Z-Wolf vision from ${tokens.length} tokens...`);
    
    for (const token of tokens) {
      const updates = {
        'sight.enabled': true,
        'sight.range': 0,
        'sight.visionMode': "basic",
        'detectionModes': [],
        'flags.zwolf-epic.-=nightsight': null,
        'flags.zwolf-epic.-=darkvision': null
      };
      
      await token.document.update(updates);
    }
    
    console.log("Z-Wolf Epic | Z-Wolf vision removed from all tokens");
  }
}