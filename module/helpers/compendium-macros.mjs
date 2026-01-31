/**
 * Z-Wolf Epic Compendium Macros
 * Contains macro definitions and auto-population logic for the system compendium.
 *
 * VERSION HISTORY:
 * 1 - Initial release with 10 macros
 *
 * When adding new macros, increment MACROS_VERSION and add the new macro to ZWOLF_MACROS.
 * The system will automatically add missing macros without overwriting user customizations.
 */

/**
 * Current version of the macro set.
 * Increment this when adding new macros.
 */
export const MACROS_VERSION = 1;

/**
 * Macro definitions for the Z-Wolf Epic system.
 * Each macro has a unique `id` field used for tracking.
 */
export const ZWOLF_MACROS = [
    {
        id: "advance-encounter",
        name: "GM: Advance Encounter",
        img: "systems/zwolf-epic/assets/icons/macros/Advance-Turn.png",
        command: `/**
 * Z-Wolf Epic - Advance Combat Turn
 * Advances to the next turn in combat and announces the current combatant.
 */

// Only allow GM to use this macro
if (!game.user.isGM) {
    ui.notifications.warn("Only the GM can use this macro.");
    return;
}

const combat = game.combat;

// Check if there's an active combat
if (!combat) {
    ui.notifications.warn("No active combat!");
    return;
}

// Advance to next turn
await combat.nextTurn();

// Get current state after advancing
const currentRound = combat.round;
const currentTurn = combat.turn + 1; // +1 for human-readable (1-based)
const currentCombatant = combat.combatant;
const tokenName = currentCombatant?.token?.name || "(Unknown)";

// Create chat message
ChatMessage.create({
    content: \`<div style="text-align: center; padding: 8px; border: 2px solid var(--z-wolf-primary); border-radius: 4px; background: var(--z-wolf-surface);">
        <h3 style="margin: 0 0 4px 0; color: var(--z-wolf-primary);">Round \${currentRound}</h3>
        <p style="margin: 0 0 4px 0;"><strong>Turn:</strong> \${currentTurn}</p>
        <p style="margin: 0;"><strong>Acting:</strong> \${tokenName}</p>
    </div>\`,
    speaker: ChatMessage.getSpeaker()
});`
    },
    {
        id: "initiative-launch",
        name: "GM: Initiative Launch",
        img: "systems/zwolf-epic/assets/icons/macros/Initiate-Encounter.png",
        command: `/**
 * Z-Wolf Epic - Initiative Launch
 * Opens a dialog to select combatants and set individual boosts for initiative rolls.
 */

// Only allow GM to use this macro
if (!game.user.isGM) {
    ui.notifications.warn("Only the GM can use this macro.");
    return;
}

// Check for scene and tokens
if (!canvas.scene) {
    ui.notifications.warn("No active scene!");
    return;
}

// Get all PC and NPC tokens on the scene
const validTokens = canvas.tokens.placeables.filter(t => {
    if (!t.actor) return false;
    const actorType = t.actor.type;
    return actorType === "pc" || actorType === "npc";
});

if (validTokens.length === 0) {
    ui.notifications.warn("No PC or NPC tokens found on the scene.");
    return;
}

// Check if combat already exists
if (game.combat && !game.combat.started) {
    ui.notifications.info("Combat already exists. Adding to existing encounter.");
}

// Build dialog content
let content = \`
<form>
    <div class="form-group" style="margin-bottom: 10px;">
        <label style="font-weight: bold;">
            <input type="checkbox" id="select-all" checked />
            Select/Deselect All
        </label>
    </div>
    <hr/>
    <div class="token-list" style="max-height: 300px; overflow-y: auto;">
\`;

validTokens.forEach((token, index) => {
    const name = token.name || "Unknown";
    const tokenClass = token.actor?.type === "pc" ? "pc-token" : "npc-token";
    content += \`
        <div class="token-row \${tokenClass}" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 4px; border-radius: 4px; background: var(--z-wolf-surface, #f5f5f5);" data-token-id="\${token.id}">
            <input type="checkbox" class="token-select" data-token-id="\${token.id}" checked />
            <span style="flex: 1; font-weight: \${token.actor?.type === "pc" ? "bold" : "normal"};">\${name}</span>
            <div style="display: flex; align-items: center; gap: 4px;">
                <button type="button" class="boost-decr" data-token-id="\${token.id}" style="width: 24px; height: 24px; padding: 0;">-</button>
                <input type="number" class="boost-input" data-token-id="\${token.id}" value="0" style="width: 50px; text-align: center;" />
                <button type="button" class="boost-incr" data-token-id="\${token.id}" style="width: 24px; height: 24px; padding: 0;">+</button>
            </div>
        </div>
    \`;
});

content += \`
    </div>
</form>
\`;

// Create and show dialog
new foundry.applications.api.DialogV2({
    window: { title: "Initiative Launch" },
    content: content,
    buttons: [
        {
            action: "launch",
            icon: "fas fa-rocket",
            label: "Launch",
            default: true,
            callback: async (event, button, dialog) => {
                const form = dialog.querySelector("form");
                const selectedTokens = [];

                form.querySelectorAll(".token-select:checked").forEach(checkbox => {
                    const tokenId = checkbox.dataset.tokenId;
                    const boostInput = form.querySelector(\`.boost-input[data-token-id="\${tokenId}"]\`);
                    const netBoosts = parseInt(boostInput?.value) || 0;
                    selectedTokens.push({ tokenId, netBoosts });
                });

                if (selectedTokens.length === 0) {
                    ui.notifications.warn("No tokens selected!");
                    return;
                }

                // Create or get combat
                let combat = game.combat;
                if (!combat) {
                    combat = await Combat.create({ scene: canvas.scene.id });
                }

                // Add combatants and roll initiative
                for (const { tokenId, netBoosts } of selectedTokens) {
                    const token = canvas.tokens.get(tokenId);
                    if (!token) continue;

                    // Check if already in combat
                    let combatant = combat.combatants.find(c => c.tokenId === tokenId);

                    if (!combatant) {
                        const [newCombatant] = await combat.createEmbeddedDocuments("Combatant", [{
                            tokenId: tokenId,
                            actorId: token.actor?.id,
                            hidden: token.document.hidden
                        }]);
                        combatant = newCombatant;
                    }

                    if (combatant) {
                        // Roll initiative using the actor's agility
                        const actor = token.actor;
                        if (actor && window.ZWolfDice) {
                            const agility = actor.system.attributes?.agility;
                            const level = actor.system.level || 0;
                            let modifier = 0;

                            if (agility?.progression) {
                                const bonuses = {
                                    mediocre: Math.floor(0.6 * level - 0.3),
                                    moderate: Math.floor(0.8 * level),
                                    specialty: Math.floor(1 * level),
                                    awesome: Math.floor(1.2 * level + 0.8001)
                                };
                                modifier = bonuses[agility.progression] || 0;
                            }

                            // Perform initiative roll
                            const rollResult = await ZWolfDice.roll({
                                netBoosts,
                                modifier,
                                flavor: \`\${token.name} Initiative\`,
                                actor
                            });

                            // Use tiebreaker for initiative value
                            const tiebreaker = rollResult.finalResult + (modifier * 0.001);
                            await combatant.update({ initiative: tiebreaker });
                        } else {
                            // Fallback: standard roll
                            await combat.rollInitiative(combatant.id);
                        }
                    }
                }

                ui.notifications.info(\`Rolled initiative for \${selectedTokens.length} combatant(s).\`);
            }
        },
        {
            action: "cancel",
            icon: "fas fa-times",
            label: "Cancel"
        }
    ],
    render: (event, dialog) => {
        const form = dialog.querySelector("form");

        // Select All handler
        form.querySelector("#select-all")?.addEventListener("change", (e) => {
            const checked = e.target.checked;
            form.querySelectorAll(".token-select").forEach(cb => cb.checked = checked);
        });

        // Boost increment/decrement handlers
        form.querySelectorAll(".boost-incr").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const tokenId = btn.dataset.tokenId;
                const input = form.querySelector(\`.boost-input[data-token-id="\${tokenId}"]\`);
                input.value = parseInt(input.value) + 1;
            });
        });

        form.querySelectorAll(".boost-decr").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const tokenId = btn.dataset.tokenId;
                const input = form.querySelector(\`.boost-input[data-token-id="\${tokenId}"]\`);
                input.value = parseInt(input.value) - 1;
            });
        });
    }
}).render(true);`
    },
    {
        id: "default-threat",
        name: "Default Threat",
        img: "systems/zwolf-epic/assets/icons/macros/Mediocre-Check.png",
        command: `/**
 * Z-Wolf Epic - Default Threat Check
 * Rolls a check using Mediocre progression for the selected token.
 * Uses current Net Boosts from the Dice UI.
 */

// Verify Z-Wolf Epic dice system is available
if (!window.ZWolfDice) {
    ui.notifications.error("Z-Wolf Epic dice system not loaded!");
    return;
}

// Get selected tokens
const tokens = canvas.tokens.controlled;

// Validate selection
if (tokens.length === 0) {
    ui.notifications.warn("Please select a token first.");
    return;
}

if (tokens.length > 1) {
    ui.notifications.warn("Please select only one token.");
    return;
}

const token = tokens[0];
const actor = token.actor;

// Validate actor exists
if (!actor) {
    ui.notifications.error("Selected token has no associated actor.");
    return;
}

// Calculate mediocre progression modifier
const level = actor.system.level || 0;
const modifier = Math.floor(0.6 * level - 0.3);

// Get net boosts from dice UI
const netBoosts = ZWolfDice.getNetBoosts();

// Roll the check
await ZWolfDice.rollProgression(actor, "mediocre", modifier, netBoosts);`
    },
    {
        id: "apply-damage",
        name: "Apply Damage",
        img: "systems/zwolf-epic/assets/icons/macros/Apply-Damage.png",
        command: `/**
 * Z-Wolf Epic - Apply Damage
 * Applies damage to a selected token with damage type tracking.
 */

// Get selected tokens
const tokens = canvas.tokens.controlled;

// Validate selection
if (tokens.length === 0) {
    ui.notifications.warn("Please select a token first.");
    return;
}

if (tokens.length > 1) {
    ui.notifications.warn("Please select only one token.");
    return;
}

const token = tokens[0];
const actor = token.actor;

// Validate actor exists
if (!actor) {
    ui.notifications.error("Selected token has no associated actor.");
    return;
}

// Check if user has permission to modify the actor
if (!actor.isOwner) {
    ui.notifications.warn("You don't have permission to modify this actor.");
    return;
}

// Damage type configuration
const damageTypes = {
    bludgeoning: "Bludgeoning",
    piercing: "Piercing",
    slashing: "Slashing",
    fire: "Fire",
    cold: "Cold",
    lightning: "Lightning",
    corrosive: "Corrosive",
    force: "Force",
    psychic: "Psychic",
    radiant: "Radiant",
    necrotic: "Necrotic"
};

// Build damage type options
const damageTypeOptions = Object.entries(damageTypes)
    .map(([key, label]) => \`<option value="\${key}">\${label}</option>\`)
    .join("");

// Dialog content
const content = \`
<form>
    <div class="form-group">
        <label>Damage Amount:</label>
        <input type="number" id="damage-amount" value="1" min="0" step="1" autofocus />
    </div>
    <div class="form-group">
        <label>Damage Type:</label>
        <select id="damage-type">
            \${damageTypeOptions}
        </select>
    </div>
</form>
\`;

// Show dialog
new foundry.applications.api.DialogV2({
    window: { title: \`Apply Damage - \${token.name}\` },
    content: content,
    buttons: [
        {
            action: "apply",
            icon: "fas fa-heart-broken",
            label: "Apply",
            default: true,
            callback: async (event, button, dialog) => {
                const form = dialog.querySelector("form");
                const amount = parseInt(form.querySelector("#damage-amount").value);
                const damageType = form.querySelector("#damage-type").value;
                const damageLabel = damageTypes[damageType];

                if (amount < 1) {
                    ui.notifications.warn("Damage amount must be greater than zero.");
                    return;
                }

                // Get current vitality points
                const vp = actor.system.vitalityPoints;
                if (!vp) {
                    ui.notifications.error("Actor does not have vitality points.");
                    return;
                }

                const currentVP = vp.value;
                const newVP = Math.max(0, currentVP - amount);

                // Update actor
                await actor.update({
                    "system.vitalityPoints.value": newVP
                });

                // Determine chat message styling
                const isZero = newVP === 0;
                const damageStyle = isZero ? "color: #dc3545; font-weight: bold;" : "";

                // Create chat message
                await ChatMessage.create({
                    user: game.user.id,
                    speaker: ChatMessage.getSpeaker({ actor }),
                    content: \`
                        <div style="text-align: center; padding: 8px;">
                            <h3 style="margin: 0 0 4px 0; \${damageStyle}">\${token.name} takes \${amount} \${damageLabel} damage!</h3>
                            <p style="margin: 0 0 4px 0;">Vitality: \${currentVP} → \${newVP}</p>
                            \${isZero ? "<p style=\\"margin: 0; color: #dc3545; font-weight: bold;\\">⚠ Vitality Depleted!</p>" : ""}
                        </div>
                    \`,
                    type: CONST.CHAT_MESSAGE_TYPES.OTHER
                });

                ui.notifications.info(\`Applied \${amount} \${damageLabel} damage to \${token.name}.\`);
            }
        },
        {
            action: "cancel",
            icon: "fas fa-times",
            label: "Cancel"
        }
    ],
    render: (event, dialog) => {
        // Auto-focus the damage input
        setTimeout(() => {
            dialog.querySelector("#damage-amount")?.focus();
        }, 50);

        // Handle Enter key to submit
        dialog.querySelector("form")?.addEventListener("keypress", (e) => {
            if (e.which === 13) {
                e.preventDefault();
                dialog.querySelector("[data-action='apply']")?.click();
            }
        });
    }
}).render(true);`
    },
    {
        id: "fortitude-check",
        name: "Fortitude Check",
        img: "systems/zwolf-epic/assets/icons/macros/Fortitude-Check.png",
        command: `/**
 * Z-Wolf Epic - Fortitude Check
 * Rolls a Fortitude attribute check for the selected token.
 * Uses current Net Boosts from the Dice UI.
 */

// Verify Z-Wolf Epic dice system is available
if (!window.ZWolfDice) {
    ui.notifications.error("Z-Wolf Epic dice system not loaded!");
    return;
}

// Get selected tokens
const tokens = canvas.tokens.controlled;

// Validate selection
if (tokens.length === 0) {
    ui.notifications.warn("Please select a token first.");
    return;
}

if (tokens.length > 1) {
    ui.notifications.warn("Please select only one token.");
    return;
}

const token = tokens[0];
const actor = token.actor;

// Validate actor exists
if (!actor) {
    ui.notifications.error("Selected token has no associated actor.");
    return;
}

// Validate actor has the attribute
if (!actor.system.attributes?.fortitude) {
    ui.notifications.warn(\`\${actor.name} does not have a Fortitude attribute.\`);
    return;
}

// Get net boosts from dice UI
const netBoosts = ZWolfDice.getNetBoosts();

// Roll the attribute check
await ZWolfDice.rollAttribute(actor, "fortitude", netBoosts);`
    },
    {
        id: "willpower-check",
        name: "Willpower Check",
        img: "systems/zwolf-epic/assets/icons/macros/Willpower-Check.png",
        command: `/**
 * Z-Wolf Epic - Willpower Check
 * Rolls a Willpower attribute check for the selected token.
 * Uses current Net Boosts from the Dice UI.
 */

// Verify Z-Wolf Epic dice system is available
if (!window.ZWolfDice) {
    ui.notifications.error("Z-Wolf Epic dice system not loaded!");
    return;
}

// Get selected tokens
const tokens = canvas.tokens.controlled;

// Validate selection
if (tokens.length === 0) {
    ui.notifications.warn("Please select a token first.");
    return;
}

if (tokens.length > 1) {
    ui.notifications.warn("Please select only one token.");
    return;
}

const token = tokens[0];
const actor = token.actor;

// Validate actor exists
if (!actor) {
    ui.notifications.error("Selected token has no associated actor.");
    return;
}

// Validate actor has the attribute
if (!actor.system.attributes?.willpower) {
    ui.notifications.warn(\`\${actor.name} does not have a Willpower attribute.\`);
    return;
}

// Get net boosts from dice UI
const netBoosts = ZWolfDice.getNetBoosts();

// Roll the attribute check
await ZWolfDice.rollAttribute(actor, "willpower", netBoosts);`
    },
    {
        id: "agility-check",
        name: "Agility Check",
        img: "systems/zwolf-epic/assets/icons/macros/Agility-Check.png",
        command: `/**
 * Z-Wolf Epic - Agility Check
 * Rolls an Agility attribute check for the selected token.
 * Uses current Net Boosts from the Dice UI.
 */

// Verify Z-Wolf Epic dice system is available
if (!window.ZWolfDice) {
    ui.notifications.error("Z-Wolf Epic dice system not loaded!");
    return;
}

// Get selected tokens
const tokens = canvas.tokens.controlled;

// Validate selection
if (tokens.length === 0) {
    ui.notifications.warn("Please select a token first.");
    return;
}

if (tokens.length > 1) {
    ui.notifications.warn("Please select only one token.");
    return;
}

const token = tokens[0];
const actor = token.actor;

// Validate actor exists
if (!actor) {
    ui.notifications.error("Selected token has no associated actor.");
    return;
}

// Validate actor has the attribute
if (!actor.system.attributes?.agility) {
    ui.notifications.warn(\`\${actor.name} does not have an Agility attribute.\`);
    return;
}

// Get net boosts from dice UI
const netBoosts = ZWolfDice.getNetBoosts();

// Roll the attribute check
await ZWolfDice.rollAttribute(actor, "agility", netBoosts);`
    },
    {
        id: "perception-check",
        name: "Perception Check",
        img: "systems/zwolf-epic/assets/icons/macros/Perception-Check.png",
        command: `/**
 * Z-Wolf Epic - Perception Check
 * Rolls a Perception attribute check for the selected token.
 * Uses current Net Boosts from the Dice UI.
 */

// Verify Z-Wolf Epic dice system is available
if (!window.ZWolfDice) {
    ui.notifications.error("Z-Wolf Epic dice system not loaded!");
    return;
}

// Get selected tokens
const tokens = canvas.tokens.controlled;

// Validate selection
if (tokens.length === 0) {
    ui.notifications.warn("Please select a token first.");
    return;
}

if (tokens.length > 1) {
    ui.notifications.warn("Please select only one token.");
    return;
}

const token = tokens[0];
const actor = token.actor;

// Validate actor exists
if (!actor) {
    ui.notifications.error("Selected token has no associated actor.");
    return;
}

// Validate actor has the attribute
if (!actor.system.attributes?.perception) {
    ui.notifications.warn(\`\${actor.name} does not have a Perception attribute.\`);
    return;
}

// Get net boosts from dice UI
const netBoosts = ZWolfDice.getNetBoosts();

// Roll the attribute check
await ZWolfDice.rollAttribute(actor, "perception", netBoosts);`
    },
    {
        id: "speed-check",
        name: "Speed Check",
        img: "systems/zwolf-epic/assets/icons/macros/Speed-Check.png",
        command: `/**
 * Z-Wolf Epic - Speed Check
 * Rolls a Speed check for the selected token.
 * Uses current Net Boosts from the Dice UI.
 */

// Verify Z-Wolf Epic dice system is available
if (!window.ZWolfDice) {
    ui.notifications.error("Z-Wolf Epic dice system not loaded!");
    return;
}

// Get selected tokens
const tokens = canvas.tokens.controlled;

// Validate selection
if (tokens.length === 0) {
    ui.notifications.warn("Please select a token first.");
    return;
}

if (tokens.length > 1) {
    ui.notifications.warn("Please select only one token.");
    return;
}

const token = tokens[0];
const actor = token.actor;

// Validate actor exists
if (!actor) {
    ui.notifications.error("Selected token has no associated actor.");
    return;
}

// Get speed progression (may be null for base speed)
const speedProgression = actor.system.speed?.progression;

// Get net boosts from dice UI
const netBoosts = ZWolfDice.getNetBoosts();

// Roll the speed check
await ZWolfDice.rollSpeed(actor, speedProgression, netBoosts);`
    },
    {
        id: "log-activity",
        name: "GM: Log Activity",
        img: "systems/zwolf-epic/assets/icons/macros/Log-Activity.png",
        command: `/**
 * Z-Wolf Epic - Log Activity
 * Logs an activity use for the selected token.
 * Parses granted abilities from the actor's items.
 */

(async () => {
    // Get selected token
    if (!canvas.tokens.controlled.length) {
        ui.notifications.warn("Please select a token first.");
        return;
    }

    const selectedToken = canvas.tokens.controlled[0];
    const actor = selectedToken.actor;

    if (!actor) {
        ui.notifications.error("Selected token has no associated actor.");
        return;
    }

    // Activity types available
    const activityTypes = {
        dominant: "Dominant Action",
        swift: "Swift Action",
        reflex: "Reflex Action",
        free: "Free Action",
        passive: "Passive"
    };

    /**
     * Get all activities for the actor, organized by type.
     */
    function getActivitiesForActor(actor) {
        const activities = {
            dominant: [],
            swift: [],
            reflex: [],
            free: [],
            passive: []
        };

        // Go through all items on the actor
        for (const item of actor.items) {
            // Skip virtual items (eidolon base items)
            if (item.flags?.["zwolf-epic"]?.isVirtual && item.type === "ancestry") {
                continue;
            }

            // Process granted abilities
            const grantedAbilities = item.system.grantedAbilities;
            if (grantedAbilities) {
                Object.values(grantedAbilities).forEach(ability => {
                    const abilityType = ability.activityType?.toLowerCase();
                    if (abilityType && activities[abilityType]) {
                        activities[abilityType].push({
                            name: ability.name,
                            source: item.name,
                            description: ability.description || ""
                        });
                    }
                });
            }

            // For tracks, also check tier abilities
            if (item.type === "track") {
                const tiers = item.system.tiers;
                if (tiers) {
                    for (const [tierKey, tierData] of Object.entries(tiers)) {
                        const tierAbilities = tierData.grantedAbilities;
                        if (tierAbilities) {
                            Object.values(tierAbilities).forEach(ability => {
                                const abilityType = ability.activityType?.toLowerCase();
                                if (abilityType && activities[abilityType]) {
                                    activities[abilityType].push({
                                        name: ability.name,
                                        source: \`\${item.name} (\${tierKey.replace("tier", "Tier ")})\`,
                                        description: ability.description || ""
                                    });
                                }
                            });
                        }
                    }
                }
            }
        }

        return activities;
    }

    // Get activities for this actor
    const activities = getActivitiesForActor(actor);

    // Build dialog content
    const content = \`
        <form style="min-height: 250px;">
            <div class="form-group">
                <label><strong>Activity Type:</strong></label>
                <select id="activity-type" style="width: 100%; margin-top: 5px;">
                    <option value="">-- Select Type --</option>
                    \${Object.entries(activityTypes).map(([key, label]) =>
                        \`<option value="\${key}">\${label}</option>\`
                    ).join("")}
                </select>
            </div>
            <div class="form-group" id="activity-name-group" style="display: none; margin-top: 10px;">
                <label><strong>Activity:</strong></label>
                <select id="activity-name" style="width: 100%; margin-top: 5px;">
                </select>
            </div>
            <div id="activity-details" style="display: none; margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
                <h4 style="margin: 0 0 8px 0;">Details</h4>
                <div id="activity-source"></div>
                <div id="activity-description" style="margin-top: 8px;"></div>
            </div>
        </form>
    \`;

    // Show dialog
    new foundry.applications.api.DialogV2({
        window: { title: \`Log Activity - \${actor.name}\` },
        content: content,
        buttons: [
            {
                action: "execute",
                icon: "fas fa-dice",
                label: "Execute",
                default: true,
                callback: async (event, button, dialog) => {
                    const form = dialog.querySelector("form");
                    const activityType = form.querySelector("#activity-type").value;
                    const activitySelect = form.querySelector("#activity-name");
                    const selectedIndex = parseInt(activitySelect.value);

                    if (!activityType || isNaN(selectedIndex)) {
                        ui.notifications.warn("Please select an activity type and activity.");
                        return;
                    }

                    const typeActivities = activities[activityType] || [];
                    const activity = typeActivities[selectedIndex];

                    if (!activity) {
                        ui.notifications.error("Selected activity not found.");
                        return;
                    }

                    // Create chat message
                    await ChatMessage.create({
                        user: game.user.id,
                        speaker: ChatMessage.getSpeaker({ actor }),
                        content: \`
                            <h3>Action Logged</h3>
                            <p><strong>Character:</strong> \${actor.name}</p>
                            <p><strong>Type:</strong> \${activityTypes[activityType]}</p>
                            <p><strong>Activity:</strong> \${activity.name}</p>
                            \${activity.source ? \`<p style="border-left: 3px solid var(--z-wolf-primary, #2c5aa0); padding-left: 8px;"><em>Source: \${activity.source}</em></p>\` : ""}
                        \`,
                        type: CONST.CHAT_MESSAGE_TYPES.OTHER
                    });
                }
            },
            {
                action: "cancel",
                icon: "fas fa-times",
                label: "Cancel"
            }
        ],
        render: (event, dialog) => {
            const form = dialog.querySelector("form");
            const typeSelect = form.querySelector("#activity-type");
            const nameGroup = form.querySelector("#activity-name-group");
            const nameSelect = form.querySelector("#activity-name");
            const detailsDiv = form.querySelector("#activity-details");
            const sourceDiv = form.querySelector("#activity-source");
            const descDiv = form.querySelector("#activity-description");

            // Update activity list when type changes
            typeSelect.addEventListener("change", () => {
                const selectedType = typeSelect.value;
                const typeActivities = activities[selectedType] || [];

                // Clear existing options
                nameSelect.innerHTML = "";

                if (selectedType && typeActivities.length > 0) {
                    nameGroup.style.display = "block";
                    typeActivities.forEach((activity, index) => {
                        const option = document.createElement("option");
                        option.value = index;
                        option.textContent = activity.name;
                        nameSelect.appendChild(option);
                    });

                    // Trigger change to show first activity details
                    nameSelect.dispatchEvent(new Event("change"));
                } else {
                    nameGroup.style.display = "none";
                    detailsDiv.style.display = "none";

                    if (selectedType && typeActivities.length === 0) {
                        nameSelect.innerHTML = "<option>No activities of this type</option>";
                        nameGroup.style.display = "block";
                    }
                }
            });

            // Update details when activity changes
            nameSelect.addEventListener("change", () => {
                const selectedType = typeSelect.value;
                const selectedIndex = parseInt(nameSelect.value);
                const typeActivities = activities[selectedType] || [];
                const activity = typeActivities[selectedIndex];

                if (activity) {
                    sourceDiv.innerHTML = activity.source ? \`<em>Source: \${activity.source}</em>\` : "";
                    descDiv.innerHTML = activity.description || "<em>No description available.</em>";
                    detailsDiv.style.display = "block";
                } else {
                    detailsDiv.style.display = "none";
                }
            });
        },
        position: {
            width: 500,
            height: "auto"
        }
    }).render(true);
})();`
    }
];

