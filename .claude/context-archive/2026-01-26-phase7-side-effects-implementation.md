# Phase 7: Side Effects Processing Implementation

**Date:** 2026-01-26
**Topic:** Complete implementation of Phase 7 side effects processing for Actor sheets

---

## Summary

Implemented Phase 7 of the Z-Wolf Epic system rebuild: comprehensive side effects processing for Actor sheets. The system now calculates and displays all Effect-based progressions, vision radii, resistances/vulnerabilities, and accumulated bonuses from attached items.

## Context

### Project State
- **System:** Z-Wolf Epic for FoundryVTT v13
- **Branch:** cleanup-3 (clean working tree)
- **Architecture:** v2 Data Models, Application v2 Sheets
- **Progress:** Phases 1-6 complete (Item sheets foundation), Phase 7 now complete

### Implementation Roadmap Reference
```
Phase 7: Side Effects
- Speed progression, TN boosts, vision radii
- Max bulk capacity boost
- Resistances/vulnerabilities
- Size modifiers, character tags, proficiencies
```

## Changes Made

### File Modified
**`module/sheets/actor-sheet.mjs`** - Extended with comprehensive side effects processing

### Key Additions

#### 1. Enhanced `_processSideEffects()` Method (Lines 250-401)

**Previous State:** Only processed Toughness TN and Destiny TN progressions

**New State:** Processes all 11 side effect types:

**Highest Value Types (Winner Takes All):**
- `speedProgression` - Speed bonus progression (mediocre/moderate/specialty/awesome)
- `toughnessTNProgression` - Toughness TN progression (default: mediocre)
- `destinyTNProgression` - Destiny TN progression (default: moderate)
- `nightsightRadius` - Night sight radius in meters (default: 1m from actor.system)
- `darkvisionRadius` - Darkvision radius in meters (default: 0.2m from actor.system)

**Accumulated Types (Summed/Collected):**
- `bulkCapacityBoost` - Summed boost to carrying capacity
- `sizeModifier` - Summed steps to effective size
- `characterTag` - Array of unique tags
- `proficiency` - Set of granted proficiencies
- `resistance` - Set of damage type resistances
- `vulnerability` - Set of damage type vulnerabilities

#### 2. Return Object Structure

```javascript
{
    // Progressions with source tracking
    speedProgression: "moderate",
    speedProgressionSource: "Item Name",
    toughnessTNProgression: "specialty",
    toughnessTNProgressionSource: "Item Name",
    destinyTNProgression: "awesome",
    destinyTNProgressionSource: "Item Name",

    // Vision with source tracking
    nightsightRadius: 2.5,
    nightsightRadiusSource: "Item Name",
    darkvisionRadius: 1.0,
    darkvisionRadiusSource: "Item Name",

    // Accumulated numeric values
    bulkCapacityBoost: 5,
    sizeModifier: 1,

    // Collections (arrays)
    characterTags: ["Powerful", "Swift", "Arcane"],
    proficiencies: ["longbow", "arcane", "herbalism"],
    resistances: ["fire", "cold"],
    vulnerabilities: ["necrotic"]
}
```

#### 3. Helper Methods (Already Present)

- `_isEquipmentActive(item)` - Checks if equipment is in required placement
- `_isAttunementActive(item)` - Checks if attunement's linked equipment is active
- `_processTrackSideEffects()` - Processes track base + tier-specific side effects
- `_getUnlockedTiers()` - Calculates unlocked track tiers based on slot and level

#### 4. Integration in `_prepareContext()` (Lines 112-126)

```javascript
// Process side effects to get highest progressions
const sideEffects = this._processSideEffects();
context.sideEffects = sideEffects;

// Calculate target numbers using side effects
context.tns = {
    toughness: calculateTn(sideEffects.toughnessTNProgression, level, progressionOnlyLevel),
    destiny: calculateTn(sideEffects.destinyTNProgression, level, progressionOnlyLevel),
    improvised: calculateTn("mediocre", level, progressionOnlyLevel),
    healing: calculateTn("moderate", level, progressionOnlyLevel),
    challenge: calculateTn("specialty", level, progressionOnlyLevel)
};
```

