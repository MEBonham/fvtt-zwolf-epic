/**
 * Z-Wolf Epic Custom Vision System
 * Implements three vision types with illumination-based limitations and radius upgrades
 */

export class ZWolfVision {
  
  static VISION_TYPES = {
    normal: {
      id: "normal",
      label: "Normal Vision",
      radius: Infinity,
      dimRadius: 0,
      brightRadius: Infinity,
      worksIn: ["bright"],
      color: null,
      saturation: 0,
      contrast: 0,
      shadows: 0,
      description: "Can see infinitely in bright light, blind in dim light and darkness"
    },
    nightsight: {
      id: "nightsight",
      label: "Nightsight",
      defaultRadius: 1, // Default 1 meter
      dimRadius: null, // Will be set based on radius
      brightRadius: 0,
      worksIn: ["bright", "dim"],
      color: "#4466aa",
      saturation: -0.3,
      contrast: 0.1,
      shadows: 0.2,
      description: "Can see in bright and dim light within range"
    },
    darkvision: {
      id: "darkvision", 
      label: "Darkvision",
      defaultRadius: 0.5, // Default 0.5 meters
      dimRadius: null, // Will be set based on radius
      brightRadius: 0,
      worksIn: ["bright", "dim", "dark"],
      color: "#669966",
      saturation: -0.5,
      contrast: 0.2,
      shadows: 0.3,
      description: "Can see in all lighting conditions within range"
    }
  };

  /**
   * Initialize the vision system hooks
   */
  static initialize() {
    // Hook into token configuration
    Hooks.on("preUpdateToken", (document, changes, options, userId) => {
      ZWolfVision._preUpdateToken(document, changes, options, userId);
    });
    
    Hooks.on("updateToken", (document, changes, options, userId) => {
      ZWolfVision._onUpdateToken(document, changes, options, userId);
    });
    
    Hooks.on("refreshToken", (token) => {
      ZWolfVision._onRefreshToken(token);
    });
    
    // Hook into sight refresh to apply vision rules
    Hooks.on("sightRefresh", (layer) => {
      ZWolfVision._onSightRefresh(layer);
    });
    
    // Hook into actor updates to refresh vision when side effects change
    Hooks.on("updateActor", (actor, changes, options, userId) => {
      ZWolfVision._onUpdateActor(actor, changes, options, userId);
    });
    
    // Add vision mode configurations
    this._registerVisionModes();
    
    console.log("Z-Wolf Epic: Vision system initialized with radius upgrades");
  }

  /**
   * Handle actor update events to refresh vision when relevant changes occur
   * @param {Actor} actor - The actor being updated
   * @param {Object} changes - The changes being applied
   * @param {Object} options - Update options
   * @param {string} userId - The user making the change
   * @private
   */
  static _onUpdateActor(actor, changes, options, userId) {
    // Check if vision-related changes occurred
    const visionChanged = changes.system?.vision || 
                         changes.system?.ancestryId !== undefined ||
                         changes.system?.fundamentId !== undefined;
    
    if (visionChanged) {
      console.log("Z-Wolf Epic: Vision-related actor update detected");
      
      // Find all tokens for this actor and refresh their vision
      canvas.tokens?.placeables.forEach(token => {
        if (token.document.actor?.id === actor.id) {
          ZWolfVision._refreshTokenVision(token);
        }
      });
    }
  }

