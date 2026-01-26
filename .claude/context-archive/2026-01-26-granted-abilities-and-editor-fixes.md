# Context Archive: Granted Abilities & Rich Text Editor Fixes
**Date:** 2026-01-26

## Issues Addressed

### 1. Granted Ability Button Not Working (Track Tiers)
- **Symptom:** Button flashed red but no ability was added
- **Root cause:** `grantedAbilities` field was not defined in the data model schema (`item-base.mjs`), causing silent update failures in Foundry v13's v2 data model framework

### 2. Rich Text Editor Erasing Content on Edit
- **Symptom:** Clicking Edit button started with blank editor instead of existing content
- **Status:** IN PROGRESS - content retrieval works, but `.ProseMirror` element not found in expected DOM location

## Code Changes Made

### module/data-models/item-base.mjs
Added missing fields to `defineSchema()`:
```javascript
grantedAbilities: new fields.ObjectField({ required: false, initial: {} }),
sideEffects: new fields.ArrayField(
    new fields.ObjectField(),
    { required: false, initial: [] }
),
tags: new fields.StringField({ required: false, blank: true, initial: "" }),
required: new fields.StringField({ required: false, blank: true, initial: "" })
```

### templates/item/parts/item-abilities.hbs
**Simplified from tier-grouped display to flat list:**
- Single "+" button for all item types (removed 5 tier-specific buttons)
- Track items show Tier dropdown on each ability (via `showTier=(eq ../itemType "track")`)
- Removed tier grouping complexity that wasn't working

### templates/item/partials/tier-template.hbs
**Removed Granted Abilities section entirely:**
- Now only contains the Talent Menu section
- Abilities are managed in the Abilities tab with tier dropdown

### templates/item/parts/item-tiers.hbs
- Removed `abilitiesByTier` parameter from tier-template partial call (no longer needed)

### module/sheets/item-sheet.mjs
- Fixed `abilitiesByTier` to always initialize for track items (even with no abilities)
- Changed buttons from `<a>` to `<button type="button">` for proper action handling

### module/helpers/editor-save-handler.mjs
- Added debug logging to trace content loading
- Expanded search for `.ProseMirror` element to multiple DOM locations
- Current debug output shows content IS retrieved but element not found:
```
Z-Wolf Epic | Editor loading content for system.tiers.tier2.talentMenu : <p>@UUID[...]</p>
Z-Wolf Epic | Could not find .ProseMirror element
```

## Current State

### Granted Abilities
- Simplified to single flat list with tier dropdown
- Data model schema now includes required fields
- Should work after refresh (needs testing)

### Rich Text Editor (IN PROGRESS)
- Content retrieval: WORKING (console confirms correct HTML loaded)
- Content display: FAILING (`.ProseMirror` element not found)
- Next step: Check console for DOM structure debug output to locate actual ProseMirror element

## Key Architectural Decisions

1. **Flat ability list over tier-grouped:** Simpler implementation, consistent with Effects tab pattern
2. **Data model schema required:** Foundry v13 v2 framework requires fields in `defineSchema()` for updates to work
3. **Button element type:** Using `<button type="button">` instead of `<a>` for action triggers

## Files to Watch
- `module/data-models/item-base.mjs` - Schema definitions
- `module/helpers/editor-save-handler.mjs` - Rich text editor logic
- `templates/item/parts/item-abilities.hbs` - Abilities tab UI
- `templates/item/partials/tier-template.hbs` - Tier content (now just Talent Menu)