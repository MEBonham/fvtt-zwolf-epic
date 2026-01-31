# Unified Dice Roll Icons on Actor Sheet

**Date:** 2026-01-30
**Topic:** Styling consistency for rollable dice icons

## Summary

Unified the styling of dice roll icons across the Actor sheet so both the Speed die (in header) and Progressions dice (in sidebar) have consistent appearance and hover behavior.

## Changes Made

### styles/dice.css (lines 357-362)
**Speed roll die** - Changed from dark gray to white:
```css
.speed-roll-die {
    cursor: pointer;
    opacity: 0.8;  /* was 0.6 */
    transition: all 0.15s ease;
    color: #fff;  /* was #4b4a44 */
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);  /* added */
}
```

### styles/actor-sheets.css (lines 365-369)
**Progressions die hover** - Changed from white halo to blue color:
```css
.progression-header .progression-die:hover {
    color: var(--z-wolf-primary, #4a90a4);  /* was #fff */
    transform: translateY(-50%) scale(1.15);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);  /* was white glow halo */
}
```

## Final Behavior

Both dice icons now:
- **Default state:** White with subtle drop shadow
- **Hover state:** Turn blue (`--z-wolf-primary`) and scale up 15%

This matches the user's request for visual consistency across all rollable dice icons on the Actor sheet.