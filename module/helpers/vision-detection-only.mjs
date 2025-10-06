/**
 * Z-Wolf Epic Vision System - Detection Mode Only
 * 
 * Uses Foundry's detection modes to control map visibility.
 * Uses manual token visibility control for token-to-token detection.
 * No personal lights - cleaner and avoids visibility leaks.
 */

export class ZWolfVisionSystem {
  
  static initialize() {
    // Update token visibility when tokens move
    Hooks.on("refreshToken", (token, flags) => {
      if (flags.refreshPosition) {
        setTimeout(() => {
          ZWolfVisionSystem._updateAllTokenVisibility();
        }, 50);
      }
    });
    
    // Update visibility when tokens are controlled
    Hooks.on("controlToken", (token, controlled) => {
      ZWolfVisionSystem._updateAllTokenVisibility();
    });
    
    // Update when actor vision values change
    Hooks.on("updateActor", (actor, changes, options, userId) => {
      if (changes.system?.nightsight !== undefined || changes.system?.darkvision !== undefined) {
        // Vision sync happens automatically in Token.prepareBaseData
        // Just update visibility
        setTimeout(() => {
          ZWolfVisionSystem._updateAllTokenVisibility();
        }, 50);
      }
    });
    
    console.log("Z-Wolf Epic | Detection-based vision system initialized");
  }
  
  /**
   * Update visibility of all tokens based on controlled tokens' vision
   * @private
   */
static _updateAllTokenVisibility() {
    if (!canvas.ready) return;
    
    const controlled = canvas.tokens.controlled;
    
    // If no tokens controlled, show all tokens (GM omniscient view)
    if (controlled.length === 0) {
        for (const token of canvas.tokens.placeables) {
        token.renderable = true;
        }
        console.log("Z-Wolf Vision | No tokens controlled - showing all tokens");
        return;
    }
    
    console.log(`Z-Wolf Vision | Updating visibility for ${controlled.length} controlled token(s)`);
    
    // For each token in the scene
    for (const token of canvas.tokens.placeables) {
        // Check if any controlled token can see this token
        let visible = false;
        
        for (const viewer of controlled) {
        if (ZWolfVisionSystem._canSeeToken(viewer, token)) {
            visible = true;
            break;
        }
        }
        
        // Set visibility (but don't hide the controlled tokens themselves)
        if (!token.controlled) {
        token.renderable = visible;
        }
    }
    }
  
  /**
   * Check if viewer token can see target token
   * @param {Token} viewer - The viewing token
   * @param {Token} target - The target token
   * @returns {boolean}
   * @private
  */
  static _canSeeToken(viewer, target) {
    if (!viewer.actor || !target) return false;
    
    // Always see yourself
    if (viewer === target) return true;
    
    // Get viewer's vision capabilities - use getter methods
    const nightsight = viewer.actor.nightsight || 0;
    const darkvision = Math.max(1, viewer.actor.darkvision || 0);
    
    // Calculate distance in pixels
    const dx = target.center.x - viewer.center.x;
    const dy = target.center.y - viewer.center.y;
    const distancePixels = Math.sqrt(dx * dx + dy * dy);
    
    // Convert to scene distance units using scene's configured scale
    const distance = distancePixels / canvas.dimensions.distancePixels;
    
    // Sample lighting at target's position
    const lightLevel = ZWolfVisionSystem._sampleLightingAt(target.center);
    
    let visible = false;
    let reason = "";
    
    // Apply Z-Wolf vision rules
    if (lightLevel >= 0.5) {
        // Bright light - visible at any distance (within reason)
        visible = distance <= 1000;
        reason = "bright light";
    } else if (lightLevel > 0) {
        // Dim light - visible within nightsight range
        visible = distance <= nightsight;
        reason = `dim light (need nightsight=${nightsight})`;
    } else {
        // Darkness - visible within darkvision range
        visible = distance <= darkvision;
        reason = `darkness (need darkvision=${darkvision})`;
    }
    
    // Debug logging
    console.log(`Vision: ${viewer.name} -> ${target.name}`, {
        distance: distance.toFixed(2) + "m",
        lightLevel,
        nightsight,
        darkvision,
        visible,
        reason
    });
    
    return visible;
    }
  
  /**
   * Sample lighting level at a point
   * Only considers actual scene light sources (not personal lights)
   * @param {Point} point
   * @returns {number} 0 = dark, 0.25 = dim, 1 = bright
   * @private
   */
static _sampleLightingAt(point) {
  let maxLight = 0;
  
  console.log(`Sampling light at (${point.x.toFixed(0)}, ${point.y.toFixed(0)})`);
  
  for (const source of canvas.effects.lightSources) {
    if (!source.active) continue;
    
    const dx = point.x - source.x;
    const dy = point.y - source.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // V13 uses different property paths
    const brightRadius = source.data?.bright || source.document?.config?.bright || 0;
    const dimRadius = source.data?.dim || source.document?.config?.dim || 0;
    
    // Log every light source we check
    console.log(`  Light source:`, {
      distance: distance.toFixed(2),
      brightRadius,
      dimRadius,
      sourceData: source.data,
      documentConfig: source.document?.config,
      inBright: brightRadius > 0 && distance <= brightRadius,
      inDim: dimRadius > 0 && distance <= dimRadius
    });
    
    // Check bright radius - only if it actually has a bright radius
    if (brightRadius > 0 && distance <= brightRadius) {
      console.log(`    -> BRIGHT LIGHT detected`);
      return 1; // Bright light
    }
    
    // Check dim radius
    if (dimRadius > 0 && distance <= dimRadius) {
      console.log(`    -> Dim light detected`);
      maxLight = Math.max(maxLight, 0.25);
    }
  }
  
  console.log(`  Final light level: ${maxLight}`);
  return maxLight;
}
  
  /**
   * Apply vision system to all tokens in scene
   */
  static async applyToAllTokens() {
    if (!canvas.scene) return;
    
    console.log("Z-Wolf Epic | Applying detection-based vision to all tokens...");
    
    ZWolfVisionSystem._updateAllTokenVisibility();
    
    console.log("Z-Wolf Epic | Vision system applied");
    ui.notifications.info("Z-Wolf vision system applied");
  }
  
  /**
   * Remove vision system from all tokens
   */
  static async removeFromAllTokens() {
    if (!canvas.scene) return;
    
    console.log("Z-Wolf Epic | Removing vision system...");
    
    // Reset all token visibility
    for (const token of canvas.tokens.placeables) {
      token.renderable = true;
    }
    
    console.log("Z-Wolf Epic | Vision system removed");
  }
}