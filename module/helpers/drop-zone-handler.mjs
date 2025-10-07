// /helpers/drop-zone-handler.mjs - All drag & drop zone handling logic

const TextEditorImpl = foundry.applications.ux.TextEditor.implementation;

export class DropZoneHandler {
  
  constructor(sheet) {
    this.sheet = sheet;
    this.actor = sheet.actor;
  }

  /**
   * Bind all drop zone event listeners
   */
  bindDropZones(html) {
    // Foundation Drop Zone Handlers
    html.querySelectorAll('.foundation-drop-zone').forEach(el => {
      el.addEventListener('dragover', this._onDragOver.bind(this));
      el.addEventListener('drop', this._onFoundationDrop.bind(this));
      el.addEventListener('dragleave', this._onDragLeave.bind(this));
    });

    // Slot Drop Zone Handlers
    html.querySelectorAll('.knack-drop-zone, .track-drop-zone, .talent-drop-zone').forEach(el => {
      el.addEventListener('dragover', this._onSlotDragOver.bind(this));
      el.addEventListener('drop', this._onSlotDrop.bind(this));
      el.addEventListener('dragleave', this._onDragLeave.bind(this));
    });
    
    // Equipment Drop Zone Handlers
    html.querySelectorAll('.equipment-drop-zone').forEach(el => {
      el.addEventListener('dragover', this._onEquipmentDragOver.bind(this));
      el.addEventListener('drop', this._onEquipmentDrop.bind(this));
      el.addEventListener('dragleave', this._onDragLeave.bind(this));
    });
  }

  // =================================
  // FOUNDATION DROP HANDLERS
  // =================================

  _onDragOver(event) {
    event.preventDefault();
    const dropZone = event.currentTarget;
    
    try {
      const data = TextEditorImpl.getDragEventData(event.originalEvent || event);
      
      if (data.type === 'Item') {
        const expectedType = dropZone.dataset.itemType;
        dropZone.classList.remove('invalid-drop');
        dropZone.classList.add('drag-over');
      }
    } catch (err) {
      console.log("Z-Wolf Epic | Drag over error (this is normal):", err);
      dropZone.classList.add('invalid-drop');
    }
  }

  _onDragLeave(event) {
    const dropZone = event.currentTarget;
    dropZone.classList.remove('drag-over', 'invalid-drop');
  }

  async _onFoundationDrop(event) {
    this.sheet._processingCustomDrop = true;
    event.preventDefault();
    event.stopPropagation();
    
    // Capture scroll position BEFORE any operations
    if (this.sheet.stateManager) {
      this.sheet.stateManager.captureState();
    }
    
    try {
      const dropZone = event.currentTarget;
      dropZone.classList.remove('drag-over', 'invalid-drop');
      
      try {
        const data = TextEditorImpl.getDragEventData(event.originalEvent || event);
        
        if (data.type !== 'Item') return;
        
        const item = await fromUuid(data.uuid);
        if (!item) {
          ui.notifications.error("Could not find the dropped item.");
          return;
        }
        
        const expectedType = dropZone.dataset.itemType;
        const slot = dropZone.dataset.slot;
        
        if (item.type !== expectedType) {
          ui.notifications.warn(`This slot only accepts ${expectedType} items.`);
          return;
        }
        
        console.log(`Z-Wolf Epic | Dropping ${item.name} (${expectedType}) into ${slot} slot`);
        
        // STEP 1: Remove ALL existing items of this type first
        const existingItems = this.actor.items.filter(i => i.type === expectedType);
        console.log(`Z-Wolf Epic | Found ${existingItems.length} existing ${expectedType} items to remove`);
        
        if (existingItems.length > 0) {
          const itemIds = existingItems.map(i => i.id);
          console.log(`Z-Wolf Epic | Deleting items:`, itemIds);
          await this.actor.deleteEmbeddedDocuments("Item", itemIds);
        }
        
        // STEP 2: Clear the old ID reference
        let updateData = {};
        updateData[`system.${slot}Id`] = null;
        await this.actor.update(updateData);
        
        // STEP 3: Create the new item (only if it's not already on this actor)
        let actorItem;
        if (item.actor?.id !== this.actor.id) {
          console.log(`Z-Wolf Epic | Creating new ${expectedType} item: ${item.name}`);
          const itemData = item.toObject();
          const createdItems = await this.actor.createEmbeddedDocuments("Item", [itemData]);
          actorItem = createdItems[0];
        } else {
          actorItem = item;
        }
        
        // STEP 4: Set the new ID reference
        updateData = {};
        updateData[`system.${slot}Id`] = actorItem.id;
        await this.actor.update(updateData);
        
        // STEP 5: Lock the item
        await actorItem.setFlag('zwolf-epic', 'locked', true);
        
        ui.notifications.info(`${item.name} has been set as your ${expectedType}.`);
        
        // After successfully assigning an ancestry, validate the size
        if (expectedType === 'ancestry') {
          await this._validateActorSize();
        }
        
        // Final render with preserved scroll
        await this.sheet.render(false);
        
      } catch (err) {
        console.error("Z-Wolf Epic | Foundation drop error:", err);
        ui.notifications.error("Failed to assign the item to this slot.");
      }
    } finally {
      console.log("Z-Wolf Epic | _onFoundationDrop FINALLY - resetting flag after 100ms");
      setTimeout(() => {
        console.log("Z-Wolf Epic | _onFoundationDrop flag reset to false");
        this.sheet._processingCustomDrop = false;
      }, 100);
    }
  }

