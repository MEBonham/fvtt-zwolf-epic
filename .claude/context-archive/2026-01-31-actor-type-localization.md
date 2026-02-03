# Actor Type Localization Strings

**Date:** 2026-01-31
**Topic:** Adding TYPES.Actor.* localization entries

## Summary

Added missing FoundryVTT v13 localization strings for Actor types. The `TYPES.Actor.<type>` pattern is used by Foundry to display actor type labels in the UI (e.g., in create dialogs, sheet headers).

## Changes Made

**File:** `lang/en.json`

Added `TYPES.Actor` section with all 5 actor types defined in `template.json`:

```json
"TYPES": {
    "Actor": {
        "pc": "Player Character",
        "npc": "NPC",
        "eidolon": "Eidolon",
        "mook": "Mook",
        "spawn": "Spawn"
    },
    "Item": { ... }
}
```

## Reference

Actor types from `template.json`:
- `pc` - Player Character (has wealth, karma points)
- `npc` - Non-Player Character (has wealth)
- `eidolon` - Summoned creature with Gemini trait (shares bond with summoner)
- `mook` - Simplified creature with Shape Ally trait
- `spawn` - Mirrored creature with Swarmer trait