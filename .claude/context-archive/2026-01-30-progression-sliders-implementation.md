# Context Archive: Progression Sliders Implementation

**Date:** 2026-01-30
**Topic:** Implementing Progression Sliders for Attributes and Skills with Lock Mechanism

---

## Summary

Implemented progression sliders for attributes and skills on the actor sheet's Configure tab, including styling, a lock mechanism, and build point spending functionality. The sliders existed in the codebase but lacked proper styling and event handlers.

## User Requests

1. "Please implement the Sliders for the Progressions of Attributes and Skills, as they were in @archive 2026-01-23/templates/actor/parts/actor-configure-content.hbs. (They exist in the current implementation, but they lack styling and a locking mechanism and actually spending Build Points on them.)"

2. "Shorten the slider by about 25px on each end (maybe give its parent that much more horizontal padding) so that its ends line up better with the MED and AWE labels."

3. "Transform the slider thumbs up maybe 10px so they're centered on the slider."

## Key Technical Concepts

- FoundryVTT ApplicationV2 / ActorSheetV2 with HandlebarsApplicationMixin
- Static actions pattern in FoundryVTT V2 sheets (`static DEFAULT_OPTIONS.actions`)
- Handlebars partials for progression sliders
- Build Points system (attributes cost: mediocre=-5, moderate=0, specialty=4, awesome=8)
- Progression values (mediocre=1, moderate=2, specialty=3, awesome=4)
- Custom range input slider styling (webkit/moz)
- Actor templates in template.json with inheritance

## Files Modified

### module/sheets/actor-sheet.mjs

Added toggle lock action and slider event handling:

```javascript
actions: {
    editImage: ZWolfActorSheet.#onEditImage,
    changeTab: ZWolfActorSheet.#onChangeTab,
    editItem: ZWolfActorSheet.#onEditItem,
    deleteItem: ZWolfActorSheet.#onDeleteItem,
    toggleLock: ZWolfActorSheet.#onToggleLock
},
```

Added methods:
- `#onToggleLock(event, target)` - Toggles buildPointsLocked state
- `_bindProgressionSliders()` - Binds slider events and applies locked state
- `_onProgressionSliderChange(event)` - Handles slider value changes

### styles/actor-sheets.css

Added comprehensive styling for:
- `.build-points-header` - Header container with lock button
- `.build-points-lock-btn` - Lock/unlock button with locked state styling
- `.progression-config`, `.config-section`, `.config-list`, `.config-row` - Config layout
- `.progression-slider-container` - Slider wrapper
- `.progression-slider` - Range input with gradient track (red→orange→green→blue)
- Webkit and Mozilla thumb styling with `transform: translateY(-6px)` for centering
- Disabled/locked slider states

Key slider styles:
```css
.progression-slider {
    background: linear-gradient(to right,
        #c62828 0%, #c62828 25%,
        #ff9800 25%, #ff9800 50%,
        #4caf50 50%, #4caf50 75%,
        #2196f3 75%, #2196f3 100%);
    padding: 0 25px;
}

.progression-slider::-webkit-slider-thumb {
    transform: translateY(-6px);
}
```

### lang/en.json

Added localization keys:
```json
"BuildPointsLocked": "Build Points locked",
"BuildPointsUnlocked": "Build Points unlocked",
"BuildPointsLockedWarning": "Build Points are locked. Click the lock button to make changes."
```

### template.json

Added `ancestryId` and `buildPointsLocked` to eidolon template (since eidolons use the configure tab but don't inherit the "character" template):

```json
"eidolon": {
    "templates": ["base", "partialCharacter", "summoned"],
    "ancestryId": null,
    "buildPointsLocked": false,
    "wealth": 0
}
```

## Errors and Fixes

- **Private method reference error**: Initially used `#onProgressionSliderChange` (private) but tried to call it from `_bindProgressionSliders`. Fixed by changing to `_onProgressionSliderChange` (protected convention).

## Implementation Details

The progression slider:
- Uses range input with min=1, max=4, step=1
- Maps values: 1=mediocre, 2=moderate, 3=specialty, 4=awesome
- Has color-coded track gradient for visual feedback
- Can be locked/unlocked via build points lock button
- Updates actor data on change via `system.attributes.{key}.progression` or `system.skills.{key}.progression`

## Current State

Implementation complete. Sliders functional with:
- Proper gradient styling
- Lock mechanism working
- Thumb centered on track with translateY(-6px)
- Slider ends aligned with labels via 25px padding