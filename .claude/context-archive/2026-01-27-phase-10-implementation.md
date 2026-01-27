# Phase 10: Item Management Implementation

**Date:** 2026-01-27
**Topic:** Item display, edit, delete, and auto-sync functionality

## Summary

Implemented Phase 10 of the implementation roadmap, focusing on item management features for actor sheets. The key feature requested was the ability to modify a world Item in the sidebar and cascade those changes to copies on Actors using a hidden `sourceId` tracking system.

## What Was Implemented

### 1. Item Sync Helper Module
**File:** `module/helpers/item-sync.mjs` (NEW)

Complete synchronization system for pushing updates from world items to actor-embedded copies:

- **`getSyncableFields(itemType)`** - Determines which fields sync by type; never syncs actor-specific fields (quantity, placement)
- **`getEmbeddedCopies(item)`** - Finds all actor-embedded copies using `flags.zwolf-epic.sourceId`
- **`pushItemToActors(item, options)`** - Main push operation with confirmation dialog
- **`registerItemContextMenuOption()`** - Adds "Push to Actors" to item context menu via libWrapper

### 2. Item Hooks Module
**File:** `module/hooks/item.mjs` (NEW, directory created)

Automatic source tracking when items are added to actors:

- **`trackSourceItem(item, userId)`** - Hooks into `createItem` event
- Automatically sets `flags.zwolf-epic.sourceId` when world items are added to actors
- Links actor items back to their source for sync functionality

### 3. Actor Sheet Actions
**File:** `module/sheets/actor-sheet.mjs` (MODIFIED)

Added item management actions:

```javascript
// In DEFAULT_OPTIONS.actions:
editItem: ZWolfActorSheet.#onEditItem,
deleteItem: ZWolfActorSheet.#onDeleteItem

// Handler methods (lines 1190-1216):
static async #onEditItem(event, target) {
    // Opens item sheet for editing
}

static async #onDeleteItem(event, target) {
    // Shows confirmation dialog and deletes item
}
```

### 4. System Integration
**File:** `module/zwolf-epic.mjs` (MODIFIED)

Registered hooks and context menu in init hook:

```javascript
import { registerItemContextMenuOption } from "./helpers/item-sync.mjs";
import { registerItemHooks } from "./hooks/item.mjs";

// In init hook:
registerItemHooks();
registerItemContextMenuOption();
```

### 5. Item Slot Partials (Already Present)
**Files:** `templates/actor/partials/` (VERIFIED)

Four reusable partials with edit/delete buttons already in place:
- `item-slot.hbs` - For knacks, tracks, talents
- `foundation-slot.hbs` - For ancestry/fundament
- `equipment-item.hbs` - For equipment with placement dropdown
- `attunement-slot.hbs` - For attunements with tier display

All partials include `data-action="editItem"` and `data-action="deleteItem"` buttons.

## Key Technical Details

### Source Tracking Flag
- **Path:** `flags.zwolf-epic.sourceId`
- **Value:** World item ID (string)
- **Purpose:** Links actor items to their world item source
- **Set:** Automatically on item creation via hook
- **Used:** By `getEmbeddedCopies()` to find all copies for sync

### Syncable Fields by Type
- **All types:** name, img, description, grantedAbilities, sideEffects, tags
- **Never synced:** quantity, placement (actor-specific)
- **Type-specific additions:** buildPoints, knacksProvided, characterTags, etc.

### User Workflow
1. Drag world item to actor → `sourceId` flag auto-set
2. Edit world item in Items sidebar
3. Right-click world item → "Push to Actors"
4. Confirmation dialog shows affected actors and fields
5. All copies update while preserving actor-specific data

## Dependencies

- **libWrapper module** required for context menu integration
- Warning shown if not installed, but other features work without it

## Testing Approach

User asked if Phase 10 could be tested without implementing Phase 11 (drop zones). Answer: Yes!

### Testing Methods Without Drop Zones:

1. **Native FoundryVTT drag:** Drag from Items sidebar directly onto actor sheet window
2. **Console commands:** Use `actor.createEmbeddedDocuments("Item", [item.toObject()])`
3. **Existing test data:** Check actors that already have items
4. **Test script provided:** Complete setup script to create test actor, item, and verify functionality

### Quick Test Script:
```javascript
// Create test item and actor, add item to actor, open sheet
const testItem = await Item.create({name: "Test", type: "knack", ...});
const testActor = await Actor.create({name: "Test Actor", type: "character"});
await testActor.createEmbeddedDocuments("Item", [testItem.toObject()]);
testActor.sheet.render(true);
```

Then test: edit button (pencil), delete button (X), and right-click world item → "Push to Actors"

## Files Created/Modified

### Created:
- `module/hooks/` (directory)
- `module/hooks/item.mjs`
- `module/helpers/item-sync.mjs`
- `.claude/context-archive/2026-01-27-phase-10-item-management.md` (detailed docs)

### Modified:
- `module/sheets/actor-sheet.mjs` - Added editItem/deleteItem actions
- `module/zwolf-epic.mjs` - Imported and registered hooks/context menu

### Verified:
- `templates/actor/partials/item-slot.hbs`
- `templates/actor/partials/foundation-slot.hbs`
- `templates/actor/partials/equipment-item.hbs`
- `templates/actor/partials/attunement-slot.hbs`
- `lang/en.json` - Localization strings for Edit/Delete/Remove

## Legacy Research

Explored `archive 2026-01-23/` to understand previous implementation:
- Item sync system with selective field syncing
- Source tracking via flags
- Context menu integration with libWrapper
- Drop zone system (saved for Phase 11)
- Equipment placement states
- Slot index tracking

## Current State

✅ Phase 10 complete and ready for testing
- Edit/delete actions functional
- Auto-sync system implemented
- Source tracking automatic
- Context menu registered
- All partials have action buttons
- Testing can begin without Phase 11

## Next Steps

- Test Phase 10 features using provided methods
- Phase 11: Drop Zones (foundation, slots, equipment, attunements)
- Phase 12: Equipment/Inventory (placement states, bulk calculation)
- Continue through Phases 13-18