# Phase 16: Rest & Wealth Implementation
**Date:** 2026-01-30
**Topic:** Implementing rest mechanics and fixing calculatedValues for actor sheet

## Summary

Implemented Phase 16 of the Z-Wolf Epic system roadmap, which covers Rest & Wealth functionality. The wealth handlers were already implemented; the main work was adding rest functionality and fixing missing template data.

## Key Findings

### Already Complete
- Wealth gain/lose UI and handlers in actor-sheet.mjs (lines 1817-1889)
- Rest button templates in actor-header.hbs (lines 140-159)
- CSS styling for rest buttons in actor-sheets.css
- Basic localization strings (ShortRest, ExtendedRest, tooltips)

### Missing/Fixed
- `calculatedValues` was referenced in templates but never populated in `_prepareContext()`
- Rest action handlers (`shortRest`, `extendedRest`) were not registered or implemented

## Code Changes

### 1. module/sheets/actor-sheet.mjs

**Added calculatedValues to _prepareContext() (lines 201-206):**
```javascript
context.calculatedValues = {
    maxVitality: context.system.vitalityPoints?.max ?? 12,
    maxStamina: context.system.staminaPoints?.max ?? 4,
    coastNumber: context.system.coastNumber ?? 4
};
```

**Added actions to DEFAULT_OPTIONS (lines 44-45):**
```javascript
shortRest: ZWolfActorSheet.#onShortRest,
extendedRest: ZWolfActorSheet.#onExtendedRest,
```

**Implemented #onShortRest handler (lines 1901-1937):**
- Checks for available stamina (warns if 0)
- Shows DialogV2.confirm() with effects list
- Spends 1 SP, restores VP to max
- Shows success notification

**Implemented #onExtendedRest handler (lines 1945-1975):**
- Shows DialogV2.confirm() with effects list
- Restores both SP and VP to max
- Shows success notification

### 2. lang/en.json

Added localization strings after line 393:
- `ShortRestConfirm`: "Take a Short Rest?"
- `ShortRestComplete`: "Short Rest completed. Vitality restored."
- `ExtendedRestConfirm`: "Take an Extended Rest?"
- `ExtendedRestComplete`: "Extended Rest completed. All resources restored."
- `NoStaminaForRest`: "You don't have any Stamina Points to spend on a Short Rest."
- `SpendStamina`: "Spend 1 Stamina Point ({current} → {new})"
- `RestoreVitality`: "Restore Vitality Points to maximum"
- `RestoreStamina`: "Restore Stamina Points to maximum"
- `RestFailed`: "Failed to complete rest."

## Rest Mechanics

| Rest Type | Cost | Effect |
|-----------|------|--------|
| Short Rest | 1 SP | Restore VP to max |
| Extended Rest | None | Restore SP and VP to max |

## Reference Files

- Archive reference: `/archive 2026-01-23/module/helpers/rest-handler.mjs` - Contains more complex rest logic with conditions (Suffused, Bruised) that was simplified for this implementation
- Template data: `template.json` lines 43-52 define vitalityPoints and staminaPoints with value/min/max structure

## Notes

- The archive version had condition management (add Suffused, remove Bruised) which was not implemented in this simplified version
- Wealth dice rolling system (from archive wealth-system.mjs) was not needed as simple +/- wealth adjustments were already functional
- DialogV2.confirm() is the v13-compatible dialog approach used throughout