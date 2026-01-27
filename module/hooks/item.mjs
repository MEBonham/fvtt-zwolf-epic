/**
 * Item-related hooks for Z-Wolf Epic
 * Tracks source Item IDs for "Push to Actors" functionality
 */

export function registerItemHooks() {
    Hooks.on("createItem", async (item, options, userId) => {
        await trackSourceItem(item, userId);
    });
}

/**
 * Track source Item ID when items are added to Actors
 * This enables the "Push to Actors" functionality
 * @param {Item} item - The created item
 * @param {string} userId - The user who created the item
 */
async function trackSourceItem(item, userId) {
    // Only track items on actors
    if (!item.parent || item.parent.documentName !== "Actor") return;

    // Don't overwrite existing source tracking
    if (item.getFlag("zwolf-epic", "sourceId")) return;

    // Only track for the user who created it
    if (game.user.id !== userId) return;

    // Find matching world item
    const worldItem = game.items.find(i =>
        i.name === item.name &&
        i.type === item.type &&
        !i.parent
    );

    if (worldItem) {
        console.log(`Z-Wolf Epic | Linking ${item.name} to source item ${worldItem.id}`);

        // Use setTimeout to avoid timing issues
        setTimeout(async () => {
            try {
                await item.setFlag("zwolf-epic", "sourceId", worldItem.id);
                console.log(`Z-Wolf Epic | Flag set successfully for ${item.name}`);
            } catch (error) {
                console.error(`Z-Wolf Epic | Failed to set sourceId flag:`, error);
            }
        }, 0);
    }
}