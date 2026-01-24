# Actor Sheet CSS Rebuild - 2026-01-24

## Context

This session focused on rebuilding the actor sheet CSS from scratch with a clean grid-based layout and muted color scheme. The previous actor-sheets.css from the archive was 2025 lines long.

## Key Decisions

### File Organization
- **Kept single CSS file**: Decided to keep actor-sheets.css as one file rather than splitting it into multiple files
- **Rationale**: Claude Code handles large files efficiently with on-demand reading, no context penalty
- **When to split**: Only if code reuse needed across sheets or parallel development

### Layout Approach
- **CSS Grid** for main structure (not flexbox as initially planned)
- **Muted color palette**: Dark backgrounds (#1e1e1e, #252525, #2a2a2a), muted blue-gray accents (#3a4a5a, #4a5a6a)
- **Grid structure**: 3 rows × 2 columns
  - Row 1: Header (spans both columns)
  - Row 2: Sidebar | Tab controls
  - Row 3: Sidebar continues | Tab content

## Files Created/Modified

### styles/actor-sheets.css (NEW - 474 lines)
Created from scratch with:
- CSS Grid layout matching ApplicationV2 PARTS structure
- Muted color scheme with low saturation
- Proper grid positioning for all components
- Header section with profile image (80×80px), character name, fields
- Header resources bar (VP, SP, KP, CN, Speed)
- Header TNs bar (target numbers display)
- Progressions sidebar (200px wide, left column)
- Tab navigation and tab content areas
- Custom scrollbar styling
- Responsive design breakpoint at 768px

**Critical CSS pattern**:
```css
.application.actor .window-content {
    display: grid;
    grid-template-rows: auto auto 1fr;
    grid-template-columns: 200px 1fr;
}

.application.actor form {
    display: contents;  /* Makes form children participate in parent grid */
}
```

### styles/zwolf-epic.css (MODIFIED)
- Removed redundant actor-specific styles (header, profile-img, sheet-body, resources, etc.)
- Now minimal (31 lines) focused on global patterns
- Kept: Global .zwolf-epic.sheet base styles, common editor content styles

### system.json (MODIFIED)
Added actor-sheets.css to styles array:
```json
"styles": [
    "styles/variables.css",
    "styles/zwolf-epic.css",
    "styles/actor-sheets.css"
],
```

### module/sheets/actor-sheet.mjs (MODIFIED)
Added mock progression data in `_prepareContext()` method (lines 106-140):
```javascript
context.progressions = {
    mediocre: { name: "Mediocre", bonus: -2, stats: [...] },
    moderate: { name: "Moderate", bonus: 0, stats: [...] },
    specialty: { name: "Specialty", bonus: 2, stats: [...] },
    awesome: { name: "Awesome", bonus: 4, stats: [...] }
};
```

## Technical Issues Resolved

### Issue 1: CSS Not Loading
**Problem**: New CSS file not being applied
**Cause**: actor-sheets.css not included in system.json
**Solution**: Added to styles array in system.json

### Issue 2: Sidebar Not Showing
**Problem**: Progressions sidebar template rendering but no data
**Cause**: Missing progression calculation logic (actor-data-calculator.mjs from archive not restored)
**Solution**: Added mock progression data temporarily in _prepareContext()

### Issue 3: Grid Layout Not Working
**Problem**: Sidebar appearing inline instead of as separate column
**Cause**: ApplicationV2 PARTS rendered into form element, grid wasn't applying
**Solution**: Applied grid to `.window-content` and used `display: contents` on form

## Current State

**Working**:
- ✓ Actor sheet renders with proper grid layout
- ✓ Header spans full width with profile image, name, fields
- ✓ Header resources bar (VP/SP/KP/CN/Speed)
- ✓ Header TNs bar (target numbers)
- ✓ Sidebar displays on left (200px) with mock progressions
- ✓ Tab controls display correctly
- ✓ Tab content area positioned properly
- ✓ Muted color scheme applied throughout

**Known Limitations**:
- Mock progression data (needs real calculation from actor-data-calculator.mjs)
- Tab content templates exist but may need styling
- No actual data being calculated (placeholders only)

## Architecture Notes

### ApplicationV2 PARTS Rendering
- Each PART defined in `static PARTS` renders as a sibling element
- All parts rendered into `<form>` inside `.window-content`
- Parts: header, sidebar, tabs, tab-main, tab-biography, tab-inventory, tab-configure
- Must use CSS Grid on container and `display: contents` on form for proper layout

### Grid Cell Assignments
```
.sheet-header-wrapper:   grid-column 1/-1, grid-row 1
.progressions-sidebar:   grid-column 1,    grid-row 2/4
.sheet-tabs:             grid-column 2,    grid-row 2
.tab[data-tab]:          grid-column 2,    grid-row 3 (all tabs share position)
```

## Next Steps (Not Completed)

1. Restore actor-data-calculator.mjs to replace mock progression data
2. Style individual tab content areas
3. Test responsive layout on mobile
4. Add interactions (progression toggles, stat rolling, etc.)
5. Integrate with real actor data model

## Related Archive Files

- Previous conversation summary: `.claude/context-archive/2026-01-24-template-json-restoration.md`
- Archive source: `archive 2026-01-23/styles/actor-sheets.css` (2025 lines, not copied)