/**
 * Register the setting for tracking macro compendium version.
 * Called during system init.
 */
export function registerMacroSettings() {
    game.settings.register("zwolf-epic", "macrosCompendiumVersion", {
        name: "Macros Compendium Version",
        hint: "Tracks which version of system macros have been added to the compendium.",
        scope: "world",
        config: false,
        type: Number,
        default: 0
    });
}

/**
 * Populate the macros compendium with system macros.
 * Uses version tracking to add only missing macros without overwriting user customizations.
 */
export async function populateMacrosCompendium() {
    // Only GM can populate compendiums
    if (!game.user.isGM) return;

    const packName = "zwolf-epic.macros";
    const pack = game.packs.get(packName);

    if (!pack) {
        console.warn("Z-Wolf Epic | Macros compendium not found:", packName);
        return;
    }

    // Get the current stored version
    const storedVersion = game.settings.get("zwolf-epic", "macrosCompendiumVersion");

    // If we're already at current version, check for any missing macros anyway
    // This handles the case where a macro was manually deleted
    console.log(`Z-Wolf Epic | Checking macros compendium (stored version: ${storedVersion}, current: ${MACROS_VERSION})`);

    // Load the full index to check existing macros
    await pack.getIndex();

    // Find macros that are missing from the compendium
    // We check by the systemMacroId flag, not by name (in case user renamed it)
    const existingMacroIds = new Set();
    for (const entry of pack.index) {
        // Get the full document to check flags
        const macro = await pack.getDocument(entry._id);
        const systemMacroId = macro?.flags?.["zwolf-epic"]?.systemMacroId;
        if (systemMacroId) {
            existingMacroIds.add(systemMacroId);
        }
    }

    // Determine which macros need to be added
    const macrosToAdd = ZWOLF_MACROS.filter(macro => !existingMacroIds.has(macro.id));

    if (macrosToAdd.length === 0) {
        console.log("Z-Wolf Epic | All system macros already present in compendium.");
        // Update version if needed
        if (storedVersion < MACROS_VERSION) {
            await game.settings.set("zwolf-epic", "macrosCompendiumVersion", MACROS_VERSION);
        }
        return;
    }

    console.log(`Z-Wolf Epic | Adding ${macrosToAdd.length} missing macro(s) to compendium...`);

    // Unlock the compendium for editing
    await pack.configure({ locked: false });

    try {
        // Create the missing macros
        const macroData = macrosToAdd.map(macro => ({
            name: macro.name,
            type: "script",
            img: macro.img,
            scope: "global",
            command: macro.command,
            flags: {
                "zwolf-epic": {
                    systemMacro: true,
                    systemMacroId: macro.id
                }
            }
        }));

        await Macro.createDocuments(macroData, { pack: packName });

        // Update the stored version
        await game.settings.set("zwolf-epic", "macrosCompendiumVersion", MACROS_VERSION);

        console.log(`Z-Wolf Epic | Added ${macrosToAdd.length} macro(s) to compendium.`);
        ui.notifications.info(`Z-Wolf Epic: ${macrosToAdd.length} new macro(s) added to compendium.`);

    } catch (error) {
        console.error("Z-Wolf Epic | Error populating macros compendium:", error);
    } finally {
        // Lock the compendium again
        await pack.configure({ locked: true });
    }
}
