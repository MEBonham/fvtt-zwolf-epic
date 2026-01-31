# Phase 17: Actor Types Implementation
**Date:** 2026-01-30
**Topic:** Implementing Eidolon, Spawn, and Mook actor types with their trait mechanics

## Summary

Implemented Phase 17 of the Z-Wolf Epic system roadmap: Actor Types with their specific traits and mechanics:
- **Eidolon** (Gemini trait) - skill excess penalty already existed
- **Spawn** (Swarmer trait) - mirrors base creature stats
- **Mook** (Shape Ally trait) - simplified stats from base creature

## Files Modified

### template.json
- Added `trait: "gemini"` to eidolon type
- Added `trait: "shapeAlly"` to mook type
- Added `trait: "swarmer"` to spawn type

### lang/en.json
Added localization strings:
- Actor type labels: Eidolon, Mook, Spawn
- Trait labels: TraitGemini, TraitSwarmer, TraitShapeAlly
- Trait descriptions explaining each mechanic
- UI strings: MirroringBase, BaseCreature warnings, tooltips

### module/documents/Actor.mjs
Added type-specific `prepareDerivedData()`:

**Spawn (`_prepareSpawnDerivedData`):**
- Mirrors all stats from base creature (attributes, skills, level, size, tags, coast number)
- Sets `mirroringBase = true` for UI indicator

**Mook (`_prepareMookDerivedData`):**
- Inherits level, size, tags from base creature
- Simplifies progressions via `_simplifyProgressions()`: mediocre stays mediocre, everything else becomes moderate

### module/sheets/actor-sheet.mjs
- Added combined TN calculation for mooks: `Math.ceil((toughness + destiny) / 2)`
- Added context preparation for spawns/mooks/eidolons:
  - `baseCreature`, `hasBaseCreature` flags
  - `trait`, `traitLabel`, `traitDescription`
  - `mirroringBase` flag
  - `availableBaseCreatures` for dropdown
- Added helper methods: `_getDefaultTrait()`, `_getTraitLabel()`, `_getTraitDescription()`, `_getAvailableBaseCreatures()`

### templates/actor/parts/actor-header.hbs
- Added trait badges with icons next to character name (Gemini=link, Swarmer=clone, Shape Ally=users)
- Added mirroring indicator for spawns with animated sync icon
- Added warning display when no base creature is selected

### styles/actor-sheets.css
Added Phase 17 section with:
- `.trait-badge` base styles with hover effects
- Color-coded variants: `.trait-gemini` (purple), `.trait-swarmer` (green), `.trait-shapeAlly` (orange)
- `.mirroring-indicator` with spinning sync animation
- `.no-base-warning` for missing base creature
- Mook combined TN styling
- Character name flexbox alignment for badge

## Key Mechanics

1. **Spawns (Swarmer)**: Complete stat mirroring - all attributes, skills, level, size, tags copied from base creature during `prepareDerivedData()`

2. **Mooks (Shape Ally)**: Simplified progressions - mediocre stays "poor", moderate/specialty/awesome become "good" (moderate). Combined TN displayed instead of separate Toughness/Destiny.

3. **Eidolons (Gemini)**: Skill excess penalty was already implemented in prior phases - costs extra BP when skills exceed base creature's progressions.

## Current State

Phase 17 is complete. All actor types have:
- Trait fields in data model
- Visual trait badges in header
- Type-specific derived data calculations
- Base creature integration with dropdown selector
- Appropriate warnings when base creature is missing