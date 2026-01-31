# Tier Side Effects and Delete Handler Fixes
**Date:** 2026-01-24
**Phase:** 4 (Track Tiers)

## Summary

Fixed two issues with Track Item Tiers:
1. Side Effects select elements showing no selectable options
2. Delete handler for Granted Abilities within Tiers not working

## Root Causes

### Issue 1: Side Effects Select Options Empty
The `side-effects-form.hbs` partial requires `config` (for `config.proficiencies` and `config.damageTypes`) and `itemType` to render options. These weren't being passed correctly through the partial chain due to Handlebars context navigation issues.

**Problem:** In `tier-template.hbs`, the partial was using `config=../config` and `itemType=../itemType` when these values were already passed as direct parameters to the partial.

### Issue 2: Delete Handler Not Working
The `removeTierAbility` method in `Item.mjs` used the wrong pattern for deleting nested object keys in Foundry. Simply spreading the object and deleting a key doesn't properly signal to Foundry that a key was removed.

**Problem:** Foundry requires the `-=` prefix syntax to delete nested keys (e.g., `system.path.-=keyToDelete`).

## Changes Made

### 1. tier-template.hbs
**File:** `templates/item/partials/tier-template.hbs`

- **Line 6:** Fixed editor context at partial root level:
  ```handlebars
  {{editor ... owner=owner editable=editable}}
  ```
  (was `owner=../owner editable=../editable`)

- **Lines 51-52:** Fixed side-effects-form partial call:
  ```handlebars
  config=config
  itemType=itemType
  ```
  (was `config=../config` and `itemType=../itemType`)

### 2. Item.mjs - removeTierAbility
**File:** `module/documents/Item.mjs:72-78`

Changed from spreading/deleting to using Foundry's deletion syntax:
```javascript
async removeTierAbility(tier, abilityId) {
    if (this.type !== "track" || tier < 1 || tier > 5) return;

    // Use Foundry's -= deletion syntax to properly remove nested keys
    await this.update({
        [`system.tiers.tier${tier}.grantedAbilities.-=${abilityId}`]: null
    });
}
```

### 3. item-sheet.mjs - #onDeleteAbility
**File:** `module/sheets/item-sheet.mjs:323-326`

Fixed regular ability deletion to also use `-=` syntax:
```javascript
await this.item.update({
    [`system.grantedAbilities.-=${abilityId}`]: null
});
```

### 4. Localization Keys
**File:** `lang/en.json`

Added missing keys for effects tab:
- `EffectNotes`
- `TalentEffectNotes`
- `TrackEffectNotes`
- `EquipmentEffects`
- `EquipmentEffectNotes`
- `EquippedActive`
- `EquippedInactive`

## Technical Notes

### Handlebars Partial Context Rules
- When a partial receives explicit parameters like `{{> partial param=value}}`, those become direct properties of the partial's context
- At the partial's root level, access them directly: `param` not `../param`
- Inside block helpers like `{{#each}}`, use `../param` to access the partial's root context

### Foundry Deletion Syntax
- To delete a nested key: `path.to.object.-=keyName`: null`
- Simply reassigning the parent object without the key doesn't reliably delete it
- The `-=` prefix is Foundry's convention for signaling key deletion

## Files Modified
- `templates/item/partials/tier-template.hbs`
- `module/documents/Item.mjs`
- `module/sheets/item-sheet.mjs`
- `lang/en.json`

## Current State
Track Tiers tab now fully functional:
- Side effects form renders all options (proficiencies, damage types, progression selects)
- Granted abilities can be added, edited, and deleted at tier level
- Rich text editors work for talent menus and ability descriptions