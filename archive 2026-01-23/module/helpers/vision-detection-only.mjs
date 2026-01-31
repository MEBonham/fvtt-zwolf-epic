/**
 * Z-Wolf Epic Vision System - Detection Mode Only
 * 
 * Uses Foundry's detection modes to control map visibility.
 * Uses manual token visibility control for token-to-token detection.
 * No personal lights - cleaner and avoids visibility leaks.
 */

export class ZWolfVisionSystem {
  
  static initialize() {
    Hooks.on("refreshToken", handleTokenRefresh);
    Hooks.on("controlToken", handleTokenControl);
    Hooks.on("updateActor", handleActorUpdate);
    
    console.log("Z-Wolf Epic | Detection-based vision system initialized");
  }
  
  /**
   * Apply vision system to all tokens in scene
   */
  static async applyToAllTokens() {
    if (!canvas.scene) return;
    
    console.log("Z-Wolf Epic | Applying detection-based vision to all tokens");
    updateAllTokenVisibility();
    ui.notifications.info("Z-Wolf vision system applied");
  }
  
  /**
   * Remove vision system from all tokens
   */
  static async removeFromAllTokens() {
    if (!canvas.scene) return;
    
    console.log("Z-Wolf Epic | Removing vision system");
    
    for (const token of canvas.tokens.placeables) {
      token.renderable = true;
    }
    
    console.log("Z-Wolf Epic | Vision system removed");
  }
}

// ========================================
// HOOK HANDLERS
// ========================================

/**
 * Handle token refresh (movement, etc.)
 * @param {Token} token - The refreshed token
 * @param {object} flags - Refresh flags
 */
function handleTokenRefresh(token, flags) {
  if (flags.refreshPosition) {
    setTimeout(() => updateAllTokenVisibility(), 50);
  }
}

/**
 * Handle token control changes
 * @param {Token} token - The controlled/released token
 * @param {boolean} controlled - Whether token is now controlled
 */
function handleTokenControl(token, controlled) {
  updateAllTokenVisibility();
}

/**
 * Handle actor updates (vision changes)
 * @param {Actor} actor - The updated actor
 * @param {object} changes - The changes made
 * @param {object} options - Update options
 * @param {string} userId - ID of user making change
 */
function handleActorUpdate(actor, changes, options, userId) {
  const visionChanged = changes.system?.nightsight !== undefined || 
                       changes.system?.darkvision !== undefined;
  
  if (visionChanged) {
    setTimeout(() => updateAllTokenVisibility(), 50);
  }
}

// ========================================
// VISIBILITY SYSTEM
// ========================================

/**
 * Update visibility of all tokens based on controlled tokens' vision
 */
function updateAllTokenVisibility() {
  if (!canvas.ready) return;
  
  const controlled = canvas.tokens.controlled;
  
  // No tokens controlled - show all (GM omniscient view)
  if (controlled.length === 0) {
    for (const token of canvas.tokens.placeables) {
      token.renderable = true;
    }
    console.log("Z-Wolf Vision | No controlled tokens - showing all");
    return;
  }
  
  console.log(`Z-Wolf Vision | Updating visibility for ${controlled.length} controlled token(s)`);
  
  // Check visibility for each token
  for (const token of canvas.tokens.placeables) {
    if (token.controlled) continue; // Always show controlled tokens
    
    let visible = false;
    for (const viewer of controlled) {
      if (canSeeToken(viewer, token)) {
        visible = true;
        break;
      }
    }
    
    token.renderable = visible;
  }
}

/**
 * Check if viewer token can see target token
 * @param {Token} viewer - The viewing token
 * @param {Token} target - The target token
 * @returns {boolean}
 */
function canSeeToken(viewer, target) {
  if (!viewer.actor || !target) return false;
  if (viewer === target) return true;
  
  // Get viewer's vision capabilities from actor system data
  const nightsight = viewer.actor.system.nightsight || 0;
  const darkvision = viewer.actor.system.darkvision || 0;
  
  // Calculate distance in scene units
  const distance = calculateDistance(viewer, target);
  
  // Sample lighting at target's position
  const lightLevel = sampleLightingAt(target.center);
  
  // Apply Z-Wolf vision rules
  const { visible, reason } = evaluateVisibility(distance, lightLevel, nightsight, darkvision);
  
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
 * Calculate distance between two tokens in scene units
 * @param {Token} token1 - First token
 * @param {Token} token2 - Second token
 * @returns {number} Distance in scene units (meters)
 */
function calculateDistance(token1, token2) {
  const dx = token2.center.x - token1.center.x;
  const dy = token2.center.y - token1.center.y;
  const distancePixels = Math.sqrt(dx * dx + dy * dy);
  
  return distancePixels / canvas.dimensions.distancePixels;
}

/**
 * Evaluate visibility based on distance, light level, and vision stats
 * @param {number} distance - Distance in scene units
 * @param {number} lightLevel - Light level (0-1)
 * @param {number} nightsight - Nightsight range
 * @param {number} darkvision - Darkvision range
 * @returns {{visible: boolean, reason: string}}
 */
function evaluateVisibility(distance, lightLevel, nightsight, darkvision) {
  if (lightLevel >= 0.5) {
    // Bright light - visible at any reasonable distance
    return {
      visible: distance <= 1000,
      reason: "bright light"
    };
  } else if (lightLevel > 0) {
    // Dim light - requires nightsight
    return {
      visible: distance <= nightsight,
      reason: `dim light (nightsight=${nightsight})`
    };
  } else {
    // Darkness - requires darkvision
    return {
      visible: distance <= darkvision,
      reason: `darkness (darkvision=${darkvision})`
    };
  }
}

/**
 * Sample lighting level at a point
 * @param {Point} point - The point to sample
 * @returns {number} Light level: 0 = dark, 0.25 = dim, 1 = bright
 */
function sampleLightingAt(point) {
  console.log(`Sampling light at (${point.x.toFixed(0)}, ${point.y.toFixed(0)})`);
  
  // Check for global illumination first
  const hasGlobalLight = canvas.effects.lightSources.some(
    source => source.constructor.name === "GlobalLightSource" && source.active
  );
  
  if (hasGlobalLight) {
    console.log(`  -> GLOBAL ILLUMINATION (bright)`);
    return 1;
  }
  
  // Check point light sources
  let maxLight = 0;
  
  for (const source of canvas.effects.lightSources.values()) {
    // Skip global light (already checked) and inactive sources
    if (source.constructor.name === "GlobalLightSource" || !source.active) {
      continue;
    }
    
    const dx = point.x - source.data.x;
    const dy = point.y - source.data.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const brightRadius = source.data.bright || 0;
    const dimRadius = source.data.dim || 0;
    
    console.log(`  Light source at (${source.data.x}, ${source.data.y}):`, {
      distance: distance.toFixed(2),
      brightRadius,
      dimRadius,
      inBright: distance <= brightRadius,
      inDim: distance <= dimRadius
    });
    
    // Check bright radius first
    if (brightRadius > 0 && distance <= brightRadius) {
      console.log(`    -> BRIGHT LIGHT`);
      return 1;
    }
    
    // Check dim radius
    if (dimRadius > 0 && distance <= dimRadius) {
      console.log(`    -> Dim light`);
      maxLight = Math.max(maxLight, 0.25);
    }
  }
  
  console.log(`  Final light level: ${maxLight}`);
  return maxLight;
}
