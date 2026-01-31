const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Shopping list dialog for purchasing equipment and commodities.
 * Items are bought in sequence from least to most expensive.
 * @extends {ApplicationV2}
 */
export class ShoppingListDialog extends HandlebarsApplicationMixin(ApplicationV2) {

    /** @type {ZWolfActor} */
    actor;

    /** @type {Array<{uuid: string, name: string, img: string, price: number, quantity: number, type: string}>} */
    shoppingList = [];

    constructor(actor, options = {}) {
        super(options);
        this.actor = actor;
        this.shoppingList = [];
    }

    static DEFAULT_OPTIONS = {
        id: "shopping-list-dialog",
        classes: ["zwolf-epic", "shopping-list-dialog"],
        tag: "form",
        window: {
            title: "ZWOLF.ShoppingList",
            resizable: true
        },
        position: {
            width: 500,
            height: 450
        },
        actions: {
            addItem: ShoppingListDialog.#onAddItem,
            removeItem: ShoppingListDialog.#onRemoveItem,
            changeQuantity: ShoppingListDialog.#onChangeQuantity,
            buyAll: ShoppingListDialog.#onBuyAll,
            clearList: ShoppingListDialog.#onClearList
        }
    };

    static PARTS = {
        content: {
            template: "systems/zwolf-epic/templates/dialogs/shopping-list-dialog.hbs"
        }
    };

    async _prepareContext(options) {
        const context = await super._prepareContext(options);

        // Calculate total cost
        const totalCost = this.shoppingList.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        context.actor = this.actor;
        context.wealth = this.actor.system.wealth || 0;
        context.shoppingList = this.shoppingList;
        context.totalCost = totalCost;
        context.canAfford = context.wealth >= totalCost;
        context.hasItems = this.shoppingList.length > 0;

        return context;
    }

