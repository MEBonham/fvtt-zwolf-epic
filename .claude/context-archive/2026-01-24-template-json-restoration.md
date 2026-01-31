# Context Archive: 2026-01-24 - Template.json Restoration

**Date:** 2026-01-24
**Topic:** Restored template.json from archived version

## Summary

Expanded the minimal `template.json` file to include all functionality from `archive 2026-01-23/template.json`, restoring the complete FoundryVTT v13 data schema for the Z-Wolf Epic system.

## Changes Made

### File Updated
- **[template.json](../../../template.json)** - Replaced skeleton schema with full implementation

### Schema Restored

**Actor Types (5):**
- `pc` - Player characters with karma points and wealth
- `npc` - Non-player characters with vitality/stamina
- `eidolon` - Summoned creatures with partial character stats
- `mook` - Basic summoned entities
- `spawn` - Basic summoned entities

**Actor Templates:**
- `base` - Common fields (level, size, speed, vision, etc.)
- `character` - Character creation fields (ancestry, fundament, build points)
- `partialCharacter` - Attributes, skills, vitality/stamina points
- `summoned` - Base creature reference for summons

**Item Types (9):**
- `ancestry` - Character ancestry with size options and knacks
- `fundament` - Character class/archetype with build points
- `equipment` - Gear with bulk, placement, attunements (4 tiers)
- `knack` - Special abilities
- `track` - Progression tracks with 5 tiers
- `talent` - Character talents
- `attunement` - Equipment attunements with tier levels
- `commodity` - Consumables and trade goods
- `universal` - Universal abilities

**Item Templates:**
- `base` - Description and granted abilities
- `sideEffectsCapable` - Side effects (speed, TN progressions, vision, size, bulk, proficiency)
- `tagged` - Tags, character tags, requirements

## Technical Details

- Uses FoundryVTT template inheritance to reduce duplication
- Applied 4-space indentation per style guide
- Structure already optimized; JSON format prevents further simplification
- Compatible with FoundryVTT v13 data model framework

## Current State

The `template.json` file now matches the archived version and defines the complete data schema for all Actor and Item types in the Z-Wolf Epic system. All templates are properly structured for FoundryVTT's template inheritance system.
