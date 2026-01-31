# Item Sheet Tab Initial Visibility Fix

**Date:** 2026-01-24
**Topic:** Fix item sheet tabs not displaying on initial load

---

## Summary

This session addressed a bug where item sheet tab contents didn't display on initial load in the Z-Wolf Epic Foundry VTT system. The tabs would only appear after switching away from Summary and back.

## Context from Previous Session

The previous session had implemented:
- ApplicationV2 PARTS system for item sheets
- Tab switching functionality using CSS manipulation
- Scrollable tab contents using ApplicationV2's built-in scrollable property
- 8 separate PARTS (header, tabs, and 6 tab content parts)

## Issue

**User Report:** "On initial load, the tab contents don't show. If you switch away from Summary and back to it, they show up."

**Root Cause:** The `_onRender` method wasn't initializing tab visibility on first render. While ApplicationV2 PARTS system rendered all the parts, manual show/hide of tabs based on the active tab was needed.

## Solution

Updated `_onRender` in [item-sheet.mjs](c:\Users\micro\AppData\Local\FoundryVTT\Data\systems\zwolf-epic\module\sheets\item-sheet.mjs#L73-L109) to initialize tab visibility on first render:

```javascript
/** @override */
_onRender(context, options) {
    super._onRender(context, options);

    // Initialize tab visibility based on current active tab
    const activeTab = this.tabGroups.primary || "summary";
    const tabContents = this.element.querySelectorAll(".tab[data-tab]");

    tabContents.forEach(tab => {
        if (tab.dataset.tab === activeTab) {
            tab.classList.add("active");
            tab.style.display = "block";
        } else {
            tab.classList.remove("active");
            tab.style.display = "none";
        }
    });

    // Update tab button active states
    const tabButtons = this.element.querySelectorAll("[data-group=\"primary\"][data-tab]");
    tabButtons.forEach(btn => {
        if (btn.dataset.tab === activeTab) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    // Restore scroll positions if they were saved
    if (this._scrollPositions) {
        const scrollContainers = this.element.querySelectorAll(".tab[data-tab]");
        scrollContainers.forEach(container => {
            const tabName = container.dataset.tab;
            if (this._scrollPositions[tabName] !== undefined) {
                container.scrollTop = this._scrollPositions[tabName];
            }
        });
    }
}
```

## Files Modified

- **c:\Users\micro\AppData\Local\FoundryVTT\Data\systems\zwolf-epic\module\sheets\item-sheet.mjs**
  - Updated `_onRender` method (lines 73-109) to initialize tab visibility

## Result

The Summary tab (or whichever tab is active) now displays immediately on initial load, matching the behavior when switching tabs.

## Key Technical Pattern

ApplicationV2 PARTS system renders all parts automatically, but tab visibility management (showing/hiding based on active tab) must be handled manually in `_onRender` for initial render and in the `#onChangeTab` action handler for subsequent tab switches.
