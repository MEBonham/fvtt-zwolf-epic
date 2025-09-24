/**
 * Z-Wolf Epic Game System
 * A heroic fantasy system for Foundry VTT
 */

// Import document classes.
import { ZWolfActor } from "./documents/Actor.mjs";
import { ZWolfItem } from "./documents/Item.mjs";
// Import sheet classes.
import ZWolfActorSheet from "./sheets/actor-sheet.mjs";
import ZWolfItemSheet from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { ZWOLF } from "./helpers/config.mjs";
import { ZWolfDice } from "./dice/index.mjs";  // Updated import path
import { ZWolfVision } from "./helpers/vision.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.zwolf = {
    ZWolfActor,
    ZWolfItem,
    vision: ZWolfVision,
    // Helper function for macros and console access
    roll: ZWolfDice.roll.bind(ZWolfDice)
  };

  // Add custom constants for configuration.
  CONFIG.ZWOLF = ZWOLF;

  // Initialize the custom vision system
  ZWolfVision.initialize();

  /**
   * Set a custom initiative system that uses Z-Wolf dice mechanics
   */
  CONFIG.Combat.initiative = {
    formula: "1d12 + @attributes.agility.value", // Fallback formula
    decimals: 2
  };

  // Override the initiative rolling to use Z-Wolf dice system
  Combat.prototype.rollInitiative = async function(ids, {formula=null, updateTurn=true, messageOptions={}} = {}) {
    // Normalize the ID array
    ids = typeof ids === "string" ? [ids] : ids;
    
    const updates = [];
    const messages = [];
    
    for (let id of ids) {
      const combatant = this.combatants.get(id);
      if (!combatant?.actor) continue;
      
      // Get the actor's agility modifier
      const agilityMod = combatant.actor.system.attributes?.agility?.value || 0; // TODO: multiply by 1.01; use Progression system
      
      // Use Z-Wolf dice system for initiative
      const rollResult = await ZWolfDice.roll({
        netBoosts: 0, // Could be modified by conditions/effects
        modifier: agilityMod,
        flavor: `Initiative Roll - ${combatant.name}`
      });
      
      // Update the combatant's initiative
      updates.push({
        _id: id,
        initiative: rollResult.finalResult
      });
    }
    
    // Update all combatants
    if (updates.length) {
      await this.updateEmbeddedDocuments("Combatant", updates);
    }
    
    // Optionally advance the turn order
    if (updateTurn && this.combatant?.initiative === null) {
      await this.nextTurn();
    }
    
    return this;
  };

  // Configure gridless gameplay
  CONFIG.Canvas.gridPrecision = 2; // Allow decimals in distance measurement
  CONFIG.Canvas.rulerUnits = "m"; // Use meters for measurement

  // Define custom Document classes
  CONFIG.Actor.documentClass = ZWolfActor;
  CONFIG.Item.documentClass = ZWolfItem;

  // Register actor types with proper labels
  CONFIG.Actor.typeLabels = {
    character: "Player Character",
    npc: "Non-Player Character",
    eidolon: "Eidolon",
    mook: "Mook",
    spawn: "Spawn"
  };

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("zwolf-epic", ZWolfActorSheet, {
    types: ["pc", "npc", "eidolon", "mook", "spawn"],
    makeDefault: true,
    label: "Z-Wolf Epic Character Sheet"
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("zwolf-epic", ZWolfItemSheet, {
    types: ["ancestry", "fundament", "equipment", "knack", "track", "talent"],
    makeDefault: true
  });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/**
 * Combat Tracker enhancement hooks for Z-Wolf Epic
 */

export function registerCombatTrackerHooks() {
  
  /**
   * Add enhanced initiative rolling to combat tracker
   */
  Hooks.on('renderCombatTracker', (app, html, data) => {
    addInitiativeBoostButton(html);
  });
}

/**
 * Add initiative boost button to combat tracker
 * @param {HTMLElement} html - The combat tracker HTML element
 */
function addInitiativeBoostButton(html) {
  const $html = $(html);
  const header = $html.find('.combat-tracker-header');
  
  // Only add button if header exists and button hasn't been added yet
  if (header.length && !header.find('.zwolf-initiative-boost').length) {
    const boostButton = createInitiativeButton();
    header.find('.combat-controls').prepend(boostButton);
    attachInitiativeButtonHandler(boostButton);
  }
}

/**
 * Create the initiative boost button element
 * @returns {jQuery} The button element
 */
function createInitiativeButton() {
  return $(`
    <a class="combat-control zwolf-initiative-boost" title="Roll Initiative with Current Boosts/Jinxes">
      <i class="fas fa-dice-d12"></i>
    </a>
  `);
}

/**
 * Attach click handler to initiative button
 * @param {jQuery} button - The button element
 */
function attachInitiativeButtonHandler(button) {
  button.on('click', async (event) => {
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
    return ui.notifications.warn("No active combat");
  }
  
  const controlled = canvas.tokens.controlled;
  if (!controlled.length) {
    return ui.notifications.warn("No tokens selected");
  }
  
  const netBoosts = ZWolfDice.getNetBoosts();
  
  for (const token of controlled) {
    await rollInitiativeForToken(token, combat, netBoosts);
  }
}

/**
 * Roll initiative for a specific token
 * @param {Token} token - The token to roll for
 * @param {Combat} combat - The active combat
 * @param {number} netBoosts - Current net boosts/jinxes
 */
async function rollInitiativeForToken(token, combat, netBoosts) {
  const combatant = combat.combatants.find(c => c.tokenId === token.id);
  if (!combatant) return;
  
  const agilityMod = token.actor.system.attributes?.agility?.value || 0;
  
  const rollResult = await ZWolfDice.roll({
    netBoosts: netBoosts,
    modifier: agilityMod,
    flavor: generateInitiativeFlavor(netBoosts, combatant.name),
    actor: token.actor
  });
  
  await combat.updateEmbeddedDocuments("Combatant", [{
    _id: combatant.id,
    initiative: rollResult.finalResult
  }]);
}

/**
 * Generate flavor text for initiative roll
 * @param {number} netBoosts - Net boosts/jinxes
 * @param {string} name - Combatant name
 * @returns {string} Flavor text
 */
function generateInitiativeFlavor(netBoosts, name) {
  let boostText = 'No Boosts';
  if (netBoosts > 0) {
    boostText = `${netBoosts} Boost${netBoosts > 1 ? 's' : ''}`;
  } else if (netBoosts < 0) {
    boostText = `${Math.abs(netBoosts)} Jinx${Math.abs(netBoosts) > 1 ? 'es' : ''}`;
  }
  
  return `Initiative Roll (${boostText}) - ${name}`;
}

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here are a few useful examples:
Handlebars.registerHelper('concat', function() {
  var outStr = '';
  for (var arg in arguments) {
    if (typeof arguments[arg] != 'object') {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

Handlebars.registerHelper('selected', function(option, value) {
  return (option === value) ? 'selected' : '';
});

Handlebars.registerHelper('checked', function(value) {
  return value ? 'checked' : '';
});

Handlebars.registerHelper('toLowerCase', function(str) {
  return str.toLowerCase();
});

Handlebars.registerHelper('join', function(array, separator) {
  if (!array) return '';
  if (!Array.isArray(array)) return String(array);
  
  separator = separator || ', ';
  
  // Clean up corrupted array elements
  const cleanArray = array
    .filter(item => item !== null && item !== undefined)
    .map(item => {
      const str = String(item);
      // If we find [object Object] corruption, try to extract meaningful parts
      if (str.includes('[object Object]')) {
        // Split on [object Object] and take valid parts
        const parts = str.split('[object Object]').filter(part => part.trim().length > 0);
        return parts.join(', ');
      }
      return str;
    })
    .filter(str => str.length > 0);
    
  return cleanArray.join(separator);
});

Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

Handlebars.registerHelper('includes', function(array, value) {
  if (!array || !Array.isArray(array)) return false;
  return array.includes(value);
});

Handlebars.registerHelper('add', function(a, b) {
  return parseInt(a) + parseInt(b);
});

Handlebars.registerHelper('json', function(obj) {
  return JSON.stringify(obj);
});

Handlebars.registerHelper('math', function(lvalue, operator, rvalue) {
  lvalue = parseFloat(lvalue);
  rvalue = parseFloat(rvalue);
  
  return {
    '+': lvalue + rvalue,
    '-': lvalue - rvalue,
    '*': lvalue * rvalue,
    '/': lvalue / rvalue,
    '%': lvalue % rvalue
  }[operator];
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                              */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  if (data.type !== "Item") return;
  if (!("data" in data)) return ui.notifications.warn("You can only create macro buttons for owned Items");
  const item = data.data;

  // Create the macro command
  const command = `game.zwolf.rollItemMacro("${item.name}");`;
  let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "zwolf-epic.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find(i => i.name === itemName) : null;
  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);

  // Trigger the item roll
  return item.roll();
}

// Add the rollItemMacro function to the game.zwolf object
game.zwolf = game.zwolf || {};
game.zwolf.rollItemMacro = rollItemMacro;
