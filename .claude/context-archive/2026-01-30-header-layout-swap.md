# Header Layout Swap - Resting Buttons and Exotic Senses Icon

**Date:** 2026-01-30
**Topic:** Actor sheet header UI element position swap

## Summary

Swapped the positions of two UI elements in the Actor sheet header layout:

### Changes Made

**File:** `templates/actor/parts/actor-header.hbs`

| Element | Previous Location | New Location |
|---------|-------------------|--------------|
| Resting buttons (Short Rest / Extended Rest) | End of Resources row (`header-resources`) | End of TNs row (`header-tns`) |
| Exotic Senses icon with tooltip | End of TNs row (`header-tns`) | End of Resources row (`header-resources`) |

### Implementation Details

- Moved the `{{#if exoticSensesDisplay.hasContent}}` block from `header-tns` to `header-resources` (lines 166-171)
- Moved the `{{#if isCharacter}}` rest buttons block from `header-resources` to `header-tns` (lines 227-246)
- Both elements retain their original markup and functionality, only their container sections changed

### Current State

The swap is complete. The actor sheet header now displays:
- **Resources row:** VP, SP, KP, CN, Speed, Exotic Senses icon
- **TNs row:** Toughness TN, Destiny TN, Improvised TN, Healing TN, Challenge TN, Rest buttons