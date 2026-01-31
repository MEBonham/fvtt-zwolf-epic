// Import document classes
import { ZWolfActor } from "./documents/Actor.mjs";
import { ZWolfItem } from "./documents/Item.mjs";
import ZWolfTokenDocument from "./documents/Token.mjs";

// Import vision system
import { ZWolfVisionRadiusDisplay } from "./vision/vision-radius-display.mjs";

// Import dice system
import { ZWolfDice } from "./dice/dice-system.mjs";

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
import { registerItemContextMenuOption } from "./helpers/item-sync.mjs";

// Import hooks
import { registerItemHooks } from "./hooks/item.mjs";
import { registerCombatHooks } from "./hooks/combat.mjs";
import { registerTokenHooks } from "./hooks/token.mjs";
import { registerActorDirectoryHook } from "./hooks/ui.mjs";
import { registerConditionLogger } from "./hooks/condition-logger.mjs";

// Import compendium helpers
import { populateMacrosCompendium, registerMacroSettings } from "./helpers/compendium-macros.mjs";

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
    CONFIG.Token.documentClass = ZWolfTokenDocument;

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

    // Register item hooks (source tracking for Push to Actors)
    registerItemHooks();

    // Register combat hooks (custom initiative system)
    registerCombatHooks();

    // Register token hooks (HUD modifications, detection modes)
    registerTokenHooks();

    // Register UI hooks (actor directory level display)
    registerActorDirectoryHook();

    // Register condition logger (chat messages for condition changes)
    registerConditionLogger();

    // Register item context menu option (Push to Actors)
    registerItemContextMenuOption();

    // Register macro compendium settings
    registerMacroSettings();

    // Initialize dice system (Phase 15)
    ZWolfDice.initialize();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function () {
    console.log("Z-Wolf Epic | System Ready");

    // Check for libWrapper dependency
    if (!game.modules.get("lib-wrapper")?.active) {
        ui.notifications.error(
            game.i18n.localize("ZWOLF.Errors.LibWrapperRequired"),
            { permanent: true }
        );
        console.error("Z-Wolf Epic | libWrapper module is not active. Some features may not work correctly.");
    }

    // Initialize vision radius display (Phase 14)
    ZWolfVisionRadiusDisplay.initialize();

    // Populate macros compendium on first load
    await populateMacrosCompendium();
});
