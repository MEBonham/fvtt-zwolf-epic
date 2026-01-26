# Tier Section Spacing - 2026-01-24

## Summary
Added CSS spacing and styling to create visual separation between tier sections in the Abilities, Effects, and Tiers tabs for track items.

## Context
This is a follow-up to the track item refactor where abilities and side effects were moved to top-level with tier grouping. The refactor created tier sections that were visually running together without clear separation.

## Changes Made

### styles/item-sheets.css
Added three new CSS sections for tier grouping:

1. **Tier Abilities Grouping** (lines 70-100)
   - 2rem bottom margin between tier groups
   - Styled headers with flex layout
   - Bottom border on headers (1px solid #3a3a3a)
   - Icon coloring with theme primary color
   - Zero margin on last section

2. **Tier Effects Grouping** (lines 102-132)
   - Identical styling to tier abilities
   - Applied to `.tier-effects-group` and `.tier-effects-header`

3. **Tier Sections (Tiers Tab)** (lines 134-164)
   - Identical styling for `.tier-section` and `.tier-header`
   - Consistent spacing across all tier-based tabs

## Visual Improvements
- Clear 2rem gaps between consecutive tier sections
- Consistent header styling with bottom borders
- Icon coloring matches theme
- Clean, organized appearance in all three tabs

## Files Modified
- `styles/item-sheets.css` - Added 95 lines of CSS for tier section spacing

## Related Work
This builds on the track item refactor completed earlier, which:
- Moved abilities from nested tiers to top-level with tier property
- Created tierSideEffects array for track items
- Simplified tiers tab to only show talent menus and character tags
- Displayed all tiers expanded in Abilities and Effects tabs