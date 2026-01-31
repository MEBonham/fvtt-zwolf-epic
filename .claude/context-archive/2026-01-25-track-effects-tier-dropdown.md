# Track Item Effects Tab Restructure

**Date:** 2026-01-25
**Topic:** Restructured Track item Effects tab to use flat list with tier dropdowns instead of visual tier separation

## Problem

The Effects tab for Track items had two issues:
1. Side effects were visually separated into tier groups (Tier 1-5 sections)
2. Missing "Add Side Effect" buttons

User wanted a flat list where each side effect has its own tier dropdown (1-5) instead.

## Solution

### Data Structure Changes

**[template.json](c:\Users\micro\AppData\Local\FoundryVTT\Data\systems\zwolf-epic\template.json)**
- Changed track items to use `sideEffectsCapable` template (includes flat `sideEffects` array)
- Removed old `tierSideEffects` structure (array of 5 tier objects)
- Each side effect now has a `tier` property (1-5)

```json
"track": {
    "templates": ["base", "sideEffectsCapable", "tagged"],
    // ... rest of config
}
```

### Template Changes

**[templates/item/partials/side-effects-form.hbs](c:\Users\micro\AppData\Local\FoundryVTT\Data\systems\zwolf-epic\templates\item\partials\side-effects-form.hbs)**
- Added tier dropdown that appears for Track items only
- Positioned between Type and Value fields
- Dropdown shows "Tier 1" through "Tier 5"
- Removed tier-specific data attributes from containers

```handlebars
{{#if (eq ../itemType "track")}}
  <div class="side-effect-tier">
    <label>{{localize 'ZWOLF.Tier'}}</label>
    <select name="{{this.pathPrefix}}.tier" data-dtype="Number">
      <option value="1" {{selected 1 this.tier}}>{{localize 'ZWOLF.Tier'}} 1</option>
      <!-- ... tiers 2-5 -->
    </select>
  </div>
{{/if}}
```

**[templates/item/parts/item-effects.hbs](c:\Users\micro\AppData\Local\FoundryVTT\Data\systems\zwolf-epic\templates\item\parts\item-effects.hbs)**
- Track items now show flat list (same pattern as other item types)
- Removed tier grouping sections
- Added "Add Side Effect" button (was missing)

### Sheet Logic Changes

**[module/sheets/item-sheet.mjs](c:\Users\micro\AppData\Local\FoundryVTT\Data\systems\zwolf-epic\module\sheets\item-sheet.mjs)**

**Data Preparation (_prepareContext):**
- Removed track-specific `tierSideEffectsArray` and `tierSideEffectsByTier` preparation
- All items now use same sideEffects preparation logic

**Add Side Effect (#onAddSideEffect):**
- Simplified to use `system.sideEffects` for all items
- Adds `tier: 1` as default for track items

```javascript
if (this.item.type === "track") {
    newEffect.tier = 1;
}
```

**Delete Side Effect (#onDeleteSideEffect):**
- Simplified to always use `system.sideEffects` path
- Removed tier-specific logic

**Form Submission (_onSubmitForm):**
- Removed track-specific tier processing
- All items process `system.sideEffects` uniformly

### CSS Styling

**[styles/item-sheets.css](c:\Users\micro\AppData\Local\FoundryVTT\Data\systems\zwolf-epic\styles\item-sheets.css)**
- Added conditional grid layout for track items with tier dropdown
- Track items: `grid-template-columns: 1fr 0.5fr 2fr auto` (Type | Tier | Value | Delete)
- Non-track items: `grid-template-columns: 1fr 2fr auto` (Type | Value | Delete)
- Tier dropdown is 0.5fr (~30% of Type column width)

```css
/* Track items have tier dropdown - adjust grid layout */
.zwolf-epic.sheet.item .side-effect-item:has(.side-effect-tier) .side-effect-controls {
    grid-template-columns: 1fr 0.5fr 2fr auto;
}
```

### Localization

**[lang/en.json](c:\Users\micro\AppData\Local\FoundryVTT\Data\systems\zwolf-epic\lang\en.json)**
- Added `TrackSideEffectsDescription`: "Configure side effects for this track. Use the tier dropdown to specify which tier each effect applies to."

### Migration

**[.claude/migration-track-side-effects-flat.js](c:\Users\micro\AppData\Local\FoundryVTT\Data\systems\zwolf-epic\.claude\migration-track-side-effects-flat.js)**
Created migration script to convert existing track items:
- Flattens `tierSideEffects` array into flat `sideEffects` array
- Adds `tier` property to each effect based on source tier
- Removes old `tierSideEffects` property
- Usage: Open F12 console, paste script, press Enter

## Current State

Track items on Effects tab now:
1. Show all side effects in single flat list
2. Each effect has Type | Tier | Value | Delete controls
3. Tier dropdown compact (30% smaller than type column)
4. "Add Side Effect" button creates effects with tier=1 default
5. Effects stored in `system.sideEffects` with `tier` property

## Files Modified

- `template.json` - Track data structure
- `templates/item/partials/side-effects-form.hbs` - Tier dropdown
- `templates/item/parts/item-effects.hbs` - Flat list layout
- `module/sheets/item-sheet.mjs` - Data prep and form handling
- `styles/item-sheets.css` - Grid layout for tier dropdown
- `lang/en.json` - Description text
- `.claude/migration-track-side-effects-flat.js` - Migration script (new file)

## Related Context

This change aligns Track items with other item types (ancestry, knack, talent, etc.) that use flat `sideEffects` arrays. The tier information is now a property of each effect rather than organizing effects into separate tier containers.