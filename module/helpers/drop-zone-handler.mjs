/**
 * Handles drop zone functionality for actor sheets
 * Provides drag-and-drop item management with visual feedback
 */
export class DropZoneHandler {
    constructor(sheet) {
        this.sheet = sheet;
        this.actor = sheet.document;
    }

    /**
     * Bind drop zone event listeners to the sheet
     * @param {HTMLElement} html - The sheet HTML element
     */
    bindDropZones(html) {
        // Foundation drop zones (ancestry, fundament)
        html.querySelectorAll(".foundation-drop-zone").forEach(zone => {
            zone.addEventListener("dragover", (e) => this._onFoundationDragOver(e));
            zone.addEventListener("drop", (e) => this._onFoundationDrop(e));
            zone.addEventListener("dragleave", (e) => this._onDragLeave(e));
        });

        // Knack drop zones
        html.querySelectorAll(".knack-drop-zone").forEach(zone => {
            zone.addEventListener("dragover", (e) => this._onSlotDragOver(e, "knack"));
            zone.addEventListener("drop", (e) => this._onSlotDrop(e, "knack"));
            zone.addEventListener("dragleave", (e) => this._onDragLeave(e));
        });

        // Track drop zones
        html.querySelectorAll(".track-drop-zone").forEach(zone => {
            zone.addEventListener("dragover", (e) => this._onSlotDragOver(e, "track"));
            zone.addEventListener("drop", (e) => this._onSlotDrop(e, "track"));
            zone.addEventListener("dragleave", (e) => this._onDragLeave(e));
        });

        // Talent drop zones
        html.querySelectorAll(".talent-drop-zone").forEach(zone => {
            zone.addEventListener("dragover", (e) => this._onSlotDragOver(e, "talent"));
            zone.addEventListener("drop", (e) => this._onSlotDrop(e, "talent"));
            zone.addEventListener("dragleave", (e) => this._onDragLeave(e));
        });

        // Attunement drop zones (for Phase 13+)
        html.querySelectorAll(".attunement-drop-zone").forEach(zone => {
            zone.addEventListener("dragover", (e) => this._onAttunementDragOver(e));
            zone.addEventListener("drop", (e) => this._onAttunementDrop(e));
            zone.addEventListener("dragleave", (e) => this._onDragLeave(e));
        });
    }

    // ========================================
    // DRAG OVER HANDLERS
    // ========================================

    /**
     * Handle dragover for foundation drop zones
     * @param {DragEvent} event
     * @private
     */
    async _onFoundationDragOver(event) {
        event.preventDefault();
        event.stopPropagation();

        const zone = event.currentTarget;
        const expectedType = zone.dataset.itemType;

        // Get drag data
        let data;
        try {
            data = TextEditor.getDragEventData(event);
        } catch (err) {
            zone.classList.add("invalid-drop");
            return;
        }

        // Must be an Item
        if (data.type !== "Item") {
            zone.classList.add("invalid-drop");
            return;
        }

        // Get the item
        let item;
        try {
            item = await fromUuid(data.uuid);
        } catch (err) {
            zone.classList.add("invalid-drop");
            return;
        }

        // Validate type
        if (item.type !== expectedType) {
            zone.classList.add("invalid-drop");
            return;
        }

        // Eidolons cannot have fundament
        if (this.actor.type === "eidolon" && expectedType === "fundament") {
            zone.classList.add("invalid-drop");
            return;
        }

        // Valid drop
        zone.classList.remove("invalid-drop");
        zone.classList.add("drag-over");
    }

