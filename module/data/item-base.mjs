foundry.documents.collections.Items.registerSheet("zwolf-epic", ZWolfItemSheet, {
    types: ["ancestry", "fundament", "equipment", "knack", "track", "talent", "universal"],
    makeDefault: true,
    label: "Z-Wolf Epic I/**
 * Z-Wolf Epic Game System
 * Main initialization file for Foundry VTT v13
 */

// Import document classes
import { ZWolfActor } from "./documents/Actor.mjs";
import { ZWolfItem } from "./documents/Item.mjs";
import ZWolfTokenDocument from "./documents/Token.mjs";

// Import data models
import * as actorDataModels from "./data/actor-base.mjs";
import * as itemDataModels from "./data/item-base.mjs";

// Import sheet classes
import ZWolfActorSheet from "./sheets/actor-sheet.mjs";
import ZWolfItemSheet from "./sheets/item-sheet.mjs";

// Import helpers and utilities
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { ZWOLF } from "./helpers/config.mjs";
import { ZWolfDice } from "./dice/index.mjs";
import { ZWolfVisionSystem } from "./helpers/vision-detection-only.mjs";
import { ZWolfVisionRadiusDisplay } from "./helpers/vision-radius-display.mjs";
import { registerItemContextMenuOption } from "./helpers/item-sync.mjs";

// Import hook modules
import { registerCombatHooks } from "./hooks/combat.mjs";
import { registerTokenHooks } from "./hooks/token.mjs";
import { registerItemHooks } from "./hooks/item.mjs";
import { registerHandlebarsHelpers } from "./helpers/handlebars.mjs";
import { registerMacroHooks } from "./hooks/macros.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {
  console.log('Z-Wolf Epic | Initializing system');

  // Add utility classes to global game object
  game.zwolf = {
    ZWolfActor,
    ZWolfItem,
    vision: ZWolfVisionSystem,
    visionDisplay: ZWolfVisionRadiusDisplay,
    roll: ZWolfDice.roll.bind(ZWolfDice)
  };

  // Add custom constants
  CONFIG.ZWOLF = ZWOLF;

  // Configure documents
  configureDocuments();
  
  // Configure status effects
  configureStatusEffects();
  
  // Configure canvas and grid
  configureCanvas();
  
  // Configure combat
  configureCombat();
  
  // Register sheets
  registerSheets();
  
  // Initialize vision systems
  ZWolfVisionSystem.initialize();
  ZWolfVisionRadiusDisplay.initialize();
  
  // Register all Handlebars helpers
  registerHandlebarsHelpers();
  
  // Register hook modules
  registerTokenHooks();
  registerCombatHooks();
  registerItemHooks();
  
  // Register item sync context menu
  registerItemContextMenuOption();
  
  // Preload templates
  await preloadHandlebarsTemplates();
  
  console.log('Z-Wolf Epic | System initialized');
});

/* -------------------------------------------- */
/*  Configuration Functions                     */
/* -------------------------------------------- */

/**
 * Configure document classes and data models
 */
function configureDocuments() {
  // Set custom document classes
  CONFIG.Actor.documentClass = ZWolfActor;
  CONFIG.Item.documentClass = ZWolfItem;
  CONFIG.Token.documentClass = ZWolfTokenDocument;
  
  // Register Actor data models
  CONFIG.Actor.dataModels = {
    pc: actorDataModels.PCData,
    npc: actorDataModels.NPCData,
    eidolon: actorDataModels.EidolonData,
    mook: actorDataModels.MookData,
    spawn: actorDataModels.SpawnData
  };
  
  // Register Item data models
  CONFIG.Item.dataModels = {
    ancestry: itemDataModels.AncestryData,
    fundament: itemDataModels.FundamentData,
    equipment: itemDataModels.EquipmentData,
    knack: itemDataModels.KnackData,
    track: itemDataModels.TrackData,
    talent: itemDataModels.TalentData,
    universal: itemDataModels.UniversalData
  };

  // Register actor type labels
  CONFIG.Actor.typeLabels = {
    pc: "Player Character",
    npc: "Non-Player Character",
    eidolon: "Eidolon",
    mook: "Mook",
    spawn: "Spawn"
  };
}

/**
 * Configure custom status effects
 */
function configureStatusEffects() {
  CONFIG.statusEffects = Object.entries(ZWOLF.conditions).map(([id, condition]) => ({
    id: id,
    name: condition.label,
    icon: condition.icon,
    description: condition.description,
    statuses: [id]
  }));

  CONFIG.specialStatusEffects = {
    DEFEATED: "dead",
    INVISIBLE: "invisible",
    BLIND: "",
    BURROW: "",
    HOVER: "",
    FLY: ""
  };
}

/**
 * Configure canvas and grid settings
 */
function configureCanvas() {
  CONFIG.Canvas.gridPrecision = 2;
  CONFIG.Canvas.rulerUnits = "m";
  
  // Set default scene to gridless
  Hooks.on("preCreateScene", (document, data, options, userId) => {
    if (!data.grid) data.grid = {};
    if (data.grid.type === undefined) {
      data.grid.type = CONST.GRID_TYPES.GRIDLESS;
    }
  });
}

/**
 * Configure combat system
 */
function configureCombat() {
  CONFIG.Combat.initiative = {
    formula: "1d12 + @attributes.agility.value",
    decimals: 2
  };

  // Override initiative rolling to use Z-Wolf dice
  Combat.prototype.rollInitiative = async function(ids, {formula=null, updateTurn=true, messageOptions={}} = {}) {
    ids = typeof ids === "string" ? [ids] : ids;
    const updates = [];
    
    for (let id of ids) {
      const combatant = this.combatants.get(id);
      if (!combatant?.actor) continue;
      
      const agilityMod = combatant.actor.system.attributes?.agility?.value || 0;
      const rollResult = await ZWolfDice.roll({
        netBoosts: 0,
        modifier: agilityMod,
        flavor: `Initiative Roll - ${combatant.name}`
      });
      
      updates.push({
        _id: id,
        initiative: rollResult.finalResult
      });
    }
    
    if (updates.length) {
      await this.updateEmbeddedDocuments("Combatant", updates);
    }
    
    if (updateTurn && this.combatant?.initiative === null) {
      await this.nextTurn();
    }
    
    return this;
  };
}

/**
 * Register sheet applications
 */
function registerSheets() {
  // Unregister core sheets
  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Items.unregisterSheet("core", foundry.applications.sheets.ItemSheetV2);
  
  // Register Z-Wolf sheets
  foundry.documents.collections.Actors.registerSheet("zwolf-epic", ZWolfActorSheet, {
    types: ["pc", "npc", "eidolon", "mook", "spawn"],
    makeDefault: true,
    label: "Z-Wolf Epic Character Sheet"
  });
  
  foundry.documents.collections.Items.registerSheet("zwolf-epic", ZWolfItemSheet, {
    types: ["ancestry", "fundament", "equipment", "knack", "track", "talent"],
    makeDefault: true,
    label: "Z-Wolf Epic Item Sheet"
  });
}

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  console.log('Z-Wolf Epic | System ready');
  
  // Register macro hooks
  registerMacroHooks();
});
