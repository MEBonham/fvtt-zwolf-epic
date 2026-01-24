// /helpers/calculation-utils.mjs - Shared calculation utilities

/**
 * Calculate progression bonuses based on character level
 * @param {number} level - The character's base level
 * @param {number} progressionOnlyLevel - Additional level from Progression Enhancement (typically 0 or 1)
 * @returns {Object} Progression bonuses for each tier
 */
export function calculateProgressionBonuses(level, progressionOnlyLevel = 0) {
    const totalLevel = level + progressionOnlyLevel;

    return {
        mediocre: Math.floor(0.6 * totalLevel - 0.3),
        moderate: Math.floor(0.8 * totalLevel),
        specialty: Math.floor(1 * totalLevel),
        awesome: Math.floor(1.2 * totalLevel + 0.8001)
    };
}

/**
 * Calculate a target number (TN) for a given progression
 * @param {string} progressionName - The progression tier ("mediocre", "moderate", "specialty", "awesome")
 * @param {number} level - The character's base level
 * @param {number} progressionOnlyLevel - Additional level from Progression Enhancement (typically 0 or 1)
 * @returns {number} The target number (6 + progression bonus)
 */
export function calculateTn(progressionName, level, progressionOnlyLevel = 0) {
    const bonuses = calculateProgressionBonuses(level, progressionOnlyLevel);
    return 6 + bonuses[progressionName];
}

/**
 * Progression tier values for comparison
 */
export const PROGRESSION_VALUES = {
    mediocre: 1,
    moderate: 2,
    specialty: 3,
    awesome: 4
};

/**
 * Build point costs for attribute progressions
 */
export const ATTRIBUTE_BP_COSTS = {
    mediocre: -5,
    moderate: 0,
    specialty: 4,
    awesome: 8
};

/**
 * Base build point costs for skill progressions
 */
export const SKILL_BP_BASE_COSTS = {
    mediocre: 0,
    moderate: 1,
    specialty: 2,
    awesome: 3
};