  /**
   * Get the effective vision radii for an actor based on side effects
   * @param {Actor} actor - The actor to get vision radii for
   * @returns {Object} Object containing nightsightRadius and darkvisionRadius
   */
  static getActorVisionRadii(actor) {
    if (!actor) {
      return {
        nightsightRadius: ZWolfVision.VISION_TYPES.nightsight.defaultRadius,
        darkvisionRadius: ZWolfVision.VISION_TYPES.darkvision.defaultRadius
      };
    }

    // Get base radii from actor system (fallback to defaults)
    let nightsightRadius = actor.system?.vision?.nightsightRadius || ZWolfVision.VISION_TYPES.nightsight.defaultRadius;
    let darkvisionRadius = actor.system?.vision?.darkvisionRadius || ZWolfVision.VISION_TYPES.darkvision.defaultRadius;

    // Check all items for vision radius upgrades (highest value wins)
    actor.items?.forEach(item => {
      if (item.system?.sideEffects) {
        const sideEffects = item.system.sideEffects;
        
        // Check nightsight radius upgrade
        if (sideEffects.nightsightRadius !== null && sideEffects.nightsightRadius !== undefined) {
          const itemRadius = parseFloat(sideEffects.nightsightRadius);
          if (!isNaN(itemRadius) && itemRadius > nightsightRadius) {
            nightsightRadius = itemRadius;
            console.log(`Z-Wolf Epic | ${actor.name}: Nightsight radius upgraded to ${itemRadius}m by ${item.name}`);
          }
        }
        
        // Check darkvision radius upgrade
        if (sideEffects.darkvisionRadius !== null && sideEffects.darkvisionRadius !== undefined) {
          const itemRadius = parseFloat(sideEffects.darkvisionRadius);
          if (!isNaN(itemRadius) && itemRadius > darkvisionRadius) {
            darkvisionRadius = itemRadius;
            console.log(`Z-Wolf Epic | ${actor.name}: Darkvision radius upgraded to ${itemRadius}m by ${item.name}`);
          }
        }
      }
    });

    return {
      nightsightRadius: nightsightRadius,
      darkvisionRadius: darkvisionRadius
    };
  }

