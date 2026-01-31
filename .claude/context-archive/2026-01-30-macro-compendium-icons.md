# Macro Compendium Icons and Polish
**Date:** 2026-01-30
**Topic:** Updating macro compendium with custom icons and GM protections

---

## Summary

This session focused on updating the Z-Wolf Epic macro compendium with custom AI-generated icons and adding polish to the GM-only macros.

## Key Changes

### 1. Custom Macro Icons
Updated all 10 macros in `ZWOLF_MACROS` array to use custom icons stored in `assets/icons/macros/`:

| Macro | Image File |
|-------|------------|
| GM: Advance Encounter | Advance-Turn.png |
| GM: Initiative Launch | Initiate-Encounter.png |
| Default Threat | Mediocre-Check.png |
| Apply Damage | Apply-Damage.png |
| Fortitude Check | Fortitude-Check.png |
| Willpower Check | Willpower-Check.png |
| Agility Check | Agility-Check.png |
| Perception Check | Perception-Check.png |
| Speed Check | Speed-Check.png |
| GM: Log Activity | Log-Activity.png |

### 2. Macro Renames
Three macros renamed with "GM: " prefix to indicate they're GM-only:
- `Advance Encounter` → `GM: Advance Encounter`
- `Initiative Launch` → `GM: Initiative Launch`
- `Log Activity` → `GM: Log Activity`

### 3. GM Protection Added
Added GM check to "GM: Advance Encounter" macro for better UX:
```javascript
if (!game.user.isGM) {
    ui.notifications.warn("Only the GM can use this macro.");
    return;
}
```
Note: "GM: Initiative Launch" already had this check.

## Technical Notes

### Image Distribution
- Images for distribution must be in system folder (e.g., `assets/`)
- World-specific paths (`worlds/...`) won't be included in system distribution
- Same applies to item icons

### Macro Permissions
- GM checks in macros are UX improvements, not security
- Foundry's document permission system is the real security layer
- `actor.isOwner` checks prevent unauthorized modifications
- Combat operations like `combat.nextTurn()` fail silently for non-GMs

### Console Script for Extracting Macro Icons
```javascript
const pack = game.packs.get("zwolf-epic.macros");
for (const entry of pack.index) {
    const macro = await pack.getDocument(entry._id);
    console.log(`${macro.name}: ${macro.img}`);
}
```

## Files Modified
- `module/helpers/compendium-macros.mjs` - Updated all `img` paths, renamed 3 macros, added GM check to Advance Encounter

## Context from Previous Session
The macro compendium system was implemented with:
- Version-aware auto-population (only adds missing macros)
- `systemMacroId` flag tracking (allows user renames without affecting updates)
- World setting for version tracking (`macrosCompendiumVersion`)
- 10 macros covering combat, checks, and utility functions

## Current State
All macros are configured with:
- Custom icons in `systems/zwolf-epic/assets/icons/macros/`
- Appropriate GM prefixes and protections
- Ready for distribution with the system