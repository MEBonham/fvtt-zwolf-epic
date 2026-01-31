# 2026-01-24: FoundryVTT System Basic Scaffolding

## Summary
Created the complete basic scaffolding for the Z-Wolf Epic FoundryVTT v13 system, following modern v2 framework patterns.

## Key Decisions
- **FoundryVTT v13**: Using Application v2 and TypeDataModel framework (not v1)
- **Actor Types**: `character`, `npc` (both using same base data model)
- **Item Types**: `item` (single basic type)
- **Naming Convention**: `ZWolf` prefix for classes, `--z-wolf-` for CSS variables, `ZWOLF.` for localization
- **File Format**: ES Modules (.mjs), Handlebars templates (.hbs)

## Files Created

### Core System Files
- **system.json**: System manifest with v13 compatibility
- **template.json**: Data schema defining actor/item types
- **lang/en.json**: English localization strings

### JavaScript Modules
- **module/zwolf-epic.mjs**: Main entry point, registers documents/sheets/data models
- **module/data-models/actor-base.mjs**: Actor TypeDataModel with health and biography
- **module/data-models/item-base.mjs**: Item TypeDataModel with description and quantity
- **module/documents/Actor.mjs**: ZWolfActor document class
- **module/documents/Item.mjs**: ZWolfItem document class
- **module/sheets/actor-sheet.mjs**: ActorSheetV2 with HandlebarsApplicationMixin
- **module/sheets/item-sheet.mjs**: ItemSheetV2 with HandlebarsApplicationMixin
- **module/helpers/handlebars.mjs**: Handlebars helper registration
- **module/helpers/templates.mjs**: Template preloader

### Templates
- **templates/actor/actor-sheet.hbs**: Basic actor sheet with health and biography
- **templates/item/item-sheet.hbs**: Basic item sheet with quantity and description

### Styles
- **styles/variables.css**: CSS custom properties (colors, spacing, typography, borders)
- **styles/zwolf-epic.css**: Main stylesheet with sheet header/body styles

## Current State
All basic scaffolding files created. System follows FoundryVTT v13 best practices:
- Application v2 sheets (not v1)
- TypeDataModel with `static defineSchema()`
- `DEFAULT_OPTIONS` and `PARTS` static properties
- Proper `--z-wolf-` CSS variable prefixing

## Issue Encountered
User reported manifest validation error for styles/variables.css despite file existing. This is a FoundryVTT caching issue - the server needs a full restart (not just browser refresh) to recognize new files referenced in system.json.

## Next Steps
User needs to fully restart FoundryVTT server to clear manifest cache and recognize the newly created files.
