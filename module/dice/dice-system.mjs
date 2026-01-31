/**
 * Z-Wolf Epic Dice System
 *
 * Core rolling mechanics, chat integration, and Foundry hooks for the
 * Z-Wolf Epic 3d12 + modifier dice system with boosts/jinxes.
 */

import { ZWolfDiceUI } from "./dice-ui.mjs";
import { ZWOLF_DICE_CONSTANTS } from "./dice-constants.mjs";

// ========================================
// PUBLIC API
// ========================================

export class ZWolfDice {
    /**
     * Perform a Z-Wolf Epic roll with full chat message creation
     * @param {Object} options - Roll options
     * @param {number} [options.netBoosts] - Net boosts/jinxes (fetched from UI if not provided)
     * @param {number} [options.modifier=0] - Modifier to add to roll
     * @param {number} [options.targetNumber] - Optional target number to check against
     * @param {string} [options.flavor] - Flavor text for the roll
     * @param {Actor} [options.actor] - Actor making the roll
     * @returns {Promise<Object>} The completed roll with details
     */
    static async roll(options = {}) {
        try {
            // Get net boosts from UI if not provided
            if (options.netBoosts === null || options.netBoosts === undefined) {
                options.netBoosts = ZWolfDiceUI.getNetBoosts();
            }

            // Perform the core roll
            const rollResult = await performRoll(options);

            // Create chat message
            await createChatMessage(rollResult);

            // Auto-reset boosts if enabled
            if (getSetting(ZWOLF_DICE_CONSTANTS.SETTINGS.AUTO_RESET_BOOSTS, true)) {
                ZWolfDiceUI.setNetBoosts(0);
            }

            return rollResult;

        } catch (error) {
            console.error("Z-Wolf Epic | Error in roll:", error);
            throw error;
        }
    }

    /**
     * Roll for a skill
     * @param {Actor} actor - The actor making the roll
     * @param {string} skillName - Name of the skill
     * @param {number} [netBoosts] - Net boosts/jinxes (optional)
     * @returns {Promise<Object>} The completed roll
     */
    static async rollSkill(actor, skillName, netBoosts = null) {
        if (!actor) {
            ui.notifications.warn(game.i18n.localize("ZWOLF_DICE.NoActor"));
            return null;
        }

        // Get net boosts from UI if not provided
        if (netBoosts === null || netBoosts === undefined) {
            netBoosts = ZWolfDiceUI.getNetBoosts();
        }

        const skill = actor.system.skills?.[skillName];

        if (!skill || !skill.progression) {
            ui.notifications.warn(game.i18n.localize("ZWOLF_DICE.InvalidSkillAttribute"));
            return null;
        }

        const modifier = calculateProgressionBonus(actor, skill.progression);
        const skillDisplayName = game.i18n.localize(`ZWOLF.Skill${capitalize(skillName)}`) || capitalize(skillName);
        const progressionDisplayName = game.i18n.localize(`ZWOLF.${capitalize(skill.progression)}`) || capitalize(skill.progression);
        const flavor = `${skillDisplayName} (${progressionDisplayName})`;

        const rollResult = await performRoll({ netBoosts, modifier, flavor, actor });
        if (rollResult) {
            await createChatMessage(rollResult);
            if (getSetting(ZWOLF_DICE_CONSTANTS.SETTINGS.AUTO_RESET_BOOSTS, true)) {
                ZWolfDiceUI.setNetBoosts(0);
            }
        }

        return rollResult;
    }

