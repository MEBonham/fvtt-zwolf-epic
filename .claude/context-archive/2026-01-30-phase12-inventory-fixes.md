# Context Archive: Phase 12 Inventory Fixes
**Date:** 2026-01-30
**Topic:** Max Bulk and Attunement Slot Corrections

---

## Summary

This session addressed two calculation bugs in the Phase 12 Equipment/Inventory implementation:

1. **Max Bulk** was not accounting for Brawn Progression
2. **Attunement Slots** had wrong formula and incorrect "overextended" mechanic

---

## Key Fixes

### Max Bulk Calculation
**File:** [actor-sheet.mjs:1442-1464](module/sheets/actor-sheet.mjs#L1442-L1464)

**Before:** `baseBulk + bulkBoost + (sizeModifier * 2)` — missing Brawn

**After:** Complete formula:
- Base: 10
- Size modifier: diminutive (-12), tiny (-8), small (-4), medium (0), large (+4), huge (+8), gargantuan (+12), colossal (+16), titanic (+20)
- Brawn progression: mediocre (+0), moderate (+3), specialty (+6), awesome (+9)
- Bulk capacity boosts from side effects
- Minimum of 1

```javascript
const sizeModifiers = {
    "diminutive": -12, "tiny": -8, "small": -4, "medium": 0,
    "large": 4, "huge": 8, "gargantuan": 12, "colossal": 16,
    "titanic": 20
};
const brawnBonus = { "mediocre": 0, "moderate": 3, "specialty": 6, "awesome": 9 };
```

### Attunement Slot System
**File:** [actor-sheet.mjs:1494-1567](module/sheets/actor-sheet.mjs#L1494-L1567)

**Slot Formula Fix:**
- **Before:** `Math.max(1, Math.floor(characterLevel / 5) + 1)` — wrong
- **After:** `Math.floor((level + 3) / 4)` — correct
  - Level 1: 1 slot
  - Level 2-5: 2 slots
  - Level 6-9: 3 slots, etc.

**Overextended Slot Mechanic:**
- The **LAST slot** is always "overextended" — using it causes the character to be continually **Shaken**
- `hasOverextended` is true only when the last slot actually contains an attunement
- Previously, "overextended" incorrectly referred to attunement tier exceeding slot tier

---

## Files Modified

| File | Changes |
|------|---------|
| `module/sheets/actor-sheet.mjs` | Fixed `_calculateInventoryTotals()` and `_prepareAttunementSlots()` |
| `lang/en.json` | Updated overextended warning strings to mention Shaken |
| `styles/actor-sheets.css` | Added `.attunement-warning` styling |
| `templates/actor/parts/actor-inventory-content.hbs` | Enabled warning display |

---

## Localization Updates

```json
"OverextendedSlotWarning": "Using this slot causes long-term Shaken",
"OverextendedSlotTooltip": "Using this slot causes long-term Shaken",
"OverextendedAttunementWarning": "Warning: The overextended attunement slot (last slot) causes the character to be Shaken as long as it is used."
```

---

## Reference: Archive Implementation

Source patterns from `archive 2026-01-23/module/helpers/actor-data-calculator.mjs`:
- Lines 1421-1436: Max bulk calculation with size and brawn
- Lines 1482-1526: Attunement slot preparation with overextended mechanic

---

## Current State

Phase 12 Equipment/Inventory is complete with all formulas matching the archive reference:
- ✅ Equipment placement states (wielded, worn, readily_available, stowed, not_carried)
- ✅ Bulk calculation (excludes not_carried items)
- ✅ Max Bulk with size + Brawn + boosts
- ✅ Attunement slots with correct formula
- ✅ Overextended (Shaken) slot warning system
- ✅ Wealth management with gain/lose dialogs
- ✅ Full CSS styling for inventory tab