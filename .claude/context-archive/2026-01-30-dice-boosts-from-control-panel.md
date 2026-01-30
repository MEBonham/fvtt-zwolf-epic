# Dice Rolls Using Control Panel Boosts/Jinxes

**Date:** 2026-01-30
**Topic:** Fix character sheet dice rolls to use Control Panel's Boosts/Jinxes setting

## Summary

Fixed an issue where dice rolls triggered from the character sheet (Progression stats, Speed, Attributes, Skills) were ignoring the Boosts/Jinxes value set in the Control Panel and always rolling with 0 boosts.

## Problem

The dice system methods (`rollSkill`, `rollAttribute`, `rollSpeed`, `rollProgression`) had a default parameter of `netBoosts = null` and passed this directly to `performRoll()`. The `performRoll()` function converted `null` to `0` via `validateNetBoosts()`, ignoring the Control Panel setting.

The base `roll()` method already had correct logic to fetch from UI when netBoosts wasn't provided, but the other methods didn't.

## Solution

Added UI fetch logic to all four roll methods in `module/dice/dice-system.mjs`:

```javascript
// Get net boosts from UI if not provided
if (netBoosts === null || netBoosts === undefined) {
    netBoosts = ZWolfDiceUI.getNetBoosts();
}
```

## Files Changed

- **module/dice/dice-system.mjs** - Added UI fetch logic to:
  - `rollSkill()` (lines 65-68)
  - `rollAttribute()` (lines 101-104)
  - `rollSpeed()` (lines 137-140)
  - `rollProgression()` (lines 166-169)

## Key Files Reference

| File | Purpose |
|------|---------|
| `module/dice/dice-system.mjs` | Core dice rolling logic, public API |
| `module/dice/dice-ui.mjs` | Control Panel UI, `getNetBoosts()`/`setNetBoosts()` |
| `module/dice/dice-constants.mjs` | Dice system constants |
| `module/sheets/actor-sheet.mjs` | Actor sheet roll actions (lines 1986-2039) |

## Control Panel Architecture

- Boosts/Jinxes stored in DOM input element (`#zwolf-net-boosts`)
- `ZWolfDiceUI.getNetBoosts()` reads current value
- `ZWolfDiceUI.setNetBoosts(value)` sets value (clamped -10 to +10)
- Auto-reset setting resets to 0 after each roll if enabled