    /**
     * Roll for an attribute
     * @param {Actor} actor - The actor making the roll
     * @param {string} attributeName - Name of the attribute
     * @param {number} [netBoosts] - Net boosts/jinxes (optional)
     * @returns {Promise<Object>} The completed roll
     */
    static async rollAttribute(actor, attributeName, netBoosts = null) {
        if (!actor) {
            ui.notifications.warn(game.i18n.localize("ZWOLF_DICE.NoActor"));
            return null;
        }

        // Get net boosts from UI if not provided
        if (netBoosts === null || netBoosts === undefined) {
            netBoosts = ZWolfDiceUI.getNetBoosts();
        }

        const attribute = actor.system.attributes?.[attributeName];

        if (!attribute || !attribute.progression) {
            ui.notifications.warn(game.i18n.localize("ZWOLF_DICE.InvalidAttribute"));
            return null;
        }

        const modifier = calculateProgressionBonus(actor, attribute.progression);
        const attributeDisplayName = game.i18n.localize(`ZWOLF.Attribute${capitalize(attributeName)}`) || capitalize(attributeName);
        const progressionDisplayName = game.i18n.localize(`ZWOLF.${capitalize(attribute.progression)}`) || capitalize(attribute.progression);
        const flavor = `${attributeDisplayName} (${progressionDisplayName})`;

        const rollResult = await performRoll({ netBoosts, modifier, flavor, actor });
        if (rollResult) {
            await createChatMessage(rollResult);
            if (getSetting(ZWOLF_DICE_CONSTANTS.SETTINGS.AUTO_RESET_BOOSTS, true)) {
                ZWolfDiceUI.setNetBoosts(0);
            }
        }

        return rollResult;
    }

    /**
     * Roll for speed
     * @param {Actor} actor - The actor making the roll
     * @param {string} speedProgression - The speed progression level
     * @param {number} [netBoosts] - Net boosts/jinxes (optional)
     * @returns {Promise<Object>} The completed roll
     */
    static async rollSpeed(actor, speedProgression, netBoosts = null) {
        if (!actor) {
            ui.notifications.warn(game.i18n.localize("ZWOLF_DICE.NoActor"));
            return null;
        }

        // Get net boosts from UI if not provided
        if (netBoosts === null || netBoosts === undefined) {
            netBoosts = ZWolfDiceUI.getNetBoosts();
        }

        // If no speed progression, use +0 modifier
        const modifier = speedProgression ? calculateProgressionBonus(actor, speedProgression) : 0;
        const flavor = game.i18n.localize("ZWOLF.SpeedCheck");

        const rollResult = await performRoll({ netBoosts, modifier, flavor, actor });
        if (rollResult) {
            await createChatMessage(rollResult);
            if (getSetting(ZWOLF_DICE_CONSTANTS.SETTINGS.AUTO_RESET_BOOSTS, true)) {
                ZWolfDiceUI.setNetBoosts(0);
            }
        }

        return rollResult;
    }

    /**
     * Roll for a progression tier (all stats at that tier)
     * @param {Actor} actor - The actor making the roll
     * @param {string} progression - The progression tier (mediocre, moderate, specialty, awesome)
     * @param {number} bonus - The pre-calculated bonus for this progression
     * @param {number} [netBoosts] - Net boosts/jinxes (optional)
     * @returns {Promise<Object>} The completed roll
     */
    static async rollProgression(actor, progression, bonus, netBoosts = null) {
        if (!actor) {
            ui.notifications.warn(game.i18n.localize("ZWOLF_DICE.NoActor"));
            return null;
        }

        // Get net boosts from UI if not provided
        if (netBoosts === null || netBoosts === undefined) {
            netBoosts = ZWolfDiceUI.getNetBoosts();
        }

        const progressionDisplayName = game.i18n.localize(`ZWOLF.${capitalize(progression)}`) || capitalize(progression);
        const flavor = `${progressionDisplayName} ${game.i18n.localize("ZWOLF_DICE.ProgressionCheck")}`;

        const rollResult = await performRoll({ netBoosts, modifier: bonus, flavor, actor });
        if (rollResult) {
            await createChatMessage(rollResult);
            if (getSetting(ZWOLF_DICE_CONSTANTS.SETTINGS.AUTO_RESET_BOOSTS, true)) {
                ZWolfDiceUI.setNetBoosts(0);
            }
        }

        return rollResult;
    }

    /**
     * Get current net boosts from UI
     * @returns {number} Current net boosts value
     */
    static getNetBoosts() {
        return ZWolfDiceUI.getNetBoosts();
    }

    /**
     * Set net boosts in UI
     * @param {number} value - Value to set
     */
    static setNetBoosts(value) {
        ZWolfDiceUI.setNetBoosts(value);
    }

