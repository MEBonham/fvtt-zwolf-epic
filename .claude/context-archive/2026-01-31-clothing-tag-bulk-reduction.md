# Clothing Tag Bulk Reduction

**Date:** 2026-01-31
**Topic:** Worn clothing items reduce effective bulk by 1

## Summary

Implemented a feature where equipment items with the "Clothing" tag contribute -1 effective Bulk when worn, with a per-item minimum of 0.

## Requirements

- Items with the "Clothing" tag should reduce their effective bulk by 1 when worn
- The reduction is clamped per-item to a minimum of 0 (a 0-bulk clothing item doesn't give -1 total bulk)

## Implementation

**File Modified:** `module/sheets/actor-sheet.mjs`

**Location:** `_calculateInventoryTotals()` method (lines 1825-1842)

**Logic:**
```javascript
// Calculate bulk from equipment (only if carried)
equipmentItems.forEach(item => {
    const placement = item.system.placement || "stowed";
    if (placement !== "not_carried") {
        let itemBulk = parseFloat(item.system.bulk) || 0;
        const quantity = parseInt(item.system.quantity) || 1;

        // Worn clothing reduces its effective bulk by 1 (to a minimum of 0)
        const tags = item.system.tags || "";
        const hasClothingTag = tags.split(",").map(t => t.trim().toLowerCase()).includes("clothing");
        if (placement === "worn" && hasClothingTag) {
            itemBulk = Math.max(0, itemBulk - 1);
        }

        totalBulk += itemBulk * quantity;
    }
});
```

## Key Decisions

1. **Per-item clamping, not total clamping:** Initial implementation subtracted 1 from total bulk per worn clothing item, then clamped total to 0. This was incorrect because 0-bulk clothing would effectively contribute -1 bulk. Fixed by clamping each item's bulk individually before adding to total.

2. **Case-insensitive tag matching:** Tags are split by comma, trimmed, and lowercased before checking for "clothing".

3. **Quantity support:** The reduction applies per item, so quantity is factored in after the per-item bulk is calculated.

## Examples

| Item | Bulk | Placement | Has Clothing Tag | Effective Bulk |
|------|------|-----------|------------------|----------------|
| Shirt | 1 | worn | yes | 0 |
| Heavy coat | 2 | worn | yes | 1 |
| Fancy hat | 0 | worn | yes | 0 (not -1) |
| Shirt | 1 | stowed | yes | 1 (no reduction) |
| Sword | 2 | worn | no | 2 (no reduction) |

## Current State

Feature is complete and working. No additional changes needed.