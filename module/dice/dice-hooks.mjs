/**
 * Z-Wolf Epic Foundry Hook Registration
 * Handles all Foundry VTT hook registrations for the dice system
 */

import { ZWOLF_CONSTANTS } from './dice-constants.mjs';
import { ZWolfUI } from './dice-ui.mjs';

/**
 * Register all Foundry hooks for the Z-Wolf Epic dice system
 */
export function registerDiceHooks() {
  console.log("Z-Wolf Epic | Registering dice system hooks");
  
  // Initialize system settings and core functionality
  Hooks.once('init', onInit);
  
  // Add UI controls when chat tab is rendered
  Hooks.on('renderSidebarTab', onRenderSidebarTab);
  
  // Initialize event listeners when system is ready
  Hooks.once('ready', onReady);
  
  // Clean up when shutting down
  Hooks.once('pause', onPause);
}

/**
 * Initialize hook - called once when Foundry initializes
 */
function onInit() {
  console.log("Z-Wolf Epic | Initializing dice system");
  
  try {
    // Register game settings
    registerGameSettings();
    
    console.log("Z-Wolf Epic | Dice system initialization complete");
  } catch (error) {
    console.error("Z-Wolf Epic | Error during initialization:", error);
    ui.notifications.error("Z-Wolf Epic dice system failed to initialize. Check console for details.");
  }
}

/**
 * Ready hook - called once when Foundry is fully ready
 */
function onReady() {
  console.log("Z-Wolf Epic | System ready, initializing UI event listeners");
  
  try {
    // Initialize UI event listeners
    ZWolfUI.initializeEventListeners();
    
    // Add controls to chat if already visible
    const chatTab = document.querySelector('#sidebar .tab[data-tab="chat"]');
    if (chatTab && !chatTab.querySelector(ZWOLF_CONSTANTS.ELEMENTS.BOOST_CONTROL)) {
      console.log("Z-Wolf Epic | Adding controls to existing chat tab");
      ZWolfUI.addToChat($(chatTab));
    }
    
    console.log("Z-Wolf Epic | UI initialization complete");
  } catch (error) {
    console.error("Z-Wolf Epic | Error during ready initialization:", error);
  }
}

/**
 * Sidebar tab render hook - adds controls to chat tab
 */
function onRenderSidebarTab(app, html, data) {
  // Only act on chat tab renders
  if (app.id !== "chat") return;
  
  try {
    console.log("Z-Wolf Epic | Chat sidebar rendered, adding boost controls");
    ZWolfUI.addToChat(html);
  } catch (error) {
    console.error("Z-Wolf Epic | Error adding controls to chat:", error);
  }
}

/**
 * Pause hook - clean up when game is paused
 */
function onPause(paused) {
  if (paused) {
    console.log("Z-Wolf Epic | Game paused, cleaning up UI");
    // Could add cleanup logic here if needed
  }
}

/**
 * Register game settings for the dice system
 */
function registerGameSettings() {
  const systemId = game.system.id;
  
  if (!systemId) {
    console.warn("Z-Wolf Epic | No system ID found, using fallback");
    return;
  }
  
  // Auto-reset boosts setting
  game.settings.register(systemId, ZWOLF_CONSTANTS.SETTINGS.AUTO_RESET_BOOSTS, {
    name: 'Auto-Reset Boosts',
    hint: 'Automatically reset Net Boosts to 0 after each roll',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      console.log(`Z-Wolf Epic | Auto-reset boosts setting changed to: ${value}`);
    }
  });
  
  // Debug mode setting (for development)
  game.settings.register(systemId, 'debugMode', {
    name: 'Debug Mode',
    hint: 'Enable debug logging for Z-Wolf Epic dice system',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      console.log(`Z-Wolf Epic | Debug mode changed to: ${value}`);
    }
  });
  
  // Default modifier setting
  game.settings.register(systemId, 'defaultModifier', {
    name: 'Default Roll Modifier',
    hint: 'Default modifier for quick rolls (can be overridden)',
    scope: 'client',
    config: true,
    type: Number,
    default: 0,
    range: {
      min: -10,
      max: 10,
      step: 1
    }
  });
  
  console.log("Z-Wolf Epic | Game settings registered");
}

/**
 * Get a game setting value with error handling
 * @param {string} settingName - Name of the setting
 * @param {*} defaultValue - Default value if setting can't be read
 * @returns {*} The setting value or default
 */
export function getSetting(settingName, defaultValue = null) {
  try {
    return game.settings.get(game.system.id, settingName);
  } catch (error) {
    console.warn(`Z-Wolf Epic | Could not read setting '${settingName}', using default:`, defaultValue);
    return defaultValue;
  }
}

/**
 * Set a game setting value with error handling
 * @param {string} settingName - Name of the setting
 * @param {*} value - Value to set
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function setSetting(settingName, value) {
  try {
    await game.settings.set(game.system.id, settingName, value);
    return true;
  } catch (error) {
    console.error(`Z-Wolf Epic | Could not set setting '${settingName}' to:`, value, error);
    return false;
  }
}

/**
 * Check if debug mode is enabled
 * @returns {boolean} True if debug mode is enabled
 */
export function isDebugMode() {
  return getSetting('debugMode', false);
}

/**
 * Log a debug message if debug mode is enabled
 * @param {...*} args - Arguments to log
 */
export function debugLog(...args) {
  if (isDebugMode()) {
    console.log("Z-Wolf Epic | DEBUG:", ...args);
  }
}
