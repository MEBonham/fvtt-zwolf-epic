/**
 * Migration Script: Track Side Effects to Flat Structure
 *
 * Converts track items from the old tierSideEffects structure to the new flat sideEffects structure.
 *
 * OLD STRUCTURE:
 * - system.tierSideEffects = array of 5 tier objects
 * - Each tier object has tier number and sideEffects array
 *
 * NEW STRUCTURE:
 * - system.sideEffects = flat array
 * - Each side effect has a tier property (1-5)
 *
 * Usage:
 * 1. Open the console in Foundry (F12)
 * 2. Copy and paste this entire script
 * 3. Press Enter to execute
 * 4. Review the migration report in the console
 */

(async function migrateTrackSideEffects() {
    console.log("=".repeat(80));
    console.log("MIGRATION: Track Side Effects to Flat Structure");
    console.log("=".repeat(80));

    // Find all track items
    const trackItems = game.items.filter(i => i.type === "track");

    console.log(`Found ${trackItems.length} track items to potentially migrate`);

    if (trackItems.length === 0) {
        console.log("No track items found. Migration complete.");
        return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const item of trackItems) {
        try {
            // Check if item has the old structure
            if (!item.system.tierSideEffects) {
                console.log(`  - "${item.name}": Already using new structure or has no side effects, skipping`);
                skippedCount++;
                continue;
            }

            // Collect all side effects from all tiers into a flat array
            const flatSideEffects = [];

            for (const tierData of item.system.tierSideEffects) {
                const tierNumber = tierData.tier;
                const tierEffects = tierData.sideEffects || [];

                // Add each effect with its tier property
                for (const effect of tierEffects) {
                    flatSideEffects.push({
                        ...effect,
                        tier: tierNumber,
                        id: effect.id || foundry.utils.randomID()
                    });
                }
            }

            console.log(`  - "${item.name}": Migrating ${flatSideEffects.length} side effects`);

            // Update the item with the new structure
            await item.update({
                "system.sideEffects": flatSideEffects,
                "system.-=tierSideEffects": null  // Remove the old property
            });

            migratedCount++;

        } catch (error) {
            console.error(`  - "${item.name}": ERROR - ${error.message}`);
            errors.push({ item: item.name, error: error.message });
        }
    }

    console.log("=".repeat(80));
    console.log("MIGRATION COMPLETE");
    console.log(`  - Migrated: ${migratedCount} items`);
    console.log(`  - Skipped: ${skippedCount} items`);
    console.log(`  - Errors: ${errors.length}`);

    if (errors.length > 0) {
        console.log("\nERROR DETAILS:");
        errors.forEach(e => {
            console.log(`  - ${e.item}: ${e.error}`);
        });
    }

    console.log("=".repeat(80));

    ui.notifications.info(`Track side effects migration complete: ${migratedCount} items migrated, ${skippedCount} skipped, ${errors.length} errors`);

})();