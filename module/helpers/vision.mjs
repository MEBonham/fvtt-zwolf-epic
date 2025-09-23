/**
 * Z-Wolf Epic Custom Vision System
 * Handles vision mode application only - side effects managed by Actor
 */

export class ZWolfVision {
  
  /**
   * Initialize the vision system hooks
   */
  static initialize() {
    // Hook into token updates to refresh vision when needed
    Hooks.on("updateToken", (document, changes, options, userId) => {
      ZWolfVision._onUpdateToken(document, changes, options, userId);
    });
    
    // Hook into token refresh to apply vision rules
    Hooks.on("refreshToken", (token) => {
      ZWolfVision._onRefreshToken(token);
    });
    
    // Register custom vision modes
    this._registerVisionModes();
    
    console.log("Z-Wolf Epic: Vision system initialized");
  }

  /**
   * Handle token update events
   * @param {TokenDocument} document - The token document
   * @param {Object} changes - The changes that were applied
   * @param {Object} options - Update options
   * @param {string} userId - The user who made the change
   * @private
   */
  static _onUpdateToken(document, changes, options, userId) {
    // Handle vision-related token updates
    if (changes.sight || changes.detectionModes) {
      console.log("Z-Wolf Epic: Vision-related token update", document.name);
      // Refresh vision if needed
      if (document.object) {
        ZWolfVision._refreshTokenVision(document.object);
      }
    }
  }

  /**
   * Handle token refresh events
   * @param {Token} token - The token being refreshed
   * @private
   */
  static _onRefreshToken(token) {
    // Apply Z-Wolf vision rules when token refreshes
    ZWolfVision._refreshTokenVision(token);
  }

  /**
   * Refresh vision for a specific token based on its actor's values
   * @param {Token} token - The token to refresh vision for
   * @private
   */
  static _refreshTokenVision(token) {
    if (!token?.document?.actor) return;
    
    // Apply vision based on what the actor has
    ZWolfVision._applyVisionToToken(token);
  }

  /**
   * Apply vision configuration to a token based on actor's current values
   * Darkvision takes precedence for sight.range, nightsight is handled via flag
   * @param {Token} token - The token to apply vision to
   * @private
   */
  static _applyVisionToToken(token) {
    const actor = token.document.actor;
    const darkvision = actor.prototypeToken?.sight?.range || 0;
    const nightsight = actor.system?.nightsight || 0;
    
    const updates = {};
    
    // Always ensure bright sight is infinite
    updates['sight.bright'] = Infinity;
    
    // Set darkvision range (Foundry's native dim vision)
    updates['sight.range'] = darkvision;
    
    // Determine vision mode based on capabilities
    if (darkvision > 0) {
      // Has darkvision - use basic mode with native dim vision
      updates['sight.visionMode'] = 'basic';
      console.log(`Z-Wolf Epic | Applied darkvision (${darkvision}m) to ${token.name}`);
    } else if (nightsight > 0) {
      // Has nightsight only - use custom nightsight mode
      updates['sight.visionMode'] = 'nightsight';
      console.log(`Z-Wolf Epic | Applied nightsight-only to ${token.name}`);
    } else {
      // Normal vision only
      updates['sight.visionMode'] = 'basic';
    }
    
    // Always sync nightsight flag (used by token getter for size bonus calculation)
    if (nightsight > 0) {
      token.setFlag('zwolf-epic', 'nightsight', nightsight);
    } else {
      token.unsetFlag('zwolf-epic', 'nightsight');
    }

    // Apply updates if there are any
    if (Object.keys(updates).length > 0) {
      token.document.update(updates);
    }
  }

  /**
   * Register custom vision modes with Foundry
   * @private
   */
  static _registerVisionModes() {
    // Only register if V13's vision mode system is available
    if (!CONFIG.Canvas?.visionModes) return;
    
    // Register custom nightsight mode (for nightsight-only characters)
    CONFIG.Canvas.visionModes.nightsight = {
      id: "nightsight",
      label: "Z-Wolf: Nightsight",
      tokenConfig: true,
      // Remove the shader property entirely or use a v13 compatible one
      vision: {
        darkness: { adaptive: true },
        defaults: { range: 0, saturation: -0.3 }
      }
    };
  }

  /**
   * Utility method to get vision information for display in character sheets
   * @param {Actor} actor - The actor to get vision info for
   * @returns {Object} Object containing vision information for display
   */
  static getVisionDisplayInfo(actor) {
    const nightsight = actor.system?.nightsight || 0;
    const darkvision = actor.prototypeToken?.sight?.range || 0;
    
    // Determine what vision capabilities they have
    let visionType = "normal";
    let capabilities = [];
    
    if (nightsight > 0) {
      capabilities.push(`Nightsight ${nightsight}m`);
    }
    if (darkvision > 0) {
      capabilities.push(`Darkvision ${darkvision}m`);
      visionType = "darkvision";
    } else if (nightsight > 0) {
      visionType = "nightsight";
    }
    
    return {
      nightsightRadius: nightsight,
      darkvisionRadius: darkvision,
      nightsightDisplay: nightsight > 0 ? `${nightsight}m` : "None",
      darkvisionDisplay: darkvision > 0 ? `${darkvision}m` : "Self only",
      visionType: visionType,
      capabilities: capabilities.join(", ") || "Normal vision only"
    };
  }
}
