/**
 * Extended TokenDocument for Z-Wolf Epic
 * Handles vision detection modes and size synchronization
 */
export default class ZWolfTokenDocument extends TokenDocument {

    // ========================================
    // FOUNDRY LIFECYCLE OVERRIDES
    // ========================================

    /**
     * @override
     * Sync vision from actor BEFORE Foundry's default preparation
     */
    prepareBaseData() {
        this._syncVisionFromActor();
        super.prepareBaseData();
    }

    /**
     * @override
     * Handle token creation to apply actor size
     */
    static async _onCreateOperation(documents, operation, user) {
        const result = await super._onCreateOperation(documents, operation, user);

        // Apply size adjustments for new tokens
        const updates = [];

        for (const tokenDoc of documents) {
            const updateData = buildTokenSizeUpdate(tokenDoc);
            if (updateData) {
                updates.push({ _id: tokenDoc.id, ...updateData });
            }
        }

        if (updates.length > 0) {
            await canvas.scene?.updateEmbeddedDocuments("Token", updates);
        }

        return result;
    }

    /**
     * @override
     * Sync vision from actor when token is first created
     */
    async _onCreate(data, options, userId) {
        await super._onCreate(data, options, userId);

        if (game.user.id === userId) {
            await this.syncVisionFromActor();
        }
    }

    // ========================================
    // VISION SYSTEM - DETECTION MODES
    // ========================================

    /**
     * Synchronize vision detection modes from actor
     * This prevents Foundry from auto-adding unwanted detection modes
     * @private
     */
    _syncVisionFromActor() {
        if (!this.actorId || !this.actor) return;

        // Check if custom vision rules flag is set (allows manual override)
        if (this.getFlag("zwolf-epic", "customVisionRules")) return;

        // Get vision capabilities from actor system data
        const nightsight = this.actor.system?.nightsight || 0;
        const darkvision = Math.max(1, this.actor.system?.darkvision || 0);

        // Get base range from source data
        const baseRange = this._source.sight.range || 100;
        const maxRange = Math.max(baseRange, nightsight, darkvision);

        // CRITICAL: Clear detection modes array to prevent auto-population
        this.detectionModes = [];

        // Set vision mode to basic
        this.sight.visionMode = "basic";

        // Build detection modes array manually
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

        // Set overall sight range
        this.sight.range = maxRange;
    }

    /**
     * Sync vision values from actor to token flags
     * Called when token is created or actor data changes
     * @returns {Promise<void>}
     */
    async syncVisionFromActor() {
        if (!this.actor) return;

        const actorNightsight = this.actor.system?.nightsight || 0;
        const actorDarkvision = this.actor.system?.darkvision || 0;
        const hasNightsightOverride = this.getFlag("zwolf-epic", "nightsight-override") !== undefined;
        const hasDarkvisionOverride = this.getFlag("zwolf-epic", "darkvision-override") !== undefined;

        const updates = {};

        // Only sync if token doesn't have custom overrides
        if (!hasNightsightOverride) {
            updates["flags.zwolf-epic.nightsight"] = actorNightsight;
        }

        if (!hasDarkvisionOverride) {
            updates["flags.zwolf-epic.darkvision"] = actorDarkvision;
        }

        if (Object.keys(updates).length > 0) {
            await this.update(updates);
        }
    }

    // ========================================
    // VISION GETTERS & SETTERS
    // ========================================

    /**
     * Get the token's base nightsight range (inherited from actor)
     * @returns {number} The base nightsight range
     */
    get baseNightsight() {
        // Check token override first
        const tokenOverride = this.getFlag("zwolf-epic", "nightsight-override");
        if (tokenOverride !== undefined) return tokenOverride;

        // Check inherited from prototype token
        const prototypeNightsight = this.getFlag("zwolf-epic", "nightsight");
        if (prototypeNightsight !== undefined) return prototypeNightsight;

        // Fall back to actor's current value
        return this.actor?.system?.nightsight || 0;
    }

    /**
     * Get the token's effective nightsight range (base + size bonus)
     * @returns {number} The effective nightsight range
     */
    get nightsight() {
        const baseNightsight = this.baseNightsight;
        if (baseNightsight <= 0) return 0;

        // Calculate size bonus from token's physical radius
        const radiusInSceneUnits = calculateTokenRadius(this);
        return baseNightsight + radiusInSceneUnits;
    }

