# Shopping List Bundles Feature
**Date:** 2026-01-31
**Topic:** Save and load reusable shopping list bundles stored in Journal entries

## Summary

Added the ability to save and load "bundles" (preset shopping lists) for the Shopping List Dialog. Bundles are stored in Journal entries, allowing GMs to create reusable equipment packages that players can quickly load.

## Key Features

- **Save Bundle** (GM only): Saves the current shopping list as a named bundle
- **Load Bundle**: Opens a picker to select from saved bundles
- **Journal Storage**: Bundles stored as pages in a "Shopping Lists" JournalEntry
- **Append Option**: When loading, can append to existing list or replace it
- **Bundle Info**: Load dialog shows item count and total cost for each bundle

## Design Decisions

- **Journal Pages**: Each bundle is a JournalEntryPage with shopping list data stored in flags
- **GM-Only Save**: Only GMs can save bundles since they're world-level data
- **All Users Load**: Any user can load bundles to populate their shopping list
- **Flag Storage**: Uses `page.getFlag("zwolf-epic", "shoppingList")` for the item array

## Files Modified

### module/applications/shopping-list-dialog.mjs
- Added actions: `saveBundle`, `loadBundle`
- Added static property: `BUNDLES_JOURNAL_NAME = "Shopping Lists"`
- Added methods:
  - `getOrCreateBundlesJournal()` - finds or creates the journal
  - `getBundles()` - retrieves all bundles from journal pages
  - `onSaveBundle()` - prompts for name, saves to journal page
  - `onLoadBundle()` - shows picker dialog, loads selected bundle
- Added `isGM` to context for conditional button rendering
- Increased dialog width from 500px to 600px to fit additional buttons

### templates/dialogs/shopping-list-dialog.hbs
- Added "Load Bundle" button (visible to all users)
- Added "Save Bundle" button (GM-only via `{{#if isGM}}`)
- Button classes: `.load-bundle-btn`, `.save-bundle-btn`

### lang/en.json
Added 12 localization strings:
- SaveBundle, LoadBundle, BundleName, BundleNamePlaceholder
- SelectBundle, AppendToList
- BundleJournalCreated, BundleSaved, BundleUpdated, BundleLoaded
- NoBundlesAvailable, BundlePageDescription, Items

## Technical Notes

### Bundle Data Structure
```javascript
// Stored in JournalEntryPage flags
{
    "zwolf-epic": {
        "shoppingList": [
            { uuid, name, img, price, quantity, type },
            // ...
        ]
    }
}
```

### Journal Creation
```javascript
journal = await JournalEntry.create({
    name: "Shopping Lists",
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER }
});
```

### Load with Merge
When appending, duplicate UUIDs have their quantities combined:
```javascript
const existingIndex = this.shoppingList.findIndex(i => i.uuid === item.uuid);
if (existingIndex >= 0) {
    this.shoppingList[existingIndex].quantity += item.quantity;
} else {
    this.shoppingList.push({ ...item });
}
```

## Configuration
- Dialog size: 600x600px (increased from 500x600 for button space)
- Journal name: "Shopping Lists"
- Bundle naming: User-provided, overwrites if duplicate name

## Usage Flow

1. **Create Bundle**: Build shopping list → Click "Save Bundle" → Enter name
2. **Load Bundle**: Click "Load Bundle" → Select from dropdown → Optionally check "Append" → Items populate
3. **Manage Bundles**: Open "Shopping Lists" journal to rename/delete pages