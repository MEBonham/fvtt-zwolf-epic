# Fair Wealth Rolls Feature

**Date:** 2026-01-31
**Topic:** Adding fairWealthRolls stat and Fair Purchase button to Shopping List Dialog

## Summary

Added a deterministic "Fair Purchase" system that uses a history-based algorithm instead of random dice rolls for wealth purchases.

## Key Changes

### 1. Actor Data Model (`module/data-models/actor-base.mjs`)
- Added `fairWealthRolls` field: `ArrayField` of integers, hidden from UI
- Removed unused placeholder `health` field (was leftover boilerplate)

```javascript
fairWealthRolls: new fields.ArrayField(
    new fields.NumberField({ integer: true }),
    { required: true, initial: [] }
)
```

### 2. Shopping List Dialog (`module/applications/shopping-list-dialog.mjs`)

**New action:** `fairBuyAll`

**New helper method:** `_getNextFairRoll(fairWealthRolls)`
- Algorithm aims to keep success fraction (rolls ≥8) close to target of 5/12 (~41.67%)
- Compares adding 12 vs 1 to history, picks whichever brings fraction closer to target
- Returns `{ value: 12|1, newRolls: [...] }`

**New handler:** `onFairBuyAll()`
- Similar to `onBuyAll` but uses deterministic fair rolls instead of random
- **Stops processing** when wealth hits 0 or can't afford an item (breaks loop)
- **Clears shopping list** after completion (no failed items tracking)
- **Saves fair rolls** to `actor.system.fairWealthRolls` after purchase

**Modified:** `_createPurchaseMessage()`
- Added `isFair` parameter (default false)
- Shows "Fair Purchase:" label instead of "Wealth Roll:" when `isFair=true`

### 3. Template (`templates/dialogs/shopping-list-dialog.hbs`)
- Added Fair Purchase button with balance-scale icon
- Uses `data-action="fairBuyAll"`

### 4. Localization (`lang/en.json`)
- `ZWOLF.FairBuyAll`: "Fair Purchase" (button label)
- `ZWOLF.FairPurchase`: "Fair Purchase" (chat message label)

## Algorithm Reference

From `archive 2026-01-23/fairWealthRolls.js`:
```javascript
const TARGET = 5 / 12;
// For each roll, compare adding 12 vs 1
// Pick whichever brings success fraction closer to TARGET
```

## Behavior Differences: Buy All vs Fair Purchase

| Aspect | Buy All | Fair Purchase |
|--------|---------|---------------|
| Dice | Random d12s | Deterministic 12 or 1 |
| On can't afford | Continue, track failed items | Stop, show message |
| On wealth=0 | Continue, track remaining items | Stop immediately |
| After completion | Keep failed items in list | Clear entire list |
| Chat label | "Wealth Roll:" | "Fair Purchase:" |
| Saves to actor | Just wealth | wealth + fairWealthRolls |