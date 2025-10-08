/**
 * Z-Wolf Epic Vision Radius Display
 * 
 * Shows visual rings around controlled tokens indicating their vision ranges:
 * - Blue ring for nightsight (dim light vision) - only if greater than darkvision
 * - Red ring for darkvision (darkness vision) if greater than default
 */

// Default darkvision from actor-base.mjs schema
const DEFAULT_DARKVISION = 0.2;

export class ZWolfVisionRadiusDisplay {
  
  static initialize() {
    Hooks.on("refreshToken", handleTokenRefresh);
    Hooks.on("controlToken", handleTokenControl);
    
    console.log("Z-Wolf Epic | Vision radius display initialized");
  }
  
  /**
   * Clear all vision rings from all tokens
   */
  static clearAll() {
    for (const token of canvas.tokens.placeables) {
      clearVisionRings(token);
    }
  }
}

// ========================================
// HOOK HANDLERS
// ========================================

/**
 * Handle token refresh
 * @param {Token} token - The refreshed token
 */
function handleTokenRefresh(token) {
  drawVisionRings(token);
}

/**
 * Handle token control changes
 * @param {Token} token - The controlled/released token
 * @param {boolean} controlled - Whether token is now controlled
 */
function handleTokenControl(token, controlled) {
  drawVisionRings(token);
}

// ========================================
// VISION RING RENDERING
// ========================================

/**
 * Draw vision range rings on a token
 * @param {Token} token - The token to draw rings for
 */
function drawVisionRings(token) {
  // Clear existing rings
  clearVisionRings(token);
  
  // Only draw rings for controlled tokens with actors
  if (!token.controlled || !token.actor) return;
  
  // Get vision values from actor system data
  const nightsight = token.actor.system.nightsight || 0;
  const darkvision = token.actor.system.darkvision || 0;
  
  // Create graphics container
  const graphics = createVisionGraphics(token);
  
  // Calculate token center and scale
  const centerX = (token.document.width * canvas.grid.size) / 2;
  const centerY = (token.document.height * canvas.grid.size) / 2;
  const pixelsPerMeter = canvas.dimensions.distancePixels;
  
  // Draw nightsight ring (blue) - only if greater than darkvision
  if (nightsight > darkvision && nightsight > 0) {
    drawVisionRing(graphics, centerX, centerY, nightsight * pixelsPerMeter, {
      color: 0x4a7bc8,
      label: `Nightsight ${nightsight}m`,
      labelOffset: { x: 0.707, y: -0.707 }
    });
  }
  
  // Draw darkvision ring (red) if greater than default
  if (darkvision > DEFAULT_DARKVISION) {
    drawVisionRing(graphics, centerX, centerY, darkvision * pixelsPerMeter, {
      color: 0xdc3545,
      label: `Darkvision ${darkvision}m`,
      labelOffset: { x: 0.707, y: 0.707 }
    });
  }
}

/**
 * Clear vision rings from a token
 * @param {Token} token - The token to clear
 */
function clearVisionRings(token) {
  if (!token.visionRings) return;
  
  // Remove all children (text labels)
  while (token.visionRings.children.length > 0) {
    token.visionRings.removeChildAt(0);
  }
  
  // Clear drawn graphics
  token.visionRings.clear();
  
  // If token not controlled, destroy the container completely
  if (!token.controlled) {
    token.removeChild(token.visionRings);
    token.visionRings.destroy();
    token.visionRings = null;
  }
}

/**
 * Create or get vision graphics container for a token
 * @param {Token} token - The token
 * @returns {PIXI.Graphics}
 */
function createVisionGraphics(token) {
  if (!token.visionRings) {
    token.visionRings = token.addChild(new PIXI.Graphics());
  }
  return token.visionRings;
}

/**
 * Draw a single vision ring with label
 * @param {PIXI.Graphics} graphics - The graphics object
 * @param {number} centerX - X center position
 * @param {number} centerY - Y center position
 * @param {number} radius - Ring radius in pixels
 * @param {object} options - Ring options
 */
function drawVisionRing(graphics, centerX, centerY, radius, options) {
  const { color, label, labelOffset } = options;
  
  // Draw circle
  graphics.lineStyle(2, color, 0.6);
  graphics.drawCircle(centerX, centerY, radius);
  
  // Draw label at offset position
  const labelX = centerX + radius * labelOffset.x;
  const labelY = centerY + radius * labelOffset.y;
  drawLabel(graphics, labelX, labelY, label, color);
}

/**
 * Draw a text label on the graphics
 * @param {PIXI.Graphics} graphics - The graphics object to draw on
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} text - Label text
 * @param {number} color - Text color
 */
function drawLabel(graphics, x, y, text, color) {
  const style = new PIXI.TextStyle({
    fontFamily: 'Signika',
    fontSize: 14,
    fill: color,
    stroke: '#000000',
    strokeThickness: 3,
    dropShadow: true,
    dropShadowColor: '#000000',
    dropShadowBlur: 4,
    dropShadowDistance: 2
  });
  
  const label = new PIXI.Text(text, style);
  label.anchor.set(0.5, 0.5);
  label.position.set(x, y);
  
  graphics.addChild(label);
}
