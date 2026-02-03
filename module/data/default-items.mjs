/**
 * Default virtual items that all actors have access to.
 * These are not stored in the database but appear in the UI.
 * @module data/default-items
 */

/**
 * Virtual Slam Strike item data.
 * Provides a basic unarmed attack to all actors.
 */
export const SLAM_STRIKE = {
    _id: "ZWVirtualSlam000",
    name: "Slam",
    type: "universal",
    img: "icons/skills/melee/unarmed-punch-fist.webp",
    system: {
        description: "",
        grantedAbilities: {
            slamStrike: {
                name: "Slam",
                type: "strike",
                tags: "Attack",
                description: "<p>&lt;Unarmed&gt; weapon; range Melee 0m; Damage Type Bludgeoning.</p>"
            }
        },
        sideEffects: []
    },
    flags: {
        "zwolf-epic": {
            isVirtual: true,
            locked: true
        }
    }
};

/**
 * Get virtual items for granted abilities display.
 * Returns item-like objects that can be processed by _gatherGrantedAbilities().
 * @returns {Array<Object>} Array of virtual item objects
 */
export function getVirtualItems() {
    return [
        {
            id: SLAM_STRIKE._id,
            name: SLAM_STRIKE.name,
            type: SLAM_STRIKE.type,
            system: SLAM_STRIKE.system,
            flags: SLAM_STRIKE.flags
        }
    ];
}
