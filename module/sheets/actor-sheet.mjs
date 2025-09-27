import { ActorDataCalculator } from "../helpers/actor-data-calculator.mjs";
import { RestHandler } from "../helpers/rest-handler.mjs";
import { SheetEventHandlers } from "../helpers/sheet-event-handlers.mjs";
import { DropZoneHandler } from "../helpers/drop-zone-handler.mjs";
import { EditorSaveHandler } from "../helpers/editor-save-handler.mjs";

export default class ZWolfActorSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
) {
  
  _processingCustomDrop = false;
  
  static PROGRESSION_ITEM_NAME = "Progression Enhancement";
  static VITALITY_BOOST_ITEM_NAME = "Extra VP";

  static DEFAULT_OPTIONS = {
    classes: ["z-wolf-epic", "sheet", "actor"],
    position: { width: 900, height: 650 },
    actions: {
      editImage: ZWolfActorSheet._onEditImage,
      rollProgression: ZWolfActorSheet._onRollProgression,
      rollStat: ZWolfActorSheet._onRollStat,
      rollSpeed: ZWolfActorSheet._onRollSpeed,
      toggleLock: ZWolfActorSheet._onToggleLock,
      toggleProgression: ZWolfActorSheet._onToggleProgression,
      shortRest: ZWolfActorSheet._onShortRest,
      extendedRest: ZWolfActorSheet._onExtendedRest,
      editItem: ZWolfActorSheet._onEditItem,
      deleteItem: ZWolfActorSheet._onDeleteItem,
      viewBaseCreature: ZWolfActorSheet._onViewBaseCreature
    },
    window: {
      resizable: true,
      minimizable: true
    },
    form: {
      closeOnSubmit: false,
      submitOnChange: true
    }
  };

  static PARTS = {
    header: {
      template: "systems/zwolf-epic/templates/actor/parts/actor-header.hbs"
    },
    sidebar: {
      template: "systems/zwolf-epic/templates/actor/parts/actor-sidebar.hbs"
    },
    tabs: {
      template: "systems/zwolf-epic/templates/actor/parts/actor-tabs.hbs"
    },
    "tab-main": {
      template: "systems/zwolf-epic/templates/actor/parts/actor-abilities-accordion.hbs",
      scrollable: [".abilities-accordion"]
    },
    "tab-biography": {
      template: "systems/zwolf-epic/templates/actor/parts/actor-biography-content.hbs",
      scrollable: [".biography-content"]
    },
    "tab-inventory": {
      template: "systems/zwolf-epic/templates/actor/parts/actor-inventory-content.hbs",
      scrollable: [".inventory-content"]
    },
    "tab-configure": {
      template: "systems/zwolf-epic/templates/actor/parts/actor-configure-content.hbs",
      scrollable: [".configure-content"]
    }
  };

  tabGroups = {
    primary: "main"
  };

  /** @override */
  async _prepareContext(options) {
    console.log("🟢 _prepareContext called");
    console.log("🟢 Document type:", this.document?.type);
    console.log("🟢 Options:", options);
    
    const context = await super._prepareContext(options);
    console.log("🟢 Super context:", context);
    
    const calculator = new ActorDataCalculator(this.document);
    
    // Get all sheet data from calculator
    const sheetData = calculator.prepareSheetData(context);
    console.log("🟢 Sheet data from calculator:", sheetData);
    
    // Add actor type flags - map all character types
    sheetData.isCharacter = ['pc', 'npc', 'eidolon'].includes(this.document.type);
    sheetData.isMook = this.document.type === 'mook';
    sheetData.isSpawn = this.document.type === 'spawn';
    
    // Add tabs configuration based on actor type
    sheetData.tabs = this._getTabs();
    
    // Store current tab
    sheetData.currentTab = this.tabGroups.primary;
    
    // Determine which parts should be shown
    sheetData.showTabs = !sheetData.isSpawn;
    sheetData.showBiography = sheetData.isCharacter;
    sheetData.showInventory = sheetData.isCharacter;
    sheetData.showConfigure = !sheetData.isSpawn;
    
    console.log("🟢 Context properties:", Object.keys(sheetData));
    return sheetData;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    
    // ADD THIS LINE - Activate editors for rich text fields
    EditorSaveHandler.activateEditors(this);
    
    // Initialize event handlers
    const eventHandlers = new SheetEventHandlers(this);
    eventHandlers.bindEventListeners(this.element);

    // Initialize drop zone handlers (not needed for spawns)
    if (this.document.type !== "spawn") {
      const dropHandler = new DropZoneHandler(this);
      dropHandler.bindDropZones(this.element);
    }
    
    // Apply lock state for all character types (pc, npc, eidolon)
    if (['pc', 'npc', 'eidolon'].includes(this.document.type)) {
      const isLocked = this.document.system.buildPointsLocked || false;
      console.log("🟡 Applying lock state:", isLocked);
      eventHandlers.updateSliderStates(isLocked);
    }
    
    // Set up cleanup hooks
    this._setupCleanupHooks();
    
    // Restore scroll position if flagged
    if (this._scrollToRestore !== undefined) {
      const scrollTop = this._scrollToRestore;
      delete this._scrollToRestore;
      
      requestAnimationFrame(() => {
        // FIXED: Find the currently active tab instead of hardcoding .configure
        const scrollableTab = this.element.querySelector('.tab.active');
        if (scrollableTab) {
          scrollableTab.scrollTop = scrollTop;
          console.log(`🟢 Restored scroll position to ${scrollTop} for active tab`);
        }
      });
    }
  }

  /** @override */
  async _onSubmit(event, form, formData) {
    console.log('🔵 _onSubmit called, formData:', formData.object);
    console.trace();
    
    // ADDED: Preserve scroll position before processing submission
    this._preserveScrollPosition();
    
    const submitData = foundry.utils.expandObject(formData.object);
    
    // Handle rich text editor saves
    for (const [key, value] of Object.entries(submitData)) {
      if (typeof value === 'string' && value.includes('<') && this._isRichTextField(key)) {
        const { EditorSaveHandler } = await import("../helpers/editor-save-handler.mjs");
        
        const handled = await EditorSaveHandler.handleEditorSave(this.document, key, null, value);
        if (handled) {
          delete submitData[key];
        }
      }
    }

    return super._onSubmit(event, form, foundry.utils.flattenObject(submitData));
  }

  /**
   * Preserve scroll position of the currently active tab
   * @private
   */
  _preserveScrollPosition() {
    const activeTab = this.element.querySelector('.tab.active');
    if (activeTab) {
      const scrollTop = activeTab.scrollTop || 0;
      this._scrollToRestore = scrollTop;
      console.log(`🟡 Preserving scroll position: ${scrollTop} for active tab`);
    }
  }

  _isRichTextField(key) {
    const richTextFields = [
      'system.languages',
      'system.liabilities', 
      'system.notes'
    ];
    return richTextFields.includes(key);
  }

  /** @override */
  async close(options = {}) {
    this._cleanupHooks();
    this.element?.querySelector('.editor-content[data-edit]')?.classList.remove('editor-active');
    return super.close(options);
  }

  /** @override */
  async _onDropItem(event, data) {
    if (this._processingCustomDrop) return false;
    
    const dropTarget = event.target.closest('.foundation-drop-zone, .knack-drop-zone, .track-drop-zone, .talent-drop-zone, .equipment-drop-zone');
    if (dropTarget) return false;
    
    const result = await super._onDropItem(event, data);
    const item = await fromUuid(data.uuid);
    
    if (item) {
      if (item.type !== 'equipment') {
        await item.setFlag('zwolf-epic', 'locked', true);
      }
      
      if (item.name === ZWolfActorSheet.PROGRESSION_ITEM_NAME) {
        this.render(false);
      }
    }
    
    return result;
  }

  _getTabs() {
    const actorType = this.document.type;
    let tabs = {};
    
    // Check if it's any character type (pc, npc, eidolon)
    if (['pc', 'npc', 'eidolon'].includes(actorType)) {
      tabs = {
        main: { id: "main", group: "primary", label: "Main" },
        biography: { id: "biography", group: "primary", label: "Biography" },
        inventory: { id: "inventory", group: "primary", label: "Inventory" },
        configure: { id: "configure", group: "primary", label: "Configure" }
      };
    } else if (actorType === "mook") {
      tabs = {
        main: { id: "main", group: "primary", label: "Main" },
        configure: { id: "configure", group: "primary", label: "Configure" }
      };
    }
    
    for (const [k, v] of Object.entries(tabs)) {
      v.active = this.tabGroups.primary === k;
      v.cssClass = v.active ? "active" : "";
    }
    
    return tabs;
  }

  _setupCleanupHooks() {
    if (this._itemDeleteHook) {
      Hooks.off('deleteItem', this._itemDeleteHook);
    }

    this._itemDeleteHook = Hooks.on('deleteItem', (item, options, userId) => {
      if (item.actor?.id === this.document.id && userId === game.user.id) {
        const hadSpecialProperties = item.system?.grantedAbilities?.length > 0 ||
                                   item.name === ZWolfActorSheet.PROGRESSION_ITEM_NAME ||
                                   item.system?.knacksProvided > 0 ||
                                   ['ancestry', 'fundament'].includes(item.type);
        
        if (hadSpecialProperties) {
          setTimeout(() => {
            if (this.rendered) {
              this.render(false);
            }
          }, 100);
        }
      }
    });
  }

  _cleanupHooks() {
    if (this._itemDeleteHook) {
      Hooks.off('deleteItem', this._itemDeleteHook);
      this._itemDeleteHook = null;
    }
  }

  // Action handlers
  static async _onEditImage(event, target) {
    const fp = new FilePicker({
      type: "image",
      current: this.document.img,
      callback: path => this.document.update({ img: path })
    });
    return fp.browse();
  }

  static async _onRollProgression(event, target) {
    const progression = target.dataset.progression;
    const bonus = parseInt(target.dataset.bonus) || 0;
    // TODO: Implement roll logic
    console.log(`Rolling ${progression} progression with bonus ${bonus}`);
  }

  static async _onRollStat(event, target) {
    const stat = target.dataset.stat;
    const type = target.dataset.type;
    const progression = target.dataset.progression;
    // TODO: Implement roll logic
    console.log(`Rolling ${stat} (${type}) with ${progression} progression`);
  }

  static async _onRollSpeed(event, target) {
    const modifier = parseInt(target.dataset.modifier) || 0;
    const flavor = target.dataset.flavor || "Speed Check";
    // TODO: Implement roll logic
    console.log(`Rolling speed check with modifier ${modifier}: ${flavor}`);
  }

  static async _onToggleLock(event, target) {
    // CHANGED: Use the new _preserveScrollPosition method
    this._preserveScrollPosition();
    
    const currentLock = this.document.system.buildPointsLocked || false;
    await this.document.update({ "system.buildPointsLocked": !currentLock });
  }

  static async _onToggleProgression(event, target) {
    // Don't toggle if clicking on the dice icon
    if (event.target.classList.contains('progression-die')) {
      return;
    }
    
    const progressionGroup = target.closest('.progression-group');
    if (progressionGroup) {
      progressionGroup.classList.toggle('collapsed');
    }
  }

  static async _onShortRest(event, target) {
    const sheet = this; // 'this' is bound to the sheet instance by V2
    const restHandler = new RestHandler(sheet.document);
    await restHandler.performShortRest();
  }

  static async _onExtendedRest(event, target) {
    const sheet = this;
    const restHandler = new RestHandler(sheet.document);
    await restHandler.performExtendedRest();
  }

  static async _onEditItem(event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    const item = this.document.items.get(itemId);
    if (item) item.sheet.render(true);
  }

  static async _onDeleteItem(event, target) {
    const itemId = target.closest('[data-item-id]')?.dataset.itemId;
    const item = this.document.items.get(itemId);
    if (item) {
      const confirmed = await Dialog.confirm({
        title: `Delete ${item.name}?`,
        content: `<p>Are you sure you want to delete ${item.name}?</p>`
      });
      if (confirmed) await item.delete();
    }
  }

  static async _onViewBaseCreature(event, target) {
    const actorId = target.dataset.actorId;
    const actor = game.actors.get(actorId);
    if (actor) actor.sheet.render(true);
  }
}