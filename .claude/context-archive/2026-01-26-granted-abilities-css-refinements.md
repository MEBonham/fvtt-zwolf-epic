# Granted Abilities CSS Refinements
**Date:** 2026-01-26
**Topic:** Item sheet CSS improvements for Granted Abilities interface and rich text editor

## Summary

Applied CSS refinements to the item sheet's Granted Abilities interface and rich text editor styling.

## Changes Made

### 1. Granted Abilities Interface Styling

**File:** [styles/item-sheets.css](../../../styles/item-sheets.css)

Added comprehensive CSS section for Granted Abilities (lines 816-1035):

**Key Features:**
- **Ability Header Row** - Name, Action Type dropdown, and Delete button aligned in one flexbox row
  - Name input: `flex: 2` (takes more space)
  - Action Type select: `flex: 1` (proportional)
  - Delete button: `flex-shrink: 0` (maintains size)
  - Gap: `0.75rem` between elements

**Components Styled:**
- `.abilities-header` - Main section header with add button
- `.ability-control` - Green add/control buttons
- `.track-add-abilities-info` - Info message for track items
- `.ability-item` - Individual ability card with dark background
- `.ability-header` - Horizontal row layout for name/type/delete
- `.ability-tier` - Tier selector (for track items)
- `.delete-ability` - Red delete button with icon and label
- `.ability-tags` - Tags input field
- `.ability-description` - Description label styling

**Color Scheme:**
- Ability items: `#252525` background, `#3a3a3a` borders
- Add buttons: Green (`#1f3a1f` bg, `#6bff6b` text)
- Delete buttons: Red (`#3a1f1f` bg, `#ff6b6b` text)
- Focus states: `var(--z-wolf-primary)` border color

### 2. Rich Text Editor Padding

**File:** [styles/item-sheets.css](../../../styles/item-sheets.css)

Increased horizontal padding for better readability:

**Changed elements:**
- `.editor-content` (line 449): `padding: 0.75rem 1.25rem` (was `0.75rem`)
- `.prosemirror-editor .ProseMirror` (line 561): `padding: 0.75rem 1.25rem`
- `.editor-content-readonly` (line 790): `padding: 0.75rem 1.25rem`

**Impact:** More breathing room on left and right sides while maintaining top/bottom spacing.

## Template References

**Ability Item Template:** [templates/item/partials/ability-item.hbs](../../../templates/item/partials/ability-item.hbs)
- Lines 3-41: Ability header structure with name, type, tier (optional), and delete button
- Lines 43-50: Tags section
- Lines 52-55: Description with rich editor partial

**Abilities Tab:** [templates/item/parts/item-abilities.hbs](../../../templates/item/parts/item-abilities.hbs)
- Track items: Abilities grouped by tier (lines 22-63)
- Non-track items: Flat list of abilities (lines 65-88)

## Visual Result

The Granted Abilities interface now displays:
1. Clean horizontal header row with properly sized elements
2. Consistent spacing and alignment
3. Clear visual hierarchy with backgrounds and borders
4. Better text readability in rich editors with increased horizontal padding
5. Proper hover and focus states throughout

## Files Modified

1. `styles/item-sheets.css` - Added Granted Abilities section and updated editor padding