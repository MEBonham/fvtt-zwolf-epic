/**
 * Combat Tracker enhancement hooks for Z-Wolf Epic
 * Adds custom initiative rolling with boosts/jinxes and flexible attribute/skill selection
 */

import { ZWolfDice } from "../dice/dice-system.mjs";
import { calculateProgressionBonuses } from "../helpers/calculation-utils.mjs";

export function registerCombatHooks() {
    Hooks.on("renderCombatTracker", (app, html, data) => {
        addInitiativeBoostButton(html);
    });
}

/**
 * Add initiative boost button to combat tracker
 * @param {HTMLElement|jQuery} html - The combat tracker HTML
 */
function addInitiativeBoostButton(html) {
    const hudElement = html instanceof HTMLElement ? html : html[0];
    const header = hudElement.querySelector(".combat-tracker-header");

    // Only add if header exists and button not already added
    if (header && !header.querySelector(".zwolf-initiative-boost")) {
        const boostButton = createInitiativeButton();
        const controlsElement = header.querySelector(".combat-controls");
        if (controlsElement) {
            controlsElement.prepend(boostButton);
            attachInitiativeButtonHandler(boostButton);
        }
    }
}

/**
 * Create the initiative boost button element
 * @returns {HTMLElement} The button element
 */
function createInitiativeButton() {
    const button = document.createElement("a");
    button.className = "combat-control zwolf-initiative-boost";
    button.title = game.i18n.localize("ZWOLF.RollInitiativeWithBoosts");

    const icon = document.createElement("i");
    icon.className = "fas fa-dice-d12";
    button.appendChild(icon);

    return button;
}

/**
 * Attach click handler to initiative button
 * @param {HTMLElement} button - The button element
 */
function attachInitiativeButtonHandler(button) {
    button.addEventListener("click", async (event) => {
        event.preventDefault();
        await handleInitiativeRoll();
    });
}

/**
 * Handle the initiative roll for selected tokens
 */
async function handleInitiativeRoll() {
    const combat = game.combat;
    if (!combat) {
        return ui.notifications.warn(game.i18n.localize("ZWOLF.NoActiveCombat"));
    }

    const controlled = canvas.tokens.controlled;
    if (!controlled.length) {
        return ui.notifications.warn(game.i18n.localize("ZWOLF.NoTokensSelected"));
    }

    const netBoosts = ZWolfDice.getNetBoosts();

    // Show dialog to select attribute/skill for initiative
    const rollConfig = await showInitiativeDialog(controlled[0].actor);
    if (!rollConfig) return; // User cancelled

    for (const token of controlled) {
        await rollInitiativeForToken(token, combat, netBoosts, rollConfig);
    }
}

/**
 * Show dialog to select attribute or skill for initiative
 * @param {Actor} actor - The actor to get attributes/skills from
 * @returns {Promise<Object|null>} Configuration object or null if cancelled
 */
async function showInitiativeDialog(actor) {
    return new Promise((resolve) => {
        const attributes = CONFIG.ZWOLF?.attributes || {};
        const skills = CONFIG.ZWOLF?.skills || {};

        // Build attribute options
        let attributeOptions = "";
        for (const [key, label] of Object.entries(attributes)) {
            const selected = key === "agility" ? "selected" : "";
            const displayLabel = game.i18n.localize(label);
            attributeOptions += `<option value="attribute:${key}" ${selected}>${displayLabel}</option>`;
        }

        // Build skill options
        let skillOptions = "";
        for (const [key, skillData] of Object.entries(skills)) {
            const displayLabel = game.i18n.localize(skillData.label);
            skillOptions += `<option value="skill:${key}">${displayLabel}</option>`;
        }

        const content = `
            <form>
                <div class="form-group">
                    <label>${game.i18n.localize("ZWOLF.RollInitiativeUsing")}</label>
                    <select id="init-selection" name="selection">
                        <optgroup label="${game.i18n.localize("ZWOLF.Attributes")}">
                            ${attributeOptions}
                        </optgroup>
                        <optgroup label="${game.i18n.localize("ZWOLF.Skills")}">
                            ${skillOptions}
                        </optgroup>
                    </select>
                </div>
            </form>
        `;

        new Dialog({
            title: game.i18n.localize("ZWOLF.RollInitiative"),
            content: content,
            buttons: {
                roll: {
                    icon: "<i class=\"fas fa-dice-d12\"></i>",
                    label: game.i18n.localize("ZWOLF.Roll"),
                    callback: (html) => {
                        const selection = html.find("#init-selection").val();
                        const [type, key] = selection.split(":");
                        resolve({ type, key });
                    }
                },
                cancel: {
                    icon: "<i class=\"fas fa-times\"></i>",
                    label: game.i18n.localize("Cancel"),
                    callback: () => resolve(null)
                }
            },
            default: "roll"
        }).render(true);
    });
}

