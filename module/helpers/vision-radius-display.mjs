/**
 * Z-Wolf Epic Vision Radius Display
 * 
 * Shows visual rings around controlled tokens indicating their vision ranges:
 * - Blue ring for nightsight (dim light vision)
 * - Red ring for darkvision (darkness vision) if greater than default
 */

export class ZWolfVisionRadiusDisplay {
  
  static initialize() {
    // Draw vision rings when token is rendered
    Hooks.on("refreshToken", (token) => {
      ZWolfVisionRadiusDisplay._drawVisionRings(token);
    });
    
    // Redraw when token is controlled/released
    Hooks.on("controlToken", (token, controlled) => {
      ZWolfVisionRadiusDisplay._drawVisionRings(token);
    });
    
    console.log("Z-Wolf Epic | Vision radius display initialized");
  }
  
  /**
   * Draw vision range rings on a token
   * @param {Token} token - The token to draw rings for
   * @private
   */
static _drawVisionRings(token) {
  // Clear existing rings
  if (token.visionRings) {
    // Remove all children (text labels)
    while (token.visionRings.children.length > 0) {
      token.visionRings.removeChildAt(0);
    }
    // Clear drawn graphics (circles, lines)
    token.visionRings.clear();
  }
  
  // Only draw rings for controlled tokens
  if (!token.controlled || !token.actor) {
    // If not controlled and visionRings exists, destroy it completely
    if (token.visionRings) {
      token.removeChild(token.visionRings);
      token.visionRings.destroy();
      token.visionRings = null;
    }
    return;
  }
  // Get vision values from actor - use getter methods
  const nightsight = token.actor.nightsight || 0;
  const darkvision = token.actor.darkvision || 0;
  const defaultDarkvision = 0.2; // Your default darkvision value
  
  // Create graphics container if it doesn't exist
  if (!token.visionRings) {
    token.visionRings = token.addChild(new PIXI.Graphics());
  }
  
  const graphics = token.visionRings;
  const pixelsPerMeter = canvas.dimensions.distancePixels;
  
  // Token center relative to token sprite
  const centerX = (token.document.width * canvas.grid.size) / 2;
  const centerY = (token.document.height * canvas.grid.size) / 2;
  
  // Draw nightsight ring (blue) if token has nightsight
  if (nightsight > 0) {
    const nightsightRadius = nightsight * pixelsPerMeter;
    graphics.lineStyle(2, 0x4a7bc8, 0.6);
    graphics.drawCircle(centerX, centerY, nightsightRadius);
    
    ZWolfVisionRadiusDisplay._drawLabel(
      graphics, 
      centerX + nightsightRadius * 0.707,
      centerY - nightsightRadius * 0.707, 
      `Nightsight ${nightsight}m`,
      0x4a7bc8
    );
  }
  
  // Draw darkvision ring (red) if greater than default
  if (darkvision > defaultDarkvision) {
    const darkvisionRadius = darkvision * pixelsPerMeter;
    graphics.lineStyle(2, 0xdc3545, 0.6);
    graphics.drawCircle(centerX, centerY, darkvisionRadius);
    
    ZWolfVisionRadiusDisplay._drawLabel(
      graphics,
      centerX + darkvisionRadius * 0.707,
      centerY + darkvisionRadius * 0.707,
      `Darkvision ${darkvision}m`,
      0xdc3545
    );
  }
}
  
  /**
   * Draw a text label on the graphics
   * @param {PIXI.Graphics} graphics - The graphics object to draw on
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {string} text - Label text
   * @param {number} color - Text color
   * @private
   */
  static _drawLabel(graphics, x, y, text, color) {
    // Create text style
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
    
    // Create text object
    const label = new PIXI.Text(text, style);
    label.anchor.set(0.5, 0.5);
    label.position.set(x, y);
    
    // Add to graphics container
    graphics.addChild(label);
  }
  
  /**
   * Clear all vision rings from all tokens
   */
  static clearAll() {
    for (const token of canvas.tokens.placeables) {
      if (token.visionRings) {
        token.visionRings.clear();
        token.visionRings = null;
      }
    }
  }
}