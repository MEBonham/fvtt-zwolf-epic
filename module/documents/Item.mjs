/**
 * Extended Item document class for Z-Wolf Epic.
 * @extends {Item}
 */
export class ZWolfItem extends Item {

    prepareData() {
        super.prepareData();
    }

    prepareDerivedData() {
        const itemData = this;
        const systemData = itemData.system;

        // Make modifications to data here.
    }

    getRollData() {
        const data = { ...super.getRollData() };

        // Include the item's own system data
        if (this.system) {
            data.item = { ...this.system };
        }

        return data;
    }

    /**
     * Get granted abilities filtered by tier
     * @param {number} tier - Tier to filter (0 for non-track items, 1-5 for tracks)
     * @returns {Object} - Abilities object filtered by tier
     */
    getAbilitiesByTier(tier) {
        if (!this.system.grantedAbilities) return {};

        const filtered = {};
        Object.entries(this.system.grantedAbilities).forEach(([id, ability]) => {
            if (ability.tier === tier) {
                filtered[id] = ability;
            }
        });
        return filtered;
    }

    /**
     * Get side effects for a specific tier (track items only)
     * @param {number} tier - Tier number (1-5)
     * @returns {Object|null} - Side effects object for that tier
     */
    getSideEffectsForTier(tier) {
        if (this.type !== "track" || !this.system.tierSideEffects) return null;

        return this.system.tierSideEffects.find(effects => effects.tier === tier) || null;
    }
}