/**
 * Roll initiative for a specific token
 * @param {Token} token - The token to roll for
 * @param {Combat} combat - The active combat
 * @param {number} netBoosts - Current net boosts/jinxes
 * @param {Object} rollConfig - Configuration for what to roll (type and key)
 */
async function rollInitiativeForToken(token, combat, netBoosts, rollConfig) {
    const combatant = combat.combatants.find(c => c.tokenId === token.id);
    if (!combatant) return;

    const { modifier, flavorText } = getInitiativeModifier(token.actor, rollConfig);

    // Apply 1.001 multiplier for tiebreaking
    const tiebreakerModifier = modifier * 1.001;

    const rollResult = await ZWolfDice.roll({
        netBoosts: netBoosts,
        modifier: tiebreakerModifier,
        flavor: generateInitiativeFlavor(netBoosts, combatant.name, flavorText),
        actor: token.actor
    });

    await combat.updateEmbeddedDocuments("Combatant", [{
        _id: combatant.id,
        initiative: rollResult.finalResult
    }]);
}

/**
 * Get the modifier value and flavor text for initiative based on selection
 * @param {Actor} actor - The actor rolling initiative
 * @param {Object} rollConfig - Configuration object with type and key
 * @returns {Object} Object with modifier and flavorText
 */
function getInitiativeModifier(actor, rollConfig) {
    const { type, key } = rollConfig;

    if (type === "attribute") {
        const attribute = actor.system.attributes?.[key];
        if (!attribute) {
            console.warn(`Z-Wolf Epic | Attribute ${key} not found, using Agility`);
            return getDefaultInitiativeModifier(actor);
        }

        const modifier = getProgressionBonus(actor, attribute.progression);
        const attributeLabel = game.i18n.localize(CONFIG.ZWOLF.attributes[key]);
        return {
            modifier,
            flavorText: attributeLabel
        };
    }
    else if (type === "skill") {
        const skill = actor.system.skills?.[key];
        if (!skill) {
            console.warn(`Z-Wolf Epic | Skill ${key} not found, using Agility`);
            return getDefaultInitiativeModifier(actor);
        }

        const modifier = getProgressionBonus(actor, skill.progression);
        const skillLabel = game.i18n.localize(CONFIG.ZWOLF.skills[key].label);
        return {
            modifier,
            flavorText: skillLabel
        };
    }

    // Fallback to default
    return getDefaultInitiativeModifier(actor);
}

/**
 * Get default initiative modifier (Agility)
 * @param {Actor} actor - The actor
 * @returns {Object} Object with modifier and flavorText
 */
function getDefaultInitiativeModifier(actor) {
    const agility = actor.system.attributes?.agility;
    const modifier = agility ? getProgressionBonus(actor, agility.progression) : 0;
    const agilityLabel = game.i18n.localize(CONFIG.ZWOLF.attributes.agility);
    return {
        modifier,
        flavorText: agilityLabel
    };
}

/**
 * Calculate progression bonus for actor
 * @param {Actor} actor - The actor
 * @param {string} progression - The progression level
 * @returns {number} The calculated bonus
 */
function getProgressionBonus(actor, progression) {
    const level = actor.system.level || 0;
    const progressionOnlyLevel = getProgressionOnlyLevel(actor);
    const bonuses = calculateProgressionBonuses(level, progressionOnlyLevel);

    return bonuses[progression] || 0;
}

/**
 * Get progression-only level from Progression Enhancement item
 * @param {Actor} actor - The actor
 * @returns {number} Additional progression level
 */
function getProgressionOnlyLevel(actor) {
    if (actor.items) {
        const hasProgressionItem = actor.items.some(item =>
            item.name === "Progression Enhancement"
        );
        return hasProgressionItem ? 1 : 0;
    }
    return 0;
}

/**
 * Generate flavor text for initiative roll
 * @param {number} netBoosts - Net boosts/jinxes
 * @param {string} name - Combatant name
 * @param {string} attributeOrSkill - Name of attribute or skill being used
 * @returns {string} Flavor text
 */
function generateInitiativeFlavor(netBoosts, name, attributeOrSkill) {
    let boostText = game.i18n.localize("ZWOLF.NoBoosts");
    if (netBoosts > 0) {
        boostText = game.i18n.format("ZWOLF.BoostCount", { count: netBoosts });
    } else if (netBoosts < 0) {
        boostText = game.i18n.format("ZWOLF.JinxCount", { count: Math.abs(netBoosts) });
    }

    return game.i18n.format("ZWOLF.InitiativeFlavor", {
        stat: attributeOrSkill,
        boosts: boostText,
        name: name
    });
}