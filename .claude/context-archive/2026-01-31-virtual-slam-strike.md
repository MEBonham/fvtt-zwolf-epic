# Virtual Slam Strike Implementation

**Date**: 2026-01-31
**Topic**: Adding virtual Slam Strike item to all actors

## Summary

Implemented a virtual item system that provides every Actor with a Slam Strike granted ability, following the pattern from the legacy archive version.

## Key Decisions

- Virtual items are not stored in the database but appear in the UI
- Items marked with `flags["zwolf-epic"].isVirtual = true` and `locked = true`
- Virtual items processed in `_gatherGrantedAbilities()` after regular actor items
- Used static ability ID (`slamStrike`) instead of numeric keys from legacy version

## Files Created

### `module/data/default-items.mjs`
New file containing:
- `SLAM_STRIKE` constant - virtual item data with:
  - `_id`: "ZWVirtualSlam000"
  - `name`: "Slam"
  - `type`: "universal"
  - Single granted ability of type "strike" with description: `<Unarmed> weapon; range Melee 0m; Damage Type Bludgeoning.`
- `getVirtualItems()` function - returns array of virtual item objects for processing

## Files Modified

### `module/sheets/actor-sheet.mjs`
- Added import for `getVirtualItems` from `../data/default-items.mjs` (line 8)
- Modified `_gatherGrantedAbilities()` method (lines 619-624) to process virtual items after regular actor items

## Legacy Reference

The legacy implementation was in `archive 2026-01-23/module/data/default-items.mjs` which included:
- Slam Strike
- Universal Activities (dominant/swift/reaction/free actions)
- Proficiencies Summary (dynamic)

Current implementation only includes Slam Strike. Additional virtual items can be added to `getVirtualItems()` as needed.

## Current State

- Virtual Slam Strike appears in all actors' granted abilities under "strike" category
- No database storage required
- Follows same pattern as legacy but with updated data model format (array sideEffects, object grantedAbilities with string keys)