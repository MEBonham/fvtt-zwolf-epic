# Talent Dropzone Fixes: Styling and Scroll Preservation

**Date:** 2026-01-27
**Topic:** Fixed talent dropzone styling inconsistencies and scroll jump issues

## Summary

Talent item dropzones had two issues compared to other item dropzones (knacks, tracks):
1. Different font size and styling (not compact)
2. Scroll position jumping to top when dropping talents

Both issues have been resolved with template and handler timing fixes.

## Issues Identified

### Issue 1: Styling Inconsistency
- **Problem**: Talents didn't use `compact=true` parameter while knacks and tracks did
- **Location**: `templates/actor/parts/actor-configure-content.hbs` line 210-222
- **Effect**: Larger font size, different layout from other slot types

### Issue 2: Scroll Position Jump
- **Problem**: Scroll position captured AFTER item operations instead of BEFORE
- **Location**: `module/helpers/drop-zone-handler.mjs`
  - `_onSlotDrop` (line 404-406 before fix)
  - `_onAttunementDrop` (line 501-503 before fix)
- **Root Cause**: When items are created or flags are set, FoundryVTT can trigger automatic re-renders. If scroll position is captured after these operations, it captures the already-jumped position (usually 0).
- **Working Pattern**: Foundation drops correctly captured scroll at line 250, BEFORE operations

## Changes Made

### 1. Template Fix
**File:** `templates/actor/parts/actor-configure-content.hbs` (line 217)

Added `compact=true` parameter to talent item-slot partial:
```handlebars
{{> item-slot
    slotLabel=(concat (localize "ZWOLF.Talent") " " (math slot.index "+" 1))
    slotClass="talent-slot"
    dropZoneClass="talent-drop-zone"
    itemType="talent"
    slotIndex=slot.index
    item=slot.item
    icon="fa-gem"
    compact=true    <!-- ADDED -->
    isDisabled=(not slot.hasTrack)
    disabledReason=(localize "ZWOLF.RequiresTrack" trackNumber=slot.trackNumber)
    extraInfo=(ternary slot.hasTrack
                (concat "(" (localize "ZWOLF.Track") " " slot.trackNumber ": " slot.trackName ")")
                (concat "(" (localize "ZWOLF.Track") " " slot.trackNumber ": " (localize "ZWOLF.NotAssigned") ")"))}}
```

This applies `.compact-drop-zone` and `.compact-drop-prompt` CSS classes, matching knacks and tracks.

### 2. Drop Handler Timing Fixes
**File:** `module/helpers/drop-zone-handler.mjs`

#### `_onSlotDrop` Method (line 354-356)
Moved scroll capture from line 404-406 to line 354-356 (before operations):
```javascript
// Flag to prevent default drop handler
this.sheet._processingCustomDrop = true;

// Capture scroll position directly from the tab element BEFORE any operations
const configureTab = this.sheet.element.querySelector(".tab[data-tab='configure']");
const scrollTop = configureTab?.scrollTop || 0;

try {
    // Get drag data
    const data = TextEditor.getDragEventData(event);
    // ... rest of operations
```

#### `_onAttunementDrop` Method (line 449-451)
Moved scroll capture from line 501-503 to line 449-451 (before operations):
```javascript
// Flag to prevent default drop handler
this.sheet._processingCustomDrop = true;

// Capture scroll position directly from the tab element BEFORE any operations
const configureTab = this.sheet.element.querySelector(".tab[data-tab='configure']");
const scrollTop = configureTab?.scrollTop || 0;

try {
    // Get drag data
    const data = TextEditor.getDragEventData(event);
    // ... rest of operations
```

## Technical Details

### CSS Classes Applied by compact=true
- `.compact-drop-zone`: Reduces min-height from 80px to 60px (line 567-569 in actor-sheets.css)
- `.compact-drop-prompt`: Changes layout to horizontal flexbox with smaller font (0.85em) and icon size (1em vs 1.5em) (line 587-600 in actor-sheets.css)

### Scroll Restoration Pattern
All three handler types now follow consistent pattern:
1. Capture scroll BEFORE any item operations
2. Perform item operations (create, setFlag, etc.)
3. Call `render(false)` explicitly
4. Restore scroll with `requestAnimationFrame` for slot/attunement handlers (setTimeout for foundation due to auto-render)

## Files Modified

1. `templates/actor/parts/actor-configure-content.hbs` - Added compact parameter to talents
2. `module/helpers/drop-zone-handler.mjs` - Fixed scroll capture timing in two methods

## Related Context

- Phase 11 Drop Zones: `.claude/context-archive/2026-01-27-phase-11-drop-zones.md`
- Phase 11 Polish: `.claude/context-archive/2026-01-27-phase-11-polish.md`
- Dropzone Padding/Height: `.claude/context-archive/2026-01-27-dropzone-padding-height.md`

## Result

Talent dropzones now:
- Match the compact styling of knacks and tracks
- Preserve scroll position correctly when items are dropped
- Follow the same handler pattern as all other dropzone types