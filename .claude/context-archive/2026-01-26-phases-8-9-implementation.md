# Phases 8-9 Implementation: Slots & Build Points

**Date:** 2026-01-26
**Topic:** Actor sheet data layer - slots calculation and build points

## Overview

Implemented Phase 8 (Slots Calculation) and Phase 9 (Build Points Calculation) from the Z-Wolf Epic roadmap. All logic copied directly from the legacy codebase (`archive 2026-01-23/module/helpers/actor-data-calculator.mjs`) without modifications.

## Changes Made

### File Modified
**[module/sheets/actor-sheet.mjs](../../../module/sheets/actor-sheet.mjs)**

### Phase 8: Slots Calculation (Lines 128-135, 489-866)

**Entry Point:**
```javascript
// In _prepareContext() - lines 128-135
if (context.isEidolon) {
    this._calculateEidolonSlots(context);
} else if (!context.isSpawn && !context.isMook) {
    this._calculateSlots(context);
}
```

**Methods Added:**
1. `_calculateSlots(context)` - Regular character slots
2. `_calculateTotalKnacksProvided()` - Sum all knack sources
3. `_prepareSlots(itemType, slotCount)` - Route to appropriate prep
4. `_prepareTalentSlots(slotCount)` - Talents with track associations
5. `_prepareTrackSlots(slotCount)` - Track slots with flag-based assignment
6. `_prepareSequentialSlots(itemType, slotCount)` - Simple sequential (knacks)
7. `_getTrackSlotIndex(trackItem)` - Get track slot with fallback
8. `_calculateEidolonSlots(context)` - Eidolon slots from placeholders
9. `_calculateEidolonTrackSlots(baseCreature)` - Eidolon track slots
10. `_prepareEidolonTalentSlots(baseCreature)` - Eidolon talent slots

**Regular Characters:**
- **Knack Slots:** Sum of ancestry + fundament + talents + track tier side effects
- **Track Slots:** min(4, character level), flag-based positioning
- **Talent Slots:** One per level, cycling through tracks 1-4

**Eidolons:**
- **Knack Slots:** Own ancestry + base creature's "(Eidolon Placeholder)" knacks
- **Track Slots:** Only positions with placeholder tracks in base creature
- **Talent Slots:** Only for enabled tracks, tier unlocks based on base creature's level

**Slot Structures:**
```javascript
// Knack/simple slots
{index: number, item: object|null}

// Track slots
{index: number, item: object|null, enabled?: boolean}

// Talent slots
{
    index: number,
    item: object|null,
    talentNumber: number,     // 1-based slot number
    trackNumber: number,      // 1-4 (which track this belongs to)
    trackName: string|null,   // Name of assigned track
    hasTrack: boolean         // Whether track is assigned
}
```

### Phase 9: Build Points Calculation (Lines 137-144, 868-1099)

**Entry Point:**
```javascript
// In _prepareContext() - lines 137-144
if (context.isCharacter) {
    if (context.isEidolon) {
        this._calculateEidolonBuildPoints(context);
    } else {
        this._calculateBuildPoints(context);
    }
}
```

**Methods Added:**
1. `_calculateBuildPoints(context)` - Regular character BP
2. `_calculateAttributeBP(attributes)` - Attribute costs
3. `_calculateSkillBP(skills, attributes)` - Skill costs with excess
4. `_calculateMaxBP(ancestry, fundament)` - Max BP from foundation
5. `_calculateEidolonBuildPoints(context)` - Eidolon BP with penalty
6. `_calculateEidolonSkillExcessPenalty(baseCreature)` - Eidolon penalty

**Attribute Costs:**
- Mediocre: -5 BP
- Moderate: 0 BP (default)
- Specialty: +4 BP
- Awesome: +8 BP

**Skill Costs:**
- Base cost by progression: Mediocre=0, Moderate=1, Specialty=2, Awesome=3
- Excess penalty: +1 BP per progression level above base value

**Skill Base Values:**
- Acumen: Willpower
- Athletics: max(Agility, Fortitude)
- Brawn: Fortitude
- Dexterity: Agility
- Glibness: Insight
- Influence: Willpower
- Insight: Perception
- Stealth: Agility

