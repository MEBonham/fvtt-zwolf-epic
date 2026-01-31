# 2026-01-24: Actor Progression Calculations

## Summary

Replaced temporary placeholder progression data in actor-sheet.mjs with real calculations using the new calculation-utils.mjs functionality. Added TN (Target Number) calculation support.

## Key Changes

### 1. Updated actor-sheet.mjs

**Imports Added:**
- `calculateProgressionBonuses` and `calculateTn` from `calculation-utils.mjs`

**Replaced Mock Data (lines 106-119):**
- Removed hardcoded temporary placeholder with fake progression values
- Added real calculations:
  - Gets actor level from `context.system.level`
  - Checks for "Progression Enhancement" item (adds +1 to effective level)
  - Calls `calculateProgressionBonuses()` to get proper bonuses
  - Organizes attributes and skills by progression tiers
  - Calculates TNs for improvised, healing, and challenge

**Added Helper Methods:**
- `_getProgressionOnlyLevel()` - Returns 1 if actor has "Progression Enhancement" item, 0 otherwise
- `_organizeByProgression(system, bonuses)` - Groups attributes and skills by their progression tier with calculated bonuses
- `_getDefaultAttributes()` - Returns default attribute structure (all "moderate")
- `_getDefaultSkills()` - Returns default skill structure (all "mediocre")

**Context Data Added:**
```javascript
context.progressions = {
    mediocre: { name: "Mediocre", bonus: X, stats: [...] },
    moderate: { name: "Moderate", bonus: Y, stats: [...] },
    specialty: { name: "Specialty", bonus: Z, stats: [...] },
    awesome: { name: "Awesome", bonus: W, stats: [...] }
};

context.tns = {
    improvised: calculateTn("mediocre", level, progressionOnlyLevel),
    healing: calculateTn("moderate", level, progressionOnlyLevel),
    challenge: calculateTn("specialty", level, progressionOnlyLevel)
};
```

### 2. Updated calculation-utils.mjs

**Added Function:**
```javascript
export function calculateTn(progressionName, level, progressionOnlyLevel = 0) {
    const bonuses = calculateProgressionBonuses(level, progressionOnlyLevel);
    return 6 + bonuses[progressionName];
}
```

- Takes progression name ("mediocre", "moderate", "specialty", "awesome")
- Returns 6 + the calculated progression bonus
- Used for:
  - Improvised TN: `calculateTn("mediocre", ...)`
  - Healing TN: `calculateTn("moderate", ...)`
  - Challenge TN: `calculateTn("specialty", ...)`

## Implementation Pattern

Following the paradigm from `archive 2026-01-23/module/helpers/actor-data-calculator.mjs`:
- Centralized progression calculations in calculation-utils.mjs
- Actor sheet calls utility functions during `_prepareContext()`
- Progression bonuses calculated based on: `level + progressionOnlyLevel`
- Formulas match archive:
  - Mediocre: `Math.floor(0.6 * totalLevel - 0.3)`
  - Moderate: `Math.floor(0.8 * totalLevel)`
  - Specialty: `Math.floor(1 * totalLevel)`
  - Awesome: `Math.floor(1.2 * totalLevel + 0.8001)`

## Files Modified

1. `module/sheets/actor-sheet.mjs` - Replaced placeholder with real progression calculations
2. `module/helpers/calculation-utils.mjs` - Added `calculateTn()` function

## Current State

- Actor sheets now display accurate progression bonuses based on character level
- TNs (Improvised, Healing, Challenge) calculated and available in template context
- Progression Enhancement item properly adds +1 to effective level for calculations
- All calculations centralized in calculation-utils.mjs for reusability