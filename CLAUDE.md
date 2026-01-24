# Project: Z-Wolf Epic System for FoundryVTT

## Overview

Z-Wolf Epic is an original Tabletop RPG rules system implemented for FoundryVTT v13. It handles all character creation mechanics of the game.

## Tech Stack
- **FoundryVTT**: Version 13 (CRITICAL - uses v2 data model framework, not v1)
- **JavaScript**: ES Modules (.mjs files)
- **HTML**: Handlebars templates (.hbs)
- **CSS**: Custom properties defined in variables.css

## Project Structure
```
zwolf-epic/
├── system.json              # System manifest
├── template.json            # Data schema definitions
├── zwolf-epic.mjs           # Main entry point
├── module/
│   ├── documents/           # Document classes (Actor, Item, Token)
│   ├── data-models/         # v2 Data models (actor-base.mjs, item-base.mjs)
│   ├── sheets/              # Sheet applications (actor-sheet, item-sheet)
│   ├── hooks/               # Hook modules (combat, token, item, macros)
│   ├── helpers/             # Utilities (handlebars, item-sync, sheet-state-manager)
│   ├── dice/                # Dice system
│   └── vision/              # Vision system
├── templates/
│   ├── actor/               # Actor sheet templates
│   │   ├── parts/           # Major template sections
│   │   └── partials/        # Reusable template fragments
│   └── item/                # Item sheet templates
│       ├── parts/
│       └── partials/
├── styles/
│   ├── variables.css        # CSS custom properties
│   └── [other stylesheets]
├── lang/
│   └── en.json              # English localization
└── archive 2026-01-23/      # Pre-cleanup backup (reference only, not loaded)
```

## FoundryVTT v13 Conventions (CRITICAL)

### Data Models (v2 Framework)
- All data models extend `foundry.abstract.TypeDataModel`
- Use `static defineSchema()` to define fields
- Use `static LOCALIZATION_PREFIXES` for auto-localization
- Derived data goes in `prepareDerivedData()`, not `prepareData()`

### Document Classes
- Actor/Item classes extend the base Foundry classes
- Override `prepareData()` sparingly; prefer data model methods
- Use `this.system` to access typed data model

### Application v2 Sheets
- Extend `foundry.applications.sheets.ActorSheetV2` or `ItemSheetV2`
- Use `static DEFAULT_OPTIONS` instead of `defaultOptions` getter
- Use `static PARTS` for template parts
- Actions use `static ACTIONS` or `data-action` attributes

### Handlebars
- Register helpers in helpers/handlebars.mjs
- Partials registered with `Handlebars.registerPartial()`
- Use `{{> partialName}}` syntax

## Key Files Reference

| File | Purpose |
|------|---------|
| `system.json` | System manifest, dependencies, compatibility |
| `template.json` | Actor/Item type definitions and default data |
| `zwolf-epic.mjs` | Main initialization, registers documents/sheets |
| `module/documents/actor.mjs` | ZWolfActor document class |
| `module/documents/item.mjs` | ZWolfItem document class |
| `module/data-models/actor-base.mjs` | Base actor data model |
| `module/data-models/item-base.mjs` | Base item data model |
| `module/sheets/actor-sheet.mjs` | Actor sheet application |
| `module/sheets/item-sheet.mjs` | Item sheet application |

## Naming Conventions

- **Files**: kebab-case (e.g., `actor-sheet.mjs`)
- **Classes**: PascalCase with ZWolf prefix (e.g., `ZWolfActorSheet`)
- **CSS Variables**: `--z-wolf-` prefix (defined in variables.css)
- **Localization Keys**: `ZWOLF.` prefix
- **Hooks**: Namespaced as `zwolf-epic.hookName`

## Common Patterns

### Creating User-Facing Strings
Use `ZWOLF.` prefix for all localization keys.

When creating a new localization key, first see if lang/en.json already has a similar key that could be reused. If not, create a new key with the `ZWOLF.` prefix, with its English value.

### CSS
- All custom properties in `styles/variables.css`
- Use `--z-wolf-` prefixed variables for theming

## Implementation Roadmap

This is a ground-up rebuild from `archive 2026-01-23/` focusing on modern v13 conventions. Progress through phases in order due to dependencies.

### Phase 1-6: Item Sheet Foundation
1. **Helper Modules**: item-data-processor, html-enricher, editor-save-handler
2. **Tab System**: 7 tabs (summary, basics, abilities, formulae, effects, tiers, attunements)
3. **Granted Abilities**: Add/remove/update abilities on items
4. **Track Tiers**: 5 tiers with tier-specific abilities and talent menus
5. **Form Processing**: Number conversion, multi-select, lock system, rich text editors
6. **Type-Specific**: Knack menus (ancestry), formulae (fundament), attunements (equipment), source tracking

### Phase 7-9: Actor Sheet Data Layer
7. **Side Effects**: Speed, TN boosts, vision radii, max bulk, resistances/vulnerabilities
8. **Slots Calculation**: Knacks, tracks, talents, attunements (with eidolon placeholder logic)
9. **Build Points**: Attribute/skill costs, progression sliders, lock toggle

### Phase 10-14: Actor Sheet UI & Features
10. **Item Management**: Display, edit, delete, auto-sync on changes
11. **Drop Zones**: Foundation, slots, equipment, attunement with drag-over feedback
12. **Equipment/Inventory**: Placement states, bulk calculation, weight/value, requirements
13. **Granted Abilities Display**: Categorized abilities, exotic senses tooltip, character tags
14. **Vision & Properties**: Vision radii, token integration, language limit, size validation

### Phase 15-18: Gameplay & Polish
15. **Dice Rolling**: Progression, stats, speed with net boosts
16. **Rest & Wealth**: Short/extended rest, gain/lose wealth
17. **Actor Types**: Eidolon (Gemini, skill excess penalty), Spawn (Swarmer, mirror base), Mook (Shape Ally, tags)
18. **UI Polish**: Progression accordion, rich text editors, notifications

**Key Principle**: Build dependencies first (helpers → items → actor data → actor UI)

## Do NOT

- Use FoundryVTT v1 patterns (deprecated in v13)
- Modify `CONFIG` directly outside of `init` hook
- Use synchronous `getData()` patterns (use async)
- Guess at file contents - ask to see them first
