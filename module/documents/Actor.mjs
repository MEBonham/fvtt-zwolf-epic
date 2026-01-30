/**
 * Extended Actor document class for Z-Wolf Epic.
 * @extends {Actor}
 */
export class ZWolfActor extends Actor {

    // ========================================
    // STATIC CALCULATION HELPERS
    // ========================================

    /**
     * Calculate vitality points based on function key
     * @param {string} functionKey - "standard" or "hardy"
     * @param {number} level - Character level
     * @param {number} vitalityBoostCount - Number of vitality boost items
     * @returns {number} Calculated vitality points
     * @static
     */
    static calculateVitality(functionKey, level, vitalityBoostCount) {
        const functions = {
            standard: (lvl, boosts) => 4 * (lvl + boosts),
            hardy: (lvl, boosts) => 5 * (lvl + boosts + 1)
        };

        const func = functions[functionKey] || functions.standard;
        return func(level, vitalityBoostCount);
    }

    /**
     * Calculate coast number based on function key
     * @param {string} functionKey - "standard" or "cunning"
     * @param {number} level - Character level
     * @returns {number} Calculated coast number
     * @static
     */
    static calculateCoast(functionKey, level) {
        const functions = {
            standard: () => 4,
            cunning: (lvl) => 5 + [7, 11, 16].filter(x => x <= lvl).length
        };

        const func = functions[functionKey] || functions.standard;
        return func(level);
    }

    // ========================================
    // FOUNDRY LIFECYCLE OVERRIDES
    // ========================================

    prepareData() {
        super.prepareData();
    }

    prepareBaseData() {
        // Data modifications in this step occur before processing embedded documents or derived data.
    }

    prepareDerivedData() {
        // Data modifications in this step occur after processing embedded documents.
        super.prepareDerivedData();

        // Calculate max vitality and stamina for character types
        if (["pc", "npc", "eidolon"].includes(this.type)) {
            this._prepareCharacterDerivedData();
        }
    }

    // ========================================
    // CHARACTER DERIVED DATA
    // ========================================

    /**
     * Prepare derived data for character-type actors
     * Calculates max vitality and stamina from fundaments
     * @private
     */
    _prepareCharacterDerivedData() {
        const level = this.system.level || 0;

        // Initialize vitality and stamina objects if needed
        if (!this.system.vitalityPoints) {
            this.system.vitalityPoints = { value: 0, max: 0 };
        }
        if (!this.system.staminaPoints) {
            this.system.staminaPoints = { value: 0, max: 0 };
        }

        // Calculate maximums
        this.system.vitalityPoints.max = this._calculateMaxVitality(level);
        this.system.staminaPoints.max = this._calculateMaxStamina(level);
        this.system.coastNumber = this._calculateCoastNumber(level);

        // Clamp current values to not exceed max
        this.system.vitalityPoints.value = Math.min(
            this.system.vitalityPoints.value,
            this.system.vitalityPoints.max
        );
        this.system.staminaPoints.value = Math.min(
            this.system.staminaPoints.value,
            this.system.staminaPoints.max
        );
    }

    /**
     * Calculate maximum vitality points from fundament
     * @param {number} level - Character level
     * @returns {number} Maximum vitality points
     * @private
     */
    _calculateMaxVitality(level) {
        const DEFAULT_VITALITY = 12;

        // Count vitality boost items
        const vitalityBoostCount = this.items.filter(i => i.name === "Extra VP").length;

        // Get fundament
        const fundament = this.system.fundamentId ? this.items.get(this.system.fundamentId) : null;
        if (!fundament?.system?.vitalityFunction) {
            return DEFAULT_VITALITY;
        }

        try {
            const result = ZWolfActor.calculateVitality(
                fundament.system.vitalityFunction,
                level,
                vitalityBoostCount
            );
            return Math.floor(result) || DEFAULT_VITALITY;
        } catch (error) {
            console.error("Z-Wolf Epic | Error calculating vitality:", error);
            return DEFAULT_VITALITY;
        }
    }

    /**
     * Calculate maximum stamina points
     * Currently always returns 4
     * @param {number} level - Character level
     * @returns {number} Maximum stamina points
     * @private
     */
    _calculateMaxStamina(level) {
        return 4;
    }

    /**
     * Calculate coast number from fundament
     * @param {number} level - Character level
     * @returns {number} Coast number
     * @private
     */
    _calculateCoastNumber(level) {
        const DEFAULT_COAST = 4;

        const fundament = this.system.fundamentId ? this.items.get(this.system.fundamentId) : null;
        if (!fundament?.system?.coastFunction) {
            return DEFAULT_COAST;
        }

        try {
            const result = ZWolfActor.calculateCoast(
                fundament.system.coastFunction,
                level
            );
            return Math.floor(result) || DEFAULT_COAST;
        } catch (error) {
            console.error("Z-Wolf Epic | Error calculating coast:", error);
            return DEFAULT_COAST;
        }
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    getRollData() {
        const data = { ...super.getRollData() };
        // Add additional roll data here
        return data;
    }
}
