# Item UI Refinements
**Date:** 2026-01-26
**Topic:** Item sheet UI improvements - avatar size, editor padding, and ability defaults

## Summary

Three small UI refinements to the item sheet:
1. Increased item avatar size to match actors
2. Fixed missing editor padding in Granted Abilities edit mode
3. Changed default ability name to match parent item

## Changes Made

### 1. Item Avatar Size Increase

**File:** [styles/item-sheets.css](../../../styles/item-sheets.css)

**Lines 42-44:** Changed profile image size from 64x64px to 80x80px to match actor sheets:
```css
.zwolf-epic.sheet.item .sheet-header .profile-img {
    width: 80px;
    height: 80px;
    /* ... */
}
```

**Reference:** Actor avatar is 80x80px at [actor-sheets.css:50-52](../../../styles/actor-sheets.css#L50-L52)

### 2. Editor Padding for Granted Abilities

**File:** [styles/item-sheets.css](../../../styles/item-sheets.css)

**Problem:** Previous conversation (2026-01-26-granted-abilities-css-refinements.md) added padding `0.75rem 1.25rem` to editor view mode but missed edit mode ProseMirror editors within ability descriptions.

**Added lines 810-813 (compact variant):**
```css
.zwolf-epic.sheet.item .ability-description .prosemirror-editor .ProseMirror {
    padding: 0.75rem 1.25rem;
    min-height: 60px;
}
```

**Added lines 821-824 (expanded variant):**
```css
.zwolf-epic.sheet.item .main-description .prosemirror-editor .ProseMirror {
    padding: 0.75rem 1.25rem;
    min-height: 150px;
}
```

Now both view mode (`.editor-content`) and edit mode (`.prosemirror-editor .ProseMirror`) have consistent horizontal padding.

### 3. Granted Ability Default Name

**File:** [module/sheets/item-sheet.mjs](../../../module/sheets/item-sheet.mjs)

**Line 580:** Changed default ability name from localized "New Ability" to parent item's name:
```javascript
// Before:
name: game.i18n.localize("ZWOLF.NewAbility"),

// After:
name: this.item.name,
```

**Rationale:** Granted abilities typically share the same name as their parent item (e.g., a "Darkvision" knack grants a "Darkvision" ability).

## Files Modified

1. `styles/item-sheets.css` - Avatar size, editor padding for abilities
2. `module/sheets/item-sheet.mjs` - Default ability name

## Visual Impact

- Item avatars now match actor avatars at 80x80px
- Ability description editors (edit mode) now have proper left/right breathing room
- New abilities automatically inherit meaningful names from their parent items