## Technical Details

### Processing Order
1. **Ancestry** side effects processed first
2. **Fundament** side effects processed second
3. **All other items** processed (equipment, knacks, tracks, talents, attunements, etc.)

### Special Handling
- **Equipment:** Only active if in required placement (`system.requiredPlacement`)
- **Attunements:** Only active if linked equipment (`system.appliesTo`) is properly placed
- **Track Items:** Process both base `system.sideEffects` and tier-specific `system.tiers.tier{N}.sideEffects`
- **Tier Unlocking:** Track tiers unlock at levels based on slot position
  - Track 1: levels 1, 5, 9, 13, 17
  - Track 2: levels 2, 6, 10, 14, 18
  - Track 3: levels 3, 7, 11, 15, 19
  - Track 4: levels 4, 8, 12, 16, 20

### Data Flow
```
Items with sideEffects arrays
    ↓
_processSideEffects() method
    ↓
context.sideEffects object
    ↓
Available for:
- Display in templates (vision, tags, resistances)
- Calculations (slots, build points, max bulk)
- Derived properties (effective size, speed rolls)
```

## Existing Infrastructure

### Template Support
- **Vision Radii:** Actor template has `nightsight` and `darkvision` number fields
- **TN Display:** Templates already reference `tns.toughness` and `tns.destiny`
- **Speed Display:** Header template has conditional speed display (lines 124-138)

### Localization
All necessary keys exist in `lang/en.json`:
- `ZWOLF.ToughnessTN`, `ZWOLF.DestinyTN`
- `ZWOLF.SideEffectType*` for all effect types
- `ZWOLF.Resistances`, `ZWOLF.DamageResistances`
- Vision and proficiency labels

### Item Sheet Support
Side effects form (`templates/item/partials/side-effects-form.hbs`) supports all effect types with appropriate UI:
- Dropdowns for progressions, proficiencies, damage types
- Number inputs for radii, bulk, size modifiers
- Text inputs for character tags

## Current State

### Completed
✅ Phase 1-6: Item sheet foundation (tabs, abilities, tiers, form processing)
✅ Phase 7: Complete side effects processing for all 11 effect types
✅ Toughness TN and Destiny TN calculation and display
✅ Speed, vision radii, bulk, size, tags, proficiencies, resistances/vulnerabilities collection

### Ready For
- **Phase 8:** Slots calculation (knacks, tracks, talents, attunements with eidolon logic)
- **Phase 9:** Build points calculation (attributes, skills, progression costs)
- Using side effects data for:
  - Display in actor templates
  - Max bulk calculation
  - Effective size calculation
  - Speed roll modifiers
  - Vision token integration
  - Resistance/vulnerability mechanics

### Testing Recommendations
1. Create actor with items containing various side effect types
2. Verify TNs display correctly in header
3. Test that higher progressions override lower ones
4. Verify track tier-specific effects activate at correct levels
5. Confirm equipment effects only apply when in required placement
6. Test attunement effects based on linked equipment placement

## Key Decisions

1. **Sets for Collections:** Used `Set` objects for proficiencies, resistances, vulnerabilities to automatically handle duplicates
2. **Source Tracking:** Track source item name for highest-value effects (useful for debugging and display)
3. **Default Values:** Toughness defaults to "mediocre", Destiny to "moderate", vision radii from actor base values
4. **Accumulation vs. Highest:** Progressions and vision use highest value; bulk, size, tags, proficiencies accumulate

## References

### Related Files
- `module/sheets/actor-sheet.mjs` - Main implementation
- `module/helpers/calculation-utils.mjs` - `calculateTn()` function
- `template.json` - Actor data schema (nightsight, darkvision fields)
- `templates/actor/parts/actor-header.hbs` - TN display
- `templates/item/partials/side-effects-form.hbs` - Item side effects UI
- `lang/en.json` - Localization keys

### Archive Reference
- Previous context from `archive 2026-01-23/module/helpers/actor-data-calculator.mjs` used as implementation guide
- Pattern matches archived `_applySideEffects()` method logic

---

**Status:** Phase 7 complete and ready for Phase 8 (Slots Calculation)