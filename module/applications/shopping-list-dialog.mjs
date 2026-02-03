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
            width: 600,
            height: 600
        },
        actions: {
            addItem: ShoppingListDialog.onAddItem,
            removeItem: ShoppingListDialog.onRemoveItem,
            changeQuantity: ShoppingListDialog.onChangeQuantity,
            buyAll: ShoppingListDialog.onBuyAll,
            fairBuyAll: ShoppingListDialog.onFairBuyAll,
            clearList: ShoppingListDialog.onClearList,
            saveBundle: ShoppingListDialog.onSaveBundle,
            loadBundle: ShoppingListDialog.onLoadBundle
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
        context.hasItems = this.shoppingList.length > 0;
        context.isGM = game.user.isGM;

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
        this._addItemToList(item);
    }

    /**
     * Add an item to the shopping list
     * @param {Item} item - The item to add
     */
    _addItemToList(item) {
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
     * @this {ShoppingListDialog}
     */
    static async onAddItem(event, target) {
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
                // html is a jQuery object in FoundryVTT v13
                const form = html[0].querySelector("form");
                return form.itemUuid.value;
            },
            rejectClose: false
        });

        if (result) {
            const item = await fromUuid(result);
            if (item) {
                this._addItemToList(item);
            }
        }
    }

    /**
     * Handle removing an item from the list
     * @this {ShoppingListDialog}
     */
    static onRemoveItem(event, target) {
        const uuid = target.dataset.uuid;
        const index = this.shoppingList.findIndex(i => i.uuid === uuid);
        if (index >= 0) {
            this.shoppingList.splice(index, 1);
            this.render();
        }
    }

    /**
     * Handle changing item quantity
     * @this {ShoppingListDialog}
     */
    static onChangeQuantity(event, target) {
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
     * Uses dice-based purchase: roll Wealth d12s, each 8+ is a success
     * Cost = max(0, Price - Successes)
     * @this {ShoppingListDialog}
     */
    static async onBuyAll(event, target) {
        if (this.shoppingList.length === 0) return;

        let currentWealth = this.actor.system.wealth || 0;
        if (currentWealth <= 0) {
            ui.notifications.warn(game.i18n.localize("ZWOLF.NotEnoughWealth"));
            return;
        }

        // Expand shopping list to individual items and sort by price (cheapest first)
        const itemsToBuy = [];
        for (const item of this.shoppingList) {
            for (let i = 0; i < item.quantity; i++) {
                itemsToBuy.push({ ...item, quantity: 1 });
            }
        }
        itemsToBuy.sort((a, b) => a.price - b.price);

        const purchaseResults = [];
        const failedItems = [];
        let totalWealthSpent = 0;

        // Process each item in order
        for (const item of itemsToBuy) {
            // Can't buy if wealth is 0
            if (currentWealth <= 0) {
                failedItems.push(item);
                continue;
            }

            // Roll wealth d12s
            const roll = await new Roll(`${currentWealth}d12`).evaluate();
            const dice = roll.terms[0].results.map(r => r.result);
            const successes = dice.filter(d => d >= 8).length;
            const actualCost = Math.max(0, item.price - successes);

            // Check if we can afford it
            if (actualCost > currentWealth) {
                // Can't afford even with successes - this shouldn't happen often
                // but could if wealth dropped mid-shopping
                failedItems.push(item);

                // Still show the roll in chat
                await this._createPurchaseMessage(item, dice, successes, actualCost, false, currentWealth);
                continue;
            }

            // Successful purchase
            currentWealth -= actualCost;
            totalWealthSpent += actualCost;
            purchaseResults.push({
                item,
                dice,
                successes,
                actualCost
            });

            // Create chat message for this purchase
            await this._createPurchaseMessage(item, dice, successes, actualCost, true, currentWealth);
        }

        // Group purchased items by UUID for efficient creation
        const groupedPurchases = {};
        for (const result of purchaseResults) {
            if (groupedPurchases[result.item.uuid]) {
                groupedPurchases[result.item.uuid].quantity += 1;
            } else {
                groupedPurchases[result.item.uuid] = { ...result.item, quantity: 1 };
            }
        }

        // Create items on actor
        if (Object.keys(groupedPurchases).length > 0) {
            const itemsToCreate = [];
            for (const [uuid, purchaseInfo] of Object.entries(groupedPurchases)) {
                const sourceItem = await fromUuid(uuid);
                if (sourceItem) {
                    const itemData = sourceItem.toObject();
                    itemData.system.quantity = purchaseInfo.quantity;
                    itemsToCreate.push(itemData);
                }
            }
            await this.actor.createEmbeddedDocuments("Item", itemsToCreate);
        }

        // Update wealth
        await this.actor.update({ "system.wealth": currentWealth });

        // Build summary notification
        const purchaseCount = purchaseResults.length;
        if (purchaseCount > 0) {
            let message = game.i18n.format("ZWOLF.PurchaseComplete", {
                count: purchaseCount,
                spent: totalWealthSpent,
                remaining: currentWealth
            });

            if (failedItems.length > 0) {
                message += " " + game.i18n.format("ZWOLF.ItemsNotAfforded", { count: failedItems.length });
            }

            ui.notifications.info(message);
        } else {
            ui.notifications.warn(game.i18n.localize("ZWOLF.NotEnoughWealth"));
        }

        // Update shopping list - keep only failed items (re-grouped)
        if (failedItems.length > 0) {
            const regrouped = {};
            for (const item of failedItems) {
                if (regrouped[item.uuid]) {
                    regrouped[item.uuid].quantity += 1;
                } else {
                    regrouped[item.uuid] = { ...item, quantity: 1 };
                }
            }
            this.shoppingList = Object.values(regrouped);
        } else {
            this.shoppingList = [];
        }

        this.render();
    }

    /**
     * Determine the next fair roll value (12 or 1) based on the actor's fairWealthRolls history.
     * The algorithm aims to keep the fraction of successes (8+) close to 5/12.
     * @param {number[]} fairWealthRolls - The actor's current fair wealth roll history
     * @returns {{value: number, newRolls: number[]}} - The fair roll value and updated rolls array
     */
    _getNextFairRoll(fairWealthRolls) {
        const TARGET = 5 / 12;

        const evaluateFraction = (arr) => {
            if (arr.length === 0) return 0;
            return arr.filter(el => el >= 8).length / arr.length;
        };

        const offTarget = (arr) => {
            return Math.abs(evaluateFraction(arr) - TARGET);
        };

        const withSuccess = [...fairWealthRolls, 12];
        const withFailure = [...fairWealthRolls, 1];

        // Choose whichever brings us closer to the target fraction
        if (offTarget(withSuccess) < offTarget(withFailure)) {
            return { value: 12, newRolls: withSuccess };
        } else {
            return { value: 1, newRolls: withFailure };
        }
    }

    /**
     * Handle buying all items using fair (deterministic) dice rolls.
     * Uses the actor's fairWealthRolls history to determine outcomes.
     * @this {ShoppingListDialog}
     */
    static async onFairBuyAll(event, target) {
        if (this.shoppingList.length === 0) return;

        let currentWealth = this.actor.system.wealth || 0;
        if (currentWealth <= 0) {
            ui.notifications.warn(game.i18n.localize("ZWOLF.NotEnoughWealth"));
            return;
        }

        // Get current fair wealth rolls history
        let fairWealthRolls = [...(this.actor.system.fairWealthRolls || [])];

        // Expand shopping list to individual items and sort by price (cheapest first)
        const itemsToBuy = [];
        for (const item of this.shoppingList) {
            for (let i = 0; i < item.quantity; i++) {
                itemsToBuy.push({ ...item, quantity: 1 });
            }
        }
        itemsToBuy.sort((a, b) => a.price - b.price);

        const purchaseResults = [];
        let totalWealthSpent = 0;

        // Process each item in order (stop if wealth runs out)
        for (const item of itemsToBuy) {
            // Stop if wealth is 0
            if (currentWealth <= 0) {
                break;
            }

            // Generate fair dice results
            const dice = [];
            for (let i = 0; i < currentWealth; i++) {
                const { value, newRolls } = this._getNextFairRoll(fairWealthRolls);
                dice.push(value);
                fairWealthRolls = newRolls;
            }

            const successes = dice.filter(d => d >= 8).length;
            const actualCost = Math.max(0, item.price - successes);

            // Check if we can afford it - if not, stop processing
            if (actualCost > currentWealth) {
                await this._createPurchaseMessage(item, dice, successes, actualCost, false, currentWealth, true);
                break;
            }

            // Successful purchase
            currentWealth -= actualCost;
            totalWealthSpent += actualCost;
            purchaseResults.push({
                item,
                dice,
                successes,
                actualCost
            });

            // Create chat message for this purchase
            await this._createPurchaseMessage(item, dice, successes, actualCost, true, currentWealth, true);
        }

        // Group purchased items by UUID for efficient creation
        const groupedPurchases = {};
        for (const result of purchaseResults) {
            if (groupedPurchases[result.item.uuid]) {
                groupedPurchases[result.item.uuid].quantity += 1;
            } else {
                groupedPurchases[result.item.uuid] = { ...result.item, quantity: 1 };
            }
        }

        // Create items on actor
        if (Object.keys(groupedPurchases).length > 0) {
            const itemsToCreate = [];
            for (const [uuid, purchaseInfo] of Object.entries(groupedPurchases)) {
                const sourceItem = await fromUuid(uuid);
                if (sourceItem) {
                    const itemData = sourceItem.toObject();
                    itemData.system.quantity = purchaseInfo.quantity;
                    itemsToCreate.push(itemData);
                }
            }
            await this.actor.createEmbeddedDocuments("Item", itemsToCreate);
        }

        // Update wealth and fairWealthRolls
        await this.actor.update({
            "system.wealth": currentWealth,
            "system.fairWealthRolls": fairWealthRolls
        });

        // Build summary notification
        const purchaseCount = purchaseResults.length;
        if (purchaseCount > 0) {
            const message = game.i18n.format("ZWOLF.PurchaseComplete", {
                count: purchaseCount,
                spent: totalWealthSpent,
                remaining: currentWealth
            });
            ui.notifications.info(message);
        } else {
            ui.notifications.warn(game.i18n.localize("ZWOLF.NotEnoughWealth"));
        }

        // Clear shopping list after fair purchase
        this.shoppingList = [];
        this.render();
    }

    /**
     * Create a chat message for a purchase roll
     * @param {Object} item - The item being purchased
     * @param {number[]} dice - Array of dice results
     * @param {number} successes - Number of successes (8+)
     * @param {number} actualCost - The actual wealth cost
     * @param {boolean} success - Whether the purchase succeeded
     * @param {number} remainingWealth - Wealth after purchase
     * @param {boolean} [isFair=false] - Whether this was a fair (deterministic) roll
     */
    async _createPurchaseMessage(item, dice, successes, actualCost, success, remainingWealth, isFair = false) {
        // Format dice results with highlighting for successes
        const diceHtml = dice.map(d => {
            const isSuccess = d >= 8;
            return `<span class="die d12 ${isSuccess ? "success" : "failure"}">${d}</span>`;
        }).join(" ");

        const content = `
            <div class="zwolf-purchase-roll">
                <div class="purchase-header">
                    <img src="${item.img}" class="item-image" />
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">(${game.i18n.localize("ZWOLF.Price")}: ${item.price})</span>
                </div>
                <div class="purchase-dice">
                    <span class="dice-label">${game.i18n.localize(isFair ? "ZWOLF.FairPurchase" : "ZWOLF.WealthRoll")}:</span>
                    <span class="dice-results">${diceHtml}</span>
                </div>
                <div class="purchase-result">
                    <span class="successes">${game.i18n.format("ZWOLF.PurchaseSuccesses", { count: successes })}</span>
                    <span class="cost">${game.i18n.format("ZWOLF.PurchaseCost", { cost: actualCost })}</span>
                    ${success
                        ? `<span class="outcome success">${game.i18n.localize("ZWOLF.Purchased")}</span>`
                        : `<span class="outcome failure">${game.i18n.localize("ZWOLF.CannotAfford")}</span>`
                    }
                </div>
            </div>
        `;

        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            content: content,
            type: CONST.CHAT_MESSAGE_STYLES.OTHER
        });
    }

    /**
     * Handle clearing the entire list
     * @this {ShoppingListDialog}
     */
    static onClearList(event, target) {
        this.shoppingList = [];
        this.render();
    }

    /**
     * The name of the journal entry used to store shopping list bundles
     * @type {string}
     */
    static BUNDLES_JOURNAL_NAME = "Shopping Lists";

    /**
     * Get or create the Shopping Lists journal entry
     * @returns {Promise<JournalEntry>}
     */
    static async getOrCreateBundlesJournal() {
        // Look for existing journal
        let journal = game.journal.getName(ShoppingListDialog.BUNDLES_JOURNAL_NAME);

        if (!journal) {
            // Create new journal entry
            journal = await JournalEntry.create({
                name: ShoppingListDialog.BUNDLES_JOURNAL_NAME,
                ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER }
            });
            ui.notifications.info(game.i18n.format("ZWOLF.BundleJournalCreated", {
                name: ShoppingListDialog.BUNDLES_JOURNAL_NAME
            }));
        }

        return journal;
    }

    /**
     * Get all available bundles from the journal
     * @returns {Promise<Array<{id: string, name: string, items: Array}>>}
     */
    static async getBundles() {
        const journal = await ShoppingListDialog.getOrCreateBundlesJournal();
        const bundles = [];

        for (const page of journal.pages) {
            const items = page.getFlag("zwolf-epic", "shoppingList");
            if (items) {
                bundles.push({
                    id: page.id,
                    name: page.name,
                    items: items
                });
            }
        }

        return bundles;
    }

    /**
     * Handle saving the current shopping list as a bundle
     * @this {ShoppingListDialog}
     */
    static async onSaveBundle(event, target) {
        if (this.shoppingList.length === 0) {
            ui.notifications.warn(game.i18n.localize("ZWOLF.ShoppingListEmpty"));
            return;
        }

        // Prompt for bundle name
        const content = `
            <form>
                <div class="form-group">
                    <label>${game.i18n.localize("ZWOLF.BundleName")}</label>
                    <input type="text" name="bundleName" placeholder="${game.i18n.localize("ZWOLF.BundleNamePlaceholder")}" autofocus />
                </div>
            </form>
        `;

        const result = await Dialog.prompt({
            title: game.i18n.localize("ZWOLF.SaveBundle"),
            content: content,
            callback: (html) => {
                const form = html[0].querySelector("form");
                return form.bundleName.value.trim();
            },
            rejectClose: false
        });

        if (!result) return;

        // Get or create the bundles journal
        const journal = await ShoppingListDialog.getOrCreateBundlesJournal();

        // Check if a bundle with this name already exists
        const existingPage = journal.pages.getName(result);
        if (existingPage) {
            // Update existing bundle
            await existingPage.setFlag("zwolf-epic", "shoppingList", this.shoppingList);
            ui.notifications.info(game.i18n.format("ZWOLF.BundleUpdated", { name: result }));
        } else {
            // Create new page for the bundle
            await journal.createEmbeddedDocuments("JournalEntryPage", [{
                name: result,
                type: "text",
                text: {
                    content: `<p>${game.i18n.localize("ZWOLF.BundlePageDescription")}</p>`
                },
                flags: {
                    "zwolf-epic": {
                        shoppingList: this.shoppingList
                    }
                }
            }]);
            ui.notifications.info(game.i18n.format("ZWOLF.BundleSaved", { name: result }));
        }
    }

    /**
     * Handle loading a bundle into the shopping list
     * @this {ShoppingListDialog}
     */
    static async onLoadBundle(event, target) {
        const bundles = await ShoppingListDialog.getBundles();

        if (bundles.length === 0) {
            ui.notifications.warn(game.i18n.localize("ZWOLF.NoBundlesAvailable"));
            return;
        }

        // Build selection dialog
        const bundleOptions = bundles.map(bundle => {
            const itemCount = bundle.items.reduce((sum, item) => sum + item.quantity, 0);
            const totalCost = bundle.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            return `<option value="${bundle.id}">${bundle.name} (${itemCount} ${game.i18n.localize("ZWOLF.Items")}, ${totalCost} ${game.i18n.localize("ZWOLF.Wealth")})</option>`;
        }).join("");

        const content = `
            <form>
                <div class="form-group">
                    <label>${game.i18n.localize("ZWOLF.SelectBundle")}</label>
                    <select name="bundleId" style="width: 100%;">
                        ${bundleOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label class="checkbox">
                        <input type="checkbox" name="append" />
                        ${game.i18n.localize("ZWOLF.AppendToList")}
                    </label>
                </div>
            </form>
        `;

        const result = await Dialog.prompt({
            title: game.i18n.localize("ZWOLF.LoadBundle"),
            content: content,
            callback: (html) => {
                const form = html[0].querySelector("form");
                return {
                    bundleId: form.bundleId.value,
                    append: form.append.checked
                };
            },
            rejectClose: false
        });

        if (!result) return;

        // Find the selected bundle
        const bundle = bundles.find(b => b.id === result.bundleId);
        if (!bundle) return;

        // Load the bundle items
        if (result.append) {
            // Append to existing list, merging quantities for duplicate UUIDs
            for (const item of bundle.items) {
                const existingIndex = this.shoppingList.findIndex(i => i.uuid === item.uuid);
                if (existingIndex >= 0) {
                    this.shoppingList[existingIndex].quantity += item.quantity;
                } else {
                    this.shoppingList.push({ ...item });
                }
            }
        } else {
            // Replace existing list
            this.shoppingList = bundle.items.map(item => ({ ...item }));
        }

        ui.notifications.info(game.i18n.format("ZWOLF.BundleLoaded", { name: bundle.name }));
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
