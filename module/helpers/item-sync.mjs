/**
 * Item synchronization helper for Z-Wolf Epic
 * Handles pushing updates from world items to actor-embedded copies
 */

/**
 * Determine which fields should be synced based on item type
 * @param {string} itemType - The type of item
 * @returns {Array<string>} Field paths to sync
 */
export function getSyncableFields(itemType) {
    // Fields that should NEVER sync (Actor-specific)
    const neverSync = ["quantity", "placement"];

    // Base fields that sync for all items
    const baseFields = [
        "name",
        "img",
        "system.description",
        "system.grantedAbilities",
        "system.sideEffects",
        "system.tags"
    ];

    // Type-specific additions
    const typeSpecificFields = {
        ancestry: [
            "system.characterTags",
            "system.sizeOptions",
            "system.required",
            "system.knacksProvided",
            "system.knackMenus",
            "system.buildPoints"
        ],
        fundament: [
            "system.buildPoints",
            "system.knacksProvided",
            "system.requiredKnackTag",
            "system.vitalityFunction",
            "system.coastFunction"
        ],
        equipment: [
            "system.requiredPlacement",
            "system.price",
            "system.bulk",
            "system.structure"
        ],
        knack: [
            "system.characterTags",
            "system.required"
        ],
        track: [
            "system.required",
            "system.tiers"
        ],
        talent: [
            "system.characterTags",
            "system.required",
            "system.knacksProvided",
            "system.knackMenus"
        ],
        universal: [
            "system.characterTags"
        ]
    };

    const typeFields = typeSpecificFields[itemType] || [];
    return [...baseFields, ...typeFields].filter(f => !neverSync.some(ns => f.includes(ns)));
}

/**
 * Get all Actor-embedded copies of a world Item
 * @param {Item} item - The world item
 * @returns {Array<{actor: Actor, item: Item}>}
 */
export function getEmbeddedCopies(item) {
    if (item.parent) return []; // Only works for world items

    const copies = [];
    for (let actor of game.actors) {
        for (let actorItem of actor.items) {
            if (actorItem.getFlag("zwolf-epic", "sourceId") === item.id) {
                copies.push({ actor, item: actorItem });
            }
        }
    }
    return copies;
}

/**
 * Push updates from a world Item to all Actor copies
 * @param {Item} item - The world item to push from
 * @param {Object} options - Options for the push operation
 * @param {Array<string>} options.fields - Specific fields to sync (defaults to all syncable)
 * @param {boolean} options.skipConfirm - Skip confirmation dialog
 * @returns {Promise<number>} Number of copies updated
 */
export async function pushItemToActors(item, options = {}) {
    if (item.parent) {
        ui.notifications.warn("Can only push updates from world Items, not embedded copies");
        return 0;
    }

    const copies = getEmbeddedCopies(item);

    if (copies.length === 0) {
        ui.notifications.info(`No copies of "${item.name}" found on any Actors`);
        return 0;
    }

    // Determine which fields to sync
    const fieldsToSync = options.fields || getSyncableFields(item.type);

    // Show confirmation dialog unless skipped
    if (!options.skipConfirm) {
        const confirmed = await showPushConfirmationDialog(item, copies, fieldsToSync);
        if (!confirmed) return 0;
    }

    // Perform updates
    return await performPushUpdates(item, copies, fieldsToSync);
}

/**
 * Show confirmation dialog for push operation
 * @param {Item} item - The item being pushed
 * @param {Array} copies - Array of {actor, item} copies
 * @param {Array<string>} fieldsToSync - Fields that will be synced
 * @returns {Promise<boolean>} True if confirmed
 * @private
 */
async function showPushConfirmationDialog(item, copies, fieldsToSync) {
    const actorNames = [...new Set(copies.map(c => c.actor.name))].sort();
    const actorList = actorNames.length <= 10
        ? actorNames.join(", ")
        : `${actorNames.slice(0, 10).join(", ")}, and ${actorNames.length - 10} more`;

    return Dialog.confirm({
        title: "Push Updates to Actors",
        content: `
            <p>Update <strong>${copies.length}</strong> cop${copies.length === 1 ? "y" : "ies"} of <strong>"${item.name}"</strong>?</p>
            <p><strong>Affected Actors:</strong> ${actorList}</p>
            <p class="notification warning">
                <i class="fas fa-exclamation-triangle"></i>
                This will overwrite any manual changes made to these copies.
            </p>
            <details>
                <summary>Fields that will be updated (${fieldsToSync.length})</summary>
                <ul style="max-height: 200px; overflow-y: auto; font-size: 0.9em;">
                    ${fieldsToSync.map(f => `<li>${f}</li>`).join("")}
                </ul>
            </details>
        `,
        options: { width: 480 }
    });
}

/**
 * Perform the actual push updates
 * @param {Item} sourceItem - The source world item
 * @param {Array} copies - Array of {actor, item} copies
 * @param {Array<string>} fieldsToSync - Fields to sync
 * @returns {Promise<number>} Number of successful updates
 * @private
 */
async function performPushUpdates(sourceItem, copies, fieldsToSync) {
    let updateCount = 0;
    const errors = [];

    for (let {actor, item} of copies) {
        try {
            const updateData = { _id: item.id };

            for (let fieldPath of fieldsToSync) {
                const value = foundry.utils.getProperty(sourceItem, fieldPath);
                if (value !== undefined) {
                    foundry.utils.setProperty(updateData, fieldPath, foundry.utils.deepClone(value));
                }
            }

            await actor.updateEmbeddedDocuments("Item", [updateData]);
            updateCount++;
        } catch (error) {
            console.error(`Z-Wolf Epic | Failed to update ${item.name} on ${actor.name}:`, error);
            errors.push(`${actor.name}: ${error.message}`);
        }
    }

    // Report results
    if (updateCount > 0) {
        ui.notifications.info(`Updated ${updateCount} cop${updateCount === 1 ? "y" : "ies"} of "${sourceItem.name}"`);
    }

    if (errors.length > 0) {
        ui.notifications.error(`Failed to update ${errors.length} items. Check console for details.`);
        console.error("Z-Wolf Epic | Push to Actors errors:", errors);
    }

    return updateCount;
}

/**
 * Add context menu option to world items for pushing to actors
 * Uses libWrapper to inject into the Items directory context menu
 * MUST be called during the "init" hook BEFORE the Items sidebar is rendered
 */
export function registerItemContextMenuOption() {
    if (typeof libWrapper !== "function") {
        console.error("Z-Wolf Epic | libWrapper not found - Push to Actors feature disabled");
        ui.notifications.warn("Z-Wolf Epic requires libWrapper module for full functionality");
        return;
    }

    console.log("Z-Wolf Epic | Registering item context menu with libWrapper");

    // Wrap the _getEntryContextOptions method for ItemDirectory
    libWrapper.register("zwolf-epic", "foundry.applications.sidebar.tabs.ItemDirectory.prototype._getEntryContextOptions", function(wrapped, ...args) {
        const options = wrapped(...args);

        // Add our custom option
        options.push({
            name: "Push to Actors",
            icon: '<i class="fas fa-sync"></i>',
            condition: li => {
                const item = game.items.get(li.dataset.entryId);
                if (!item || item.parent) return false;
                const copies = getEmbeddedCopies(item);
                return copies.length > 0;
            },
            callback: async li => {
                const item = game.items.get(li.dataset.entryId);
                if (item) {
                    await pushItemToActors(item);
                }
            }
        });

        return options;
    }, "WRAPPER");

    console.log("Z-Wolf Epic | Item context menu registered successfully");
}