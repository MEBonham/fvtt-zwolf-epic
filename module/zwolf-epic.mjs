// Import document classes
import { ZWolfActor } from "./documents/Actor.mjs";
import { ZWolfItem } from "./documents/Item.mjs";

// Import data models
import { ZWolfActorBase } from "./data-models/actor-base.mjs";
import { ZWolfItemBase } from "./data-models/item-base.mjs";

// Import sheet classes
import { ZWolfActorSheet } from "./sheets/actor-sheet.mjs";
import { ZWolfItemSheet } from "./sheets/item-sheet.mjs";

// Import helpers
import { registerHandlebarsHelpers } from "./helpers/handlebars.mjs";
import { preloadTemplates } from "./helpers/templates.mjs";
import { ZWOLF } from "./helpers/config.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once("init", async function () {
    console.log("Z-Wolf Epic | Initializing Z-Wolf Epic System");

    // Add custom constants for configuration
    CONFIG.ZWOLF = ZWOLF;

    // Define custom Document classes
    CONFIG.Actor.documentClass = ZWolfActor;
    CONFIG.Item.documentClass = ZWolfItem;

    // Register data models
    CONFIG.Actor.dataModels = {
        character: ZWolfActorBase,
        npc: ZWolfActorBase
    };

    CONFIG.Item.dataModels = {
        item: ZWolfItemBase
    };

    // Register sheet application classes
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("zwolf-epic", ZWolfActorSheet, {
        makeDefault: true,
        label: "ZWOLF.SheetLabels.Actor"
    });

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("zwolf-epic", ZWolfItemSheet, {
        makeDefault: true,
        label: "ZWOLF.SheetLabels.Item"
    });

    // Register Handlebars helpers
    registerHandlebarsHelpers();

    // Preload Handlebars templates
    await preloadTemplates();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function () {
    console.log("Z-Wolf Epic | System Ready");
});
