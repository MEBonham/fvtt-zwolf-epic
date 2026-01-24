# Actor Sheet Header Layout Improvements

**Date:** 2026-01-24
**Topic:** Size field inline layout and tags display styling

## Summary

Improved the actor sheet header layout to display size-related elements on a single line and made the tags display fill available space properly.

## Changes Made

### File: [styles/actor-sheets.css](styles/actor-sheets.css)

**Added CSS rules for size field elements (lines 128-155):**
- `.size-source` - Styling for the info icon showing size option source
- `.effective-size-display` - Container for arrow and effective size (uses accent color background)
- `.effective-size-display i` - Styling for the arrow icon

**Modified `.header-field input, .header-field select` (line 118):**
- Added `line-height: normal` for consistent height rendering

**Added `.header-field.tags-field` (lines 129-132):**
- `align-self: stretch` - Makes tags field fill vertical space in flex container
- `flex-grow: 1` - Makes tags field expand to fill horizontal space

**Modified `.tags-display` (lines 157-169):**
- Changed to `height: 100%` to fill parent container
- Added `flex-grow: 1` to expand horizontally
- Added `line-height: normal` for consistency
- Uses `display: inline-flex` with `align-items: center` for proper content alignment

## Key Decisions

1. **Size field inline layout:** The template ([actor-header.hbs:28-73](templates/actor/parts/actor-header.hbs)) already had the correct structure with label, select/input, info icon, arrow, and effective size. Just needed CSS rules from the archive restored.

2. **Tags display height matching:** After several attempts with explicit heights and min-heights, the solution was to use flexbox properties:
   - Parent uses `align-self: stretch` to match the flex container's cross-axis size (determined by the tallest input/select)
   - Child uses `height: 100%` to fill the stretched parent

3. **Horizontal space filling:** Both parent and child use `flex-grow: 1` to expand and fill available horizontal space in the header.

## Technical Context

- FoundryVTT v13 actor sheet using ApplicationV2
- CSS follows the project's existing flexbox-based header layout
- All changes maintain responsive design compatibility