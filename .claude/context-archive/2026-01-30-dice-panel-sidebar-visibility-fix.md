# Dice Control Panel Sidebar Visibility Fix

**Date:** 2026-01-30
**Topic:** Bug fix - Dice Control Panel visible on non-Chat sidebar tabs

## Summary

Fixed a bug where the Dice Control Panel was visible even when a different sidebar tab (like Actors) was selected. The panel was taking up space in the upper half of the sidebar above the active tab content.

## Problem

The CSS in `styles/dice.css` was applying `display: flex` unconditionally to `#chat`, which overrode FoundryVTT's default tab hiding mechanism (likely `display: none` on inactive tabs). This caused:
1. The `#chat` element to remain visible as a flex container even when inactive
2. The dice control panel (and its dark gray background) to show on top of other tabs

## Solution

Changed all flex layout selectors to only apply when the chat tab has the `.active` class:

### Before (broken):
```css
#chat,
#sidebar [data-tab="chat"],
.chat-sidebar {
    display: flex;
    flex-direction: column;
}
```

### After (fixed):
```css
#chat.active,
#sidebar [data-tab="chat"].active,
.chat-sidebar.active {
    display: flex;
    flex-direction: column;
}
```

Similarly updated child element selectors:
- `#chat.active #chat-log` instead of `#chat-log`
- `#chat.active #chat-form` instead of `#chat-form`
- `#chat.active .zwolf-boost-control` instead of `.zwolf-boost-control`

Also removed unnecessary `position: relative` and `z-index: 10` from `.zwolf-boost-control` that could have caused layering issues.

## Files Modified

- `styles/dice.css` - Updated flex layout selectors to be conditional on `.active` class

## Key Insight

FoundryVTT v13 uses the `.active` class on sidebar tab content elements (`#chat`, `#combat`, etc.) to indicate the currently visible tab. Custom CSS that overrides `display` properties must respect this pattern to avoid breaking tab visibility.