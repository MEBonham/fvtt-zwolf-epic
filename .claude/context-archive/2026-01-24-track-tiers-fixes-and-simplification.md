# Track Tiers Fixes and Simplification
**Date:** 2026-01-24
**Phase:** 4 (Track Tiers)

## Summary

Fixed three minor issues with the Track Tiers tab and simplified the Track item structure by removing top-level granted abilities (they now only exist at the tier level).

## Issues Identified

1. **Missing localization**: `ZWOLF.TrackTiers` had no localization key
2. **Orphaned reference**: `ZWOLF.TrackTiersHint` was referenced but didn't exist
3. **Incomplete Side Effects form**: Resistances and Vulnerabilities multi-select checkboxes weren't showing up in tier-level side effects
4. **Redundant structure**: Track items had both top-level and tier-level granted abilities

## Changes Made

### 1. Localization Fixes

**File:** `lang/en.json:35`
```json
"TrackTiers": "Track Tiers",
```

**File:** `templates/item/parts/item-tiers.hbs:5`
- Removed the `<p class="notes">{{localize 'ZWOLF.TrackTiersHint'}}</p>` line

### 2. Fixed Side Effects Form Data Passing

**File:** `templates/item/parts/item-tiers.hbs:22-23`
```handlebars
config=../../config
itemType=../../itemType
```
- Added these parameters to tier-template partial call

**File:** `templates/item/partials/tier-template.hbs:49-50`
```handlebars
config=../config
itemType=../itemType
```
- Passed through to side-effects-form partial

This fixed the resistances/vulnerabilities checkboxes not rendering because `config.damageTypes` wasn't available.

### 3. Simplified Track Item Structure

Removed top-level granted abilities from Track items since abilities should only exist at tier level.

**File:** `module/sheets/item-sheet.mjs:139-141`
```javascript
// Note: Tracks have tier-level abilities only, not top-level abilities
const TYPES_WITH_ABILITIES = ["fundament", "equipment", "knack", "talent", "ancestry", "attunement", "universal"];
```
- Removed "track" from the array

### 4. Implemented Tier-Level Ability Management

**File:** `module/documents/Item.mjs:35-88`

Added two methods:
- `addTierAbility(tier)`: Creates new ability with random ID in specified tier
- `removeTierAbility(tier, abilityId)`: Removes ability from specified tier

Both methods:
- Validate track type and tier range (1-5)
- Use randomID() for unique ability keys
- Update using standard Foundry update pattern

**File:** `module/sheets/item-sheet.mjs`

Added action handlers:
- `#onAddTierAbility`: Lines 314-326
- `#onDeleteTierAbility`: Lines 334-365 (includes confirmation dialog)

Registered actions in DEFAULT_OPTIONS:
```javascript
"add-tier-ability": ZWolfItemSheet.#onAddTierAbility,
"delete-tier-ability": ZWolfItemSheet.#onDeleteTierAbility
```

Added tier ability processing in `_prepareContext` (lines 173-194):
```javascript
if (this.item.type === "track" && this.item.system.tiers) {
    for (let tierNum = 1; tierNum <= 5; tierNum++) {
        const tierKey = `tier${tierNum}`;
        const tierData = this.item.system.tiers[tierKey];

        if (tierData && tierData.grantedAbilities) {
            tierData.grantedAbilitiesArray = Object.entries(tierData.grantedAbilities).map(([id, ability]) => ({
                ...ability,
                id,
                tierNumber: tierNum,
                nameTarget: `system.tiers.${tierKey}.grantedAbilities.${id}.name`,
                // ... other targets
                deleteAction: "delete-tier-ability"
            }));
        } else if (tierData) {
            tierData.grantedAbilitiesArray = [];
        }
    }
}
```

**File:** `templates/item/partials/tier-template.hbs:29-41`
- Updated to pass `id`, `owner`, and all necessary data to ability-item partial

**File:** `templates/item/partials/ability-item.hbs:2`
- Moved `data-tier` attribute to root div for easier targeting by delete handler

## Technical Notes

### Data Flow for Tier Abilities

1. User clicks "Add Ability" button with `data-action="add-tier-ability"` and `data-tier="X"`
2. Action handler calls `item.addTierAbility(tier)`
3. Item method generates random ID and updates `system.tiers.tierX.grantedAbilities`
4. Sheet re-renders, `_prepareContext` processes abilities into array format
5. Template receives properly formatted `grantedAbilitiesArray` with all targets

### Delete Flow

1. Delete button has `data-action="delete-tier-ability"`
2. Handler finds closest `[data-ability-id]` which also has `[data-tier]`
3. Shows confirmation dialog with ability name
4. Calls `item.removeTierAbility(tier, abilityId)`
5. Sheet re-renders with ability removed

## Current State

- Track items now have clean separation: tier-level abilities only
- All tier abilities can be added, edited, and deleted
- Side effects form (including resistances/vulnerabilities) displays properly at tier level
- Localization complete for Track Tiers tab

## Related Files

**Modified:**
- `lang/en.json`
- `module/documents/Item.mjs`
- `module/sheets/item-sheet.mjs`
- `templates/item/parts/item-tiers.hbs`
- `templates/item/partials/tier-template.hbs`
- `templates/item/partials/ability-item.hbs`

**Key Dependencies:**
- `module/helpers/config.mjs` (defines CONFIG.ZWOLF.damageTypes)
- `templates/item/partials/side-effects-form.hbs` (consumes config and itemType)

## Next Steps

Phase 4 appears complete. Track Tiers tab is now fully functional with:
- ✅ 5 tier accordion sections
- ✅ Talent menu rich text editor per tier
- ✅ Character tags input per tier
- ✅ Granted abilities management per tier
- ✅ Complete side effects form per tier (including resistances/vulnerabilities)