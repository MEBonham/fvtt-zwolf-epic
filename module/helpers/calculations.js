/**
 * Fundament calculation functions for Z-Wolf Epic
 * Place this file at: module/helpers/calculations.js
 */
export const VITALITY_FUNCTIONS = {
  standard: (level, vitalityBoostCount) => {
    return 4 * (level + vitalityBoostCount);
  },
  hardy: (level, vitalityBoostCount) => {
    return 5 * (level + vitalityBoostCount + 1);
  }
};

export const COAST_FUNCTIONS = {
  standard: (level) => {
    return 4;
  },
  cunning: (level) => {
    return 5 + ([7, 11, 16]).filter(x => x <= level).length;
  }
};

// Helper functions to get the actual calculation function
export function calculateVitality(functionKey, level, attributes, skills, vitalityBoostCount) {
  const func = VITALITY_FUNCTIONS[functionKey] || VITALITY_FUNCTIONS.standard;
  return func(level, vitalityBoostCount);
}

export function calculateCoast(functionKey, level, attributes, skills) {
  const func = COAST_FUNCTIONS[functionKey] || COAST_FUNCTIONS.standard;
  return func(level);
}