  // =================================
  // SLOT DROP HANDLERS
  // =================================

  _onSlotDragOver(event) {
    event.preventDefault();
    const dropZone = event.currentTarget;
    
    try {
      const data = TextEditorImpl.getDragEventData(event.originalEvent || event);
      
      if (data.type === 'Item') {
        const expectedType = dropZone.dataset.itemType;
        dropZone.classList.remove('invalid-drop');
        dropZone.classList.add('drag-over');
      }
    } catch (err) {
      console.log("Z-Wolf Epic | Slot drag over error (this is normal):", err);
      dropZone.classList.add('invalid-drop');
    }
  }

  async _onSlotDrop(event) {
    console.log("Z-Wolf Epic | _onSlotDrop START - setting flag to true");
    this.sheet._processingCustomDrop = true;
    event.preventDefault();
    event.stopPropagation();
    
    // Capture scroll position BEFORE any operations
    if (this.sheet.stateManager) {
      this.sheet.stateManager.captureState();
    }
    
    try {
      const dropZone = event.currentTarget;
      dropZone.classList.remove('drag-over', 'invalid-drop');
      
      try {
        const data = TextEditorImpl.getDragEventData(event.originalEvent || event);
        
        if (data.type !== 'Item') return;
        
        const item = await fromUuid(data.uuid);
        if (!item) {
          ui.notifications.error("Could not find the dropped item.");
          return;
        }
        
        const expectedType = dropZone.dataset.itemType;
        const slot = dropZone.dataset.slot;
        
        if (item.type !== expectedType) {
          ui.notifications.warn(`This slot only accepts ${expectedType} items.`);
          return;
        }
        
        // Parse slot index from slot string (e.g., "talent-4" -> 4, "track-2" -> 2)
        const slotIndex = parseInt(slot.split('-')[1]);
        
        // Check slot capacity
        const currentItems = this.actor.items.filter(i => i.type === expectedType);
        const maxSlots = this._getMaxSlotsForType(expectedType);
        
        let existingItem = null;
        
        if (expectedType === 'talent' || expectedType === 'track') {
          // For talents and tracks, check if there's already an item in this specific slot
          existingItem = currentItems.find(i => i.getFlag('zwolf-epic', 'slotIndex') === slotIndex);
          
          // Validate slot index is within bounds
          if (slotIndex >= maxSlots) {
            ui.notifications.warn(`Invalid ${expectedType} slot ${slotIndex + 1}. Maximum slots: ${maxSlots}.`);
            return;
          }
        } else {
          // For knacks, use sequential logic
          existingItem = currentItems[slotIndex];
          
          if (currentItems.length >= maxSlots && !existingItem) {
            ui.notifications.warn(`You have reached the maximum number of ${expectedType} slots.`);
            return;
          }
        }
        
        // Create or get the item on the actor if it's not already owned
        let actorItem;
        if (item.actor?.id !== this.actor.id) {
          const itemData = item.toObject();
          const createdItems = await this.actor.createEmbeddedDocuments("Item", [itemData]);
          actorItem = createdItems[0];
        } else {
          actorItem = item;
        }
        
        // Handle replacement if needed
        if (existingItem && existingItem.id !== actorItem.id) {
          await existingItem.delete();
          ui.notifications.info(`Replaced ${existingItem.name} with ${item.name}.`);
        } else if (!existingItem) {
          ui.notifications.info(`${item.name} has been added as a ${expectedType}.`);
        }
        
        // Set locked flag
        await actorItem.setFlag('zwolf-epic', 'locked', true);
        
        // For talents and tracks, store the specific slot index
        if (expectedType === 'talent' || expectedType === 'track') {
          await actorItem.setFlag('zwolf-epic', 'slotIndex', slotIndex);
          console.log(`Z-Wolf Epic | Set ${expectedType} ${item.name} to slot index ${slotIndex}`);
        }
        
        // Final render with preserved scroll
        await this.sheet.render(false);
        
      } catch (err) {
        console.error("Z-Wolf Epic | Slot drop error:", err);
        ui.notifications.error("Failed to assign the item to this slot.");
      }
    } finally {
      console.log("Z-Wolf Epic | _onSlotDrop FINALLY - resetting flag after 100ms");
      setTimeout(() => {
        console.log("Z-Wolf Epic | _onSlotDrop flag reset to false");
        this.sheet._processingCustomDrop = false;
      }, 100);
    }
  }

