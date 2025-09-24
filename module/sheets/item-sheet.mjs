import { ZWolfSheetMixin } from '../mixins/sheet-mixin.mjs';

/**
 * Extend the basic ItemSheet for Z-Wolf Epic items
 */
export default class ZWolfItemSheet extends ZWolfSheetMixin(foundry.appv1.sheets.ItemSheet) {
  
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["zwolf", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: null }]
    });
  }

  /** @override */
  get template() {
    const path = "systems/zwolf-epic/templates/item";
    return `${path}/item-${this.item.type}-sheet.hbs`;
  }

  /** @override */
  async getData(options) {
    const context = super.getData(options);
    
    // Add item-specific data
    context.item = this.item;
    context.system = this.item.system;
    context.flags = this.item.flags;
    
    // Add derived data
    context.enrichedDescription = await TextEditor.enrichHTML(this.item.system.description, {
      async: true,
      secrets: this.item.isOwner
    });

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Roll handlers
    html.find('.rollable').click(this._onRoll.bind(this));

    // Add/remove handlers
    html.find('.item-create').click(this._onItemCreate.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));
  }

  /**
   * Handle rolling for this item
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    
    // Delegate to item's roll method
    return this.item.roll(dataset);
  }

  /**
   * Handle creating embedded items
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    // Implementation depends on your item structure
  }

  /**
   * Handle deleting embedded items
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemDelete(event) {
    event.preventDefault();
    // Implementation depends on your item structure
  }
}
