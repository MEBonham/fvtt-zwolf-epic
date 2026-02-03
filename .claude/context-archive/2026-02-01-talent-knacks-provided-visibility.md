# Talent Knacks Provided Field Visibility Fix

**Date:** 2026-02-01

## Summary

Modified the Talent item sheet to always display the "Knacks Provided" field and make it editable.

## Changes Made

### File: `templates/item/parts/item-summary.hbs`

**Before:** The Knacks Provided field was wrapped in a conditional `{{#if system.required}}` block and had `readonly=true`, meaning:
- It only appeared when the Talent had content in its "Required" rich text field
- The value could not be edited by the user

**After:** Removed the conditional wrapper and the readonly attribute so that:
- The field always displays on Talent sheets
- Users can enter/modify the value directly

## Code Change

```handlebars
{{!-- BEFORE --}}
{{#if system.required}}
    {{> form-field
        label="ZWOLF.KnacksProvided"
        type="number"
        name="system.knacksProvided"
        value=system.knacksProvided
        min=0
        readonly=true}}
{{/if}}

{{!-- AFTER --}}
{{> form-field
    label="ZWOLF.KnacksProvided"
    type="number"
    name="system.knacksProvided"
    value=system.knacksProvided
    min=0}}
```

## Current State

The change is complete. The Knacks Provided field now always shows on Talent item sheets and is editable.