  // =================================
  // EQUIPMENT DROP HANDLERS
  // =================================

  _onEquipmentDragOver(event) {
    event.preventDefault();
    const dropZone = event.currentTarget;
    
    try {
      const data = TextEditorImpl.getDragEventData(event.originalEvent || event);
      
      if (data.type === 'Item') {
        dropZone.classList.remove('invalid-drop');
        dropZone.classList.add('drag-over');
      }
    } catch (err) {
      console.log("Z-Wolf Epic | Equipment drag over error (this is normal):", err);
      dropZone.classList.add('invalid-drop');
    }
  }

  async _onEquipmentDrop(event) {
    this.sheet._processingCustomDrop = true;
    event.preventDefault();
    event.stopPropagation();
    
    // Capture scroll position BEFORE any operations
    if (this.sheet.stateManager) {
      this.sheet.stateManager.captureState();
    }
    
    try {
      const dropZone = event.currentTarget;
      dropZone.classList.remove('drag-over', 'invalid-drop');
      
      try {
        const data = TextEditorImpl.getDragEventData(event.originalEvent || event);
        
        if (data.type !== 'Item') return;
        
        const item = await fromUuid(data.uuid);
        if (!item) {
          ui.notifications.error("Could not find the dropped item.");
          return;
        }
        
        // Only accept equipment items
        if (item.type !== 'equipment') {
          ui.notifications.warn("Only equipment items can be added to inventory.");
          return;
        }
        
        console.log(`Z-Wolf Epic | Dropping equipment: ${item.name}`);
        
        // Create or get the item on the actor if it's not already owned
        let actorItem;
        if (item.actor?.id !== this.actor.id) {
          const itemData = item.toObject();
          const createdItems = await this.actor.createEmbeddedDocuments("Item", [itemData]);
          actorItem = createdItems[0];
        } else {
          actorItem = item;
        }
        
        // Equipment items don't get locked (unlike talents/knacks/tracks)
        
        ui.notifications.info(`${item.name} has been added to your inventory.`);
        
        // Final render with preserved scroll
        await this.sheet.render(false);
        
      } catch (err) {
        console.error("Z-Wolf Epic | Equipment drop error:", err);
        ui.notifications.error("Failed to add the item to inventory.");
      }
    } finally {
      setTimeout(() => {
        this.sheet._processingCustomDrop = false;
      }, 100);
    }
  }

  // =================================
  // UTILITY METHODS
  // =================================

  _getMaxSlotsForType(itemType) {
    switch (itemType) {
      case 'knack':
        return this._calculateTotalKnacksProvided();
      case 'track':
        return Math.min(4, this.actor.system.level || 0);
      case 'talent':
        return this.actor.system.level || 0;
      default:
        return 0;
    }
  }

  _calculateTotalKnacksProvided() {
    let totalKnacks = 0;
    
    // Get knacks from ancestry
    if (this.actor.system.ancestryId) {
      const ancestryItem = this.actor.items.get(this.actor.system.ancestryId);
      if (ancestryItem && ancestryItem.system && ancestryItem.system.knacksProvided) {
        totalKnacks += ancestryItem.system.knacksProvided;
      }
    }
    
    // Get knacks from fundament
    if (this.actor.system.fundamentId) {
      const fundamentItem = this.actor.items.get(this.actor.system.fundamentId);
      if (fundamentItem && fundamentItem.system && fundamentItem.system.knacksProvided) {
        totalKnacks += fundamentItem.system.knacksProvided;
      }
    }
    
    // Get knacks from all talent items
    const talentItems = this.actor.items.filter(item => item.type === 'talent');
    talentItems.forEach((talent, index) => {
      if (talent.system && talent.system.knacksProvided) {
        totalKnacks += talent.system.knacksProvided;
      }
    });
    
    return totalKnacks;
  }

  async _validateActorSize() {
    const ancestry = this.actor.items.get(this.actor.system.ancestryId);
    const currentSize = this.actor.system.size;
    
    let validSizes = ['medium'];
    
    if (ancestry && ancestry.system.sizeOptions && ancestry.system.sizeOptions.length > 0) {
      validSizes = ancestry.system.sizeOptions;
    }
    
    if (!validSizes.includes(currentSize)) {
      const newSize = validSizes[0];
      console.log(`Z-Wolf Epic | Invalid size "${currentSize}" for ancestry, changing to "${newSize}"`);
      
      await this.actor.update({ 'system.size': newSize });
      
      ui.notifications.info(`Size changed to ${newSize.charAt(0).toUpperCase() + newSize.slice(1)} to match ancestry restrictions.`);
      
      return true;
    }
    
    return false;
  }
}
