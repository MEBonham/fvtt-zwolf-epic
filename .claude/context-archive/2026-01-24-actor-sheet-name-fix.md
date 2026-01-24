# Actor Sheet Name Fix & Sizing - 2026-01-24

## Context

Session focused on fixing a CSS issue where the actor's character name was being cut off at the top and bottom, plus adjusting default sheet dimensions.

## Issue: Character Name Text Cutoff

**Problem**: The character name input field was clipping text at top and bottom.

**Investigation**:
- Checked archive folder at `archive 2026-01-23/styles/actor-sheets.css`
- Found the archive used `font-size: 0.74em` while current CSS had `font-size: 1.2em`

**Attempted Fixes**:
1. Added `line-height: 1.4` to `.sheet-header .charname input` - **Did not work**
2. Reverted to archive's `font-size: 0.74em` - **This was the solution**

## Code Changes

### styles/actor-sheets.css
Changed character name input font size (line 81):
```css
.sheet-header .charname input {
    font-size: 0.74em;  /* Was 1.2em, caused text clipping */
}
```

### module/sheets/actor-sheet.mjs
Updated default sheet dimensions (lines 29-32):
```javascript
position: {
    width: 900,   /* Was 600 */
    height: 650   /* Was 600 */
}
```

### CLAUDE.md
Added archive directory to project structure documentation (line 39):
```
└── archive 2026-01-23/      # Pre-cleanup backup (reference only, not loaded)
```

## Key Learnings

- The archive folder is named `archive 2026-01-23` (with a space), not in `.claude/context-archive/`
- Archive contains the original 2025-line actor-sheets.css and other pre-cleanup files
- Text cutoff in inputs is often a font-size issue rather than line-height

## Current State

- Actor sheet renders at 900x650 default size
- Character name displays without clipping
- Archive location documented in CLAUDE.md for future reference
