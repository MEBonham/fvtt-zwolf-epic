# Attunement Separate Item Approach Implementation

**Date:** 2026-01-26
**Topic:** Refactored attunements from embedded Equipment data to standalone Item type

## Summary

Implemented the Separate Item Approach for attunements, replacing the embedded attunements-on-equipment design. This architectural change allows attunements to work both with equipment items (equipment-based) and as standalone magical effects (permanent enchantments, blessings, etc.).

## Problem

The system had two conflicting attunement designs:
1. **Embedded Approach (Current)**: Equipment items had an `attunements` object with tier-specific descriptions embedded in their data
2. **Separate Item Approach (Legacy)**: Attunements were standalone Items with `tier` and `appliesTo` fields

The embedded approach couldn't handle non-equipment attunements (permanent blessings, magical bonds, tattoos) without creating awkward "phantom" equipment items.

## Decision

Chose the **Separate Item Approach** because:
- **Flexibility**: Handles both equipment-based and standalone attunements naturally
- **Semantics**: Attunement slots accept "Attunement" items, not special Equipment items
- **Future-proofing**: Supports story mechanics like blessings, curses, magical bonds
- **Data integrity**: Relationship between attunement and equipment is explicit
- **appliesTo field logic**:
  - Equipment-based: `appliesTo: "equipment-id"` (or equipment name)
  - Standalone: `appliesTo: ""` (permanent blessing, tattoo, pact)

## Files Modified

### 1. template.json (Data Schema)
**Lines 131-146**: Removed embedded `attunements` object from Equipment type
```json
// REMOVED:
"attunements": {
    "tier1": { "description": "" },
    "tier2": { "description": "" },
    "tier3": { "description": "" },
    "tier4": { "description": "" }
}
```

**Lines 171-175**: Kept standalone Attunement item type (already present)
- `tier`: 1-4 (which tier this attunement requires)
- `appliesTo`: Equipment ID/name or blank for standalone
- Inherits: `base`, `sideEffectsCapable`, `tagged` templates

### 2. module/sheets/item-sheet.mjs (PARTS Configuration)
**Lines 63-66**: Removed `tab-attunements` part from PARTS object
```javascript
// REMOVED:
"tab-attunements": {
    template: "systems/zwolf-epic/templates/item/parts/item-attunements.hbs",
    scrollable: [".tab"]
}
```

**Lines 367-370**: Kept context preparation for attunement items (provides equipment list)

### 3. templates/item/parts/item-tabs.hbs (Tab Navigation)
**Lines 41-51**: Removed attunements tab button (Equipment-only, GM-only section)

### 4. templates/item/item-sheet.hbs (Main Template)
**Lines 7-12**: Fixed partial references to use correct `tab-*` names
```handlebars
{{> tab-summary}}
{{> tab-abilities}}
{{> tab-effects}}
{{> tab-tiers}}
```

### 5. templates/item/parts/item-attunements.hbs (Template File)
**DELETED** - No longer needed since attunements aren't embedded on equipment

### 6. templates/item/parts/item-summary.hbs (Already Complete)
**Lines 266-311**: Attunement item summary section already exists with:
- Tier selector (1-4 dropdown)
- AppliesTo field:
  - Equipment dropdown when attunement is on an actor
  - Text field when editing world-level attunement
- Required field for prerequisites

### 7. lang/en.json (Localization - Already Complete)
All necessary strings already present:
- `ItemTypeAttunement`, `Tier`, `Tier1-4`
- `AppliesTo`, `SelectEquipment`, `AppliesToPlaceholder`
- `Required`, attunement slot strings (lines 163-172)

## How Attunement Items Work

**Attunement Items** are standalone items with:
- **Tier** (1-4): Which attunement tier this represents (unlocks at Level 5/9/13/17)
- **Applies To**:
  - Equipment item ID when on an actor (dropdown selection)
  - Equipment name when in world (text field)
  - Blank for standalone permanent enchantments
- **Description**: What the attunement does (rich text)
- **Granted Abilities**: Powers granted by the attunement
- **Side Effects**: Stat modifications from the attunement
- **Tags** & **Required**: Prerequisites and categorization

## Examples

**Equipment-based attunement:**
- Name: "Flaming Sword Tier 2"
- Tier: 2 (unlocks at Level 9)
- Applies To: "Longsword of Flames" (equipment ID)
- Description: "The sword ignites with holy fire..."

**Standalone attunement:**
- Name: "Divine Blessing"
- Tier: 1 (unlocks at Level 5)
- Applies To: "" (blank - not tied to equipment)
- Description: "The gods have blessed you with..."

## Current State

- Attunements are standalone Item types with tier and appliesTo fields
- Equipment items no longer have embedded attunements data
- Item sheet properly displays attunement summary with smart appliesTo field
- All tabs work correctly (Summary, Abilities, Effects)
- All localization strings in place
- Implementation complete and ready for actor sheet integration

## Next Steps (Future Work)

Phase 7-9 will implement:
- Actor sheet attunement slot display
- Drag-drop attunement items into slots
- Tier validation (attunement tier ≤ slot tier)
- Overextended slot warnings
- Equipment reference display ("applies to X")