# Context Archive: Rebuild Implementation Roadmap

**Date**: 2026-01-24
**Topic**: Comprehensive feature inventory and implementation roadmap for ground-up rebuild

## Summary

Created a comprehensive inventory of all features from `archive 2026-01-23/` that haven't been re-implemented in the current cleanup, then designed an 18-phase implementation roadmap with logical dependency ordering. This serves as the master plan for rebuilding all functionality using modern FoundryVTT v13 conventions.

## Context

The current codebase is a **ground-up rebuild** from the archived version. Goals:
- Make code more concise and organized
- Use modern FoundryVTT v13 conventions (v2 data models, ApplicationV2 sheets)
- Add new features like resistances/vulnerabilities (already added to schema)
- Re-implement all previous functionality in a cleaner architecture

## Feature Analysis

### Missing Actor Sheet Features (87% actions, 100% major systems)
- **13 of 15 actions missing**: Roll dice (progression/stats/speed), rest system, wealth, item management, base creature viewing
- **Major systems completely missing**:
  - Build Points System (sliders, costs, lock toggle)
  - Item Management & Drop Zones (drag-and-drop, capacity checking, validation)
  - Equipment & Inventory (placement, bulk calculation, attunement)
  - Side Effects Processing (speed, TN boosts, vision, resistances, bulk)
  - Slots Calculation (knacks, tracks, talents, attunements with eidolon logic)
  - Granted Abilities Display (categorization, tooltips, tags)
  - Actor Type-Specific Features (eidolon, spawn, mook validation and inheritance)
  - Rest & Wealth Systems
  - Vision System (nightsight, darkvision with source tracking)
  - Accordion interactions and rich text editors

### Missing Item Sheet Features (88% tabs, 92% major systems)
- **7 of 8 tabs missing**: Summary, basics, abilities, formulae, effects, tiers, attunements
- **Major systems completely missing**:
  - Granted Abilities Management (add/remove/update with type selection)
  - Track Tier System (5 tiers with tier-specific abilities and talent menus)
  - Knack Menu System (ancestry items, auto-calculate knacks provided)
  - Rich Text Editors (ProseMirror with save/cancel buttons)
  - HTML Enrichment (async enrichment for descriptions)
  - Form Data Processing (number conversion, multi-select arrays)
  - Lock System (disable inputs on actor-embedded items)
  - Source Item Tracking (link embedded items to world items)
  - Tab navigation with state persistence
  - Type-specific conditional rendering

### Missing Helper Modules (10 of 14 files)
**Currently missing**:
1. `editor-save-handler.mjs` - Rich text editor management
2. `html-enricher.mjs` - HTML content enrichment
3. `item-data-processor.mjs` - Form data processing utilities
4. `item-sync.mjs` - Item change monitoring and auto-refresh
5. `rest-handler.mjs` - Short/extended rest logic
6. `vision-detection-only.mjs` - Vision mode integration
7. `vision-radius-display.mjs` - Token vision radius display
8. `sheet-event-handlers.mjs` - Centralized event handling
9. `actor-data-calculator.mjs` - Complete data pipeline with side effects
10. `drop-zone-handler.mjs` - Drag-and-drop zone management

**Currently present**:
- `sheet-state-manager.mjs` - Scroll/tab state persistence ✓
- `handlebars.mjs` - 50+ template helpers ✓
- `templates.mjs` - Template preloading ✓
- `calculation-utils.mjs` - Basic calculations ✓
- `config.mjs` - ZWOLF config (damage types, etc.) ✓

### Currently Working Features
✅ Basic sheet structure and layout
✅ Tab navigation (actor sheet)
✅ Scroll position persistence
✅ Image editing
✅ Basic progression bonus calculations
✅ Target number calculations (improvised/healing/challenge)
✅ Type-specific visibility logic
✅ Handlebars helpers ecosystem
✅ Config system with damage types
✅ Resistance/vulnerability UI (schema + UI added, processing pending)
✅ Basic form auto-save (submitOnChange)

## Implementation Roadmap

Designed an 18-phase roadmap with 89 tasks, organized by dependency order:

### Phase 1-6: Item Sheet Foundation (24 tasks)
Build item sheet first since actors depend on items being fully functional.
- **Phase 1**: Helper modules (item-data-processor, html-enricher, editor-save-handler)
- **Phase 2**: Tab system (7 tabs with conditional rendering)
- **Phase 3**: Granted abilities (add/remove/update, core feature used everywhere)
- **Phase 4**: Track tiers (5 tiers with tier-specific abilities/menus)
- **Phase 5**: Form processing (number conversion, multi-select, lock system, rich text)
- **Phase 6**: Type-specific features (knack menus, formulae, attunements, source tracking)

