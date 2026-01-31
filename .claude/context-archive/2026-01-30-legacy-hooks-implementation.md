# Context Archive: Legacy Hooks Implementation
**Date:** 2026-01-30
**Topic:** Implementing missing legacy features from archive (hooks, rest conditions)

## Summary

Reviewed Phase 18 status and compared current codebase against `archive 2026-01-23/` to identify missing legacy features. Phase 18 (Progression accordion, Rich text editors, Notifications) was already fully implemented.

## Missing Features Identified

From archive comparison, these features were missing:
1. **Combat hooks** - Custom initiative system with attribute/skill selection
2. **Token hooks** - HUD modifications, detection mode filtering
3. **UI hooks** - Actor directory level display
4. **Condition logger** - Chat messages for condition changes
5. **Rest condition application** - Suffused on rest, Bruised removal on extended rest

**Excluded from implementation** (per user decision):
- Macro hotbar system (not needed)
- Item sheet full tabs (determined unnecessary during item sheet rebuild)

## Files Created

### module/hooks/combat.mjs
Custom initiative system:
- Adds d12 button to combat tracker header
- Dialog to select attribute or skill for initiative
- Integrates with ZWolfDice boost/jinx system
- Uses `calculateProgressionBonuses` from progression-calculator
- Tiebreaker multiplier (1.001) for initiative values

### module/hooks/token.mjs
Token modifications:
- Removes "movement actions" and "target toggle" HUD buttons
- Sets `lockRotation: true` on token creation
- Filters out `basicSight` and `lightPerception` detection modes

### module/hooks/ui.mjs
Actor directory enhancement:
- Displays "(Lv X)" next to actor names in sidebar
- Only for `character` and `npc` actor types

### module/hooks/condition-logger.mjs
Condition change logging:
- Hooks into `createActiveEffect` and `deleteActiveEffect`
- Posts chat messages when conditions added/removed from tokens
- Shows token name, condition, and user who made the change

## Files Modified

### module/sheets/actor-sheet.mjs
Added condition helper methods and updated rest actions:

```javascript
// New private methods (lines ~2030-2066)
async #addCondition(conditionId) { ... }
async #removeCondition(conditionId) { ... }
```

**Short Rest** (`#onShortRest`):
- Now applies Suffused condition after restoring VP

**Extended Rest** (`#onExtendedRest`):
- Now applies Suffused condition
- Removes Bruised condition
- Shows reminder if actor has Dying/Wounded conditions

### module/zwolf-epic.mjs
Added imports and registration calls:
```javascript
import { registerCombatHooks } from "./hooks/combat.mjs";
import { registerTokenHooks } from "./hooks/token.mjs";
import { registerActorDirectoryHook } from "./hooks/ui.mjs";
import { registerConditionLogger } from "./hooks/condition-logger.mjs";
```

All registered in `init` hook after `registerItemHooks()`.

### lang/en.json
Added ~50 new localization strings:
- Initiative-related: `RollInitiative`, `RollInitiativeUsing`, `NoActiveCombat`, etc.
- Rest-related: `GainSuffused`, `RemoveBruised`, `FortitudeReminder`, `ExtendedRestCompleteWithReminder`
- Condition names and descriptions: All conditions from config.mjs now have localized labels

## Architecture Notes

- Combat hooks use existing `ZWolfDice` and `calculateProgressionBonuses` helpers
- Condition application uses `statuses` Set (v13 pattern) rather than `flags.core.statusId`
- Actor sheet condition helpers are private instance methods (`#addCondition`, `#removeCondition`)
- All hooks register in `init` hook for early availability

## Current State

All legacy hook features are now implemented. The codebase matches archive functionality except for:
- Macro hotbar (intentionally excluded)
- Item sheet tabs (intentionally excluded - determined unnecessary)
- `ActorDataCalculator` helper class (logic embedded in actor-sheet.mjs - architectural difference)

## Dependencies

Combat hooks depend on:
- `module/dice/dice-system.mjs` - ZWolfDice class
- `module/helpers/progression-calculator.mjs` - calculateProgressionBonuses function