**Regular Characters:**
```javascript
context.buildPoints = {
    attributes: number,    // Total attribute BP cost
    skills: number,        // Total skill BP cost (base + excess)
    total: number,         // attributes + skills
    max: number           // ancestry BP + fundament BP
}
```

**Eidolons:**
```javascript
context.buildPoints = {
    attributes: number,           // Own attribute BP cost
    skills: number,               // Own skill BP cost (base + excess)
    skillExcessPenalty: number,   // +1 BP per skill exceeding base creature
    total: number,                // attributes + skills + penalty
    max: number,                  // Own ancestry + base unused
    fromAncestry: number,         // BP from own ancestry
    fromBaseUnused: number        // BP from base creature's unused
}
```

**Eidolon Skill Excess Penalty:**
- Compares each skill to base creature's corresponding skill
- If eidolon's skill is ANY higher (regardless of how many steps), adds 1 BP penalty
- Total penalty = count of skills where eidolon > base creature
- Encourages efficient base creature builds

## Technical Notes

### Slot Assignment Logic
- **Flag-Based:** Items store `zwolf-epic.slotIndex` flag for persistence
- **Fallback:** If no flag, uses item order in collection
- **Auto-Assignment:** If item has no valid slot, finds first available slot and sets flag
- **Tier Unlocks:** Calculated as `trackPosition + (tier - 1) * 4`

### BP Calculation Logic
- **Progression Values:** Mediocre=1, Moderate=2, Specialty=3, Awesome=4
- **Excess Calculation:** `max(0, skillValue - baseValue)` in progression steps
- **Eidolon Max BP:** Can be negative if base creature overspends
- **Skill Interdependency:** Glibness depends on Insight, creating cascading costs

### Integration Points
- Slots used by Configure tab (future Phase 10+)
- BP displayed in UI (future Phase 10+)
- Eidolon calculations require base creature access
- Track tiers affect knack slot counts through side effects

## Logic Source

**Copied from:** `archive 2026-01-23/module/helpers/actor-data-calculator.mjs`
- Lines 1020-1200: Slots calculation methods
- Lines 1204-1330: Build points calculation methods
- Lines 336-465: Eidolon-specific slot calculations

**No changes made** - direct port from legacy codebase

## Testing Checklist

### Phase 8 - Slots
- [ ] Knack slots count ancestry + fundament + talents correctly
- [ ] Knack slots increase when track tiers provide them
- [ ] Track slots appear at correct levels (1-4 as level increases)
- [ ] Talent slots appear one per level
- [ ] Talent slots show correct track associations
- [ ] Eidolon knack slots include placeholder count
- [ ] Eidolon track slots only appear for placeholder positions
- [ ] Eidolon talent slots unlock based on base creature's level
- [ ] Slot assignments persist through reloads

### Phase 9 - Build Points
- [ ] Attribute costs calculate correctly (-5/0/+4/+8)
- [ ] Skill base costs calculate correctly (0/1/2/3)
- [ ] Skill excess penalties apply correctly
- [ ] Max BP sums ancestry + fundament
- [ ] Athletics uses max of Agility/Fortitude
- [ ] Glibness uses Insight progression
- [ ] Eidolon shows own ancestry BP separately
- [ ] Eidolon includes base creature's unused BP
- [ ] Eidolon skill excess penalty counts correctly
- [ ] BP totals update when progressions change

## Related Files

- `.claude/context-archive/2026-01-26-phase8-slots-calculation.md` - Phase 8 detail
- `.claude/context-archive/2026-01-26-phase9-build-points-calculation.md` - Phase 9 detail
- `archive 2026-01-23/module/helpers/actor-data-calculator.mjs` - Original source

## Next Steps

**Phase 10: Item Management (Actor Sheet UI)**
- Display items on actor sheet
- Edit items in place
- Delete items
- Auto-sync on changes

**Future Phases:**
- Phase 11: Drop Zones (Foundation, slots, equipment, attunements)
- Phase 12: Equipment/Inventory (Placement, bulk, requirements)
- Phase 13: Granted Abilities Display (Categories, exotic senses, tags)
- Phase 14: Vision & Properties (Radii, token integration)