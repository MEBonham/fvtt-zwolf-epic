# Max VP Level Calculation Fix
**Date:** 2026-01-30
**Topic:** Fixing Max VP/SP/Coast Number not updating when Level changes

## Problem
The character's Max VP (and other calculated stats like Max SP, Coast Number) weren't updating when the Level field changed on the actor sheet.

## Root Cause
The current `module/documents/actor.mjs` had a minimal implementation that didn't include the derived data calculations. The archive code (`archive 2026-01-23/module/documents/Actor.mjs`) showed that `prepareDerivedData()` should call `_prepareCharacterDerivedData()` to calculate these values based on level and fundament settings.

## Solution
Added the missing calculation methods to `module/documents/actor.mjs`:

### Static Helper Methods
- `calculateVitality(functionKey, level, vitalityBoostCount)` - Formulas for VP:
  - `standard`: `4 * (level + boosts)`
  - `hardy`: `5 * (level + boosts + 1)`
- `calculateCoast(functionKey, level)` - Formulas for coast number:
  - `standard`: `4`
  - `cunning`: `5 + [7, 11, 16].filter(x => x <= level).length`

### Instance Methods
- `_prepareCharacterDerivedData()` - Called from `prepareDerivedData()` for pc/npc/eidolon types
- `_calculateMaxVitality(level)` - Uses fundament's `vitalityFunction` field
- `_calculateMaxStamina(level)` - Returns 4 (constant)
- `_calculateCoastNumber(level)` - Uses fundament's `coastFunction` field

### Data Flow
1. Level changes trigger actor update
2. `prepareDerivedData()` is called
3. For character types, `_prepareCharacterDerivedData()` recalculates:
   - `system.vitalityPoints.max`
   - `system.staminaPoints.max`
   - `system.coastNumber`
4. Current values are clamped to not exceed max
5. Actor sheet reads these in `_prepareContext()` at line 202-206

## Key Files
- `module/documents/actor.mjs` - **Modified** - Added all calculation logic
- `module/sheets/actor-sheet.mjs` - Reads `context.system.vitalityPoints?.max` (no changes needed)
- `template.json` - Defines fundament fields `vitalityFunction` and `coastFunction`

## Notes
- Characters need a **fundament** with `vitalityFunction` set for VP to scale with level
- Without a fundament, defaults to 12 VP, 4 SP, 4 coast
- "Extra VP" items (by name match) add to vitality boost count

## Related Context
This is part of the Z-Wolf Epic FoundryVTT v13 system rebuild. The project is going through phases rebuilding from an archived codebase, with proper v2 data model patterns.