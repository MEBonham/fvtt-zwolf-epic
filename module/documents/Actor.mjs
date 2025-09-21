export class ZWolfActor extends Actor {
  
  /** @override */
  prepareData() {
    super.prepareData();
  }
  
  /** @override */
  prepareBaseData() {
    super.prepareBaseData();
    
    // Set default prototype token settings
    if (!this.prototypeToken.name) {
      this.prototypeToken.updateSource({
        name: this.name,
        displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
        displayBars: CONST.TOKEN_DISPLAY_MODES.ALWAYS,
        bar1: { attribute: "health" },
        bar2: { attribute: "power" },
        sight: {
          enabled: true,
          range: 0
        }
      });
    }
    
    // Set token size based on actor size
    const size = this.system.size || "medium";
    const sizeData = CONFIG.ZWOLF?.sizes?.[size];
    if (sizeData && !this.prototypeToken.width) {
      this.prototypeToken.updateSource({
        width: sizeData.tokenScale,
        height: sizeData.tokenScale
      });
    }
  }
  
  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    
    // Apply vision type to prototype token
    const visionType = this.system.vision?.type || "normal";
    if (game.zwolf?.vision) {
      const vision = game.zwolf.vision.VISION_TYPES[visionType];
      if (vision) {
        this.prototypeToken.updateSource({
          sight: {
            enabled: true,
            range: vision.radius === Infinity ? 0 : vision.radius,
            visionMode: visionType === "normal" ? "basic" : visionType
          }
        });
      }
    }
  }
  
  /** @override */
  getRollData() {
    const data = super.getRollData();
    
    // Add system data
    data.attributes = this.system.attributes || {};
    data.skills = this.system.skills || {};
    
    return data;
  }
  
  /** @override */
  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);
    
    // Set default token settings for new actors
    if (this.type === "character") {
      this.prototypeToken.updateSource({
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY
      });
    } else if (this.type === "eidolon") {
      this.prototypeToken.updateSource({
        actorLink: false,
        disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE
      });
    } else if (this.type === "spawn") {
      this.prototypeToken.updateSource({
        actorLink: false,
        disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE,
        displayName: CONST.TOKEN_DISPLAY_MODES.ALWAYS
      });
    }
  }
}
