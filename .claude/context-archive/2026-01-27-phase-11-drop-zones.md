# Phase 11: Drop Zones Implementation

**Date:** 2026-01-27
**Topic:** Drag-and-drop zones with visual feedback for Configure Tab

## Summary

Implemented Phase 11 of the implementation roadmap, adding drop zones to the Configure Tab for foundation items (ancestry/fundament), slotted items (knacks, tracks, talents), and attunements. The system provides visual feedback during drag operations and validates drop targets.

## What Was Implemented

### 1. DropZoneHandler Helper Class
**File:** `module/helpers/drop-zone-handler.mjs` (NEW)

Complete drag-and-drop system with event handlers and validation:

**Key Methods:**
- `bindDropZones(html)` - Registers event listeners for all drop zone types
- `_onFoundationDragOver(event)` - Validates foundation item drops (ancestry, fundament)
- `_onSlotDragOver(event, itemType)` - Validates slot item drops (knacks, tracks, talents)
- `_onAttunementDragOver(event)` - Validates attunement drops with tier checking
- `_onDragLeave(event)` - Removes visual feedback when drag leaves zone
- `_onFoundationDrop(event)` - Handles foundation item placement
- `_onSlotDrop(event, itemType)` - Handles slot item placement with slotIndex tracking
- `_onAttunementDrop(event)` - Handles attunement placement with overextension warnings

**Visual Feedback System:**
- Adds `.drag-over` class for valid drops (green border, glow effect)
- Adds `.invalid-drop` class for invalid drops (red border)
- Removes both classes on dragleave

**Validation Logic:**
- Type checking: ensures dropped item matches expected type
- Actor-specific: prevents eidolons from receiving fundament items
- Slot availability: checks disabled zones (e.g., talent slots without tracks)
- Tier validation: warns when attunements exceed slot tier capacity

**Drop Processing:**
- Sets `_processingCustomDrop` flag to prevent default Foundry handler
- Creates item copies when dropping from different actors
- Updates item when dropping from same actor (repositioning)
- Sets `slotIndex` flag for positional tracking
- Updates foundation references (`ancestryId`, `fundamentId`)
- Provides user notifications for success/failure

### 2. CSS Styling for Drop Zones
**File:** `styles/actor-sheets.css` (MODIFIED)

Added comprehensive styling for drop zone visual feedback:

**Base Drop Zone Styles (lines 555-611):**
```css
.drop-zone {
    background: rgba(0, 0, 0, 0.3);
    border: 2px dashed rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    min-height: 80px;
    transition: all 0.2s ease;
}
```

