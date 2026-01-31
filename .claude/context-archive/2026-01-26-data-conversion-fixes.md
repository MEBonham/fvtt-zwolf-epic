# Data Conversion Fixes

**Date:** 2026-01-26
**Topic:** Fixed legacy data conversion issues with arrays, objects, and multi-select fields

---

## Context

User raised concerns about legacy data conversion issues between strings, arrays, and numerically-keyed objects that existed in the previous version. Specifically:
- Converting comma-separated tags between strings and arrays
- Converting between arrays and numerically-keyed objects
- Proper handling of form data conversion

## Investigation Results

### ✅ Already Working Properly

1. **Tags (String Format)**
   - Consistently stored as comma-separated strings in `template.json:111`
   - Validated in `item-data-processor.mjs:49,62` to ensure string type
   - Form inputs naturally produce strings
   - No conversion needed

2. **Number Conversion**
   - Explicitly handled in `item-sheet.mjs:411-419`
   - Converts form strings to numbers for fields with `data-dtype="Number"` or `type="number"`
   - Handles integers and decimals based on `step` attribute
   - Safely defaults to `0` for invalid values

3. **Granted Abilities (Object Storage)**
   - Now use objects with random ID keys (not numeric indices)
   - `validateGrantedAbilities` handles backwards compatibility from arrays
   - Uses proper deletion syntax: `system.grantedAbilities.-=${id}`

### ⚠️ Issues Found & Fixed

## Changes Made

### 1. Side Effects Array Reconstruction - Critical Bug Fix

**File:** `module/sheets/item-sheet.mjs:446-497`

**Problem:**
- Old code used `while` loops to fill gaps, creating placeholder objects
- Generated unnecessary random IDs for empty slots
- Created malformed objects if fields arrived out of order
- Left gaps in arrays with non-contiguous indices

**Solution:**
```javascript
// OLD (lines 459-461):
while (effects.length <= index) {
    effects.push({ id: foundry.utils.randomID(), type: "characterTag", value: "" });
}

// NEW (lines 460-462):
if (!effects[index]) {
    effects[index] = {};
}
```

Added validation and filtering (lines 477-496):
- Uses sparse array assignment instead of loops
- Filters out `undefined` slots after reconstruction
- Validates each effect has required fields (type, value)
- Preserves existing IDs or generates only for valid effects
- Properly handles optional `tier` field for track items

### 2. Multi-Select Processor - Made Generic

**File:** `module/helpers/item-data-processor.mjs:122-139`

**Problem:**
- Only handled `sizeOptions` field specifically
- Future multi-select fields would fail to convert to arrays

**Solution:**
```javascript
// OLD: Hardcoded for sizeOptions only
const sizeOptionsSelect = form.querySelector('select[name="system.sizeOptions"]');

// NEW: Generic for all multi-select fields
const multiSelects = form.querySelectorAll("select[multiple]");
multiSelects.forEach(select => {
    const fieldName = select.name;
    if (fieldName) {
        const selectedValues = Array.from(select.selectedOptions).map(option => option.value);
        formData[fieldName] = selectedValues;
    }
});
```

Now automatically finds and converts ALL `select[multiple]` elements to arrays.

## Summary

All data conversion concerns are now properly handled:

- ✅ **Tags:** Always strings, no conversion needed
- ✅ **Numbers:** Explicit conversion with `data-dtype="Number"`
- ✅ **Arrays:** Multi-select now generic and automatic
- ✅ **Objects:** Granted abilities use proper object storage with random ID keys
- ✅ **Side Effects Arrays:** Robust reconstruction that handles edge cases (gaps, missing fields, tier preservation)

Legacy array/object conversion issues are resolved.

## Files Modified

1. `module/sheets/item-sheet.mjs` - Enhanced `_reconstructSideEffectsArray` method
2. `module/helpers/item-data-processor.mjs` - Generalized `processMultiSelectFields` method

## Outstanding Notes

- `evaluateFunction` in `item-data-processor.mjs:147` has unused destructured variables warning
- Function not currently called anywhere - appears to be legacy code for formula evaluation
- Left unchanged as it may be used in future phases