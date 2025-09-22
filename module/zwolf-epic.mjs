/**
 * Z-Wolf Epic Game System
 * A heroic fantasy system for Foundry VTT
 */

// Import document classes.
import { ZWolfActor } from "./documents/Actor.mjs";
import { ZWolfItem } from "./documents/Item.mjs";
// Import sheet classes.
import { ZWolfActorSheet } from "./sheets/actor-sheet.mjs";
import { ZWolfItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { ZWOLF } from "./helpers/config.mjs";
import { ZWolfDice } from "./helpers/dice.mjs";
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
    rollDice: ZWolfDice.roll,
    vision: ZWolfVision
  };

  // Also expose ZWolfDice globally for easier access
  window.ZWolfDice = ZWolfDice;

  // Add custom constants for configuration.
  CONFIG.ZWOLF = ZWOLF;

  // Initialize the custom vision system
  ZWolfVision.initialize();

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d12 + @attributes.agility.value",
    decimals: 2
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
    spawn: "Spawn"
  };

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("zwolf-epic", ZWolfActorSheet, {
    types: ["pc", "npc", "eidolon", "spawn"],
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
