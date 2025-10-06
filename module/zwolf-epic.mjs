/**
 * Z-Wolf Epic Game System
 * A heroic fantasy system for Foundry VTT
 */

// Import document classes.
import { ZWolfActor } from "./documents/Actor.mjs";
import { ZWolfItem } from "./documents/Item.mjs";
import ZWolfTokenDocument from "./documents/Token.mjs";
import * as actorDataModels from "./data/actor-base.mjs";
import * as itemDataModels from "./data/item-base.mjs";
// Import sheet classes.
import ZWolfActorSheet from "./sheets/actor-sheet.mjs";
import ZWolfItemSheet from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { ZWOLF } from "./helpers/config.mjs";
import { ZWolfDice } from "./dice/index.mjs";
import { ZWolfVisionSystem } from "./helpers/vision-detection-only.mjs";
import { ZWolfVisionRadiusDisplay } from "./helpers/vision-radius-display.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.zwolf = {
    ZWolfActor,
    ZWolfItem,
    vision: ZWolfVisionSystem,
    visionDisplay: ZWolfVisionRadiusDisplay,
    // Helper function for macros and console access
    roll: ZWolfDice.roll.bind(ZWolfDice)
  };

  // Add custom constants for configuration.
  CONFIG.ZWOLF = ZWOLF;

  /**
   * Configure custom status effects to replace Foundry's defaults
   */
  CONFIG.statusEffects = Object.entries(ZWOLF.conditions).map(([id, condition]) => ({
    id: id,
    name: condition.label,
    icon: condition.icon,
    description: condition.description,
    statuses: [id] // This is important for V13 compatibility
  }));

  // Clear Foundry's default status effects
  CONFIG.specialStatusEffects = {
    DEFEATED: "dead",
    INVISIBLE: "invisible",
    BLIND: "",
    BURROW: "",
    HOVER: "",
    FLY: ""
  };

  // Initialize the detection mode vision system
  ZWolfVisionSystem.initialize();
  ZWolfVisionRadiusDisplay.initialize();

  /**
   * Remove unwanted buttons from Token HUD
   */
  Hooks.on('renderTokenHUD', (app, html, data) => {
    // In Foundry V13, html is a native HTMLElement, not jQuery
    const hudElement = html instanceof HTMLElement ? html : html[0];
    
    // Remove "Select Movement Action" button
    const movementButton = hudElement.querySelector('[data-action="togglePalette"][data-palette="movementActions"]');
    if (movementButton) {
      movementButton.remove();
      console.log('Z-Wolf Epic | Removed movement actions button');
    }
    
    // Remove "Toggle Target State" button  
    const targetButton = hudElement.querySelector('[data-action="target"]');
    if (targetButton) {
      targetButton.remove();
      console.log('Z-Wolf Epic | Removed target toggle button');
    }
  });

  /**
   * Consolidated token creation hook
   * Handles both lockRotation and detection mode cleanup
   */
  Hooks.on("createToken", async (document, options, userId) => {
    console.log("Z-Wolf Epic | createToken hook fired");
    
    // Handle lockRotation
    if (!document.lockRotation) {
      console.log("Z-Wolf Epic | Setting lockRotation");
      setTimeout(() => {
        document.update({ lockRotation: true });
      }, 0);
    }
    
    // Handle detection modes - clean up after Foundry adds defaults
    setTimeout(async () => {
      console.log("Z-Wolf Epic | Checking detection modes:", document.detectionModes);
      
      const hasUnwanted = document.detectionModes.some(m => 
        m.id === 'basicSight' || m.id === 'lightPerception'
      );
      
      if (hasUnwanted) {
        console.log("Z-Wolf Epic | Found unwanted detection modes, filtering...");
        const filtered = document.detectionModes.filter(m => 
          m.id !== 'basicSight' && m.id !== 'lightPerception'
        );
        
        console.log("Z-Wolf Epic | Filtered modes:", filtered);
        
        await document.update({ 
          detectionModes: filtered 
        }, { _zwolfVisionUpdate: true });
        
        console.log("Z-Wolf Epic | Updated detection modes");
      }
    }, 250); // Longer delay to ensure Foundry finished adding its modes
  });

  /**
   * Prevent unwanted detection modes during updates
   */
  Hooks.on("preUpdateToken", (document, changes, options, userId) => {
    if (options._zwolfVisionUpdate) return; // Don't interfere with our own updates
    
    if (changes.detectionModes) {
      console.log("Z-Wolf Epic | preUpdateToken - filtering detection modes");
      changes.detectionModes = changes.detectionModes.filter(m => 
        m.id !== 'basicSight' && m.id !== 'lightPerception'
      );
    }
  });

  /**
   * Set default Token settings - Lock Artwork Rotation
   */
  Hooks.on("preCreateToken", (document, data, options, userId) => {
    console.log("Z-Wolf Epic | preCreateToken hook fired");
    data.lockRotation = true;
    console.log("Z-Wolf Epic | Forced lockRotation to true");
  });

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
      const agilityMod = combatant.actor.system.attributes?.agility?.value || 0;
      
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

  /* -------------------------------------------- */
  /*  Default Document Settings                   */
  /* -------------------------------------------- */

  /**
   * Set default Scene settings - Gridless mode
   */
  Hooks.on("preCreateScene", (document, data, options, userId) => {
    if (!data.grid) data.grid = {};
    if (data.grid.type === undefined) {
      data.grid.type = CONST.GRID_TYPES.GRIDLESS;
    }
  });

  // Define custom Document classes
  CONFIG.Actor.documentClass = ZWolfActor;
  CONFIG.Item.documentClass = ZWolfItem;
  CONFIG.Token.documentClass = ZWolfTokenDocument;
  
  // Register Actor DataModels
  CONFIG.Actor.dataModels = {
    pc: actorDataModels.PCData,
    npc: actorDataModels.NPCData,
    eidolon: actorDataModels.EidolonData,
    mook: actorDataModels.MookData,
    spawn: actorDataModels.SpawnData
  };
  
  // Register Item DataModels
  CONFIG.Item.dataModels = {
    ancestry: itemDataModels.AncestryData,
    fundament: itemDataModels.FundamentData,
    equipment: itemDataModels.EquipmentData,
    knack: itemDataModels.KnackData,
    track: itemDataModels.TrackData,
    talent: itemDataModels.TalentData
  };

  // Register actor types with proper labels
  CONFIG.Actor.typeLabels = {
    character: "Player Character",
    npc: "Non-Player Character",
    eidolon: "Eidolon",
    mook: "Mook",
    spawn: "Spawn"
  };

  // Register sheet application classes
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet("zwolf-epic", ZWolfActorSheet, {
    types: ["pc", "npc", "eidolon", "mook", "spawn"],
    makeDefault: true,
    label: "Z-Wolf Epic Character Sheet"
  });
  foundry.documents.collections.Items.unregisterSheet("core", foundry.applications.sheets.ItemSheetV2);
  foundry.documents.collections.Items.registerSheet("zwolf-epic", ZWolfItemSheet, {
    types: ["ancestry", "fundament", "equipment", "knack", "track", "talent"],
    makeDefault: true,
    label: "Z-Wolf Epic Item Sheet"
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
  const hudElement = html instanceof HTMLElement ? html : html[0];
  const header = hudElement.querySelector('.combat-tracker-header');
  
  // Only add button if header exists and button hasn't been added yet
  if (header && !header.querySelector('.zwolf-initiative-boost')) {
    const boostButton = createInitiativeButton();
    const controlsElement = header.querySelector('.combat-controls');
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
  const button = document.createElement('a');
  button.className = 'combat-control zwolf-initiative-boost';
  button.title = 'Roll Initiative with Current Boosts/Jinxes';
  
  const icon = document.createElement('i');
  icon.className = 'fas fa-dice-d12';
  button.appendChild(icon);
  
  return button;
}

/**
 * Attach click handler to initiative button
 * @param {HTMLElement} button - The button element
 */
function attachInitiativeButtonHandler(button) {
  button.addEventListener('click', async (event) => {
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
  
  const cleanArray = array
    .filter(item => item !== null && item !== undefined)
    .map(item => {
      const str = String(item);
      if (str.includes('[object Object]')) {
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

Handlebars.registerHelper('range', function(start, end) {
  const result = [];
  for (let i = start; i <= end; i++) {
    result.push(i);
  }
  return result;
});

Handlebars.registerHelper('lookup', function(obj, key) {
  return obj[key];
});

Handlebars.registerHelper('extractNumber', function(str) {
  return str.replace(/\D/g, '');
});

Handlebars.registerHelper('mod', function(a, b) {
  return a % b;
});

Handlebars.registerHelper('capitalize', function(str) {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
});

Handlebars.registerHelper('gt', function(a, b) {
  return a > b;
});

Handlebars.registerHelper('gte', function(a, b) {
  return a >= b;
});

Handlebars.registerHelper('lt', function(a, b) {
  return a < b;
});

Handlebars.registerHelper('lte', function(a, b) {
  return a <= b;
});

Handlebars.registerHelper('or', function() {
  return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
});

Handlebars.registerHelper('getSourceItem', function(item) {
  return item.getSourceItem?.();
});

Handlebars.registerHelper('contains', function(string, substring) {
  if (typeof string !== 'string' || typeof substring !== 'string') {
    return false;
  }
  return string.includes(substring);
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

/**
 * Track source Item ID when items are added to Actors
 * This enables the "Push to Actors" functionality
 */
Hooks.on("createItem", async (item, options, userId) => {
  
  if (!item.parent || item.parent.documentName !== "Actor") return;
  if (item.getFlag("zwolf-epic", "sourceId")) return;
  if (game.user.id !== userId) return;
  
  const worldItem = game.items.find(i => 
    i.name === item.name && 
    i.type === item.type &&
    !i.parent
  );
  
  if (worldItem) {
    console.log(`Z-Wolf Epic | Linking ${item.name} to source item ${worldItem.id}`);
    setTimeout(async () => {
      try {
        await item.setFlag("zwolf-epic", "sourceId", worldItem.id);
        console.log(`Z-Wolf Epic | Flag set successfully for ${item.name}`);
      } catch (error) {
        console.error(`Z-Wolf Epic | Failed to set sourceId flag:`, error);
      }
    }, 0);
  }
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

  return item.roll();
}

// Add the rollItemMacro function to the game.zwolf object
game.zwolf = game.zwolf || {};
game.zwolf.rollItemMacro = rollItemMacro;