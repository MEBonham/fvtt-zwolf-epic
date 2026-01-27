# Phase 10: Item Management - Implementation Summary

**Date:** 2026-01-27
**Status:** Complete

## Overview

Phase 10 implements comprehensive item management for actor sheets, including display, editing, deletion, and auto-sync functionality when world items are modified.

## Components Implemented

### 1. Item Slot Partials (Already Existing)

Four reusable template partials for displaying items on actor sheets:

#### [templates/actor/partials/item-slot.hbs](templates/actor/partials/item-slot.hbs)
- **Used for:** Knacks, Tracks, Talents
- **Features:**
  - Displays item image, name, and type-specific details
  - Edit and delete control buttons
  - Drop zone for drag-and-drop item addition
  - Compact mode support
  - Disabled state handling
  - Tracks slot index via `data-slot` attribute
  - Stores item ID via `data-item-id` attribute

#### [templates/actor/partials/foundation-slot.hbs](templates/actor/partials/foundation-slot.hbs)
- **Used for:** Ancestry and Fundament items
- **Features:**
  - Similar structure to item-slot.hbs
  - Foundation-specific drop zone styling
  - Simpler display (no type-specific details)

#### [templates/actor/partials/equipment-item.hbs](templates/actor/partials/equipment-item.hbs)
- **Used for:** Equipment and Commodity items
- **Features:**
  - Displays bulk and value
  - Placement dropdown (wielded, worn, readily_available, stowed, not_carried)
  - Attunement tier display with star icons
  - Active/inactive attunement state
  - Invalid placement highlighting

#### [templates/actor/partials/attunement-slot.hbs](templates/actor/partials/attunement-slot.hbs)
- **Used for:** Attunement items
- **Features:**
  - Displays slot number and tier capacity
  - Shows applied equipment reference
  - Overextended state handling
  - Tier-specific drop zone validation

### 2. Item Management Actions

Added to [module/sheets/actor-sheet.mjs](module/sheets/actor-sheet.mjs:37-38):

#### Edit Item Action (actor-sheet.mjs:1190-1196)
```javascript
static async #onEditItem(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.document.items.get(itemId);
    if (item) {
        item.sheet.render(true);
    }
}
```
- Finds item by ID from `data-item-id` attribute
- Opens item sheet for editing
- Triggered by `data-action="editItem"` buttons

#### Delete Item Action (actor-sheet.mjs:1203-1216)
```javascript
static async #onDeleteItem(event, target) {
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.document.items.get(itemId);
    if (!item) return;

    const confirmed = await Dialog.confirm({
        title: `Delete ${item.name}?`,
        content: `<p>Are you sure you want to delete <strong>${item.name}</strong>?</p>`
    });

    if (confirmed) {
        await item.delete();
    }
}
```
- Finds item by ID
- Shows confirmation dialog
- Deletes item if confirmed
- Triggered by `data-action="deleteItem"` buttons

### 3. Auto-Sync System

#### [module/helpers/item-sync.mjs](module/helpers/item-sync.mjs)
Complete synchronization system for pushing updates from world items to actor-embedded copies.

**Key Functions:**

1. **`getSyncableFields(itemType)`** (item-sync.mjs:11-69)
   - Determines which fields sync based on item type
   - Never syncs actor-specific fields (quantity, placement)
   - Always syncs: name, img, description, grantedAbilities, sideEffects, tags
   - Type-specific fields for each item type

2. **`getEmbeddedCopies(item)`** (item-sync.mjs:76-88)
   - Finds all actor-embedded copies of a world item
   - Uses `flags.zwolf-epic.sourceId` to track source item

3. **`pushItemToActors(item, options)`** (item-sync.mjs:98-122)
   - Main push operation
   - Shows confirmation dialog with affected actors list
   - Performs selective field updates
   - Reports success/failure with notifications

4. **`registerItemContextMenuOption()`** (item-sync.mjs:207-242)
   - Uses libWrapper to inject into ItemDirectory context menu
   - Adds "Push to Actors" option with sync icon
   - Only shows when copies exist
   - Triggers push operation on click

#### [module/hooks/item.mjs](module/hooks/item.mjs)
Automatic source tracking when items are added to actors.

**`trackSourceItem(item, userId)`** (item.mjs:18-48)
- Hooks into `createItem` event
- Only tracks items on actors (not world items)
- Finds matching world item by name and type
- Sets `flags.zwolf-epic.sourceId` to link back to source
- Uses setTimeout to avoid timing issues
- Logs success/failure for debugging

