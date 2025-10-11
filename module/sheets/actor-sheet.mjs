import { ActorDataCalculator } from "../helpers/actor-data-calculator.mjs";
import { RestHandler } from "../helpers/rest-handler.mjs";
import { SheetEventHandlers } from "../helpers/sheet-event-handlers.mjs";
import { DropZoneHandler } from "../helpers/drop-zone-handler.mjs";
import { EditorSaveHandler } from "../helpers/editor-save-handler.mjs";
import { SheetStateManager } from "../helpers/sheet-state-manager.mjs";

/**
 * Actor Sheet for Z-Wolf Epic system
 * Handles display and interaction for all actor types (pc, npc, eidolon, mook, spawn)
 */
export default class ZWolfActorSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
) {
  
  // ========================================
  // STATIC CONFIGURATION
  // ========================================
  
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
      viewBaseCreature: ZWolfActorSheet._onViewBaseCreature,
      changeTab: ZWolfActorSheet._onChangeTab
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

  // ========================================
  // CONSTRUCTOR & INITIALIZATION
  // ========================================

  constructor(options = {}) {
    super(options);
    
    // Initialize state manager with custom scroll selectors
    this.stateManager = new SheetStateManager(this, {
      scrollSelectors: ['.tab', '.abilities-accordion', '.biography-content', '.inventory-content', '.configure-content'],
      tabSelector: '.tab[data-tab]',
      tabNavSelector: '.sheet-tabs .item[data-tab]'
    });
    
    // Track custom drop processing
    this._processingCustomDrop = false;
    
    // Initialize tab groups
    this.tabGroups = {
      primary: "main"
    };
  }

  // ========================================
  // FOUNDRY LIFECYCLE - DATA PREPARATION
  // ========================================

  /** @override */
  async _prepareContext(options) {
    // Don't capture state if we're in the middle of a custom drop operation
    // The drop handler will capture state at the right time
    if (!this._processingCustomDrop && this.stateManager) {
      this.stateManager.captureState();
    }
    
    const context = await super._prepareContext(options);
    const calculator = new ActorDataCalculator(this.document);
    
    // Get all sheet data from calculator
    const sheetData = calculator.prepareSheetData(context);
    
    // Add actor type flags
    sheetData.isCharacter = ['pc', 'npc', 'eidolon'].includes(this.document.type);
    sheetData.isEidolon = this.document.type === 'eidolon';
    sheetData.isMook = this.document.type === 'mook';
    sheetData.isSpawn = this.document.type === 'spawn';
    sheetData.isGM = game.user.isGM;
    
    // Ensure tabGroups.primary has a value
    if (!this.tabGroups.primary) {
      this.tabGroups.primary = "main";
    }
    
    // Add tabs configuration
    sheetData.tabs = this._getTabs();
    sheetData.currentTab = this.tabGroups.primary;
    
    // Determine visible parts
    sheetData.showTabs = !sheetData.isSpawn;
    sheetData.showBiography = sheetData.isCharacter;
    sheetData.showInventory = sheetData.isCharacter;
    sheetData.showConfigure = !sheetData.isSpawn;
    
    return sheetData;
  }

  // ========================================
  // FOUNDRY LIFECYCLE - RENDERING
  // ========================================

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    
    // Activate the correct tab FIRST
    this._activateTab();
    
    // Activate rich text editors
    EditorSaveHandler.activateEditors(this);
    
    // Initialize event handlers
    const eventHandlers = new SheetEventHandlers(this);
    eventHandlers.bindEventListeners(this.element);

    // Initialize drop zones (not for spawns)
    if (this.document.type !== "spawn") {
      const dropHandler = new DropZoneHandler(this);
      
      dropHandler.bindDropZones(this.element);
    }
      
    // Apply lock state for character types
    if (['pc', 'npc', 'eidolon'].includes(this.document.type)) {
      const isLocked = this.document.system.buildPointsLocked || false;
      eventHandlers.updateSliderStates(isLocked);
    }
    
    // Set up cleanup hooks
    this._setupCleanupHooks();
    
    // Restore state AFTER everything else
    this.stateManager.restoreState();
  }

  /**
   * Activate the current tab
   * @private
   */
  _activateTab() {
    const activeTab = this.tabGroups.primary || "main";
    
    // Show the active tab content
    const tabContents = this.element.querySelectorAll('.tab[data-tab]');
    tabContents.forEach(tab => {
      if (tab.dataset.tab === activeTab) {
        tab.classList.add('active');
        tab.style.display = 'block';
      } else {
        tab.classList.remove('active');
        tab.style.display = 'none';
      }
    });
    
    // Highlight the active tab button
    const tabButtons = this.element.querySelectorAll('[data-group="primary"][data-tab]');
    tabButtons.forEach(btn => {
      if (btn.dataset.tab === activeTab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // ========================================
  // FOUNDRY LIFECYCLE - FORM SUBMISSION
  // ========================================

  /** @override */
  async _onSubmit(event, form, formData) {
    const submitData = foundry.utils.expandObject(formData.object);
    
    // Handle rich text editor saves
    for (const [key, value] of Object.entries(submitData)) {
      if (typeof value === 'string' && value.includes('<') && this._isRichTextField(key)) {
        const handled = await EditorSaveHandler.handleEditorSave(
          this.document, 
          key, 
          null, 
          value
        );
        if (handled) {
          delete submitData[key];
        }
      }
    }

    return super._onSubmit(event, form, foundry.utils.flattenObject(submitData));
  }

  /** @override */
  async close(options = {}) {
    this._cleanupHooks();
    this.element?.querySelector('.editor-content[data-edit]')?.classList.remove('editor-active');
    return super.close(options);
  }

  // ========================================
  // DROP HANDLING
  // ========================================

  /** @override */
    async _onDropItem(event, data) {
      // Don't process if custom drop zone is handling it
      if (this._processingCustomDrop) return false;
      
      // Check if dropped on a special zone
      const dropTarget = event.target.closest(
        '.foundation-drop-zone, .knack-drop-zone, .track-drop-zone, .talent-drop-zone, .equipment-drop-zone, .attunement-drop-zone'
      );
      if (dropTarget) return false;
      
      // Standard drop handling
      const result = await super._onDropItem(event, data);
      const item = await fromUuid(data.uuid);
      
      if (item) {
        // Lock non-equipment items
        if (item.type !== 'equipment') {
          await item.setFlag('zwolf-epic', 'locked', true);
        }
        
        // Re-render for progression items
        if (item.name === ZWolfActorSheet.PROGRESSION_ITEM_NAME) {
          this.render(false);
        }
      }
      
      return result;
    }

  // ========================================
  // TAB MANAGEMENT
  // ========================================

  /**
   * Get tab configuration for current actor type
   * @returns {Object} Tab configuration
   * @private
   */
  _getTabs() {
    const actorType = this.document.type;
    let tabs = {};
    
    // Character types get all tabs
    if (['pc', 'npc', 'eidolon'].includes(actorType)) {
      tabs = {
        main: { id: "main", group: "primary", label: "Main" },
        biography: { id: "biography", group: "primary", label: "Biography" },
        inventory: { id: "inventory", group: "primary", label: "Inventory" },
        configure: { id: "configure", group: "primary", label: "Configure" }
      };
    } 
    // Mooks get main and configure
    else if (actorType === "mook") {
      tabs = {
        main: { id: "main", group: "primary", label: "Main" },
        configure: { id: "configure", group: "primary", label: "Configure" }
      };
    }
    
    // Set active states
    for (const [k, v] of Object.entries(tabs)) {
      v.active = this.tabGroups.primary === k;
      v.cssClass = v.active ? "active" : "";
    }
    
    return tabs;
  }

  // ========================================
  // HOOK MANAGEMENT
  // ========================================

  /**
   * Set up hooks for item deletion and updates
   * @private
   */
  _setupCleanupHooks() {
    if (this._itemDeleteHook) {
      Hooks.off('deleteItem', this._itemDeleteHook);
    }
    if (this._itemUpdateHook) {
      Hooks.off('updateItem', this._itemUpdateHook);
    }

    this._itemDeleteHook = Hooks.on('deleteItem', (item, options, userId) => {
      if (item.actor?.id !== this.document.id || userId !== game.user.id) return;
      
      const hadSpecialProperties = 
        item.system?.grantedAbilities?.length > 0 ||
        item.name === ZWolfActorSheet.PROGRESSION_ITEM_NAME ||
        item.system?.knacksProvided > 0 ||
        ['ancestry', 'fundament'].includes(item.type);
      
      if (hadSpecialProperties && this.rendered) {
        this.render(false);
      }
    });

    // Add update hook for equipment and commodities
    this._itemUpdateHook = Hooks.on('updateItem', (item, changes, options, userId) => {
      if (item.actor?.id !== this.document.id || userId !== game.user.id) return;
      
      // Re-render for equipment/commodity changes that affect inventory totals
      if (['equipment', 'commodity'].includes(item.type)) {
        const affectsInventory = changes.system?.placement || 
                                changes.system?.bulk !== undefined || 
                                changes.system?.price !== undefined;
        
        if (affectsInventory && this.rendered) {
          this.render(false);
        }
      }
      
      // Re-render for items with special properties
      const hasSpecialChanges = 
        changes.system?.grantedAbilities ||
        changes.system?.knacksProvided !== undefined ||
        changes.system?.sideEffects;
      
      if (hasSpecialChanges && this.rendered) {
        this.render(false);
      }
    });
  }

  /**
   * Clean up hooks on close
   * @private
   */
  _cleanupHooks() {
    if (this._itemDeleteHook) {
      Hooks.off('deleteItem', this._itemDeleteHook);
      this._itemDeleteHook = null;
    }
    if (this._itemUpdateHook) {
      Hooks.off('updateItem', this._itemUpdateHook);
      this._itemUpdateHook = null;
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Check if a field is a rich text field
   * @param {string} key - Field key
   * @returns {boolean}
   * @private
   */
  _isRichTextField(key) {
    const richTextFields = [
      'system.languages',
      'system.liabilities', 
      'system.notes'
    ];
    return richTextFields.includes(key);
  }

  // ========================================
  // ACTION HANDLERS (STATIC)
  // ========================================

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
    
    const { ZWolfDice } = await import("../dice/dice-system.mjs");
    const progressionName = progression.charAt(0).toUpperCase() + progression.slice(1);
    
    await ZWolfDice.roll({
      modifier: bonus,
      flavor: `${progressionName} Progression Roll`,
      actor: this.document
    });
  }

  static async _onRollStat(event, target) {
    const stat = target.dataset.stat;
    const type = target.dataset.type;
    
    const { ZWolfDice } = await import("../dice/dice-system.mjs");
    
    // Handle speed specially
    if (type === 'speed' || stat === 'speed') {
      const bonus = parseInt(target.closest('.stat-item')?.querySelector('.stat-value')?.textContent?.replace('+', '')) || 0;
      await ZWolfDice.roll({
        modifier: bonus,
        flavor: "Speed Check",
        actor: this.document
      });
      return;
    }
    
    // Handle attributes and skills
    if (type === 'attribute') {
      await ZWolfDice.rollAttribute(this.document, stat);
    } else if (type === 'skill') {
      await ZWolfDice.rollSkill(this.document, stat);
    }
  }

  static async _onRollSpeed(event, target) {
    const modifier = parseInt(target.dataset.modifier) || 0;
    const flavor = target.dataset.flavor || "Speed Check";
    
    const { ZWolfDice } = await import("../dice/dice-system.mjs");
    await ZWolfDice.roll({ 
      modifier, 
      flavor, 
      actor: this.document 
    });
  }

  static async _onToggleLock(event, target) {
    const currentLock = this.document.system.buildPointsLocked || false;
    await this.document.update({ "system.buildPointsLocked": !currentLock });
  }

  static async _onToggleProgression(event, target) {
    // Don't toggle if clicking on the dice icon
    if (event.target.classList.contains('progression-die')) return;
    
    const progressionGroup = target.closest('.progression-group');
    if (progressionGroup) {
      progressionGroup.classList.toggle('collapsed');
    }
  }

  static async _onChangeTab(event, target) {
    const newTab = target.dataset.tab;
    const group = target.dataset.group || "primary";
    
    if (this.tabGroups[group] !== newTab) {
      // Update the tab group
      this.tabGroups[group] = newTab;
      
      // IMPORTANT: Update the state manager BEFORE any rendering
      this.stateManager.state.activeTab = newTab;
      
      // Use CSS to show/hide tabs immediately (no render needed)
      const tabContents = this.element.querySelectorAll('.tab[data-tab]');
      
      tabContents.forEach(tab => {
        if (tab.dataset.tab === newTab) {
          tab.classList.add('active');
          tab.style.display = 'block';
        } else {
          tab.classList.remove('active');
          tab.style.display = 'none';
        }
      });
      
      // Update tab button active states
      const tabButtons = this.element.querySelectorAll('[data-group="primary"][data-tab]');
      
      tabButtons.forEach(btn => {
        console.log(`Processing button: ${btn.dataset.tab}, making active: ${btn.dataset.tab === newTab}`);
        if (btn.dataset.tab === newTab) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    } else {
      console.log("Tab already active, no change needed");
    }
  }

  static async _onShortRest(event, target) {
    const restHandler = new RestHandler(this.document);
    await restHandler.performShortRest();
  }

  static async _onExtendedRest(event, target) {
    const restHandler = new RestHandler(this.document);
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
    
    if (!item) return;
    
    const confirmed = await Dialog.confirm({
      title: `Delete ${item.name}?`,
      content: `<p>Are you sure you want to delete ${item.name}?</p>`
    });
    
    if (confirmed) await item.delete();
  }

  static async _onViewBaseCreature(event, target) {
    const actorId = target.dataset.actorId;
    const actor = game.actors.get(actorId);
    if (actor) actor.sheet.render(true);
  }
}