    /**
     * Handle adding an item via drag and drop
     * @param {DragEvent} event
     */
    async _onDrop(event) {
        event.preventDefault();

        // Get dropped data
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData("text/plain"));
        } catch (err) {
            return;
        }

        // Only handle item drops
        if (data.type !== "Item") return;

        // Get the item
        const item = await fromUuid(data.uuid);
        if (!item) return;

        // Only accept equipment and commodity types
        if (!["equipment", "commodity"].includes(item.type)) {
            ui.notifications.warn(game.i18n.localize("ZWOLF.ShoppingListInvalidType"));
            return;
        }

        // Add to shopping list
        this.#addItemToList(item);
    }

    /**
     * Add an item to the shopping list
     * @param {Item} item - The item to add
     */
    #addItemToList(item) {
        // Check if item already exists in list
        const existingIndex = this.shoppingList.findIndex(i => i.uuid === item.uuid);

        if (existingIndex >= 0) {
            // Increase quantity if already in list
            this.shoppingList[existingIndex].quantity += 1;
        } else {
            // Add new item to list
            this.shoppingList.push({
                uuid: item.uuid,
                name: item.name,
                img: item.img,
                price: parseFloat(item.system.price) || 0,
                quantity: 1,
                type: item.type
            });
        }

        this.render();
    }

    /**
     * Handle clicking the add item button (opens item picker)
     */
    static async #onAddItem(event, target) {
        // Get all available equipment and commodity items from world and compendiums
        const items = [];

        // World items
        for (const item of game.items) {
            if (["equipment", "commodity"].includes(item.type)) {
                items.push({
                    uuid: item.uuid,
                    name: item.name,
                    img: item.img,
                    price: parseFloat(item.system.price) || 0,
                    type: item.type,
                    source: "World"
                });
            }
        }

        // Compendium items
        for (const pack of game.packs) {
            if (pack.documentName !== "Item") continue;

            const index = await pack.getIndex({ fields: ["system.price", "type", "img"] });
            for (const entry of index) {
                if (["equipment", "commodity"].includes(entry.type)) {
                    items.push({
                        uuid: `Compendium.${pack.collection}.${entry._id}`,
                        name: entry.name,
                        img: entry.img,
                        price: parseFloat(entry.system?.price) || 0,
                        type: entry.type,
                        source: pack.metadata.label
                    });
                }
            }
        }

        // Sort by name
        items.sort((a, b) => a.name.localeCompare(b.name));

        if (items.length === 0) {
            ui.notifications.warn(game.i18n.localize("ZWOLF.NoShoppableItems"));
            return;
        }

        // Create selection dialog
        const itemOptions = items.map(item => {
            const priceStr = item.price > 0 ? ` (${item.price} ${game.i18n.localize("ZWOLF.Wealth")})` : ` (${game.i18n.localize("ZWOLF.Free")})`;
            return `<option value="${item.uuid}">${item.name}${priceStr} [${item.source}]</option>`;
        }).join("");

        const content = `
            <form>
                <div class="form-group">
                    <label>${game.i18n.localize("ZWOLF.SelectItem")}</label>
                    <select name="itemUuid" style="width: 100%;">
                        ${itemOptions}
                    </select>
                </div>
            </form>
        `;

        const result = await Dialog.prompt({
            title: game.i18n.localize("ZWOLF.AddToShoppingList"),
            content: content,
            callback: (html) => {
                const form = html.querySelector("form");
                return form.itemUuid.value;
            },
            rejectClose: false
        });

        if (result) {
            const item = await fromUuid(result);
            if (item) {
                this.#addItemToList(item);
            }
        }
    }

    /**
     * Handle removing an item from the list
     */
    static #onRemoveItem(event, target) {
        const uuid = target.dataset.uuid;
        const index = this.shoppingList.findIndex(i => i.uuid === uuid);
        if (index >= 0) {
            this.shoppingList.splice(index, 1);
            this.render();
        }
    }

    /**
     * Handle changing item quantity
     */
    static #onChangeQuantity(event, target) {
        const uuid = target.dataset.uuid;
        const delta = parseInt(target.dataset.delta) || 0;
        const index = this.shoppingList.findIndex(i => i.uuid === uuid);

        if (index >= 0) {
            this.shoppingList[index].quantity = Math.max(1, this.shoppingList[index].quantity + delta);
            this.render();
        }
    }

    /**
     * Handle buying all items in sequence (cheapest first)
     */
    static async #onBuyAll(event, target) {
        if (this.shoppingList.length === 0) return;

        // Sort by price (cheapest first)
        const sortedItems = [...this.shoppingList].sort((a, b) => a.price - b.price);

        let currentWealth = this.actor.system.wealth || 0;
        const purchasedItems = [];
        const failedItems = [];

        // Process each item in order
        for (const item of sortedItems) {
            for (let i = 0; i < item.quantity; i++) {
                const cost = item.price;

                if (currentWealth >= cost) {
                    // Can afford this item
                    currentWealth -= cost;
                    purchasedItems.push(item);
                } else {
                    // Cannot afford - add to failed list
                    const remaining = item.quantity - i;
                    if (remaining > 0) {
                        failedItems.push({
                            ...item,
                            quantity: remaining
                        });
                    }
                    break;
                }
            }
        }

        // If nothing can be purchased, show error
        if (purchasedItems.length === 0) {
            ui.notifications.warn(game.i18n.localize("ZWOLF.NotEnoughWealth"));
            return;
        }

        // Group purchased items by UUID for efficient creation
        const groupedPurchases = {};
        for (const item of purchasedItems) {
            if (groupedPurchases[item.uuid]) {
                groupedPurchases[item.uuid].quantity += 1;
            } else {
                groupedPurchases[item.uuid] = { ...item, quantity: 1 };
            }
        }

        // Create items on actor
        const itemsToCreate = [];
        for (const [uuid, purchaseInfo] of Object.entries(groupedPurchases)) {
            const sourceItem = await fromUuid(uuid);
            if (sourceItem) {
                const itemData = sourceItem.toObject();
                itemData.system.quantity = purchaseInfo.quantity;
                itemsToCreate.push(itemData);
            }
        }

        // Create items and update wealth
        await this.actor.createEmbeddedDocuments("Item", itemsToCreate);
        await this.actor.update({ "system.wealth": currentWealth });

        // Build summary message
        const purchaseCount = purchasedItems.length;
        const totalSpent = (this.actor.system.wealth || 0) - currentWealth;

        let message = game.i18n.format("ZWOLF.PurchaseComplete", {
            count: purchaseCount,
            spent: totalSpent,
            remaining: currentWealth
        });

        if (failedItems.length > 0) {
            const failedCount = failedItems.reduce((sum, i) => sum + i.quantity, 0);
            message += " " + game.i18n.format("ZWOLF.ItemsNotAfforded", { count: failedCount });
        }

        ui.notifications.info(message);

        // Clear purchased items from list, keep failed ones
        if (failedItems.length > 0) {
            this.shoppingList = failedItems;
        } else {
            this.shoppingList = [];
        }

        this.render();
    }

    /**
     * Handle clearing the entire list
     */
    static #onClearList(event, target) {
        this.shoppingList = [];
        this.render();
    }

    /**
     * Enable drag and drop on the dialog
     */
    _onRender(context, options) {
        super._onRender(context, options);

        // Enable drop zone
        const dropZone = this.element.querySelector(".shopping-list-drop-zone");
        if (dropZone) {
            dropZone.addEventListener("dragover", (event) => {
                event.preventDefault();
                dropZone.classList.add("drag-over");
            });
            dropZone.addEventListener("dragleave", () => {
                dropZone.classList.remove("drag-over");
            });
            dropZone.addEventListener("drop", (event) => {
                dropZone.classList.remove("drag-over");
                this._onDrop(event);
            });
        }
    }
}