    /**
     * Set the token's nightsight override
     * @param {number} value - The nightsight override value, or null to use actor value
     * @returns {Promise<void>}
     */
    async setNightsightOverride(value) {
        if (value === null || value === undefined) {
            return this.unsetFlag("zwolf-epic", "nightsight-override");
        }
        return this.setFlag("zwolf-epic", "nightsight-override", value);
    }

    /**
     * Get the token's base darkvision range (from actor system data)
     * @returns {number} The base darkvision range
     */
    get baseDarkvision() {
        // Check token override first
        const tokenOverride = this.getFlag("zwolf-epic", "darkvision-override");
        if (tokenOverride !== undefined) return tokenOverride;

        // Get from actor system data
        return this.actor?.system?.darkvision || 0;
    }

    /**
     * Get the token's effective darkvision range (base + size bonus)
     * @returns {number} The effective darkvision range
     */
    get darkvision() {
        const baseDarkvision = this.baseDarkvision;
        const radiusInSceneUnits = calculateTokenRadius(this);

        // If no base darkvision, token can only see its own space
        if (baseDarkvision <= 0) {
            return radiusInSceneUnits;
        }

        // If has darkvision, add size bonus to base range
        return baseDarkvision + radiusInSceneUnits;
    }

    /**
     * Set the token's darkvision override
     * @param {number} value - The darkvision override value, or null to use actor value
     * @returns {Promise<void>}
     */
    async setDarkvisionOverride(value) {
        if (value === null || value === undefined) {
            return this.unsetFlag("zwolf-epic", "darkvision-override");
        }
        return this.setFlag("zwolf-epic", "darkvision-override", value);
    }

    /**
     * Get all vision ranges for this token
     * @returns {Object} Object containing all vision ranges
     */
    get visionRanges() {
        return {
            bright: Infinity,
            nightsight: this.nightsight,
            baseNightsight: this.baseNightsight,
            darkvision: this.darkvision,
            baseDarkvision: this.baseDarkvision
        };
    }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Calculate token radius in scene units
 * @param {TokenDocument} tokenDoc - The token document
 * @returns {number} The radius in scene units
 * @private
 */
function calculateTokenRadius(tokenDoc) {
    // In gridless with 1m base units, token width equals diameter in meters
    const tokenDiameterInMeters = tokenDoc.width || 1;
    return tokenDiameterInMeters / 2;
}

/**
 * Build size update data for a token based on actor size
 * @param {TokenDocument} tokenDoc - The token document
 * @returns {Object|null} Update data or null if no update needed
 * @private
 */
function buildTokenSizeUpdate(tokenDoc) {
    const actor = tokenDoc.actor;
    if (!actor) return null;

    // Use effectiveSize instead of base size
    const actorSize = actor.system?.effectiveSize || actor.system?.size || "medium";
    const sizeData = CONFIG.ZWOLF?.sizes?.[actorSize];

    if (!sizeData) return null;

    const updateData = {};
    let needsUpdate = false;

    // Check if token size needs updating
    const currentWidth = tokenDoc.width || 1;
    const currentHeight = tokenDoc.height || 1;
    const targetSize = sizeData.tokenScale;

    if (currentWidth !== targetSize || currentHeight !== targetSize) {
        updateData.width = targetSize;
        updateData.height = targetSize;
        needsUpdate = true;
    }

    // Preserve lockRotation setting
    if (tokenDoc.lockRotation === true) {
        updateData.lockRotation = true;
        needsUpdate = true;
    }

    return needsUpdate ? updateData : null;
}

// ========================================
// HOOKS FOR TOKEN/ACTOR UPDATES
// ========================================

/**
 * Sync vision when actor data changes
 */
Hooks.on("updateActor", (actor, data, options, userId) => {
    // Check if nightsight, darkvision, or size was updated
    if (data.system?.nightsight !== undefined ||
        data.system?.darkvision !== undefined ||
        data.system?.effectiveSize !== undefined) {
        // Update all tokens for this actor that don't have custom overrides
        actor.getActiveTokens().forEach(async token => {
            await token.document.syncVisionFromActor();
        });
    }
});

/**
 * Apply size update when actor effective size changes
 */
Hooks.on("updateActor", (actor, data, options, userId) => {
    if (data.system?.effectiveSize !== undefined) {
        // Update token sizes for all active tokens
        actor.getActiveTokens().forEach(async token => {
            const updateData = buildTokenSizeUpdate(token.document);
            if (updateData) {
                await token.document.update(updateData);
            }
        });
    }
});
