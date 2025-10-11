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
    
    // Attunement Drop Zone Handlers (specific slots)
    const attunementZones = html.querySelectorAll('.attunement-drop-zone');
    attunementZones.forEach(el => {
      el.addEventListener('dragover', this._onAttunementDragOver.bind(this));
      el.addEventListener('drop', this._onAttunementSlotDrop.bind(this));
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
        
        // Eidolons can't have fundaments
        if (this.actor.type === 'eidolon' && expectedType === 'fundament') {
          ui.notifications.warn("Eidolons cannot have a Fundament.");
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
        
        let existingItem = null;
        
        if (expectedType === 'talent' || expectedType === 'track') {
          // For talents and tracks, check if there's already an item in this specific slot
          existingItem = currentItems.find(i => i.getFlag('zwolf-epic', 'slotIndex') === slotIndex);
          
          // Special validation for eidolon tracks
          if (this.actor.type === 'eidolon' && expectedType === 'track') {
            const validSlots = this._getEidolonValidTrackSlots();
            if (!validSlots.includes(slotIndex)) {
              ui.notifications.warn(`Eidolons can only use track slots where their base creature has an (Eidolon Placeholder) track.`);
              return;
            }
          } else {
            // Normal validation for non-eidolon actors
            const maxSlots = this._getMaxSlotsForType(expectedType);
            if (slotIndex >= maxSlots) {
              ui.notifications.warn(`Invalid ${expectedType} slot ${slotIndex + 1}. Maximum slots: ${maxSlots}.`);
              return;
            }
          }
        } else {
          // For knacks, use sequential logic
          const maxSlots = this._getMaxSlotsForType(expectedType);
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
        
        // Handle attunement items separately
        if (item.type === 'attunement') {
          await this._handleAttunementDrop(item);
          return;
        }
        
        // Accept both equipment and commodity
        if (!['equipment', 'commodity'].includes(item.type)) {
          ui.notifications.warn("Only equipment and commodity items can be added to inventory.");
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
  // ATTUNEMENT DROP HANDLER
  // =================================

  _onAttunementDragOver(event) {
    event.preventDefault();
    const dropZone = event.currentTarget;
    
    try {
      const data = TextEditorImpl.getDragEventData(event.originalEvent || event);
      
      if (data.type === 'Item') {
        dropZone.classList.remove('invalid-drop');
        dropZone.classList.add('drag-over');
      }
    } catch (err) {
      console.log("Z-Wolf Epic | Attunement drag over error (this is normal):", err);
      dropZone.classList.add('invalid-drop');
    }
  }

  async _onAttunementSlotDrop(event) {
    console.log("Z-Wolf Epic | _onAttunementSlotDrop called");
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
        console.log("Z-Wolf Epic | Drag data:", data);
        
        if (data.type !== 'Item') return;
        
        const item = await fromUuid(data.uuid);
        if (!item) {
          ui.notifications.error("Could not find the dropped item.");
          return;
        }
        
        console.log(`Z-Wolf Epic | Dropped item: ${item.name}, type: ${item.type}`);
        
        if (item.type !== 'attunement') {
          ui.notifications.warn("This slot only accepts attunement items.");
          return;
        }
        
        // Parse slot index from data-slot attribute (e.g., "attunement-1" -> 0)
        const slot = dropZone.dataset.slot;
        const slotIndex = parseInt(slot.split('-')[1]) - 1; // Convert to 0-based index
        
        const itemTier = item.system?.tier || 1;
        
        // Calculate this slot's maximum tier based on slot position
        const level = this.actor.system.level || 1;
        const totalSlots = Math.floor((level + 3) / 4);
        
        // Validate slot index
        if (slotIndex < 0 || slotIndex >= totalSlots) {
          ui.notifications.warn(`Invalid attunement slot.`);
          return;
        }
        
        // Each slot has a tier equal to its position (1-based)
        // Slot 0 = Tier 1, Slot 1 = Tier 2, Slot 2 = Tier 3, Slot 3 = Tier 4, etc.
        const slotMaxTier = slotIndex + 1;
        
        // Validate tier compatibility
        if (itemTier > slotMaxTier) {
          ui.notifications.warn(`This Tier ${itemTier} attunement requires a slot with Tier ${itemTier}+ capacity. This slot only supports up to Tier ${slotMaxTier}.`);
          return;
        }
        
        // Get existing attunements - find by slotIndex flag, not array position
        const existingAttunements = this.actor.items.filter(i => i.type === 'attunement');
        const existingInSlot = existingAttunements.find(i => i.getFlag('zwolf-epic', 'slotIndex') === slotIndex);
        
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
        if (existingInSlot && existingInSlot.id !== actorItem.id) {
          await existingInSlot.delete();
          ui.notifications.info(`Replaced ${existingInSlot.name} with ${item.name} in slot ${slotIndex + 1}.`);
        } else if (!existingInSlot) {
          ui.notifications.info(`${item.name} (Tier ${itemTier}) has been added to attunement slot ${slotIndex + 1}.`);
        }
        
        // Store the slot index on the attunement item (like we do for talents/tracks)
        await actorItem.setFlag('zwolf-epic', 'slotIndex', slotIndex);
        console.log(`Z-Wolf Epic | Set attunement ${item.name} to slot index ${slotIndex}`);
        
        // Final render with preserved scroll
        await this.sheet.render(false);
        
      } catch (err) {
        console.error("Z-Wolf Epic | Attunement slot drop error:", err);
        ui.notifications.error("Failed to assign the attunement to this slot.");
      }
    } finally {
      setTimeout(() => {
        this.sheet._processingCustomDrop = false;
      }, 100);
    }
  }

  async _handleAttunementDrop(item) {
    const itemTier = item.system?.tier || 1;
    
    // Calculate available attunement slots
    const level = this.actor.system.level || 1;
    const totalSlots = Math.floor((level + 3) / 4);
    
    // Get existing attunements
    const existingAttunements = this.actor.items.filter(i => i.type === 'attunement');
    
    // Calculate slot tiers
    const slots = [];
    for (let i = 0; i < totalSlots; i++) {
      let maxTier = 1;
      if (level >= 17) maxTier = 4;
      else if (level >= 13) maxTier = 3;
      else if (level >= 9) maxTier = 2;
      else if (level >= 5) maxTier = 1;
      
      slots.push({
        index: i,
        maxTier: maxTier,
        occupied: existingAttunements[i] || null
      });
    }
    
    // Find first available slot that can accommodate this tier
    const availableSlot = slots.find(slot => 
      slot.maxTier >= itemTier && !slot.occupied
    );
    
    if (!availableSlot) {
      ui.notifications.warn(`No available attunement slot can accommodate a Tier ${itemTier} attunement. You need a slot with Tier ${itemTier}+ capacity.`);
      return;
    }
    
    console.log(`Z-Wolf Epic | Dropping Tier ${itemTier} attunement into slot ${availableSlot.index + 1} (max tier: ${availableSlot.maxTier})`);
    
    // Create or get the item on the actor if it's not already owned
    let actorItem;
    if (item.actor?.id !== this.actor.id) {
      const itemData = item.toObject();
      const createdItems = await this.actor.createEmbeddedDocuments("Item", [itemData]);
      actorItem = createdItems[0];
    } else {
      actorItem = item;
    }
    
    ui.notifications.info(`${item.name} (Tier ${itemTier}) has been added to attunement slot ${availableSlot.index + 1}.`);
    
    // Final render with preserved scroll
    await this.sheet.render(false);
  }

  // =================================
  // UTILITY METHODS
  // =================================

  _getMaxSlotsForType(itemType) {
    switch (itemType) {
      case 'knack':
        return this._calculateTotalKnacksProvided();
      case 'track':
        if (this.actor.type === 'eidolon') {
          return this._getEidolonValidTrackSlots().length;
        }
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
    
    // Get knacks from fundament (not for eidolons)
    if (this.actor.type !== 'eidolon' && this.actor.system.fundamentId) {
      const fundamentItem = this.actor.items.get(this.actor.system.fundamentId);
      if (fundamentItem && fundamentItem.system && fundamentItem.system.knacksProvided) {
        totalKnacks += fundamentItem.system.knacksProvided;
      }
    }
    
    // For eidolons, add knacks from base creature's placeholders
    if (this.actor.type === 'eidolon' && this.actor.system.baseCreatureId) {
      const baseCreature = game.actors.get(this.actor.system.baseCreatureId);
      if (baseCreature) {
        const placeholderKnacks = baseCreature.items.filter(item => 
          item.type === 'knack' && item.name === '(Eidolon Placeholder)'
        ).length;
        totalKnacks += placeholderKnacks;
        console.log(`Z-Wolf Epic | Eidolon gets ${placeholderKnacks} knack slots from base creature placeholders`);
      }
    }
    
    // Get knacks from all talent items
    const talentItems = this.actor.items.filter(item => item.type === 'talent');
    talentItems.forEach((talent) => {
      if (talent.system && talent.system.knacksProvided) {
        totalKnacks += talent.system.knacksProvided;
      }
    });
    
    // Get knacks from track tiers
    const characterLevel = this.actor.system.level || 0;
    const trackItems = this.actor.items.filter(item => item.type === 'track');
    
    trackItems.forEach(track => {
      // Get track slot index
      const trackSlotIndex = track.getFlag('zwolf-epic', 'slotIndex');
      const fallbackIndex = trackItems.findIndex(t => t.id === track.id);
      const slotIndex = trackSlotIndex !== undefined ? trackSlotIndex : fallbackIndex;
      
      // Calculate unlocked tiers
      const unlockedTiers = [];
      for (let tier = 1; tier <= 5; tier++) {
        const tierLevel = slotIndex + 1 + ((tier - 1) * 4);
        if (characterLevel >= tierLevel) {
          unlockedTiers.push(tier);
        }
      }
      
      // Add knacks from each unlocked tier
      unlockedTiers.forEach(tierNumber => {
        const tierData = track.system.tiers?.[`tier${tierNumber}`];
        if (tierData?.sideEffects?.knacksProvided) {
          totalKnacks += parseInt(tierData.sideEffects.knacksProvided) || 0;
        }
      });
    });
    
    return totalKnacks;
  }

  /**
   * Get valid track slot indices for eidolons
   * @returns {Array<number>} Array of valid slot indices
   * @private
   */
  _getEidolonValidTrackSlots() {
    if (this.actor.type !== 'eidolon' || !this.actor.system.baseCreatureId) {
      return [];
    }
    
    const baseCreature = game.actors.get(this.actor.system.baseCreatureId);
    if (!baseCreature) return [];
    
    const placeholderTracks = baseCreature.items.filter(item => 
      item.type === 'track' && item.name === '(Eidolon Placeholder)'
    );
    
    const validSlots = [];
    placeholderTracks.forEach(track => {
      const slotIndex = track.getFlag('zwolf-epic', 'slotIndex');
      if (slotIndex !== undefined) {
        validSlots.push(slotIndex);
      }
    });
    
    return validSlots;
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
