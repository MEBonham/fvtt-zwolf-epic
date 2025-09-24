/**
 * Z-Wolf Epic Dice System - Module Exports
 * Main export file for the entire dice system
 */

// Export main dice class (primary interface)
export { ZWolfDice } from './dice.mjs';

// Export individual components for advanced usage
export { ZWolfDiceCore } from './dice-core.mjs';
export { ZWolfUI } from './dice-ui.mjs';
export { ZWolfChat } from './dice-chat.mjs';
export { ZWOLF_CONSTANTS } from './dice-constants.mjs';
export { 
  registerDiceHooks, 
  getSetting, 
  setSetting, 
  isDebugMode, 
  debugLog 
} from './dice-hooks.mjs';

// Default export is the main dice class
export default ZWolfDice;
