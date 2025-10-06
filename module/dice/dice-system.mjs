/**
 * Z-Wolf Epic Dice System
 * 
 * Core rolling mechanics, chat integration, and Foundry hooks for the
 * Z-Wolf Epic 3d12 + modifier dice system with boosts/jinxes.
 */

import { ZWolfUI } from './dice-ui.mjs';
import { ZWOLF_CONSTANTS } from './dice-constants.mjs';

// ========================================
// PUBLIC API
// ========================================

export class ZWolfDice {
  /**
   * Perform a Z-Wolf Epic roll with full chat message creation
   * @param {Object} options - Roll options
   * @returns {Promise<Object>} The completed roll with details
   */
  static async roll(options = {}) {
    try {
      // Get net boosts from UI if not provided
      if (options.netBoosts === null || options.netBoosts === undefined) {
        options.netBoosts = ZWolfUI.getNetBoosts();
      }
      
      // Perform the core roll
      const rollResult = await performRoll(options);
      
      // Create chat message
      await createChatMessage(rollResult);
      
      // Auto-reset boosts if enabled
      if (getSetting(ZWOLF_CONSTANTS.SETTINGS.AUTO_RESET_BOOSTS, true)) {
        ZWolfUI.setNetBoosts(0);
      }
      
      return rollResult;
      
    } catch (error) {
      console.error("Z-Wolf Epic | Error in roll:", error);
      throw error;
    }
  }

  /**
   * Quick skill roll
   * @param {Actor} actor - The actor making the roll
   * @param {string} skillName - Name of the skill
   * @param {string} attributeName - Not used in Z-Wolf (kept for compatibility)
   * @param {number} netBoosts - Net boosts/jinxes (optional)
   * @returns {Promise<Object>} The completed roll
   */
  static async rollSkill(actor, skillName, attributeName = null, netBoosts = null) {
    if (!actor) {
      ui.notifications.warn(game.i18n.localize("ZWOLF_DICE.NoActor"));
      return null;
    }
    
    const skill = actor.system.skills?.[skillName];
    
    if (!skill || !skill.progression) {
      ui.notifications.warn(game.i18n.localize("ZWOLF_DICE.InvalidSkillAttribute"));
      return null;
    }
    
    const modifier = calculateProgressionBonus(actor, skill.progression);
    const skillDisplayName = skillName.charAt(0).toUpperCase() + skillName.slice(1);
    const progressionDisplayName = skill.progression.charAt(0).toUpperCase() + skill.progression.slice(1);
    const flavor = `${skillDisplayName} (${progressionDisplayName})`;
    
    const rollResult = await performRoll({ netBoosts, modifier, flavor, actor });
    if (rollResult) {
      await createChatMessage(rollResult);
      if (getSetting(ZWOLF_CONSTANTS.SETTINGS.AUTO_RESET_BOOSTS, true)) {
        ZWolfUI.setNetBoosts(0);
      }
    }
    
    return rollResult;
  }
  
  /**
   * Quick attribute roll
   * @param {Actor} actor - The actor making the roll
   * @param {string} attributeName - Name of the attribute
   * @param {number} netBoosts - Net boosts/jinxes (optional)
   * @returns {Promise<Object>} The completed roll
   */
  static async rollAttribute(actor, attributeName, netBoosts = null) {
    if (!actor) {
      ui.notifications.warn(game.i18n.localize("ZWOLF_DICE.NoActor"));
      return null;
    }
    
    const attribute = actor.system.attributes?.[attributeName];
    
    if (!attribute || !attribute.progression) {
      ui.notifications.warn(game.i18n.localize("ZWOLF_DICE.InvalidAttribute"));
      return null;
    }
    
    const modifier = calculateProgressionBonus(actor, attribute.progression);
    const attributeDisplayName = attributeName.charAt(0).toUpperCase() + attributeName.slice(1);
    const progressionDisplayName = attribute.progression.charAt(0).toUpperCase() + attribute.progression.slice(1);
    const flavor = `${attributeDisplayName} (${progressionDisplayName})`;
    
    const rollResult = await performRoll({ netBoosts, modifier, flavor, actor });
    if (rollResult) {
      await createChatMessage(rollResult);
      if (getSetting(ZWOLF_CONSTANTS.SETTINGS.AUTO_RESET_BOOSTS, true)) {
        ZWolfUI.setNetBoosts(0);
      }
    }
    
    return rollResult;
  }

  /**
   * Get current net boosts from UI
   */
  static getNetBoosts() {
    return ZWolfUI.getNetBoosts();
  }

