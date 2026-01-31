# Dropzone Padding and Height Adjustments

**Date:** 2026-01-27
**Topic:** Actor sheet dropzone styling polish - padding and height refinements

## Summary

Enhanced dropzone visual presentation on Actor sheets by adding horizontal padding to filled dropzones and reducing the height of Foundation (Ancestry/Fundament) dropzones when filled.

## Changes Made

### File: `styles/actor-sheets.css`

**1. Added horizontal padding to filled dropzones (lines 571-574)**
```css
/* Add padding when filled */
.drop-zone:has(.slotted-item) {
    padding: 0 0.5rem;
}
```
- Provides left and right spacing between dropzone border and item representation
- Applies to all dropzone types when filled

**2. Reduced Foundation dropzone height when filled (lines 666-669)**
```css
/* Reduce height when filled */
.foundation-drop-zone:has(.slotted-item) {
    min-height: 70px;
}
```
- Reduces height from 100px to 70px when filled
- Matches the compact height of Knacks, Tracks, and Talents dropzones
- Improves visual consistency across slot types

## Context

- Part of Phase 11 dropzone polish work
- Uses `:has()` pseudo-class to detect filled state
- Foundation dropzones include Ancestry and Fundament slots
- Empty foundation dropzones remain at 100px height for better visibility

## Result

Filled dropzones now have:
- Better visual spacing from borders (0.5rem horizontal padding)
- More consistent, compact heights across all slot types
- Improved visual hierarchy when comparing empty vs. filled states