**Drag-Over Feedback (lines 613-639):**
- Valid drops: Green border (#4caf50) with glow effect
- Invalid drops: Red border (#f44336)
- Disabled zones: Reduced opacity, not-allowed cursor

**Type-Specific Styling:**
- **Foundation zones** (lines 657-669): Blue-gray theme
- **Knack zones** (lines 687-695): Gold theme (#ffd700)
- **Track zones** (lines 698-706): Brown theme (#8b4513)
- **Talent zones** (lines 709-717): Purple theme (#9370db)
- **Attunement zones** (lines 723-750): Turquoise theme (#40e0d0)
- **Equipment zones** (lines 756-765): Slate theme (#607d8b) - for Phase 12

**Slotted Item Display (lines 771-859):**
- Flex layout with item image, info, and controls
- Compact variants for knacks/tracks
- Edit and delete buttons with hover effects

**Grid Layouts (lines 905-931):**
- Foundation row: auto-fit grid
- Knacks/tracks: compact grid with minmax(250px, 1fr)
- Talents: single column layout

### 3. Actor Sheet Integration
**File:** `module/sheets/actor-sheet.mjs` (MODIFIED)

**Import Statement (line 5):**
```javascript
import { DropZoneHandler } from "../helpers/drop-zone-handler.mjs";
```

**Context Preparation (lines 149-157):**
Added foundation items to context for template access:
```javascript
// Get foundation items (Phase 11)
context.ancestry = context.system.ancestryId
    ? this.actor.items.get(context.system.ancestryId)?.toObject()
    : null;
context.fundament = context.system.fundamentId
    ? this.actor.items.get(context.system.fundamentId)?.toObject()
    : null;
```

**Drop Zone Initialization (lines 1127-1137):**
```javascript
_onRender(context, options) {
    super._onRender(context, options);

    // Initialize drop zones (not for spawns)
    if (this.document.type !== "spawn") {
        const dropHandler = new DropZoneHandler(this);
        dropHandler.bindDropZones(this.element);
    }

    // Restore state...
}
```

**Drop Override (lines 1140-1150):**
Prevents default Foundry drop handler when custom zones are processing:
```javascript
async _onDrop(event) {
    // If a custom drop zone is handling this, skip default behavior
    if (this._processingCustomDrop) {
        return;
    }

    // Otherwise, use default behavior
    return super._onDrop(event);
}
```

### 4. Configure Tab Template
**File:** `templates/actor/parts/actor-configure-content.hbs` (VERIFIED)

Template already includes drop zone markup from previous phases:

**Foundation Slots (lines 14-29):**
- Uses `foundation-slot` partial for ancestry/fundament
- Conditional rendering for eidolons (no fundament)

**Slot Zones (lines 122-237):**
- Knacks grid with `item-slot` partial
- Tracks grid with `item-slot` partial
- Talents grid with `item-slot` partial
- All use appropriate `dropZoneClass` parameter

### 5. Partials with Drop Zone Support
**Files:** `templates/actor/partials/` (VERIFIED)

All partials include proper drop zone markup:

**foundation-slot.hbs:**
- `.foundation-drop-zone` with `data-item-type` and `data-slot`
- Drop prompt with icon and localized text
- Edit/delete controls when filled

**item-slot.hbs:**
- Configurable drop zone class (knack-drop-zone, track-drop-zone, talent-drop-zone)
- `data-item-type` and `data-slot` attributes with slotIndex
- Disabled state support
- Compact variant support

**attunement-slot.hbs:**
- `.attunement-drop-zone` with tier tracking
- `data-slot-tier` attribute for validation
- Overextended state styling
- Tier capacity display

## Technical Details

### Drop Zone Markup Pattern
```html
<div class="[type]-drop-zone drop-zone"
     data-item-type="[itemType]"
     data-slot="[itemType]-[index]"
     data-slot-tier="[tier]">
  <!-- Content -->
</div>
```

### Event Flow
1. User drags item from Items sidebar
2. `dragover` event fires → validation → visual feedback
3. User releases mouse → `drop` event fires
4. Drop handler validates and processes
5. Item created/moved with appropriate flags
6. Sheet re-renders to show changes
7. `_processingCustomDrop` flag prevents default handler

### Slot Index Tracking
Items store their slot position in flags:
```javascript
item.setFlag("zwolf-epic", "slotIndex", index);
```

This allows:
- Repositioning items by dragging to different slots
- Preserving slot assignments across sessions
- Track/talent association for tier unlocking

### Foundation ID Tracking
Foundation items use actor system fields:
```javascript
actor.update({
    "system.ancestryId": ancestryItem.id,
    "system.fundamentId": fundamentItem.id
});
```

## Key Features

### Visual Feedback States
1. **Empty/Default**: Dashed border, muted colors, drop prompt visible
2. **Valid Drag-Over**: Solid green border, glow effect, prompt highlights
3. **Invalid Drag-Over**: Solid red border, not-allowed cursor
4. **Disabled**: Reduced opacity, disabled cursor, grayed prompt
5. **Filled**: Item display with image, name, controls

### Type Validation
- **Foundation**: ancestry/fundament only, eidolon restrictions
- **Knacks**: knack items only
- **Tracks**: track items only
- **Talents**: talent items only, requires active track
- **Attunements**: attunement items only, tier warnings

### User Notifications
- Success: "X added to slot N"
- Success: "X set as ancestry/fundament"
- Warning: "This slot only accepts Y items"
- Warning: "Eidolons cannot have a Fundament"
- Warning: "This slot is not available"
- Warning: Tier overextension notices
- Error: "Could not find the dragged item"

## Files Created/Modified

### Created:
- `module/helpers/drop-zone-handler.mjs` - Complete drop zone system
- `.claude/context-archive/2026-01-27-phase-11-drop-zones.md` - This document

### Modified:
- `styles/actor-sheets.css` - Added 450+ lines of drop zone CSS
- `module/sheets/actor-sheet.mjs` - Integrated drop handler, added context data, override _onDrop

### Verified:
- `templates/actor/parts/actor-configure-content.hbs` - Drop zone markup present
- `templates/actor/partials/foundation-slot.hbs` - Foundation drop zones
- `templates/actor/partials/item-slot.hbs` - Slot drop zones
- `templates/actor/partials/attunement-slot.hbs` - Attunement drop zones

## Dependencies

No external dependencies. Uses native Foundry VTT APIs:
- `TextEditor.getDragEventData()` - Extract drag data
- `fromUuid()` - Resolve item UUIDs
- `actor.createEmbeddedDocuments()` - Create items
- `item.setFlag()` - Store metadata
- `ui.notifications` - User feedback

## Testing Approach

### Foundation Items (Ancestry/Fundament):
1. Create test ancestry and fundament items in Items sidebar
2. Open character sheet, navigate to Configure tab
3. Drag ancestry item to ancestry drop zone → should show green feedback
4. Drop → should display item with edit/delete controls
5. Drag fundament to ancestry zone → should show red feedback (invalid)
6. Drag fundament to fundament zone → should work
7. Open eidolon sheet → fundament zone should not appear

### Slot Items (Knacks/Tracks/Talents):
1. Create test knack, track, and talent items
2. Character must have level > 0 for slots to appear
3. Drag knack to knack slot → should work
4. Drag knack to different knack slot → should reposition
5. Drag track to track slot → should work
6. Drag talent to talent slot → check track association hint
7. Try talent slot without assigned track → should be disabled

### Attunement Items:
1. Create attunement items with various tiers (1-5)
2. Character must have level > 0 for attunement slots
3. Drag Tier 1 attunement to Tier 1 slot → should work
4. Drag Tier 3 attunement to Tier 1 slot → should warn about overextension but allow
5. Check slot styling changes to orange when overextended

### Validation Testing:
1. Try dragging wrong item types to each zone type
2. Verify red border and not-allowed cursor
3. Verify notification messages
4. Try dragging items from different actors
5. Verify copies are created, not moved

## Current State

✅ Phase 11 complete and ready for testing
- Drop zone handler implemented
- CSS styling complete with visual feedback
- Actor sheet integration done
- Foundation and slot drop zones functional
- Attunement drop zones prepared for Phase 13
- Equipment drop zones prepared for Phase 12
- User notifications for all operations
- Type validation for all drop zones

## Next Steps

- **Testing**: Verify all drop zone types work correctly
- **Phase 12**: Equipment/Inventory (placement states, bulk calculation)
- **Phase 13**: Granted Abilities Display (will need attunement slots to be functional)
- **Phase 14**: Vision & Properties (vision radii, token integration)

## Notes

- Drop zones are disabled for spawn actors (they use a different system)
- Slot indices are 0-based internally but displayed as 1-based to users
- Foundation items are unique (one ancestry, one fundament max)
- Slot items can be repositioned by dragging to different slots
- The `_processingCustomDrop` flag prevents conflicts with Foundry's default drop handler
- Attunement tier validation allows overextension (with warnings) for flexibility
- Equipment drop zones are styled but handlers will be implemented in Phase 12