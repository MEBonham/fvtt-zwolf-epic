# Phase 11 Polish: Localization, Layout, and Scroll Preservation

**Date:** 2026-01-27
**Topic:** Post-Phase 11 refinements for drop zones

## Summary

Follow-up work after Phase 11 Drop Zones implementation, addressing localization strings, layout adjustments, and scroll position preservation when adding items via drag-and-drop.

## Changes Made

### 1. Localization Strings Added
**File:** `lang/en.json` (lines 149-153)

Added missing drag prompt strings:
```json
"DragAncestryHere": "Drag Ancestry Here",
"DragFundamentHere": "Drag Fundament Here",
"DragKnackHere": "Drag Knack Here",
"DragTrackHere": "Drag Track Here",
"DragTalentHere": "Drag Talent Here"
```

These are used in templates via the pattern `{{localize (concat 'ZWOLF.Drag' (capitalize itemType) 'Here')}}`.

### 2. CSS Layout Adjustments
**File:** `styles/actor-sheets.css`

**Foundation Row (line 928):**
- Changed `minmax(300px, 1fr)` → `minmax(200px, 1fr)`
- Allows Ancestry and Fundament to fit on the same line

**Talents Grid (line 918):**
- Changed `grid-template-columns: 1fr;` → `repeat(auto-fill, minmax(200px, 1fr))`
- Creates responsive two-column layout for talents

### 3. Scroll Position Preservation
**File:** `module/helpers/drop-zone-handler.mjs`

Added direct scroll capture/restore to all drop handlers:

**Foundation Drop (lines 250-252, 305-313):**
```javascript
// Capture scroll position directly from the tab element
const configureTab = this.sheet.element.querySelector(".tab[data-tab='configure']");
const scrollTop = configureTab?.scrollTop || 0;

// ... after actor.update() ...

// Restore scroll position after the automatic re-render
if (scrollTop > 0) {
    setTimeout(() => {
        const newTab = this.sheet.element.querySelector(".tab[data-tab='configure']");
        if (newTab) {
            newTab.scrollTop = scrollTop;
        }
    }, 100);
}
```

**Slot Drop (lines 390-405) and Attunement Drop (lines 473-488):**
```javascript
// Capture scroll position directly from the tab element
const configureTab = this.sheet.element.querySelector(".tab[data-tab='configure']");
const scrollTop = configureTab?.scrollTop || 0;

// Refresh the sheet
await this.sheet.render(false);

// Restore scroll position after render completes
if (scrollTop > 0) {
    requestAnimationFrame(() => {
        const newTab = this.sheet.element.querySelector(".tab[data-tab='configure']");
        if (newTab) {
            newTab.scrollTop = scrollTop;
        }
    });
}
```

## Technical Details

### Scrollable Elements
From CSS analysis:
- `.window-content`: `overflow: hidden` (not scrollable)
- `.character-tabs`: `overflow-y: auto` (left sidebar)
- `.tab[data-tab]`: `overflow-y: auto` (main content area)

The Configure tab (`.tab[data-tab='configure']`) is the scrollable element, not `.configure-content`.

### Scroll Restoration Approaches

| Handler | Trigger | Restore Method |
|---------|---------|----------------|
| Foundation | `actor.update()` auto-renders | `setTimeout(100ms)` |
| Slot | Explicit `render(false)` | `requestAnimationFrame` |
| Attunement | Explicit `render(false)` | `requestAnimationFrame` |

### Previous Attempt (Did Not Work)
Initial approach used SheetStateManager's `captureState()` method:
```javascript
if (this.sheet.stateManager) {
    this.sheet.stateManager.captureState();
}
```
This was insufficient - the direct element approach was needed.

## Current State

**Status:** Scroll preservation implemented but not yet confirmed working by user.

The direct scroll capture/restore approach targets the exact scrollable element (`.tab[data-tab='configure']`) rather than relying on the general SheetStateManager.

## Files Modified

- `lang/en.json` - Added 5 localization strings
- `styles/actor-sheets.css` - Adjusted grid layouts for foundation-row and talents-grid
- `module/helpers/drop-zone-handler.mjs` - Added scroll preservation to all 3 drop handlers

## Related Context

- Phase 11 documentation: `.claude/context-archive/2026-01-27-phase-11-drop-zones.md`
- SheetStateManager: `module/helpers/sheet-state-manager.mjs`
- Actor Sheet: `module/sheets/actor-sheet.mjs`

## Notes

- The SheetStateManager is configured with scroll selectors including `.tab` which should capture tab scroll positions, but direct capture proved more reliable for drop operations.
- Foundation drops don't explicitly call `render()` - they rely on automatic re-render from `actor.update()`, hence the `setTimeout` approach.
- Slot and attunement drops call `render(false)` explicitly, allowing `requestAnimationFrame` for immediate post-render restoration.