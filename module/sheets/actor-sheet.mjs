export default class ZWolfActorSheet extends foundry.applications.sheets.ActorSheetV2 {
  
  _processingCustomDrop = false;
  _activeTab = "main";
  
  static PROGRESSION_ITEM_NAME = "Progression Enhancement";
  static VITALITY_BOOST_ITEM_NAME = "Extra VP";

  static DEFAULT_OPTIONS = {
    classes: ["z-wolf-epic", "sheet", "actor"],
    position: { width: 850, height: 950 },
    actions: {
      editImage: ZWolfActorSheet._onEditImage,
      rollProgression: ZWolfActorSheet._onRollProgression,
      rollStat: ZWolfActorSheet._onRollStat,
      toggleLock: ZWolfActorSheet._onToggleLock,
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
      template: "systems/z-wolf-epic/templates/actor/parts/actor-header.hbs"
    },
    body: {
      template: "systems/z-wolf-epic/templates/actor/parts/actor-body.hbs"
    }
  };

  tabGroups = {
    primary: "main"
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const calculator = new ActorDataCalculator(this.document);
    
    // Get all sheet data from calculator
    const sheetData = calculator.prepareSheetData(context);
    
    // Add actor type flags
    sheetData.isCharacter = this.document.type === "character";
    sheetData.isMook = this.document.type === "mook";
    sheetData.isSpawn = this.document.type === "spawn";
    
    // Add tabs based on actor type
    sheetData.tabs = this._getTabs();
    
    // Add parts configuration for conditional rendering in template
    sheetData.showTabs = !sheetData.isSpawn;
    sheetData.showBiography = sheetData.isCharacter;
    sheetData.showInventory = sheetData.isCharacter;
    sheetData.showConfigure = !sheetData.isSpawn;
    
    return sheetData;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    
    // Restore active tab
    const tabToActivate = this._activeTab || "main";
    this._activateTab(tabToActivate);
    
    // Add tab click listeners
    this.element.querySelectorAll('.sheet-tabs .item[data-tab]').forEach(tab => {
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        this._activateTab(event.currentTarget.dataset.tab);
      });
    });

    // Initialize event handlers from your helpers
    const eventHandlers = new SheetEventHandlers(this);
    eventHandlers.bindEventListeners(this.element);

    // Initialize drop zone handlers (not needed for spawns)
    if (this.document.type !== "spawn") {
      const dropHandler = new DropZoneHandler(this);
      dropHandler.bindDropZones(html);
    }
    
    // Apply lock state (only for characters)
    if (this.document.type === "character") {
      const isLocked = this.document.system.buildPointsLocked || false;
      eventHandlers.updateSliderStates(isLocked);
    }
    
    // Set up cleanup hooks
    this._setupCleanupHooks();
  }

  /** @override */
  async _onSubmit(event, form, formData) {
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
    
    if (actorType === "character") {
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
  }

  static async _onRollStat(event, target) {
    const stat = target.dataset.stat;
    const type = target.dataset.type;
    // TODO: Implement roll logic
  }

  static async _onToggleLock(event, target) {
    const currentLock = this.document.system.buildPointsLocked || false;
    await this.document.update({ "system.buildPointsLocked": !currentLock });
  }

  static async _onShortRest(event, target) {
    const { RestHandler } = await import("../helpers/rest-handler.mjs");
    await RestHandler.shortRest(this.document);
  }

  static async _onExtendedRest(event, target) {
    const { RestHandler } = await import("../helpers/rest-handler.mjs");
    await RestHandler.extendedRest(this.document);
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

  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    
    if (!this.isEditable) return;

    switch (partId) {
      case "header":
        this._attachImagePicker(htmlElement);
        break;
      case "sidebar":
        this._attachProgressionListeners(htmlElement);
        break;
      case "configure":
        this._attachConfigureListeners(htmlElement);
        break;
    }
  }
}