    /**
     * Handle dragover for slot drop zones (knacks, tracks, talents)
     * @param {DragEvent} event
     * @param {string} itemType - Expected item type
     * @private
     */
    async _onSlotDragOver(event, itemType) {
        event.preventDefault();
        event.stopPropagation();

        const zone = event.currentTarget;

        // Don't allow drops on disabled zones
        if (zone.classList.contains("disabled")) {
            zone.classList.add("invalid-drop");
            return;
        }

        // Get drag data
        let data;
        try {
            data = TextEditor.getDragEventData(event);
        } catch (err) {
            zone.classList.add("invalid-drop");
            return;
        }

        // Must be an Item
        if (data.type !== "Item") {
            zone.classList.add("invalid-drop");
            return;
        }

        // Get the item
        let item;
        try {
            item = await fromUuid(data.uuid);
        } catch (err) {
            zone.classList.add("invalid-drop");
            return;
        }

        // Validate type
        if (item.type !== itemType) {
            zone.classList.add("invalid-drop");
            return;
        }

        // Valid drop
        zone.classList.remove("invalid-drop");
        zone.classList.add("drag-over");
    }

    /**
     * Handle dragover for attunement drop zones
     * @param {DragEvent} event
     * @private
     */
    async _onAttunementDragOver(event) {
        event.preventDefault();
        event.stopPropagation();

        const zone = event.currentTarget;
        const slotTier = parseInt(zone.dataset.slotTier) || 1;

        // Get drag data
        let data;
        try {
            data = TextEditor.getDragEventData(event);
        } catch (err) {
            zone.classList.add("invalid-drop");
            return;
        }

        // Must be an Item
        if (data.type !== "Item") {
            zone.classList.add("invalid-drop");
            return;
        }

        // Get the item
        let item;
        try {
            item = await fromUuid(data.uuid);
        } catch (err) {
            zone.classList.add("invalid-drop");
            return;
        }

        // Validate type
        if (item.type !== "attunement") {
            zone.classList.add("invalid-drop");
            return;
        }

        // Validate tier (allow if within slot tier or overextended)
        const itemTier = item.system.tier || 1;
        // For now, allow all drops (tier validation will show warnings but allow placement)

        // Valid drop
        zone.classList.remove("invalid-drop");
        zone.classList.add("drag-over");
    }

    /**
     * Handle dragleave for all drop zones
     * @param {DragEvent} event
     * @private
     */
    _onDragLeave(event) {
        event.preventDefault();
        const zone = event.currentTarget;

        // Only remove if we're actually leaving the zone (not entering a child)
        if (!zone.contains(event.relatedTarget)) {
            zone.classList.remove("drag-over", "invalid-drop");
        }
    }

    // ========================================
    // DROP HANDLERS
    // ========================================

    /**
     * Handle drop for foundation zones (ancestry, fundament)
     * @param {DragEvent} event
     * @private
     */
    async _onFoundationDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        const zone = event.currentTarget;
        const expectedType = zone.dataset.itemType;

        // Remove visual feedback
        zone.classList.remove("drag-over", "invalid-drop");

        // Flag to prevent default drop handler
        this.sheet._processingCustomDrop = true;

        // Capture scroll position directly from the tab element
        const configureTab = this.sheet.element.querySelector(".tab[data-tab='configure']");
        const scrollTop = configureTab?.scrollTop || 0;