### 4. System Integration

Updated [module/zwolf-epic.mjs](module/zwolf-epic.mjs) to register hooks and context menu:

```javascript
// Import helpers
import { registerItemContextMenuOption } from "./helpers/item-sync.mjs";

// Import hooks
import { registerItemHooks } from "./hooks/item.mjs";

// In init hook:
// Register item hooks (source tracking for Push to Actors)
registerItemHooks();

// Register item context menu option (Push to Actors)
registerItemContextMenuOption();
```

## Data Structures

### Source Tracking Flag
- **Path:** `flags.zwolf-epic.sourceId`
- **Type:** String (world item ID)
- **Purpose:** Links actor-embedded items back to their world item for syncing
- **Set by:** `trackSourceItem()` hook
- **Read by:** `getEmbeddedCopies()` to find all copies

## User Workflow

### Editing Items
1. Click edit button (pencil icon) on any item slot
2. Item sheet opens for editing
3. Changes are saved to the actor's embedded item

### Deleting Items
1. Click delete button (X icon) on any item slot
2. Confirmation dialog appears
3. If confirmed, item is removed from actor

### Auto-Sync (Push to Actors)
1. Edit a world item in the Items sidebar
2. Right-click the world item
3. Select "Push to Actors" from context menu (only appears if copies exist)
4. Confirmation dialog shows:
   - Number of copies to update
   - List of affected actors
   - Warning about overwriting manual changes
   - List of fields that will be updated
5. If confirmed:
   - All actor-embedded copies are updated
   - Actor-specific fields (quantity, placement) are preserved
   - Success notification shows number of copies updated

### Automatic Source Linking
1. Drag a world item to an actor sheet
2. System automatically finds matching world item by name/type
3. Sets `sourceId` flag on the actor's copy
4. Now the item can be synced via "Push to Actors"

## Syncable Fields by Item Type

### All Items
- name, img, description, grantedAbilities, sideEffects, tags

### Ancestry
- characterTags, sizeOptions, required, knacksProvided, knackMenus, buildPoints

### Fundament
- buildPoints, knacksProvided, requiredKnackTag, vitalityFunction, coastFunction

### Equipment
- requiredPlacement, price, bulk, structure

### Knack
- characterTags, required

### Track
- required, tiers

### Talent
- characterTags, required, knacksProvided, knackMenus

### Universal
- characterTags

## Dependencies

- **libWrapper module:** Required for context menu injection
  - Warning shown if not installed
  - Feature gracefully degrades if unavailable

## Testing Checklist

### Item Display
- [ ] Items appear correctly in all slot types
- [ ] Item images, names, and details display properly
- [ ] Edit and delete buttons are visible and positioned correctly

### Item Editing
- [ ] Click edit button opens item sheet
- [ ] Changes to embedded items save correctly
- [ ] Item sheet shows current values

### Item Deletion
- [ ] Click delete button shows confirmation dialog
- [ ] Confirming deletion removes item from actor
- [ ] Canceling leaves item unchanged
- [ ] Actor updates after deletion

### Auto-Sync
- [ ] Source ID is set when dragging world item to actor
- [ ] "Push to Actors" appears in context menu for world items with copies
- [ ] "Push to Actors" does not appear for items without copies
- [ ] Confirmation dialog shows correct information
- [ ] Updates apply to all copies successfully
- [ ] Actor-specific fields (quantity, placement) are preserved
- [ ] Notifications show correct counts

### Edge Cases
- [ ] Deleting last item of a type works correctly
- [ ] Multiple copies on same actor sync correctly
- [ ] Items without source ID can still be edited/deleted
- [ ] libWrapper missing warning appears if module not installed

## Notes

- Item slots use `data-item-id` attribute to identify items
- Drop zones use `data-item-type` and `data-slot` for drag-and-drop
- Actor-specific data (quantity, placement) never syncs from world items
- Source tracking happens automatically on item creation
- Context menu uses libWrapper for clean integration

## Related Files

- `module/sheets/actor-sheet.mjs` - Action handlers
- `module/helpers/item-sync.mjs` - Sync system
- `module/hooks/item.mjs` - Source tracking
- `module/zwolf-epic.mjs` - System initialization
- `templates/actor/partials/item-slot.hbs` - Knack/track/talent slots
- `templates/actor/partials/foundation-slot.hbs` - Ancestry/fundament slots
- `templates/actor/partials/equipment-item.hbs` - Equipment items
- `templates/actor/partials/attunement-slot.hbs` - Attunement slots
- `lang/en.json` - Localization strings