  /**
   * Handle pre-update token events
   * @param {TokenDocument} document - The token document
   * @param {Object} changes - The changes being applied
   * @param {Object} options - Update options
   * @param {string} userId - The user making the change
   * @private
   */
  static _preUpdateToken(document, changes, options, userId) {
    // Add any pre-update logic here if needed
    console.log("Z-Wolf Epic: Token pre-update", document.name);
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
   * Handle sight refresh events
   * @param {*} layer - The sight layer or related object
   * @private
   */
  static _onSightRefresh(layer) {
    // Apply Z-Wolf vision rules when sight refreshes
    console.log("Z-Wolf Epic: Sight refresh");
    
    // Apply vision rules to all tokens
    if (canvas.tokens) {
      canvas.tokens.placeables.forEach(token => {
        ZWolfVision._refreshTokenVision(token);
      });
    }
  }

  /**
   * Refresh vision for a specific token
   * @param {Token} token - The token to refresh vision for
   * @private
   */
  static _refreshTokenVision(token) {
    if (!token?.document?.actor) return;
    
    // Get the vision type from actor data (you might want to add this to your actor template)
    const visionType = token.document.actor.system?.visionType || 'normal';
    
    // Apply the appropriate vision type with upgraded radii
    ZWolfVision._applyVisionType(token, visionType);
  }

  /**
   * Apply a specific vision type to a token with radius upgrades
   * @param {Token} token - The token to apply vision to
   * @param {string} visionType - The type of vision to apply
   * @private
   */
  static _applyVisionType(token, visionType) {
    const visionConfig = ZWolfVision.VISION_TYPES[visionType];
    if (!visionConfig) {
      console.warn(`Z-Wolf Epic: Unknown vision type: ${visionType}`);
      return;
    }

    // Get effective radii from actor's side effects
    const visionRadii = ZWolfVision.getActorVisionRadii(token.document.actor);
    
    // Apply vision configuration to token
    const updates = {};
    
    // Set sight range based on vision type and upgrades
    if (visionType === 'nightsight') {
      // Convert meters to Foundry units (assuming 1 meter = X units, adjust as needed)
      const radiusInUnits = ZWolfVision._metersToFoundryUnits(visionRadii.nightsightRadius);
      updates['sight.range'] = radiusInUnits;
      updates['sight.visionMode'] = 'nightsight';
      
      console.log(`Z-Wolf Epic | Applied nightsight with ${visionRadii.nightsightRadius}m radius (${radiusInUnits} units) to ${token.name}`);
    } else if (visionType === 'darkvision') {
      // Convert meters to Foundry units
      const radiusInUnits = ZWolfVision._metersToFoundryUnits(visionRadii.darkvisionRadius);
      updates['sight.range'] = radiusInUnits;
      updates['sight.visionMode'] = 'zwolfDarkvision';
      
      console.log(`Z-Wolf Epic | Applied darkvision with ${visionRadii.darkvisionRadius}m radius (${radiusInUnits} units) to ${token.name}`);
    } else {
      // Normal vision
      updates['sight.visionMode'] = 'basic';
      if (visionConfig.radius !== Infinity) {
        updates['sight.range'] = visionConfig.radius;
      }
    }

    // Apply updates if there are any
    if (Object.keys(updates).length > 0) {
      token.document.update(updates);
    }
  }

  /**
   * Convert meters to Foundry units based on scene configuration
   * @param {number} meters - Distance in meters
   * @returns {number} Distance in Foundry units
   * @private
   */
  static _metersToFoundryUnits(meters) {
    // This depends on your scene configuration
    // If using gridless and 1 unit = 1 meter, return as-is
    // If using a grid, you'll need to convert appropriately
    // For now, assuming 1 meter = 5 feet = 1 Foundry unit (standard D&D conversion)
    
    const scene = canvas.scene;
    if (!scene) return meters * 5; // Fallback: assume 5 feet per meter
    
    // If scene is configured with specific distance units
    if (scene.grid?.units === 'm' || scene.grid?.units === 'meter' || scene.grid?.units === 'meters') {
      return meters; // Direct conversion
    } else {
      // Assume feet or other units, convert meters to appropriate scale
      return meters * 5; // 1 meter ≈ 5 feet in game terms
    }
  }

  /**
   * Register custom vision modes with Foundry
   * @private
   */
  static _registerVisionModes() {
    // Only register if V13's vision mode system is available
    if (!CONFIG.Canvas?.visionModes) return;
    
    CONFIG.Canvas.visionModes.nightsight = {
      id: "nightsight",
      label: "Z-Wolf: Nightsight",
      tokenConfig: true,
      canvas: {
        shader: ColorAdjustmentsSamplerShader,
        uniforms: {
          contrast: 0.1,
          saturation: -0.3,
          exposure: 0.1
        }
      },
      lighting: {
        background: { 
          postProcessingModes: ["SATURATION"],
          saturation: -0.3
        },
        illumination: {
          postProcessingModes: ["SATURATION"],
          saturation: -0.2
        },
        coloration: {
          postProcessingModes: ["SATURATION"],
          saturation: -0.3
        }
      },
      vision: {
        darkness: { adaptive: true },
        defaults: { range: 5, saturation: -0.3 } // Default range, will be overridden
      }
    };
    
    CONFIG.Canvas.visionModes.zwolfDarkvision = {
      id: "zwolfDarkvision",
      label: "Z-Wolf: Darkvision",
      tokenConfig: true,
      canvas: {
        shader: ColorAdjustmentsSamplerShader,
        uniforms: {
          contrast: 0.2,
          saturation: -0.5,
          exposure: 0.05
        }
      },
      lighting: {
        background: {
          postProcessingModes: ["SATURATION"],
          saturation: -0.5
        },
        illumination: {
          postProcessingModes: ["SATURATION"],
          saturation: -0.4
        },
        coloration: {
          postProcessingModes: ["SATURATION"],
          saturation: -0.5
        }
      },
      vision: {
        darkness: { adaptive: false },
        defaults: { range: 2.5, saturation: -0.5 } // Default range, will be overridden
      }
    };
  }

  /**
   * Utility method to get vision information for display in character sheets
   * @param {Actor} actor - The actor to get vision info for
   * @returns {Object} Object containing vision information for display
   */
  static getVisionDisplayInfo(actor) {
    const radii = ZWolfVision.getActorVisionRadii(actor);
    
    return {
      nightsightRadius: radii.nightsightRadius,
      darkvisionRadius: radii.darkvisionRadius,
      nightsightDisplay: `${radii.nightsightRadius}m`,
      darkvisionDisplay: `${radii.darkvisionRadius}m`,
      hasUpgradedNightsight: radii.nightsightRadius > ZWolfVision.VISION_TYPES.nightsight.defaultRadius,
      hasUpgradedDarkvision: radii.darkvisionRadius > ZWolfVision.VISION_TYPES.darkvision.defaultRadius
    };
  }
}