    /**
     * Initialize the dice system
     */
    static initialize() {
        console.log("Z-Wolf Epic | Initializing dice system");

        try {
            registerHooks();
            registerSettings();
            window.ZWolfDice = ZWolfDice;

            console.log("Z-Wolf Epic | Dice system initialized");
        } catch (error) {
            console.error("Z-Wolf Epic | Failed to initialize dice system:", error);
            ui.notifications.error("Z-Wolf Epic dice system failed to initialize");
        }
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ========================================
// CORE DICE LOGIC
// ========================================

/**
 * Perform a Z-Wolf Epic roll
 * @param {Object} options - Roll options
 * @returns {Promise<Object>} Roll result data
 */
async function performRoll({ netBoosts = 0, modifier = 0, targetNumber = null, flavor = "", actor = null } = {}) {
    // Validate inputs
    netBoosts = validateNetBoosts(netBoosts);
    modifier = parseInt(modifier) || 0;

    // Roll dice
    const diceCount = ZWOLF_DICE_CONSTANTS.BASE_DICE_COUNT + Math.abs(netBoosts);
    const roll = new Roll(`${diceCount}d12`);
    await roll.evaluate();

    // Process results
    const diceResults = roll.dice[0].results.map(r => r.result);
    const sortedDice = [...diceResults].sort((a, b) => a - b);

    const { keyDieIndex, keyDiePosition } = determineKeyDie(sortedDice, netBoosts);
    const keyDie = sortedDice[keyDieIndex];
    const finalResult = keyDie + modifier;

    const critSuccessChance = checkCritSuccess(sortedDice, keyDieIndex);
    const critFailureChance = checkCritFailure(sortedDice, keyDieIndex);

    const success = targetNumber !== null ? finalResult >= targetNumber : null;

    return {
        roll,
        success,
        targetNumber,
        flavor: flavor || game.i18n.localize("ZWOLF_DICE.DefaultFlavor"),
        actor,
        netBoosts,
        modifier,
        diceResults,
        sortedDice,
        keyDie,
        keyDieIndex,
        keyDiePosition,
        finalResult,
        critSuccessChance,
        critFailureChance
    };
}

/**
 * Determine key die index and position based on net boosts
 * @param {number[]} sortedDice - Sorted dice results
 * @param {number} netBoosts - Net boosts value
 * @returns {Object} Key die index and position
 */
function determineKeyDie(sortedDice, netBoosts) {
    let keyDieIndex, keyDiePosition;

    if (netBoosts > 0) {
        // Boosted: second-highest die
        keyDieIndex = sortedDice.length - 2;
        keyDiePosition = ZWOLF_DICE_CONSTANTS.KEY_DIE_POSITIONS.SECOND_HIGHEST;
    } else if (netBoosts < 0) {
        // Jinxed: second-lowest die
        keyDieIndex = 1;
        keyDiePosition = ZWOLF_DICE_CONSTANTS.KEY_DIE_POSITIONS.SECOND_LOWEST;
    } else {
        // Neutral: median die
        keyDieIndex = Math.floor(sortedDice.length / 2);
        keyDiePosition = ZWOLF_DICE_CONSTANTS.KEY_DIE_POSITIONS.MEDIAN;
    }

    return { keyDieIndex, keyDiePosition };
}

/**
 * Check for critical success chance
 * @param {number[]} sortedDice - Sorted dice results
 * @param {number} keyDieIndex - Index of the key die
 * @returns {boolean} True if crit success chance exists
 */
function checkCritSuccess(sortedDice, keyDieIndex) {
    return keyDieIndex < sortedDice.length - 1 &&
        sortedDice[keyDieIndex + 1] === ZWOLF_DICE_CONSTANTS.CRIT_SUCCESS_VALUE;
}

/**
 * Check for critical failure chance
 * @param {number[]} sortedDice - Sorted dice results
 * @param {number} keyDieIndex - Index of the key die
 * @returns {boolean} True if crit failure chance exists
 */
function checkCritFailure(sortedDice, keyDieIndex) {
    return keyDieIndex > 0 &&
        sortedDice[keyDieIndex - 1] === ZWOLF_DICE_CONSTANTS.CRIT_FAILURE_VALUE;
}

/**
 * Validate net boosts value
 * @param {number} netBoosts - Net boosts value
 * @returns {number} Clamped value
 */
function validateNetBoosts(netBoosts) {
    const value = parseInt(netBoosts) || 0;
    return Math.max(ZWOLF_DICE_CONSTANTS.MIN_BOOSTS, Math.min(ZWOLF_DICE_CONSTANTS.MAX_BOOSTS, value));
}

/**
 * Calculate progression bonus for actor
 * @param {Actor} actor - The actor
 * @param {string} progression - Progression level
 * @returns {number} Calculated bonus
 */
function calculateProgressionBonus(actor, progression) {
    const level = actor.system.level || 0;
    const progressionOnlyLevel = getProgressionOnlyLevel(actor);
    const totalLevel = level + progressionOnlyLevel;

    const bonuses = {
        mediocre: Math.floor(0.6 * totalLevel - 0.3),
        moderate: Math.floor(0.8 * totalLevel),
        specialty: Math.floor(1 * totalLevel),
        awesome: Math.floor(1.2 * totalLevel + 0.8001)
    };

    return bonuses[progression] || 0;
}

/**
 * Get progression-only level from Progression Enhancement item
 * @param {Actor} actor - The actor
 * @returns {number} 0 or 1
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

// ========================================
// CHAT MESSAGE FORMATTING
// ========================================

/**
 * Create a chat message for a roll result
 * @param {Object} rollData - Roll result data
 * @returns {Promise<ChatMessage>} Created chat message
 */
async function createChatMessage(rollData) {
    try {
        const messageData = {
            speaker: rollData.actor ? ChatMessage.getSpeaker({ actor: rollData.actor }) : ChatMessage.getSpeaker(),
            flavor: rollData.flavor || game.i18n.localize("ZWOLF_DICE.DefaultFlavor"),
            rolls: [rollData.roll],
            content: await createRollContent(rollData),
            sound: CONFIG.sounds.dice
        };

        return await ChatMessage.create(messageData);
    } catch (error) {
        console.error("Z-Wolf Epic | Error creating chat message:", error);
        ui.notifications.error("Failed to create chat message");
        throw error;
    }
}

/**
 * Create the HTML content for the roll result
 * @param {Object} rollData - Roll result data
 * @returns {string} HTML content
 */
async function createRollContent(rollData) {
    const { diceResults, sortedDice, keyDie, keyDiePosition, modifier, netBoosts,
        finalResult, flavor, targetNumber, success, critSuccessChance, critFailureChance } = rollData;

    // Format key die position for display
    const keyDiePositionLabel = game.i18n.localize(`ZWOLF_DICE.KeyDie${capitalize(keyDiePosition.replace("-", ""))}`) || keyDiePosition;

    // Create tooltip
    let tooltip = `${game.i18n.localize("ZWOLF_DICE.OriginalRoll")}: ${diceResults.join(", ")}`;
    tooltip += `\n${game.i18n.localize("ZWOLF_DICE.Sorted")}: ${sortedDice.join(", ")}`;
    tooltip += `\n${game.i18n.localize("ZWOLF_DICE.KeyDie")} (${keyDiePositionLabel}): ${keyDie}`;
    if (modifier !== 0) {
        tooltip += ` + ${modifier} ${game.i18n.localize("ZWOLF_DICE.Modifier")}`;
    }
    if (netBoosts !== 0) {
        const boostType = netBoosts > 0 ? game.i18n.localize("ZWOLF_DICE.Boosts") : game.i18n.localize("ZWOLF_DICE.Jinxes");
        tooltip += `\n${game.i18n.localize("ZWOLF_DICE.Net")} ${boostType}: ${Math.abs(netBoosts)}`;
    }

    // Determine crit class
    let critClass = "";
    if (critSuccessChance && critFailureChance) {
        critClass = ZWOLF_DICE_CONSTANTS.CSS_CLASSES.CRIT_BOTH;
    } else if (critSuccessChance) {
        critClass = ZWOLF_DICE_CONSTANTS.CSS_CLASSES.CRIT_SUCCESS_CHANCE;
    } else if (critFailureChance) {
        critClass = ZWOLF_DICE_CONSTANTS.CSS_CLASSES.CRIT_FAILURE_CHANCE;
    }

    // Build content
    let content = `
        <div class="zwolf-roll-compact ${critClass}">
            <div class="roll-main" title="${tooltip}">
                <div class="roll-stat">${flavor || game.i18n.localize("ZWOLF_DICE.DefaultFlavor")}</div>
                <div class="roll-result-big">${finalResult}</div>
            </div>
    `;

    // Add crit notifications
    if (critSuccessChance || critFailureChance) {
        content += `<div class="crit-notification">`;

        if (critSuccessChance && critFailureChance) {
            content += `<span class="crit-both">${game.i18n.localize("ZWOLF_DICE.CritWildCard")}</span>`;
        } else if (critSuccessChance) {
            content += `<span class="crit-success">${game.i18n.localize("ZWOLF_DICE.CritSuccessChance")}</span>`;
        } else if (critFailureChance) {
            content += `<span class="crit-failure">${game.i18n.localize("ZWOLF_DICE.CritFailureChance")}</span>`;
        }

        content += `</div>`;
    }

    // Add target and outcome
    if (targetNumber !== null) {
        const vsText = game.i18n.format("ZWOLF_DICE.VersusTarget", { target: targetNumber });
        const outcomeText = success ? game.i18n.localize("ZWOLF_DICE.Success") : game.i18n.localize("ZWOLF_DICE.Failure");

        content += `
            <div class="roll-outcome-compact">
                <span class="target">${vsText}</span>
                <span class="outcome ${success ? "success" : "failure"}">
                    ${outcomeText}
                </span>
            </div>
        `;
    }

    content += `</div>`;
    return content;
}

// ========================================
// FOUNDRY HOOKS
// ========================================

/**
 * Register all Foundry hooks
 */
function registerHooks() {
    // Add controls when chat log renders
    Hooks.on("renderChatLog", (app, html, data) => {
        try {
            // Small delay to ensure DOM is ready
            setTimeout(() => ZWolfDiceUI.addToChat(), 50);
        } catch (error) {
            console.error("Z-Wolf Epic | Error adding controls to chat:", error);
        }
    });

    // Also try on sidebar tab change
    Hooks.on("changeSidebarTab", (app) => {
        if (app.tabName === "chat" || app.id === "chat") {
            try {
                ZWolfDiceUI.addToChat();
            } catch (error) {
                console.error("Z-Wolf Epic | Error adding controls on tab change:", error);
            }
        }
    });

    // Initialize event listeners and ensure controls exist on ready
    Hooks.once("ready", () => {
        try {
            ZWolfDiceUI.initializeEventListeners();

            // Ensure controls are added after a delay
            setTimeout(() => {
                if (!document.querySelector(`.${ZWOLF_DICE_CONSTANTS.CSS_CLASSES.BOOST_CONTROL}`)) {
                    ZWolfDiceUI.addToChat();
                }
            }, 500);
        } catch (error) {
            console.error("Z-Wolf Epic | Error during ready initialization:", error);
        }
    });
}

/**
 * Register game settings
 */
function registerSettings() {
    const systemId = game.system.id;
    if (!systemId) return;

    game.settings.register(systemId, ZWOLF_DICE_CONSTANTS.SETTINGS.AUTO_RESET_BOOSTS, {
        name: game.i18n.localize("ZWOLF_DICE.Settings.AutoResetBoostsName"),
        hint: game.i18n.localize("ZWOLF_DICE.Settings.AutoResetBoostsHint"),
        scope: "client",
        config: true,
        type: Boolean,
        default: true
    });
}

/**
 * Get a game setting value
 * @param {string} settingName - Setting name
 * @param {*} defaultValue - Default value if setting not found
 * @returns {*} Setting value
 */
function getSetting(settingName, defaultValue = null) {
    try {
        return game.settings.get(game.system.id, settingName);
    } catch (error) {
        return defaultValue;
    }
}
