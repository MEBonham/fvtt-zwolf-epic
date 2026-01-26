/**
 * Migration Script: Side Effects Array Refactor
 *
 * This script migrates all items from the old side effects object structure
 * to the new dynamic array-based structure. Also merges characterTags into
 * side effects.
 *
 * BEFORE RUNNING:
 * 1. Backup your world data
 * 2. Close all item sheets
 * 3. Test on a copy of your world first
 *
 * TO RUN:
 * 1. Open Foundry VTT
 * 2. Open the console (F12)
 * 3. Copy and paste this entire script
 * 4. Execute by pressing Enter
 */

async function migrateSideEffectsToArray() {
    console.log("=== STARTING SIDE EFFECTS MIGRATION ===");

    // Close all item sheets
    Object.values(ui.windows).forEach(app => {
        if (app instanceof ItemSheet) {
            app.close();
        }
    });

    console.log("Closed all item sheets");

    /**
     * Convert old sideEffects object to new array format
     * @param {Object} oldEffects - The old sideEffects object
     * @param {String} characterTags - Optional character tags string to include
     * @returns {Array} - New array of side effects
     */
    function convertSideEffectsToArray(oldEffects, characterTags = "") {
        const newEffects = [];

        // Add character tags if present
        if (characterTags && characterTags.trim()) {
            newEffects.push({
                id: foundry.utils.randomID(),
                type: "characterTag",
                value: characterTags.trim()
            });
        }

        // If oldEffects is already an array (already migrated), return it
        if (Array.isArray(oldEffects)) {
            return oldEffects;
        }

        // If oldEffects doesn't exist or is not an object, return empty array
        if (!oldEffects || typeof oldEffects !== "object") {
            return newEffects;
        }

        // Convert proficiency
        if (oldEffects.grantedProficiency && oldEffects.grantedProficiency.trim()) {
            newEffects.push({
                id: foundry.utils.randomID(),
                type: "proficiency",
                value: oldEffects.grantedProficiency
            });
        }

        // Convert progressions
        if (oldEffects.speedProgression && oldEffects.speedProgression.trim()) {
            newEffects.push({
                id: foundry.utils.randomID(),
                type: "speedProgression",
                value: oldEffects.speedProgression
            });
        }

        if (oldEffects.toughnessTNProgression && oldEffects.toughnessTNProgression.trim()) {
            newEffects.push({
                id: foundry.utils.randomID(),
                type: "toughnessTNProgression",
                value: oldEffects.toughnessTNProgression
            });
        }

        if (oldEffects.destinyTNProgression && oldEffects.destinyTNProgression.trim()) {
            newEffects.push({
                id: foundry.utils.randomID(),
                type: "destinyTNProgression",
                value: oldEffects.destinyTNProgression
            });
        }

        // Convert vision radii
        if (oldEffects.nightsightRadius != null && oldEffects.nightsightRadius !== "") {
            newEffects.push({
                id: foundry.utils.randomID(),
                type: "nightsightRadius",
                value: Number(oldEffects.nightsightRadius)
            });
        }

        if (oldEffects.darkvisionRadius != null && oldEffects.darkvisionRadius !== "") {
            newEffects.push({
                id: foundry.utils.randomID(),
                type: "darkvisionRadius",
                value: Number(oldEffects.darkvisionRadius)
            });
        }

        // Convert bulk boost
        if (oldEffects.maxBulkBoost && oldEffects.maxBulkBoost !== 0) {
            newEffects.push({
                id: foundry.utils.randomID(),
                type: "bulkCapacityBoost",
                value: Number(oldEffects.maxBulkBoost)
            });
        }

        // Convert size steps
        if (oldEffects.sizeSteps && oldEffects.sizeSteps !== 0) {
            newEffects.push({
                id: foundry.utils.randomID(),
                type: "sizeModifier",
                value: Number(oldEffects.sizeSteps)
            });
        }

        // Convert resistances (array to individual entries)
        if (Array.isArray(oldEffects.resistances)) {
            oldEffects.resistances.forEach(resistance => {
                if (resistance && resistance.trim()) {
                    newEffects.push({
                        id: foundry.utils.randomID(),
                        type: "resistance",
                        value: resistance
                    });
                }
            });
        }

        // Convert vulnerabilities (array to individual entries)
        if (Array.isArray(oldEffects.vulnerabilities)) {
            oldEffects.vulnerabilities.forEach(vulnerability => {
                if (vulnerability && vulnerability.trim()) {
                    newEffects.push({
                        id: foundry.utils.randomID(),
                        type: "vulnerability",
                        value: vulnerability
                    });
                }
            });
        }

        return newEffects;
    }

    // Step 1: Migrate non-track items with sideEffects
    const itemsWithSideEffects = game.items.filter(i =>
        i.type !== "track" && (i.system.sideEffects || i.system.characterTags)
    );

    console.log(`\nFound ${itemsWithSideEffects.length} non-track items to migrate`);

    for (const item of itemsWithSideEffects) {
        console.log(`\nMigrating item: ${item.name} (${item.type})`);
        const updates = {};

        // Convert side effects and character tags
        const newSideEffects = convertSideEffectsToArray(
            item.system.sideEffects,
            item.system.characterTags || ""
        );

        updates["system.sideEffects"] = newSideEffects;
        console.log(`  - Converted to ${newSideEffects.length} side effects`);

        // Remove characterTags field if it exists
        if (item.system.characterTags !== undefined) {
            updates["system.-=characterTags"] = null;
            console.log(`  - Removed characterTags field`);
        }

        // Perform the update
        try {
            await item.update(updates);
            console.log(`✓ Successfully migrated: ${item.name}`);
        } catch (error) {
            console.error(`✗ Failed to migrate ${item.name}:`, error);
        }
    }

    // Step 2: Migrate track items
    const trackItems = game.items.filter(i => i.type === "track");
    console.log(`\nFound ${trackItems.length} track items to migrate`);

    for (const item of trackItems) {
        console.log(`\nMigrating track item: ${item.name}`);
        const updates = {};

        // Migrate tierSideEffects
        if (item.system.tierSideEffects && Array.isArray(item.system.tierSideEffects)) {
            const newTierSideEffects = item.system.tierSideEffects.map((tierEffect, index) => {
                const tierNumber = tierEffect.tier || (index + 1);

                // Get character tags from the tier if they exist
                const tierKey = `tier${tierNumber}`;
                const tierCharacterTags = item.system.tiers?.[tierKey]?.characterTags || "";

                return {
                    tier: tierNumber,
                    sideEffects: convertSideEffectsToArray(tierEffect, tierCharacterTags)
                };
            });

            updates["system.tierSideEffects"] = newTierSideEffects;
            console.log(`  - Converted tierSideEffects for all 5 tiers`);
        }

        // Remove characterTags from each tier
        for (let tier = 1; tier <= 5; tier++) {
            const tierKey = `tier${tier}`;
            if (item.system.tiers?.[tierKey]?.characterTags !== undefined) {
                updates[`system.tiers.${tierKey}.-=characterTags`] = null;
            }
        }
        console.log(`  - Removed characterTags from all tier objects`);

        // Perform the update
        try {
            await item.update(updates);
            console.log(`✓ Successfully migrated: ${item.name}`);
        } catch (error) {
            console.error(`✗ Failed to migrate ${item.name}:`, error);
        }
    }

    console.log("\n=== MIGRATION COMPLETE ===");
    console.log("Side effects have been converted to the new array format.");
    console.log("Character tags have been merged into side effects.");
    ui.notifications.info("Side effects migration complete! Check console for details.");
}

// Run the migration
migrateSideEffectsToArray();