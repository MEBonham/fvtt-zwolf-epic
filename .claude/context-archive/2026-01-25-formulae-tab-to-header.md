# Formulae Tab Moved to Header for Fundament Items

**Date:** 2026-01-25
**Topic:** Refactored Item Sheet to move Formulae tab content into Header for Fundament items

## Summary

The Formulae tab was eliminated as a separate tab because it contained minimal content (only 2 dropdown fields) that applied exclusively to Fundament items. This content was moved into the Item Sheet header for a cleaner, more streamlined UI.

## Problem

The Formulae tab existed solely for Fundament items and contained only:
- Vitality Function selector (standard/hardy)
- Coast Function selector (standard/cunning)

Having a separate tab for such minimal content was inefficient and cluttered the tab navigation.

## Solution

Moved the formulae fields into the Item Sheet header as a conditional section that only appears for Fundament items.

## Files Modified

### 1. template.json (Schema Fix)
**Critical Fix:** Resolved field name mismatch
- Changed `vitalityKey` → `vitalityFunction` (default: "standard")
- Changed `coastKey` → `coastFunction` (default: "standard")

These field names now match the existing template implementation from the archive.

### 2. lang/en.json (Localization)
Added 10 new localization keys:
- `VitalityFunction`, `VitalityFormula`, `VitalityStandard`, `VitalityHardy`, `VitalityFunctionHint`
- `CoastFunction`, `CoastFormula`, `CoastStandard`, `CoastCunning`, `CoastFunctionHint`

### 3. templates/item/parts/item-header.hbs (Header Template)
Added conditional formulae section after tags field:
```handlebars
{{#if (eq itemType "fundament")}}
    <div class="header-formulae">
        <div class="header-field">
            <label>{{localize 'ZWOLF.VitalityFormula'}}</label>
            <select name="system.vitalityFunction">
                <option value="standard" {{#if (or (eq system.vitalityFunction "standard") (not system.vitalityFunction))}}selected{{/if}}>
                    {{localize 'ZWOLF.VitalityStandard'}}
                </option>
                <option value="hardy" {{#if (eq system.vitalityFunction "hardy")}}selected{{/if}}>
                    {{localize 'ZWOLF.VitalityHardy'}}
                </option>
            </select>
        </div>
        <div class="header-field">
            <label>{{localize 'ZWOLF.CoastFormula'}}</label>
            <select name="system.coastFunction">
                <option value="standard" {{#if (or (eq system.coastFunction "standard") (not system.coastFunction))}}selected{{/if}}>
                    {{localize 'ZWOLF.CoastStandard'}}
                </option>
                <option value="cunning" {{#if (eq system.coastFunction "cunning")}}selected{{/if}}>
                    {{localize 'ZWOLF.CoastCunning'}}
                </option>
            </select>
        </div>
    </div>
{{/if}}
```

### 4. templates/item/parts/item-tabs.hbs (Tab Navigation)
Removed the Formulae tab button (lines 21-29):
- Deleted the conditional `{{#if (eq itemType "fundament")}}` block for the formulae tab

### 5. module/sheets/item-sheet.mjs (PARTS Configuration)
Removed the `tab-formulae` entry from PARTS object (lines 58-61):
```javascript
// REMOVED:
"tab-formulae": {
    template: "systems/zwolf-epic/templates/item/parts/item-formulae.hbs",
    scrollable: [".tab"]
},
```

### 6. templates/item/parts/item-formulae.hbs (Template File)
**DELETED** - File is no longer needed since content was moved to header

### 7. styles/item-sheets.css (Header Styling)
Added comprehensive Item Sheet header styling (lines 25-162):
- `.sheet-header-wrapper` - gradient background, border, padding
- `.sheet-header` - flex layout for image + fields
- `.profile-img` - 64x64 image with hover scale effect
- `.header-fields` - flex container for all text fields
- `.charname` - name input styling
- `.item-subtitle` - type display styling
- `.header-tags` - tags input styling
- `.header-formulae` - formulae container with flex layout
- `.header-field` - individual field wrapper (label + select inline)
- `.header-field label` - label styling (600 weight, gray color)
- `.header-field select` - dropdown styling with hover effect
- `.source-indicator` - source display styling

Pattern matches actor sheet header for visual consistency.

## Design Decisions

1. **Inline Layout:** Used `.header-field` wrapper with label and select side-by-side instead of stacked layout
2. **No Hint Text:** Omitted hint paragraphs from header for cleaner, more compact appearance
3. **Field Names:** Used `vitalityFunction` and `coastFunction` to match archive implementation
4. **Complete Cleanup:** Deleted obsolete template file entirely rather than leaving it empty
5. **CSS Organization:** Added all header styles to `item-sheets.css` for organized stylesheet management

## Current State

- Fundament items now display vitality and coast formula selectors in the header
- Formulae tab no longer appears in navigation for any item type
- Header layout is clean with inline formulae fields
- All 7 todos completed successfully

## Tab Structure After Changes

Item Sheet now has 5 tabs (conditionally shown):
1. **Summary** - Always visible for all types
2. **Abilities** - For types with granted abilities
3. **Effects** - For types with side effects or character tags
4. **Tiers** - Track items only
5. **Attunements** - Equipment items only (GM only)

The Formulae tab has been eliminated.

## Testing Recommendations

1. Open a Fundament item sheet - verify formulae dropdowns appear in header
2. Change vitality function to "hardy" and save - verify persistence
3. Change coast function to "cunning" and save - verify persistence
4. Open non-Fundament items (ancestry, track, equipment) - verify formulae section does NOT appear
5. Verify header layout is clean and responsive
6. Check that no "Formulae" tab appears for any item type