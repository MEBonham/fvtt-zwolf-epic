# Equipment Buy Zone Purchase Implementation
**Date:** 2026-01-31
**Topic:** Implementing wealth-based purchasing when items are dropped on "Buy Equipment Here" zone

## Summary

Added purchase functionality to the "Buy Equipment Here" drop zone on the actor sheet's inventory tab. Previously, dropping items there would just add them; now it triggers the wealth system to roll for purchase cost.

## Key Changes

### module/helpers/drop-zone-handler.mjs
Added equipment buy zone handlers (lines 51-56, 529-797):

- **`bindDropZones()`** - Added binding for `.equipment-buy-zone` elements
- **`_onEquipmentBuyDragOver()`** - Validates only equipment/commodity items during drag
- **`_onEquipmentBuyDrop()`** - Handles drop event, triggers purchase flow
- **`_attemptPurchase(item)`** - Core purchase logic:
  - If price is 0, adds item free
  - Rolls `[Wealth]d12` dice
  - Each 8+ counts as a success
  - Cost = `max(0, Price - Successes)`
  - Shows confirmation dialog if affordable
- **`_createPurchaseRollMessage()`** - Posts dice results to chat with success highlighting
- **`_showPurchaseConfirmDialog()`** - Shows wealth change before/after
- **`_completePurchase()`** - Adds item to actor, deducts wealth, posts success message

### lang/en.json
Added 12 localization keys:
- `CanAfford`, `ItemNotFound`, `ItemFree`, `CannotAffordItem`
- `ConfirmPurchase`, `Cost`, `NewWealth`, `PurchaseItem`
- `PurchasedItem`, `ItemPurchased`, `Price`

## Purchase Flow

1. User drags equipment/commodity onto "Buy Equipment Here" zone
2. System validates item type (equipment or commodity only)
3. If price is 0, item is added free with notification
4. Otherwise, rolls `[Wealth]d12` dice
5. Chat message shows roll with highlighted successes (8+)
6. Calculates actual cost: `max(0, Price - Successes)`
7. If cost > current wealth, shows "Cannot Afford" warning
8. If affordable, confirmation dialog shows:
   - Current Wealth
   - Cost (negative)
   - New Wealth
9. On confirm: item created on actor, wealth deducted, success chat message

## Reference

Based on template from `archive 2026-01-23/module/dice/wealth-system.mjs` which had similar purchase mechanics. Adapted for the drop zone context with simplified flow (no separate ZWolfWealth class, integrated directly into DropZoneHandler).

## Technical Notes

- Uses `TextEditor.getDragEventData(event)` to get drag data (FoundryVTT v13 pattern)
- Sets `this.sheet._processingCustomDrop = true` to prevent default drop handler
- Chat message includes roll object for dice animation: `rolls: [await new Roll(...).evaluate()]`
- Item created via `actor.createEmbeddedDocuments("Item", [itemData])`

## Files Modified

1. `module/helpers/drop-zone-handler.mjs` - Added ~270 lines for buy zone handling
2. `lang/en.json` - Added 12 localization strings after line 360