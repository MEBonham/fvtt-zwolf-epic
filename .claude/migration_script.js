/**
 * Migration Script: Track Item Refactor
 *
 * This script migrates track items from the old nested structure to the new flat structure.
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

async function migrateTrackItemsRefactor() {
    console.log("=== STARTING TRACK ITEM MIGRATION ===");

    // Close all item sheets
    Object.values(ui.windows).forEach(app => {
        if (app instanceof ItemSheet) {
            app.close();
        }
    });

    console.log("Closed all item sheets");

    // Step 1: Migrate track items
    const trackItems = game.items.filter(i => i.type === "track");
    console.log(`Found ${trackItems.length} track items to migrate`);

    for (const item of trackItems) {
        console.log(`\nMigrating track item: ${item.name}`);
        const updates = {};

        // 1. Migrate abilities from tiers to top level
        const newAbilities = {};
        let abilitiesCount = 0;

        for (let tier = 1; tier <= 5; tier++) {
            const tierKey = `tier${tier}`;
            const tierAbilities = item.system.tiers?.[tierKey]?.grantedAbilities || {};

            Object.entries(tierAbilities).forEach(([id, ability]) => {
                newAbilities[id] = {
                    ...ability,
                    tier: tier
                };
                abilitiesCount++;
            });
        }

        updates["system.grantedAbilities"] = newAbilities;
        console.log(`  - Migrated ${abilitiesCount} abilities to top level`);

        // 2. Migrate side effects to tierSideEffects array
        const tierSideEffects = [];

        for (let tier = 1; tier <= 5; tier++) {
            const tierKey = `tier${tier}`;
            const tierEffects = item.system.tiers?.[tierKey]?.sideEffects || {};

            tierSideEffects.push({
                tier: tier,
                speedProgression: tierEffects.speedProgression || "",
                toughnessTNProgression: tierEffects.toughnessTNProgression || "",
                destinyTNProgression: tierEffects.destinyTNProgression || "",
                nightsightRadius: tierEffects.nightsightRadius || null,
                darkvisionRadius: tierEffects.darkvisionRadius || null,
                sizeSteps: tierEffects.sizeSteps || 0,
                maxBulkBoost: tierEffects.maxBulkBoost || 0,
                knacksProvided: tierEffects.knacksProvided || 0,
                grantedProficiency: tierEffects.grantedProficiency || "",
                resistances: tierEffects.resistances || [],
                vulnerabilities: tierEffects.vulnerabilities || []
            });
        }

        updates["system.tierSideEffects"] = tierSideEffects;
        console.log(`  - Created tierSideEffects array with 5 tiers`);

        // 3. Clean up tiers - keep only talentMenu and characterTags
        for (let tier = 1; tier <= 5; tier++) {
            const tierKey = `tier${tier}`;
            updates[`system.tiers.${tierKey}`] = {
                talentMenu: item.system.tiers?.[tierKey]?.talentMenu || "",
                characterTags: item.system.tiers?.[tierKey]?.characterTags || ""
            };
        }

        console.log(`  - Cleaned up tier objects (kept only talentMenu and characterTags)`);

        // 4. Remove old sideEffects if present at top level
        if (item.system.sideEffects) {
            updates["system.-=sideEffects"] = null;
            console.log(`  - Removed top-level sideEffects`);
        }

        // Perform the update
        try {
            await item.update(updates);
            console.log(`✓ Successfully migrated: ${item.name}`);
        } catch (error) {
            console.error(`✗ Failed to migrate ${item.name}:`, error);
        }
    }

    // Step 2: Update all non-track items to have tier: 0 on abilities
    const nonTrackItems = game.items.filter(i =>
        i.type !== "track" && i.system.grantedAbilities
    );

    console.log(`\nFound ${nonTrackItems.length} non-track items with abilities`);

    for (const item of nonTrackItems) {
        const abilities = item.system.grantedAbilities || {};
        const updatedAbilities = {};
        let needsUpdate = false;

        Object.entries(abilities).forEach(([id, ability]) => {
            if (ability.tier === undefined) {
                needsUpdate = true;
                updatedAbilities[id] = {
                    ...ability,
                    tier: 0
                };
            } else {
                updatedAbilities[id] = ability;
            }
        });

        if (needsUpdate) {
            try {
                await item.update({
                    "system.grantedAbilities": updatedAbilities
                });
                console.log(`✓ Updated abilities for: ${item.name}`);
            } catch (error) {
                console.error(`✗ Failed to update ${item.name}:`, error);
            }
        }
    }

    console.log("\n=== MIGRATION COMPLETE ===");
    ui.notifications.info("Track item migration complete! Check console for details.");
}

// Run the migration
migrateTrackItemsRefactor();