### Phase 7-9: Actor Sheet Data Layer (23 tasks)
Core calculations that everything else depends on.
- **Phase 7**: Side effects processing (resistances, vision, TN boosts, bulk, speed)
- **Phase 8**: Slots calculation (knacks, tracks, talents, attunements with eidolon logic)
- **Phase 9**: Build points system (costs, sliders, lock toggle)

### Phase 10-14: Actor Sheet UI & Features (27 tasks)
User-facing functionality for managing characters.
- **Phase 10**: Item display and management (edit, delete, auto-sync)
- **Phase 11**: Drop zones (foundation, slots, equipment with drag feedback)
- **Phase 12**: Equipment & inventory (placement, bulk, attunement)
- **Phase 13**: Granted abilities display (categorization, tooltips, tags)
- **Phase 14**: Vision integration and character properties

### Phase 15-18: Gameplay & Polish (15 tasks)
Advanced features and quality of life.
- **Phase 15**: Dice rolling system (progression, stats, speed with net boosts)
- **Phase 16**: Rest and wealth systems
- **Phase 17**: Actor type-specific features (eidolon, spawn, mook)
- **Phase 18**: UI polish (accordions, editors, notifications)

**Key Design Principles**:
1. Dependencies First: Helper modules → Item sheet → Actor data → Actor UI
2. Core Before Polish: Basic functionality before rich text editors and tooltips
3. Data Before Display: Calculate everything before showing it
4. Type-Agnostic Then Specific: General features before type-specific logic

## Changes Made

### CLAUDE.md Updated
Added new **Implementation Roadmap** section (lines 99-129) with concise phase overview:
- 18 phases organized into 4 major sections
- Each phase summarized in 1-2 lines
- Key dependency principle noted
- Serves as reference for logical implementation order

## Technical Notes

### Actor Type-Specific Logic (Critical)
- **Eidolons**: Require Gemini track on base creature, inherit level/progression, skill excess penalty (1 BP per skill over base), can only use "(Eidolon Placeholder)" track/knack slots
- **Spawns**: Require Swarmer track on base creature, completely mirror base creature stats
- **Mooks**: Require Shape Ally talent on base creature, derive tags from base creature

### Build Points Formula
- **Attributes**: -5 (mediocre) to +8 (awesome) based on progression
- **Skills**: Base cost + excess cost above attribute value
- **Eidolon Exception**: +1 BP penalty per skill exceeding base creature

### Slots Calculation
- **Knacks**: Ancestry + Fundament + Talents + Track Tiers
- **Tracks**: Min(4, level) normally; eidolons use base creature placeholder slots only
- **Talents**: 1 per character level, assigned to tracks via modulo formula
- **Attunements**: floor((level + 3) / 4) slots with tier = slot position

### Track Tier Unlock
Tier N unlocks at character level: `slotIndex + 1 + (N-1) * 4`

### Special Item Names (System Recognition)
- "Progression Enhancement" → +1 level to progression calculations
- "Extra VP" → Vitality point boost
- "(Eidolon Placeholder)" → Base creature slots for eidolons
- "Shape Ally" → Required for mook base creatures
- "Gemini" → Required for eidolon base creatures
- "Swarmer" → Required for spawn base creatures

## Current State

- ✅ Comprehensive feature inventory completed (actor + item sheets)
- ✅ 18-phase implementation roadmap designed with dependency ordering
- ✅ Roadmap documented in CLAUDE.md for future reference
- ⏳ Implementation phases ready to begin (Phase 1: Helper modules)
- 📋 89 tasks identified across all phases

## Quick Wins for Initial Progress
Recommended starting points for visible progress:
1. **Phase 2-3** (Item tabs + abilities) → makes items functional
2. **Phase 7** (Side effects) → unlocks actor calculations
3. **Phase 10** (Item display) → lets you see items on actors

## Files Referenced

### Archived Files (Reference)
- `archive 2026-01-23/module/sheets/actor-sheet.mjs`
- `archive 2026-01-23/module/sheets/item-sheet.mjs`
- `archive 2026-01-23/module/helpers/*.mjs` (14 helper files)
- `archive 2026-01-23/module/documents/item.mjs`

### Current Files
- `module/sheets/actor-sheet.mjs` (minimal implementation)
- `module/sheets/item-sheet.mjs` (minimal implementation)
- `module/helpers/` (5 of 14 helpers present)
- `CLAUDE.md` (updated with roadmap)

## Next Steps

1. Begin Phase 1: Create helper modules (item-data-processor, html-enricher, editor-save-handler)
2. Progress through phases in order due to dependencies
3. Test each phase before moving to next
4. Reference archived implementations for feature details while modernizing to v13 patterns