        try {
            // Get drag data
            const data = TextEditor.getDragEventData(event);
            if (data.type !== "Item") return;

            // Get the item
            const item = await fromUuid(data.uuid);
            if (!item) {
                ui.notifications.error("Could not find the dragged item.");
                return;
            }

            // Validate type
            if (item.type !== expectedType) {
                ui.notifications.warn(`This slot only accepts ${expectedType} items.`);
                return;
            }

            // Eidolons cannot have fundament
            if (this.actor.type === "eidolon" && expectedType === "fundament") {
                ui.notifications.warn("Eidolons cannot have a Fundament.");
                return;
            }

            // Check if there's already a foundation item of this type
            const fieldName = expectedType === "ancestry" ? "ancestryId" : "fundamentId";
            const existingId = this.actor.system[fieldName];

            // Create item on actor (or copy if from another actor)
            let createdItem;
            if (item.actor && item.actor.id === this.actor.id) {
                // Item already on this actor, just update the reference
                createdItem = item;
            } else {
                // Create a copy on this actor
                const itemData = item.toObject();
                const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
                createdItem = created[0];
            }

            // If there was an existing item, remove it
            if (existingId && existingId !== createdItem.id) {
                const existingItem = this.actor.items.get(existingId);
                if (existingItem) {
                    await existingItem.delete();
                }
            }

            // Update the actor's foundation reference
            await this.actor.update({
                [`system.${fieldName}`]: createdItem.id
            });

            ui.notifications.info(`${item.name} set as ${expectedType}.`);

            // Restore scroll position after the automatic re-render
            if (scrollTop > 0) {
                setTimeout(() => {
                    const newTab = this.sheet.element.querySelector(".tab[data-tab='configure']");
                    if (newTab) {
                        newTab.scrollTop = scrollTop;
                    }
                }, 100);
            }

        } catch (err) {
            console.error("Z-Wolf Epic | Error handling foundation drop:", err);
            ui.notifications.error(`Error adding ${expectedType}: ${err.message}`);
        } finally {
            // Reset flag after a delay
            setTimeout(() => {
                this.sheet._processingCustomDrop = false;
            }, 100);
        }
    }

    /**
     * Handle drop for slot zones (knacks, tracks, talents)
     * @param {DragEvent} event
     * @param {string} itemType - Item type
     * @private
     */
    async _onSlotDrop(event, itemType) {
        event.preventDefault();
        event.stopPropagation();

        const zone = event.currentTarget;

        // Don't allow drops on disabled zones
        if (zone.classList.contains("disabled")) {
            ui.notifications.warn("This slot is not available.");
            return;
        }

        // Remove visual feedback
        zone.classList.remove("drag-over", "invalid-drop");

        // Flag to prevent default drop handler
        this.sheet._processingCustomDrop = true;

        // Capture scroll position directly from the tab element BEFORE any operations
        const configureTab = this.sheet.element.querySelector(".tab[data-tab='configure']");
        const scrollTop = configureTab?.scrollTop || 0;

        try {
            // Get drag data
            const data = TextEditor.getDragEventData(event);
            if (data.type !== "Item") return;

            // Get the item
            const item = await fromUuid(data.uuid);
            if (!item) {
                ui.notifications.error("Could not find the dragged item.");
                return;
            }

            // Validate type
            if (item.type !== itemType) {
                ui.notifications.warn(`This slot only accepts ${itemType} items.`);
                return;
            }

            // Extract slot index from zone
            const slotMatch = zone.dataset.slot.match(/\d+$/);
            const slotIndex = slotMatch ? parseInt(slotMatch[0]) : 0;

            // Check if this item is already on this actor
            let createdItem;
            if (item.actor && item.actor.id === this.actor.id) {
                // Item already on this actor
                createdItem = item;

                // Check if it's in a different slot
                const currentSlotIndex = createdItem.getFlag("zwolf-epic", "slotIndex");
                if (currentSlotIndex !== undefined && currentSlotIndex !== slotIndex) {
                    // Moving to a new slot
                    await createdItem.setFlag("zwolf-epic", "slotIndex", slotIndex);
                    ui.notifications.info(`${item.name} moved to slot ${slotIndex + 1}.`);
                } else if (currentSlotIndex === undefined) {
                    // First time assigning to a slot
                    await createdItem.setFlag("zwolf-epic", "slotIndex", slotIndex);
                    ui.notifications.info(`${item.name} assigned to slot ${slotIndex + 1}.`);
                }
            } else {
                // Create a copy on this actor
                const itemData = item.toObject();
                const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
                createdItem = created[0];

                // Set slot index
                await createdItem.setFlag("zwolf-epic", "slotIndex", slotIndex);
                ui.notifications.info(`${item.name} added to slot ${slotIndex + 1}.`);
            }

            // Refresh the sheet
            await this.sheet.render(false);

            // Restore scroll position after render completes
            if (scrollTop > 0) {
                requestAnimationFrame(() => {
                    const newTab = this.sheet.element.querySelector(".tab[data-tab='configure']");
                    if (newTab) {
                        newTab.scrollTop = scrollTop;
                    }
                });
            }

        } catch (err) {
            console.error(`Z-Wolf Epic | Error handling ${itemType} drop:`, err);
            ui.notifications.error(`Error adding ${itemType}: ${err.message}`);
        } finally {
            // Reset flag after a delay
            setTimeout(() => {
                this.sheet._processingCustomDrop = false;
            }, 100);
        }
    }

    /**
     * Handle drop for attunement zones
     * @param {DragEvent} event
     * @private
     */
    async _onAttunementDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        const zone = event.currentTarget;

        // Remove visual feedback
        zone.classList.remove("drag-over", "invalid-drop");

        // Flag to prevent default drop handler
        this.sheet._processingCustomDrop = true;

        // Capture scroll position directly from the tab element BEFORE any operations
        const configureTab = this.sheet.element.querySelector(".tab[data-tab='configure']");
        const scrollTop = configureTab?.scrollTop || 0;

        try {
            // Get drag data
            const data = TextEditor.getDragEventData(event);
            if (data.type !== "Item") return;

            // Get the item
            const item = await fromUuid(data.uuid);
            if (!item) {
                ui.notifications.error("Could not find the dragged item.");
                return;
            }

            // Validate type
            if (item.type !== "attunement") {
                ui.notifications.warn("This slot only accepts attunement items.");
                return;
            }

            // Extract slot index from zone
            const slotMatch = zone.dataset.slot.match(/\d+$/);
            const slotIndex = slotMatch ? parseInt(slotMatch[0]) : 0;
            const slotTier = parseInt(zone.dataset.slotTier) || 1;

            // Check tier (warn if overextended but still allow)
            const itemTier = item.system.tier || 1;
            if (itemTier > slotTier) {
                ui.notifications.warn(`This attunement (Tier ${itemTier}) exceeds the slot's capacity (Tier ${slotTier}). The slot will be overextended.`);
            }

            // Check if this item is already on this actor
            let createdItem;
            if (item.actor && item.actor.id === this.actor.id) {
                // Item already on this actor
                createdItem = item;

                // Update slot index if moving
                const currentSlotIndex = createdItem.getFlag("zwolf-epic", "slotIndex");
                if (currentSlotIndex !== slotIndex) {
                    await createdItem.setFlag("zwolf-epic", "slotIndex", slotIndex);
                    ui.notifications.info(`${item.name} moved to attunement slot ${slotIndex + 1}.`);
                }
            } else {
                // Create a copy on this actor
                const itemData = item.toObject();
                const created = await this.actor.createEmbeddedDocuments("Item", [itemData]);
                createdItem = created[0];

                // Set slot index
                await createdItem.setFlag("zwolf-epic", "slotIndex", slotIndex);
                ui.notifications.info(`${item.name} added to attunement slot ${slotIndex + 1}.`);
            }

            // Refresh the sheet
            await this.sheet.render(false);

            // Restore scroll position after render completes
            if (scrollTop > 0) {
                requestAnimationFrame(() => {
                    const newTab = this.sheet.element.querySelector(".tab[data-tab='configure']");
                    if (newTab) {
                        newTab.scrollTop = scrollTop;
                    }
                });
            }

        } catch (err) {
            console.error("Z-Wolf Epic | Error handling attunement drop:", err);
            ui.notifications.error(`Error adding attunement: ${err.message}`);
        } finally {
            // Reset flag after a delay
            setTimeout(() => {
                this.sheet._processingCustomDrop = false;
            }, 100);
        }
    }
}