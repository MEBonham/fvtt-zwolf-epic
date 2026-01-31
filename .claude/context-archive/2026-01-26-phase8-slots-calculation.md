# Phase 8: Slots Calculation - COMPLETE

**Date:** 2026-01-26
**Status:** ✅ Complete

## Overview

Implemented Phase 8 from the roadmap: **Slots Calculation** for knacks, tracks, talents, and attunements, including special eidolon placeholder-based logic.

## Implementation Details

### Files Modified

1. **[module/sheets/actor-sheet.mjs](../../../module/sheets/actor-sheet.mjs)**
   - Added slot calculation logic in `_prepareContext()` (line 128-139)
   - Added 11 new methods for slot management (lines 505-921)

### Core Functionality

#### Regular Characters (PC/NPC)

**Knack Slots:**
- Calculated from ancestry, fundament, talents, and track tier side effects
- Uses `_calculateTotalKnacksProvided()` to sum all sources
- Fills slots sequentially

**Track Slots:**
- Count = min(4, character level)
- Uses flag-based slot assignment with fallback to item order
- Each track stored at its assigned slot index

**Talent Slots:**
- One slot per character level
- Each slot associated with a track (1-4, cycling)
- Tracks which talents can be placed in each slot

#### Eidolons (Special Logic)

**Knack Slots:**
- From own ancestry + base creature's "(Eidolon Placeholder)" knack items
- Each placeholder knack in base = 1 knack slot for eidolon

**Track Slots:**
- Only created for positions with "(Eidolon Placeholder)" tracks in base creature
- Placeholder determines which track slots are enabled
- Eidolon's tracks fill these placeholder positions

**Talent Slots:**
- Only created for enabled track positions (where placeholders exist)
- Number of slots per track = unlocked tiers based on base creature's level
- Tier unlock formula: track position + (tier - 1) * 4

### Key Methods Added

1. `_calculateSlots(context)` - Main entry point for regular characters
2. `_calculateTotalKnacksProvided()` - Sum knack sources
3. `_prepareSlots(itemType, slotCount)` - Route to appropriate slot prep method
4. `_prepareTalentSlots(slotCount)` - Create talent slots with track associations
5. `_prepareTrackSlots(slotCount)` - Create track slots
6. `_prepareSequentialSlots(itemType, slotCount)` - Create simple sequential slots
7. `_getTrackSlotIndex(trackItem)` - Get track's slot with fallback
8. `_calculateEidolonSlots(context)` - Main entry point for eidolons
9. `_calculateEidolonTrackSlots(baseCreature)` - Eidolon track slots from placeholders
10. `_prepareEidolonTalentSlots(baseCreature)` - Eidolon talent slots based on enabled tracks

### Technical Notes

- **Slot Structure:** Each slot is an object with `index`, `item`, and type-specific properties
- **Track Association:** Talent slots know their track number and whether track is assigned
- **Flag-Based Assignment:** Items use `zwolf-epic.slotIndex` flag for persistence
- **Tier Calculation:** Reuses `_getUnlockedTiers()` method from side effects
- **Eidolon Inheritance:** Base creature's level determines tier unlocks for eidolon talents

### Logic Source

All logic copied from legacy codebase:
- `archive 2026-01-23/module/helpers/actor-data-calculator.mjs` lines 1020-1080, 1086-1200, 336-465

## Testing Checklist

- [ ] Regular character shows correct number of knack slots from all sources
- [ ] Track slots appear correctly (max 4, capped by level)
- [ ] Talent slots cycle through tracks 1-4 correctly
- [ ] Eidolon knack slots include own ancestry + base placeholders
- [ ] Eidolon track slots only appear for placeholder positions
- [ ] Eidolon talent slots respect base creature's level for tier unlocks
- [ ] Slot assignments persist through sheet reloads
- [ ] Track tier side effects add knack slots correctly

## Next Steps

Phase 9: Build Points Calculation
- Attribute/skill costs
- Progression sliders
- Lock toggle
- Eidolon skill excess penalty