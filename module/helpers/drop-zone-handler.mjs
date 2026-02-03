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

        // Equipment buy zones (purchase with wealth)
        html.querySelectorAll(".equipment-buy-zone").forEach(zone => {
            zone.addEventListener("dragover", (e) => this._onEquipmentBuyDragOver(e));
            zone.addEventListener("drop", (e) => this._onEquipmentBuyDrop(e));
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

    // ========================================
    // EQUIPMENT BUY ZONE HANDLERS
    // ========================================

    /**
     * Handle dragover for equipment buy zone
     * @param {DragEvent} event
     * @private
     */
    async _onEquipmentBuyDragOver(event) {
        event.preventDefault();
        event.stopPropagation();

        const zone = event.currentTarget;

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

        // Only accept equipment and commodity
        if (!["equipment", "commodity"].includes(item.type)) {
            zone.classList.add("invalid-drop");
            return;
        }

        // Valid drop
        zone.classList.remove("invalid-drop");
        zone.classList.add("drag-over");
    }

    /**
     * Handle drop for equipment buy zone - triggers purchase with wealth roll
     * @param {DragEvent} event
     * @private
     */
    async _onEquipmentBuyDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        const zone = event.currentTarget;

        // Remove visual feedback
        zone.classList.remove("drag-over", "invalid-drop");

        // Flag to prevent default drop handler
        this.sheet._processingCustomDrop = true;

        try {
            // Get drag data
            const data = TextEditor.getDragEventData(event);
            if (data.type !== "Item") return;

            // Get the item
            const item = await fromUuid(data.uuid);
            if (!item) {
                ui.notifications.error(game.i18n.localize("ZWOLF.ItemNotFound"));
                return;
            }

            // Validate type
            if (!["equipment", "commodity"].includes(item.type)) {
                ui.notifications.warn(game.i18n.localize("ZWOLF.ShoppingListInvalidType"));
                return;
            }

            // Attempt purchase
            await this._attemptPurchase(item);

        } catch (err) {
            console.error("Z-Wolf Epic | Error handling equipment buy drop:", err);
            ui.notifications.error(`Error purchasing item: ${err.message}`);
        } finally {
            // Reset flag after a delay
            setTimeout(() => {
                this.sheet._processingCustomDrop = false;
            }, 100);
        }
    }

    /**
     * Attempt to purchase an item using the wealth system
     * @param {Item} item - The item to purchase
     * @private
     */
    async _attemptPurchase(item) {
        const wealth = this.actor.system.wealth || 0;
        const price = parseFloat(item.system.price) || 0;

        // If price is 0, just add it free
        if (price === 0) {
            await this._completePurchase(item, 0);
            ui.notifications.info(game.i18n.format("ZWOLF.ItemFree", { name: item.name }));
            return;
        }

        // Check if actor has any wealth
        if (wealth <= 0) {
            ui.notifications.warn(game.i18n.localize("ZWOLF.NotEnoughWealth"));
            return;
        }

        // Roll wealth dice
        const roll = await new Roll(`${wealth}d12`).evaluate();
        const dice = roll.terms[0].results.map(r => r.result);
        const successes = dice.filter(d => d >= 8).length;
        const actualCost = Math.max(0, price - successes);

        // Create chat message showing the roll
        await this._createPurchaseRollMessage(item, dice, successes, actualCost, wealth);

        // Check if we can afford it
        if (actualCost > wealth) {
            ui.notifications.warn(game.i18n.format("ZWOLF.CannotAffordItem", { name: item.name }));
            return;
        }

        // Show confirmation dialog
        const confirmed = await this._showPurchaseConfirmDialog(item, actualCost, wealth);

        if (confirmed) {
            await this._completePurchase(item, actualCost);
        }
    }

    /**
     * Create a chat message for the purchase roll
     * @param {Item} item - The item being purchased
     * @param {number[]} dice - Array of dice results
     * @param {number} successes - Number of successes (8+)
     * @param {number} actualCost - The actual wealth cost
     * @param {number} currentWealth - Current wealth before purchase
     * @private
     */
    async _createPurchaseRollMessage(item, dice, successes, actualCost, currentWealth) {
        const diceHtml = dice.map(d => {
            const isSuccess = d >= 8;
            return `<span class="die d12 ${isSuccess ? "success" : "failure"}">${d}</span>`;
        }).join(" ");

        const canAfford = actualCost <= currentWealth;
        const price = parseFloat(item.system.price) || 0;

        const content = `
            <div class="zwolf-purchase-roll">
                <div class="purchase-header">
                    <img src="${item.img}" class="item-image" />
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">(${game.i18n.localize("ZWOLF.Price")}: ${price})</span>
                </div>
                <div class="purchase-dice">
                    <span class="dice-label">${game.i18n.localize("ZWOLF.WealthRoll")}:</span>
                    <span class="dice-results">${diceHtml}</span>
                </div>
                <div class="purchase-result">
                    <span class="successes">${game.i18n.format("ZWOLF.PurchaseSuccesses", { count: successes })}</span>
                    <span class="cost">${game.i18n.format("ZWOLF.PurchaseCost", { cost: actualCost })}</span>
                    <span class="outcome ${canAfford ? "affordable" : "failure"}">${canAfford
                        ? game.i18n.localize("ZWOLF.CanAfford")
                        : game.i18n.localize("ZWOLF.CannotAfford")
                    }</span>
                </div>
            </div>
        `;

        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            content: content,
            type: CONST.CHAT_MESSAGE_STYLES.OTHER,
            rolls: [await new Roll(`${dice.length}d12`).evaluate()]
        });
    }

    /**
     * Show purchase confirmation dialog
     * @param {Item} item - The item to purchase
     * @param {number} cost - The wealth cost
     * @param {number} currentWealth - Current wealth
     * @returns {Promise<boolean>} True if confirmed
     * @private
     */
    async _showPurchaseConfirmDialog(item, cost, currentWealth) {
        const newWealth = currentWealth - cost;

        const content = `
            <div class="zwolf-purchase-dialog">
                <p>${game.i18n.format("ZWOLF.ConfirmPurchase", { name: item.name })}</p>
                <div class="purchase-summary">
                    <div class="summary-row">
                        <span class="label">${game.i18n.localize("ZWOLF.CurrentWealth")}:</span>
                        <span class="value">${currentWealth}</span>
                    </div>
                    <div class="summary-row">
                        <span class="label">${game.i18n.localize("ZWOLF.Cost")}:</span>
                        <span class="value loss">-${cost}</span>
                    </div>
                    <div class="summary-row total">
                        <span class="label">${game.i18n.localize("ZWOLF.NewWealth")}:</span>
                        <span class="value">${newWealth}</span>
                    </div>
                </div>
            </div>
        `;

        return await Dialog.confirm({
            title: game.i18n.format("ZWOLF.PurchaseItem", { name: item.name }),
            content,
            yes: () => true,
            no: () => false,
            defaultYes: true
        });
    }

    /**
     * Complete the purchase - add item to actor and deduct wealth
     * @param {Item} item - The item to add
     * @param {number} cost - The wealth cost to deduct
     * @private
     */
    async _completePurchase(item, cost) {
        // Create item on actor
        const itemData = item.toObject();
        await this.actor.createEmbeddedDocuments("Item", [itemData]);

        // Deduct wealth
        const currentWealth = this.actor.system.wealth || 0;
        const newWealth = currentWealth - cost;
        await this.actor.update({ "system.wealth": newWealth });

        // Create success message in chat
        const content = `
            <div class="zwolf-purchase-complete">
                <div class="purchase-success">
                    <i class="fas fa-check-circle"></i>
                    <strong>${this.actor.name}</strong> ${game.i18n.format("ZWOLF.PurchasedItem", { name: item.name })}
                </div>
                <div class="wealth-change">
                    ${game.i18n.localize("ZWOLF.Wealth")}: ${currentWealth} → ${newWealth} (-${cost})
                </div>
            </div>
        `;

        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            content
        });

        ui.notifications.info(game.i18n.format("ZWOLF.ItemPurchased", { name: item.name }));
    }
}