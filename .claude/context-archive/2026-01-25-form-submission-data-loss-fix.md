# Form Submission Data Loss Fix

**Date:** 2026-01-25
**Topic:** Fixed critical data loss issue where all item sheet inputs were being erased on close/reopen

## Problem

User reported that closing and reopening an item sheet was erasing most of the data, not just side effects. The side effects would lose their type and value, and all other form inputs would also lose their values.

## Root Cause

The current implementation was using `_processFormData()` to handle form submissions, but this method was incomplete and missing critical processing logic from the legacy version. The legacy version correctly used `_onSubmitForm()` with comprehensive form handling.

**Key missing pieces:**
1. Number field conversion (all numbers were being saved as strings)
2. Multi-select field handling
3. Proper object expansion with `foundry.utils.expandObject()`
4. Missing `closeOnSubmit: false` in form options

## Solution

### 1. Replaced `_processFormData` with `_onSubmitForm`

Ported the complete form submission handler from the legacy version ([archive 2026-01-23/module/sheets/item-sheet.mjs:541-592](../archive%202026-01-23/module/sheets/item-sheet.mjs)):

```javascript
async _onSubmitForm(formConfig, event) {
    // Get the form element
    const form = event?.target?.form || event?.target?.closest("form") || this.element.querySelector("form");
    if (!form) {
        console.error("Z-Wolf Epic | No form found in submit event");
        return;
    }

    // Extract form data using FormDataExtended
    const formData = new foundry.applications.ux.FormDataExtended(form);
    let submitData = formData.object;

    // Convert number fields explicitly
    const numberInputs = form.querySelectorAll("input[data-dtype=\"Number\"], input[type=\"number\"]");
    numberInputs.forEach(input => {
        const fieldPath = input.name;
        if (fieldPath && submitData[fieldPath] !== null && submitData[fieldPath] !== undefined && submitData[fieldPath] !== "") {
            const parsedValue = Number(submitData[fieldPath]);
            const finalValue = input.step && input.step !== "1" ? parsedValue : Math.floor(parsedValue);
            submitData[fieldPath] = isNaN(finalValue) ? 0 : finalValue;
        }
    });

    // Handle multi-select fields
    ItemDataProcessor.processMultiSelectFields(form, submitData);

    // Process side effects for non-track items
    if (this.item.type !== "track") {
        submitData["system.sideEffects"] = this._reconstructSideEffectsArray(submitData, "system.sideEffects");
    } else {
        // Process side effects for each track tier
        for (let i = 0; i < 5; i++) {
            const tierPath = `system.tierSideEffects.${i}.sideEffects`;
            submitData[tierPath] = this._reconstructSideEffectsArray(submitData, tierPath);
        }
    }

    // Expand object structure
    submitData = foundry.utils.expandObject(submitData);

    // Update the document
    try {
        await this.document.update(submitData, { render: false, diff: true });
    } catch (error) {
        console.error("Z-Wolf Epic | Failed to update item:", error);
        ui.notifications.error("Failed to save changes: " + error.message);
    }
}
```

### 2. Updated Form Options

Added `closeOnSubmit: false` in [module/sheets/item-sheet.mjs:33-36](module/sheets/item-sheet.mjs):

```javascript
form: {
    submitOnChange: true,
    closeOnSubmit: false
},
```

### 3. Added Missing Import

Added `ItemDataProcessor` import at the top of [module/sheets/item-sheet.mjs:3](module/sheets/item-sheet.mjs):

```javascript
import { ItemDataProcessor } from "../helpers/item-data-processor.mjs";
```

## Files Modified

- **[module/sheets/item-sheet.mjs](module/sheets/item-sheet.mjs)**
  - Added import for `ItemDataProcessor` (line 3)
  - Added `closeOnSubmit: false` to form options (line 35)
  - Replaced `_processFormData` with `_onSubmitForm` (lines 249-296)
  - Kept existing `_reconstructSideEffectsArray` helper method (lines 305-345)

## Result

✅ All form data now persists correctly when closing and reopening item sheets
✅ Side effects maintain their type and value
✅ Number fields are properly converted and saved
✅ Multi-select fields work correctly
✅ Data integrity maintained across form submissions

## Technical Notes

- ApplicationV2 in FoundryVTT v13 uses `_onSubmitForm(formConfig, event)` as the correct override point for form submission handling
- The method must handle:
  1. Form data extraction
  2. Data type conversion (especially numbers)
  3. Multi-select field processing
  4. Custom data structure processing (side effects arrays)
  5. Object expansion for nested structures
  6. Document update with appropriate options

## Related Context

This fix builds on previous work documented in:
- Side effects refactor (previous conversation context)
- Hidden `id` field addition to preserve effect identity
- Dynamic side effect type dropdown implementation