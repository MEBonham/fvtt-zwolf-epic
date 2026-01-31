# Progression Colors Darkened for Readability

**Date:** 2026-01-30
**Topic:** Darkened progression color scheme for better text contrast

## Summary

User reported that the light text on Progression headers in the Actor sheet sidebar was hard to read, especially the yellow color. Colors needed to be darkened and made consistent between the sidebar Progressions accordion and the Configure tab sliders.

## Changes Made

### File: `styles/actor-sheets.css`

**Progression accordion headers** (lines 372-402) and **slider gradient** (lines 1242-1246) updated with darker, consistent colors:

| Progression | Old Color | New Color |
|-------------|-----------|-----------|
| **Mediocre** (Red) | `#c62828` | `#a31d1d` |
| **Moderate** (Yellow) | `#ffc400` / `#ff9800` | `#c79100` (dark amber) |
| **Specialty** (Green) | `#4caf50` | `#388e3c` |
| **Awesome** (Blue) | `#2196f3` | `#1976d2` |

### Key Fix

The yellow/moderate color had the biggest change - replaced bright yellow/orange with dark amber/gold (`#c79100`) which provides much better contrast with white text. Previously the accordion used `#ffc400` (yellow) while the slider used `#ff9800` (orange) - now both use the same darker amber.

## Current State

All progression colors are now:
- Darkened for better text readability
- Consistent between accordion headers and Configure tab sliders
- Using gradient backgrounds with hover states