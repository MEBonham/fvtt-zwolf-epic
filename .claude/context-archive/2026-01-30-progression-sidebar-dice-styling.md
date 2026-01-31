# Progression Sidebar Dice Styling

**Date:** 2026-01-30
**Topic:** Styling dice icons and color-coded headers in Actor Sheet progressions sidebar

## Summary

Styled the dice icons in the Actor Sheet sidebar's Progressions accordion to improve visibility and added color-coded accordion headers matching the Configure tab slider colors.

## Changes Made

### actor-sheets.css

1. **Left margin for dice icons:**
   - Added `padding-left: 1.5rem` to `.progressions-container`

2. **Dice icon positioning and styling:**
   - Added `position: relative` to `.progression-header`
   - New `.progression-header .progression-die` styles:
     - Absolute positioned at `left: -1.25rem`, vertically centered
     - White color (`#fff`) with text shadow
     - Hover effect with glow (`text-shadow: 0 0 8px rgba(255, 255, 255, 0.5)`)

3. **Color-coded progression headers** (matching slider colors):
   - `.progression-group.mediocre` → Red gradient (`#c62828`)
   - `.progression-group.moderate` → Orange gradient (`#ff9800`)
   - `.progression-group.specialty` → Green gradient (`#4caf50`)
   - `.progression-group.awesome` → Blue gradient (`#2196f3`)

### dice.css

- Removed `.progression-die` from the shared rollable styles (lines 357-370)
- Kept only `.speed-roll-die` with the original dark gray/opacity styling
- This resolved a conflict where dice.css was overriding the white color from actor-sheets.css

## Key Discovery

The progression keys are `mediocre`, `moderate`, `specialty`, `awesome` (not `poor` and `good` as initially assumed). The template at `actor-sidebar.hbs` uses `{{progressionKey}}` as a class name on `.progression-group`.

## File References

- [actor-sheets.css:304-400](styles/actor-sheets.css#L304-L400) - Progressions sidebar and color-coded headers
- [dice.css:357-368](styles/dice.css#L357-L368) - Speed roll die styles (progression-die removed)
- [actor-sidebar.hbs](templates/actor/parts/actor-sidebar.hbs) - Template structure

## Current State

Dice icons are now:
- White colored for contrast against dark sidebar
- Positioned in the left margin outside accordion headers
- Have a glow effect on hover

Accordion headers are now color-coded:
- Mediocre: Red
- Moderate: Orange/Yellow
- Specialty: Green
- Awesome: Blue