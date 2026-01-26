# Equipment Effects Placement Status Fix

**Date:** 2026-01-26
**Topic:** Fixed broken equipment effects active/inactive status display

## Summary

Fixed the "Not Equipped - Effects Inactive" caption on Equipment Items that was checking a non-existent `system.equipped` field. Replaced it with computed logic that compares current placement against required placement to determine if effects are active.

## Problem

The Equipment Effects tab ([item-effects.hbs:35-43](templates/item/parts/item-effects.hbs#L35-L43)) was checking `system.equipped` to show whether effects are active:

```handlebars
{{#if system.equipped}}
    <div class="equipped-status active">
        <i class="fas fa-check-circle"></i> {{localize 'ZWOLF.EquippedActive'}}
    </div>
{{else}}
    <div class="equipped-status inactive">
        <i class="fas fa-times-circle"></i> {{localize 'ZWOLF.EquippedInactive'}}
    </div>
{{/if}}
```

However:
- `system.equipped` is never defined in [template.json](template.json)
- Equipment only has `placement` and `requiredPlacement` fields
- The field was never computed in item sheet's `_prepareContext`
- This meant the status always showed "Not Equipped - Effects Inactive" regardless of actual placement

## Solution

The caption is **informational only** - it displays whether the equipment's current placement meets its required placement for effects to be active. The placement dropdown in the Summary tab is the actual UI control.

### Decision
- Compute `effectsActive` and `showPlacementStatus` in `_prepareContext`
- Only show status if there's a `requiredPlacement` set
- If no required placement, don't show any status (effects are always active)

## Changes Made

### 1. module/sheets/item-sheet.mjs
**Lines 372-387**: Added equipment effects status calculation in `_prepareContext`

```javascript
// For equipment items, calculate if effects are active based on placement requirements
if (this.item.type === "equipment") {
    const requiredPlacement = this.item.system.requiredPlacement;

    // Only show status if there's a required placement
    if (requiredPlacement) {
        // Normalize placement values for comparison (hyphens to underscores)
        const currentPlacement = this.item.system.placement?.replace(/-/g, "_") || "";
        context.effectsActive = currentPlacement === requiredPlacement;
        context.showPlacementStatus = true;
    } else {
        // No required placement means effects are always active
        context.effectsActive = true;
        context.showPlacementStatus = false;
    }
}
```

**Key logic:**
- Normalizes `placement` values (hyphens to underscores) for comparison with `requiredPlacement`
- `showPlacementStatus`: Only `true` if `requiredPlacement` is set
- `effectsActive`: `true` if current placement matches required placement (or no requirement)

### 2. templates/item/parts/item-effects.hbs
**Lines 35-45**: Updated template to use computed values

```handlebars
{{#if showPlacementStatus}}
    {{#if effectsActive}}
        <div class="equipped-status active">
            <i class="fas fa-check-circle"></i> {{localize 'ZWOLF.EquippedActive'}}
        </div>
    {{else}}
        <div class="equipped-status inactive">
            <i class="fas fa-times-circle"></i> {{localize 'ZWOLF.EquippedInactive'}}
        </div>
    {{/if}}
{{/if}}
```

## Behavior

**No required placement:**
- Status message hidden (effects always active)

**Required placement set:**
- If current placement matches required placement → "✓ Equipped - Effects Active"
- If current placement doesn't match → "✗ Not Equipped - Effects Inactive"

**Example:**
- Item requires "wielded" but is currently "stowed" → Shows inactive warning
- Item requires "wielded" and is "wielded" → Shows active confirmation
- Item has no required placement → No status shown at all

## Files Modified

- `module/sheets/item-sheet.mjs` (lines 372-387)
- `templates/item/parts/item-effects.hbs` (lines 35-45)

## Current State

Equipment items now correctly display placement-based effects status. The placement dropdown in the Summary tab ([item-summary.hbs:87-99](templates/item/parts/item-summary.hbs#L87-L99)) remains the UI control for changing placement, and the Effects tab shows informational status based on that placement.