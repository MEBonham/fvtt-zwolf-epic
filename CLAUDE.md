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

### Adding a New Item Type
1. Add type to `template.json` under `Item.types`
2. Create data model in `module/data-models/`
3. Register in `zwolf-epic.mjs`
4. Create template in `templates/item/`
5. Add localization strings to `lang/en.json`

### Adding a New Actor Type
1. Add type to `template.json` under `Actor.types`
2. Create data model in `module/data-models/`
3. Register in `zwolf-epic.mjs`
4. Create template in `templates/actor/`
5. Add localization strings to `lang/en.json`

## Game-Specific Concepts

[TODO: Add your game's unique mechanics here, e.g.:]
- **Stats**: [List primary stats]
- **Skills**: [How skills work]
- **Combat**: [Combat system overview]
- **Special Mechanics**: [Any unique systems]

## Development Notes

### Running/Testing
- Load in FoundryVTT as a system
- Use browser DevTools console for debugging
- Check for errors in Foundry's developer mode (F12)

### CSS
- All custom properties in `styles/variables.css`
- Use `--z-wolf-` prefixed variables for theming

### Known Issues / TODOs
- [ ] Testing phase pending

## Do NOT

- Use FoundryVTT v1 patterns (deprecated in v13)
- Modify `CONFIG` directly outside of `init` hook
- Use synchronous `getData()` patterns (use async)
- Guess at file contents - ask to see them first
