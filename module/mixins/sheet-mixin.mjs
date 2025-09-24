/**
 * A mixin for shared functionality across Z-Wolf Epic sheets
 * @param {class} BaseSheet - The base sheet class to extend
 * @returns {class} The mixed class
 */
export function ZWolfSheetMixin(BaseSheet) {
  return class extends BaseSheet {

    /** @override */
    async getData(options) {
      const context = await super.getData(options);
      
      // Add common Z-Wolf data
      context.config = CONFIG.ZWOLF;
      context.isGM = game.user.isGM;
      context.isOwner = this.document.isOwner;
      context.limited = this.document.limited;
      
      // Add system-specific helpers
      context.systemData = this.document.system;
      context.dtypes = ["String", "Number", "Boolean"];
      
      return context;
    }

    /** @override */
    activateListeners(html) {
      super.activateListeners(html);

      // Common input handlers
      html.find('input[data-dtype="Number"]').change(this._onNumberInputChange.bind(this));
      html.find('.resource-control').click(this._onResourceControl.bind(this));
      
      // Image handling
      html.find('.profile-img').click(this._onEditImage.bind(this));
      
      // Drag and drop
      if (this.isEditable) {
        const dragDrop = new DragDrop({
          dropSelector: ".sheet-body",
          callbacks: { drop: this._onDrop.bind(this) }
        });
        dragDrop.bind(html[0]);
      }
    }

    /**
     * Handle number input changes to ensure valid numeric values
     * @param {Event} event - The input change event
     * @private
     */
    _onNumberInputChange(event) {
      const input = event.currentTarget;
      const value = parseFloat(input.value) || 0;
      
      // Enforce min/max if specified
      if (input.min && value < parseFloat(input.min)) {
        input.value = input.min;
      } else if (input.max && value > parseFloat(input.max)) {
        input.value = input.max;
      }
    }

    /**
     * Handle resource increment/decrement controls
     * @param {Event} event - The click event
     * @private
     */
    async _onResourceControl(event) {
      event.preventDefault();
      const button = event.currentTarget;
      const action = button.dataset.action;
      const resource = button.dataset.resource;
      
      if (!resource || !action) return;
      
      const current = foundry.utils.getProperty(this.document.system, resource) || 0;
      const change = action === "increase" ? 1 : -1;
      const newValue = Math.max(0, current + change);
      
      return this.document.update({
        [`system.${resource}`]: newValue
      });
    }

    /**
     * Handle editing the document's image
     * @param {Event} event - The click event
     * @private
     */
    _onEditImage(event) {
      event.preventDefault();
      const attr = event.currentTarget.dataset.edit;
      const current = foundry.utils.getProperty(this.document, attr);
      
      new FilePicker({
        type: "image",
        current: current,
        callback: (path) => {
          this.document.update({ [attr]: path });
        },
        top: this.position.top + 40,
        left: this.position.left + 10
      }).browse();
    }

    /**
     * Handle dropped items
     * @param {DragEvent} event - The drop event
     * @private
     */
    async _onDrop(event) {
      const data = TextEditor.getDragEventData(event);
      const document = this.document;
      
      // Handle different drop types
      switch (data.type) {
        case "Item":
          return this._onDropItem(event, data);
        case "ActiveEffect":
          return this._onDropActiveEffect(event, data);
        default:
          return false;
      }
    }

    /**
     * Handle dropping an item
     * @param {DragEvent} event - The drop event
     * @param {Object} data - The dropped data
     * @private
     */
    async _onDropItem(event, data) {
      if (!this.document.isOwner) return false;
      
      const item = await Item.implementation.fromDropData(data);
      if (!item) return false;
      
      // Override to implement item-specific drop logic
      return this._handleItemDrop(item, event, data);
    }

    /**
     * Handle dropping an active effect
     * @param {DragEvent} event - The drop event
     * @param {Object} data - The dropped data
     * @private
     */
    async _onDropActiveEffect(event, data) {
      if (!this.document.isOwner) return false;
      
      const effect = await ActiveEffect.implementation.fromDropData(data);
      if (!effect) return false;
      
      // Create the effect on this document
      return ActiveEffect.create({
        ...effect.toObject(),
        origin: this.document.uuid
      }, { parent: this.document });
    }

    /**
     * Handle item drops - override in subclasses
     * @param {Item} item - The dropped item
     * @param {DragEvent} event - The drop event
     * @param {Object} data - The dropped data
     * @protected
     */
    async _handleItemDrop(item, event, data) {
      // Default: just create the item if it's being dropped on an actor
      if (this.document.documentName === "Actor") {
        return this.document.createEmbeddedDocuments("Item", [item.toObject()]);
      }
      return false;
    }

    /**
     * Format numbers for display
     * @param {number} value - The number to format
     * @param {Object} options - Formatting options
     * @returns {string} Formatted number
     * @protected
     */
    formatNumber(value, { decimals = 0, signed = false } = {}) {
      if (typeof value !== "number") return "—";
      
      const formatted = value.toFixed(decimals);
      return signed && value > 0 ? `+${formatted}` : formatted;
    }

    /**
     * Get localized label for a key
     * @param {string} key - The localization key
     * @param {Object} data - Optional data for interpolation
     * @returns {string} Localized string
     * @protected
     */
    localize(key, data = {}) {
      return game.i18n.format(`ZWOLF.${key}`, data);
    }

    /**
     * Show a notification message
     * @param {string} message - The message to show
     * @param {string} type - Notification type (info, warn, error)
     * @protected
     */
    notify(message, type = "info") {
      ui.notifications[type](this.localize(message));
    }
  };
}
