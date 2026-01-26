# Phase 9: Build Points Calculation - COMPLETE

**Date:** 2026-01-26
**Status:** ✅ Complete

## Overview

Implemented Phase 9 from the roadmap: **Build Points Calculation** for attributes and skills, including special eidolon logic with skill excess penalty.

## Implementation Details

### Files Modified

1. **[module/sheets/actor-sheet.mjs](../../../module/sheets/actor-sheet.mjs)**
   - Added BP calculation in `_prepareContext()` (line 136-144)
   - Added 6 new methods for build points (lines 869-1088)

### Core Functionality

#### Regular Characters (PC/NPC)

**Attribute Costs:**
- Mediocre: -5 BP
- Moderate: 0 BP (default)
- Specialty: +4 BP
- Awesome: +8 BP

**Skill Costs:**
- Base cost by progression:
  - Mediocre: 0 BP
  - Moderate: 1 BP
  - Specialty: 2 BP
  - Awesome: 3 BP
- Excess penalty: +1 BP per progression level above the skill's base value

**Skill Base Values:**
- Acumen: Willpower progression
- Athletics: Max of Agility or Fortitude
- Brawn: Fortitude progression
- Dexterity: Agility progression
- Glibness: Insight progression
- Influence: Willpower progression
- Insight: Perception progression
- Stealth: Agility progression

**Max BP:**
- Sum of ancestry BP + fundament BP

#### Eidolons (Special Logic)

**BP Calculation:**
- Own attribute/skill costs calculated normally
- Special skill excess penalty: 1 BP per skill that exceeds base creature (regardless of how many steps)
- Total = attributes + skills + skillExcessPenalty

**Max BP:**
- Own ancestry BP + base creature's unused BP
- Encourages efficient base creature builds

**Skill Excess Penalty:**
- Compares each of eidolon's 8 skills to base creature's corresponding skill
- If eidolon's skill progression is higher (by any amount), adds 1 BP penalty
- Example: If base has Moderate Athletics but eidolon has Awesome Athletics, that's +1 BP penalty

### Key Methods Added

1. `_calculateBuildPoints(context)` - Main BP calc for regular characters
2. `_calculateAttributeBP(attributes)` - Attribute costs
3. `_calculateSkillBP(skills, attributes)` - Skill costs with excess
4. `_calculateMaxBP(ancestry, fundament)` - Max BP from foundation
5. `_calculateEidolonBuildPoints(context)` - Main BP calc for eidolons
6. `_calculateEidolonSkillExcessPenalty(baseCreature)` - Eidolon skill penalty

### Build Points Object Structure

**Regular Characters:**
```javascript
{
    attributes: number,    // Attribute BP cost
    skills: number,        // Skill BP cost (base + excess)
    total: number,         // attributes + skills
    max: number           // From ancestry + fundament
}
```

**Eidolons:**
```javascript
{
    attributes: number,           // Attribute BP cost
    skills: number,               // Skill BP cost (base + excess)
    skillExcessPenalty: number,   // Penalty for exceeding base creature
    total: number,                // attributes + skills + penalty
    max: number,                  // Own ancestry + base unused
    fromAncestry: number,         // From own ancestry
    fromBaseUnused: number        // From base creature's unused BP
}
```

### Technical Notes

- **Progression Values:** Mediocre=1, Moderate=2, Specialty=3, Awesome=4
- **Excess Cost:** Each skill compares its value to its base (from attributes/other skills)
- **Glibness Special Case:** Based on Insight, not an attribute
- **Athletics Special Case:** Uses max of Agility or Fortitude
- **Eidolon Penalty:** Binary (1 BP if higher, 0 if not) - doesn't scale with difference
- **Base Creature Dependency:** Eidolon max BP recalculates if base creature changes

### Logic Source

All logic copied from legacy codebase:
- `archive 2026-01-23/module/helpers/actor-data-calculator.mjs` lines 1204-1330

## Testing Checklist

- [ ] Regular character BP costs match expected values
- [ ] Attribute costs apply correctly (-5, 0, 4, 8)
- [ ] Skill base costs apply correctly (0, 1, 2, 3)
- [ ] Skill excess penalties calculate correctly
- [ ] Max BP sums ancestry + fundament correctly
- [ ] Eidolon shows own ancestry BP separately
- [ ] Eidolon includes base creature's unused BP
- [ ] Eidolon skill excess penalty applies correctly (1 BP per exceeded skill)
- [ ] BP totals update when progressions change
- [ ] BP lock toggle works (Phase 9 includes lock in roadmap, but may be UI-only)

## Next Steps

Phase 10: Item Management (Actor Sheet UI)
- Display items on actor sheet
- Edit items in place
- Delete items
- Auto-sync on changes