  /**
   * Set net boosts in UI
   */
  static setNetBoosts(value) {
    ZWolfUI.setNetBoosts(value);
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
// CORE DICE LOGIC
// ========================================

/**
 * Perform a Z-Wolf Epic roll
 * @param {Object} options - Roll options
 * @returns {Promise<Object>} Roll result data
 */
async function performRoll({netBoosts = 0, modifier = 0, targetNumber = null, flavor = "", actor = null} = {}) {
  // Validate inputs
  netBoosts = validateNetBoosts(netBoosts);
  modifier = parseInt(modifier) || 0;
  
  // Roll dice
  const diceCount = ZWOLF_CONSTANTS.BASE_DICE_COUNT + Math.abs(netBoosts);
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
 */
function determineKeyDie(sortedDice, netBoosts) {
  let keyDieIndex, keyDiePosition;
  
  if (netBoosts > 0) {
    keyDieIndex = sortedDice.length - 2;
    keyDiePosition = ZWOLF_CONSTANTS.KEY_DIE_POSITIONS.SECOND_HIGHEST;
  } else if (netBoosts < 0) {
    keyDieIndex = 1;
    keyDiePosition = ZWOLF_CONSTANTS.KEY_DIE_POSITIONS.SECOND_LOWEST;
  } else {
    keyDieIndex = Math.floor(sortedDice.length / 2);
    keyDiePosition = ZWOLF_CONSTANTS.KEY_DIE_POSITIONS.MEDIAN;
  }
  
  return { keyDieIndex, keyDiePosition };
}

/**
 * Check for critical success chance
 */
function checkCritSuccess(sortedDice, keyDieIndex) {
  return keyDieIndex < sortedDice.length - 1 && 
         sortedDice[keyDieIndex + 1] === ZWOLF_CONSTANTS.CRIT_SUCCESS_VALUE;
}

/**
 * Check for critical failure chance
 */
function checkCritFailure(sortedDice, keyDieIndex) {
  return keyDieIndex > 0 && 
         sortedDice[keyDieIndex - 1] === ZWOLF_CONSTANTS.CRIT_FAILURE_VALUE;
}

/**
 * Validate net boosts value
 */
function validateNetBoosts(netBoosts) {
  const value = parseInt(netBoosts) || 0;
  return Math.max(ZWOLF_CONSTANTS.MIN_BOOSTS, Math.min(ZWOLF_CONSTANTS.MAX_BOOSTS, value));
}

/**
 * Calculate progression bonus for actor
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
 */
async function createChatMessage(rollData) {
  try {
    const messageData = {
      speaker: rollData.actor ? ChatMessage.getSpeaker({ actor: rollData.actor }) : ChatMessage.getSpeaker(),
      flavor: rollData.flavor || game.i18n.localize("ZWOLF_DICE.DefaultFlavor"),
      roll: [rollData.roll],
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
 */
async function createRollContent(rollData) {
  const { diceResults, sortedDice, keyDie, keyDiePosition, modifier, netBoosts,
          finalResult, flavor, targetNumber, success, critSuccessChance, critFailureChance } = rollData;
  
  // Create tooltip
  let tooltip = `Original Roll: ${diceResults.join(', ')}`;
  tooltip += `\nSorted: ${sortedDice.join(', ')}`;
  tooltip += `\nKey Die (${keyDiePosition}): ${keyDie}`;
  if (modifier !== 0) tooltip += ` + ${modifier} modifier`;
  if (netBoosts !== 0) {
    const boostType = netBoosts > 0 ? game.i18n.localize("ZWOLF_DICE.Boosts") : game.i18n.localize("ZWOLF_DICE.Jinxes");
    tooltip += `\nNet ${boostType}: ${Math.abs(netBoosts)}`;
  }
  
  // Determine crit class
  let critClass = '';
  if (critSuccessChance && critFailureChance) {
    critClass = ZWOLF_CONSTANTS.CSS_CLASSES.CRIT_BOTH;
  } else if (critSuccessChance) {
    critClass = ZWOLF_CONSTANTS.CSS_CLASSES.CRIT_SUCCESS_CHANCE;
  } else if (critFailureChance) {
    critClass = ZWOLF_CONSTANTS.CSS_CLASSES.CRIT_FAILURE_CHANCE;
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
        <span class="outcome ${success ? 'success' : 'failure'}">
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
  Hooks.on('renderChatLog', (app, html, data) => {
    try {
      ZWolfUI.addToChat(html);
    } catch (error) {
      console.error("Z-Wolf Epic | Error adding controls to chat:", error);
    }
  });
  
  Hooks.once('ready', () => {
    try {
      ZWolfUI.initializeEventListeners();
      
      const chatTab = document.querySelector('#sidebar .tab[data-tab="chat"]');
      if (chatTab && !chatTab.querySelector(`.${ZWOLF_CONSTANTS.CSS_CLASSES.BOOST_CONTROL}`)) {
        ZWolfUI.addToChat($(chatTab));
      }
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
  
  game.settings.register(systemId, ZWOLF_CONSTANTS.SETTINGS.AUTO_RESET_BOOSTS, {
    name: game.i18n.localize("ZWOLF_DICE.Settings.AutoResetBoostsName"),
    hint: game.i18n.localize("ZWOLF_DICE.Settings.AutoResetBoostsHint"),
    scope: 'client',
    config: true,
    type: Boolean,
    default: true
  });
  
  game.settings.register(systemId, 'debugMode', {
    name: game.i18n.localize("ZWOLF_DICE.Settings.DebugModeName"),
    hint: game.i18n.localize("ZWOLF_DICE.Settings.DebugModeHint"),
    scope: 'client',
    config: true,
    type: Boolean,
    default: false
  });
}

/**
 * Get a game setting value
 */
function getSetting(settingName, defaultValue = null) {
  try {
    return game.settings.get(game.system.id, settingName);
  } catch (error) {
    return defaultValue;
  }
}

// Auto-initialize
ZWolfDice.initialize();
