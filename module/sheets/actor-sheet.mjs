// /sheets/actor-sheet.mjs - Main sheet class (significantly reduced)

import { ActorDataCalculator } from "../helpers/actor-data-calculator.mjs";
import { DropZoneHandler } from "../helpers/drop-zone-handler.mjs";
import { SheetEventHandlers } from "../helpers/sheet-event-handlers.mjs";
import { RestHandler } from "../helpers/rest-handler.mjs";

export default class ZWolfActorSheet extends foundry.appv1.sheets.ActorSheet {
  
  _processingCustomDrop = false;
  
  // Static constants for the sheet
  static PROGRESSION_ITEM_NAME = "Progression Enhancement";
  static VITALITY_BOOST_ITEM_NAME = "Extra VP";

  /** @override */
  getData(options) {
    const context = super.getData(options);
    const calculator = new ActorDataCalculator(this.actor);
    
    // Delegate all data preparation to the calculator
    return calculator.prepareSheetData(context);
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    
    if (!this.isEditable) return;

    // Initialize event handlers
    const eventHandlers = new SheetEventHandlers(this);
    eventHandlers.bindEventListeners(html);

    // Initialize drop zone handlers
    const dropHandler = new DropZoneHandler(this);
    dropHandler.bindDropZones(html);
    
    // Apply lock state
    const isLocked = this.actor.system.buildPointsLocked || false;
    eventHandlers.updateSliderStates(isLocked);
    
    // Set up cleanup hooks
    this._setupCleanupHooks();
  }

  /** @override */
  async _onSubmit(event, {updateData=null, preventClose=false, preventRender=false}={}) {
    // Handle rich text editor saves
    const formData = this._getSubmitData(updateData);
    
    // Check if any of the submitted data is from rich text editors
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string' && value.includes('<') && this._isRichTextField(key)) {
        // This is likely rich text content, let EditorSaveHandler process it
        const { EditorSaveHandler } = await import("../helpers/editor-save-handler.mjs");
        
        const handled = await EditorSaveHandler.handleEditorSave(this.actor, key, null, value);
        if (handled) {
          // Remove from formData since it was handled separately
          delete formData[key];
        }
      }
    }

    return super._onSubmit(event, {updateData: formData, preventClose, preventRender});
  }

  /**
   * Check if a field key represents a rich text field
   */
  _isRichTextField(key) {
    const richTextFields = [
      'system.languages',
      'system.liabilities', 
      'system.notes'
    ];
    
    return richTextFields.includes(key);
  }

  /** @override */
  async close(options) {
    this._cleanupHooks();
    this.element.find('.editor-content[data-edit]').removeClass('editor-active');
    return super.close(options);
  }

  /** @override */
  async _onDropItem(event, data) {
    console.log("Z-Wolf Epic | _onDropItem called, flag is:", this._processingCustomDrop);
    
    if (this._processingCustomDrop) {
      console.log("Z-Wolf Epic | _onDropItem blocked - custom drop in progress");
      return false;
    }
    
    const dropTarget = event.target.closest('.foundation-drop-zone, .knack-drop-zone, .track-drop-zone, .talent-drop-zone, .equipment-drop-zone');
    if (dropTarget) {
      console.log("Z-Wolf Epic | _onDropItem blocked - dropped on custom zone");
      return false;
    }
    
    console.log("Z-Wolf Epic | _onDropItem proceeding with default behavior");
    
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

  /** @override */
  async _onDropItemDelete(item) {
    const result = await super._onDropItemDelete(item);
    
    if (item.name === ZWolfActorSheet.PROGRESSION_ITEM_NAME) {
      this.render(false);
    }
    
    return result;
  }

  /** @override */
  async _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    
    if (changed.system?.level !== undefined || changed.system?.fundamentId !== undefined) {
      console.log("Z-Wolf Epic | Level or fundament updated via _onUpdate hook");
      this.render(false);
    }
  }

  // =================================
  // PRIVATE HELPER METHODS
  // =================================
  
  _setupCleanupHooks() {
    if (this._itemDeleteHook) {
      Hooks.off('deleteItem', this._itemDeleteHook);
    }

    this._itemDeleteHook = Hooks.on('deleteItem', (item, options, userId) => {
      if (item.actor?.id === this.actor.id && userId === game.user.id) {
        console.log(`Z-Wolf Epic | Item ${item.name} deleted via hook, checking for re-render needs`);
        
        const hadSpecialProperties = item.system?.grantedAbilities?.length > 0 ||
                                   item.name === ZWolfActorSheet.PROGRESSION_ITEM_NAME ||
                                   item.system?.knacksProvided > 0 ||
                                   ['ancestry', 'fundament'].includes(item.type);
        
        if (hadSpecialProperties) {
          setTimeout(() => {
            if (!this._state.closed) {
              this.render(false);
            }
          }, 100);
        }
      }
    });

    Hooks.on('createItem', this._vitalityBoostHook);
    Hooks.on('deleteItem', this._vitalityBoostHook);
  }

  _cleanupHooks() {
    if (this._itemDeleteHook) {
      Hooks.off('deleteItem', this._itemDeleteHook);
      this._itemDeleteHook = null;
    }
    
    if (this._vitalityBoostHook) {
      Hooks.off('createItem', this._vitalityBoostHook);
      Hooks.off('deleteItem', this._vitalityBoostHook);
      this._vitalityBoostHook = null;
    }
  }
}
