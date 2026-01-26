# Summary Tab Cleanup - 2026-01-24

## Overview
Cleaned up the Summary Tab for Item sheets by removing unnecessary fields, improving spacing, and reorganizing layout to avoid overflow issues.

## Changes Made

### 1. Localization Updates
**File**: `lang/en.json`
- Added missing ZWOLF.* localization keys:
  - `Required`, `BuildPoints`, `Quantity`, `Many`, `Price`, `Structure`
  - `Placement`, `RequiredPlacement`, `NoRequirement`
  - `PlacementRequirementActive`, `PlacementRequirementActiveDescription`
  - `PlacementDisabledHint`, `CommodityType`, `Sundries`, `RitualComponents`
  - `SizeOptions`, `RequiredKnackTag`, `RequiredKnackTagPlaceholder`
  - `KnackMenu`, `Tier1-4`, `AppliesTo`, `SelectEquipment`, `AppliesToPlaceholder`

### 2. Template Cleanup
**File**: `templates/item/parts/item-summary.hbs`

**Removed entirely**:
- All "Description" fields from all item types
- "Knack Menu" field from Ancestry items
- All `notes` hint parameters from form-field calls

**Reorganized**:
- Moved "Required" editor field to the bottom of sections for:
  - Knack (now last)
  - Talent (now after KnacksProvided)
  - Ancestry (now after BuildPoints, SizeOptions, KnacksProvided)
  - Track (already last)
  - Attunement (now after Tier and AppliesTo)

**Updated**:
- Equipment: Removed notes from Required Placement section, kept placement warning display
- Ancestry: Changed Size Options multiselect from `size=8` to `size=9` to show all options
- Universal: Now shows empty comment instead of Description field

### 3. Form Field Partial
**File**: `templates/item/partials/form-field.hbs`
- Removed conditional `height` parameter support for editors (no longer needed)
- Simplified editor rendering to single code path

### 4. CSS Improvements
**File**: `styles/item-sheets.css`

**Added**:
- `.summary-tab .form-group` spacing: `margin-bottom: 1.5rem`
- `.summary-tab .form-group:last-child`: `margin-bottom: 0`
- Size Options multiselect: `min-height: 160px` to show all 9 size options

**Removed**:
- All attempted editor height constraints (caused overflow issues)

## Design Decisions

1. **No Hint Text**: Removed all hint/notes captions to reduce visual clutter
2. **No Description Fields**: Description removed as it wasn't needed in Summary tab
3. **Required at Bottom**: Moved Required editor to bottom so any overflow doesn't interfere with other fields
4. **Full Size Options**: Made multiselect tall enough to show all 9 sizes without scrolling

## Item Types Affected

- **Fundament**: BuildPoints, KnacksProvided, RequiredKnackTag
- **Knack**: Required (only)
- **Equipment**: Quantity, Price, Bulk, Structure, Placement, RequiredPlacement
- **Commodity**: CommodityType, Price, Bulk, Placement
- **Talent**: KnacksProvided (conditional), Required
- **Ancestry**: BuildPoints, SizeOptions, KnacksProvided, Required
- **Track**: Required (only)
- **Attunement**: Tier, AppliesTo, Required
- **Universal**: Empty (no fields)

## Current State
Summary tab now displays clean, well-spaced form fields with proper gaps between sections. Required editor fields are positioned at the bottom of each item type section to avoid layout issues. Size Options multiselect shows all options without scrolling.