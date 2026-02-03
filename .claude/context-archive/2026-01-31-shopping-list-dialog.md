# Shopping List Dialog Implementation
**Date:** 2026-01-31
**Topic:** Shopping list feature for purchasing equipment and commodities with dice-based wealth system

## Summary

Implemented a "Shopping List" dialog feature for the Z-Wolf Epic FoundryVTT system that allows players to queue up equipment/commodity items and purchase them using a dice-based wealth mechanic.

## Key Features

- **Shopping List Dialog**: ApplicationV2-based dialog accessible from the Inventory tab
- **Dice-Based Purchasing**: Roll Wealth d12s per item, each 8+ is a success, Cost = max(0, Price - Successes)
- **Purchase Order**: Items bought cheapest-first for optimal wealth usage
- **Drag & Drop**: Items can be dragged onto the dialog's drop zone
- **Add Item Button**: Opens a picker dialog to select from world/compendium items
- **Quantity Controls**: Increase/decrease quantity per item
- **Chat Messages**: Each purchase roll displays in chat with dice results highlighted

## Files Created/Modified

### Created
- **module/applications/shopping-list-dialog.mjs** - Main dialog class
- **templates/dialogs/shopping-list-dialog.hbs** - Dialog template

### Modified
- **templates/actor/parts/actor-inventory-content.hbs** - Added shopping list button
- **module/sheets/actor-sheet.mjs** - Added `openShoppingList` action handler and import
- **styles/actor-sheets.css** - Added `.shopping-list-btn` and dialog styles
- **styles/dice.css** - Added `.zwolf-purchase-roll` chat message styles
- **lang/en.json** - Added 20+ localization strings for shopping feature

## Technical Notes

### ApplicationV2 Action Pattern
The dialog uses **public static methods** for action handlers (not private static):
```javascript
static DEFAULT_OPTIONS = {
    actions: {
        buyAll: ShoppingListDialog.onBuyAll,  // Public static method
        // NOT: buyAll: ShoppingListDialog.#onBuyAll  // Private static fails!
    }
};

static async onBuyAll(event, target) {
    // 'this' is bound to instance by ApplicationV2
}
```

**Why**: Private static methods (`static #method`) cannot be called with `this` bound to an instance due to JavaScript restrictions. Public static methods work because ApplicationV2 binds `this` to the instance when calling them.

### Dialog.prompt jQuery Issue
In FoundryVTT v13, `Dialog.prompt` callback receives a jQuery object, not a DOM element:
```javascript
callback: (html) => {
    const form = html[0].querySelector("form");  // html[0] to get DOM element
    return form.itemUuid.value;
}
```

### Dice Rolling
```javascript
const roll = await new Roll(`${currentWealth}d12`).evaluate();
const dice = roll.terms[0].results.map(r => r.result);
const successes = dice.filter(d => d >= 8).length;
const actualCost = Math.max(0, item.price - successes);
```

## Configuration
- Dialog size: 500x600px (resizable)
- Accepts item types: `equipment`, `commodity`
- Items sorted by price (cheapest first) before purchasing

## Localization Keys Added
- ShoppingList, CurrentWealth, MaxCost, MaxCostTooltip
- PurchaseRollExplanation, DragItemsHere
- DecreaseQuantity, IncreaseQuantity, RemoveFromList
- ShoppingListEmpty, AddItem, ClearList, BuyAll
- NotEnoughWealth, WealthRoll, PurchaseSuccesses, PurchaseCost
- Purchased, CannotAfford, and more