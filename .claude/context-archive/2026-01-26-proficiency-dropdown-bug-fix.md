# Proficiency Dropdown Bug Fix

**Date:** 2026-01-26
**Topic:** Fixed proficiency dropdowns showing only categories instead of options

---

## Summary

Fixed a regression bug where Effects (Side Effects) proficiency dropdowns only displayed category headers (Seed Proficiencies, Weapon Proficiencies, Miscellaneous Proficiencies) without showing the actual proficiency options inside them.

## Context

### Project State
- **System:** Z-Wolf Epic for FoundryVTT v13
- **Branch:** cleanup-3
- **Phase:** Post-Phase 7 (side effects implementation complete)
- **Bug Origin:** Introduced in recent conversations during Phase 7 work

### Issue Description
When editing an item's Effects tab and selecting "Proficiency" as a side effect type, the dropdown showed:
- ✅ Category labels (Seed Proficiencies, Weapon Proficiencies, etc.)
- ❌ No actual options (Aether Seed, Air Seed, swords, axes, etc.)

## Root Cause

**Two related issues:**

1. **Incorrect Handlebars context path:**
   - Template used `../../config.proficiencies` to access proficiencies
   - Should be `../config.proficiencies` (only one level up)
   - Handlebars `#if` blocks don't create new contexts
   - From `{{#each sideEffectsArray}}` loop, only need to go up one level to root

2. **Unnecessary localization:**
   - Proficiency labels in `config.mjs` are plain text: `"Aether Seed"`, `"swords"`, etc.
   - Template was trying to localize them with `{{localize this.label}}`
   - JavaScript was trying to localize with `game.i18n.localize(prof.label)`
   - Should use raw `this.label` / `prof.label` values directly

## Changes Made

### File 1: `templates/item/partials/side-effects-form.hbs`

#### Proficiency Dropdown (Lines 78-111)
```handlebars
<!-- BEFORE -->
{{#each ../../config.proficiencies}}
  {{#if (eq this.type 'seed')}}
    <option value="{{@key}}" {{selected @key ../this.value}}>
      {{localize this.label}}
    </option>
  {{/if}}
{{/each}}

<!-- AFTER -->
{{#each ../config.proficiencies}}
  {{#if (eq this.type 'seed')}}
    <option value="{{@key}}" {{selected @key ../this.value}}>
      {{this.label}}
    </option>
  {{/if}}
{{/each}}
```

**Changes:**
- `../../config.proficiencies` → `../config.proficiencies` (3 instances)
- `{{localize this.label}}` → `{{this.label}}` (3 instances)
- Applied to all three proficiency types: seed, weapon, miscellaneous

#### Damage Type Dropdowns (Lines 177-201)
```handlebars
<!-- BEFORE -->
{{#each ../../config.damageTypes}}

<!-- AFTER -->
{{#each ../config.damageTypes}}
```

**Changes:**
- `../../config.damageTypes` → `../config.damageTypes` (2 instances for resistance and vulnerability)
- Damage types kept `{{localize this.label}}` because they ARE localization keys in config.mjs

### File 2: `module/sheets/item-sheet.mjs`

#### Method: `_buildProficiencySelect()` (Lines 208-240)
```javascript
// BEFORE
html += `<option value="${key}" ${currentValue === key ? "selected" : ""}>${game.i18n.localize(prof.label)}</option>`;

// AFTER
html += `<option value="${key}" ${currentValue === key ? "selected" : ""}>${prof.label}</option>`;
```

**Changes:**
- Removed `game.i18n.localize()` wrapper from `prof.label` (3 instances)
- Applied to all three proficiency types: seed, weapon, miscellaneous
- This method dynamically rebuilds the dropdown when user changes effect type

## Technical Details

### Handlebars Context Nesting
```
Root context (contains: config, sideEffectsArray, editable, etc.)
  ↓
{{#each sideEffectsArray}} - creates new context (this = side effect object)
  ↓
{{#if (eq this.type 'proficiency')}} - does NOT create new context
  ↓
{{#each ../config.proficiencies}} - go up ONE level to root, access config
    ↓
    this = proficiency object
```

### Config Data Structure Reference
From `module/helpers/config.mjs`:
```javascript
ZWOLF.proficiencies = {
  "aether": {
    type: "seed",
    label: "Aether Seed"  // Plain text, not localization key
  },
  "sword": {
    type: "weapon",
    label: "swords"  // Plain text
  },
  // ...
};

ZWOLF.damageTypes = {
  "fire": {
    label: "ZWOLF.DamageHeat",  // IS a localization key
    icon: "...",
    color: "#ff4500"
  },
  // ...
};
```

## Testing Verification

To verify the fix works:
1. Open any item that supports side effects (ancestry, knack, talent, track, etc.)
2. Go to Effects tab
3. Add a side effect or edit existing one
4. Change type dropdown to "Proficiency"
5. Check value dropdown shows:
   - ✅ "None" option
   - ✅ "Seed Proficiencies" optgroup header
   - ✅ Individual seed options (Aether Seed, Air Seed, etc.)
   - ✅ "Weapon Proficiencies" optgroup header
   - ✅ Individual weapon options (swords, axes, bows, etc.)
   - ✅ "Miscellaneous Proficiencies" optgroup header
   - ✅ Individual misc options (<Unarmed> weapons, improvised weapons)

## Related References

### Affected Templates
- `templates/item/partials/side-effects-form.hbs` - Item side effects form

### Affected Code
- `module/sheets/item-sheet.mjs` - Item sheet with dynamic dropdown builder

### Related Config
- `module/helpers/config.mjs` - ZWOLF.proficiencies, ZWOLF.damageTypes

### Previous Context
- `.claude/context-archive/2026-01-26-phase7-side-effects-implementation.md` - Phase 7 implementation that introduced side effects system

---

**Status:** Bug fixed. Proficiency dropdowns now properly populate with all options.