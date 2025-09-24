/**
 * Z-Wolf Epic UI Management
 * Handles the boost/jinx control panel and user interface
 */

import { ZWOLF_CONSTANTS } from './dice-constants.mjs';

export class ZWolfUI {
  /**
   * Get the current net boosts value from the UI
   * @returns {number} The current net boosts value
   */
  static getNetBoosts() {
    const input = document.getElementById(ZWOLF_CONSTANTS.ELEMENTS.NET_BOOSTS_INPUT);
    return parseInt(input?.value) || 0;
  }
  
  /**
   * Set the net boosts value in the UI
   * @param {number} value - The value to set
   */
  static setNetBoosts(value) {
    const input = document.getElementById(ZWOLF_CONSTANTS.ELEMENTS.NET_BOOSTS_INPUT);
    if (input) {
      const clampedValue = Math.max(
        ZWOLF_CONSTANTS.MIN_BOOSTS, 
        Math.min(ZWOLF_CONSTANTS.MAX_BOOSTS, parseInt(value) || 0)
      );
      input.value = clampedValue;
      this.updateNetBoostsDisplay();
    }
  }
  
  /**
   * Update the net boosts display to show current state
   */
  static updateNetBoostsDisplay() {
    const input = document.getElementById(ZWOLF_CONSTANTS.ELEMENTS.NET_BOOSTS_INPUT);
    const label = document.querySelector(ZWOLF_CONSTANTS.ELEMENTS.BOOST_LABEL);
    const container = document.querySelector(ZWOLF_CONSTANTS.ELEMENTS.BOOST_CONTROL);
    
    if (!input || !label) return;
    
    const value = parseInt(input.value) || 0;
    
    // Update label text and styling
    this._updateLabelAndStyling(label, container, value);
  }

  /**
   * Update label text and container styling based on boost value
   * @private
   */
  static _updateLabelAndStyling(label, container, value) {
    if (value > 0) {
      label.textContent = `Boosts: ${value}`;
      container?.classList.remove(ZWOLF_CONSTANTS.CSS_CLASSES.JINX_ACTIVE);
      container?.classList.add(ZWOLF_CONSTANTS.CSS_CLASSES.BOOST_ACTIVE);
    } else if (value < 0) {
      label.textContent = `Jinxes: ${Math.abs(value)}`;
      container?.classList.remove(ZWOLF_CONSTANTS.CSS_CLASSES.BOOST_ACTIVE);
      container?.classList.add(ZWOLF_CONSTANTS.CSS_CLASSES.JINX_ACTIVE);
    } else {
      label.textContent = 'Net Boosts: 0';
      container?.classList.remove(
        ZWOLF_CONSTANTS.CSS_CLASSES.BOOST_ACTIVE, 
        ZWOLF_CONSTANTS.CSS_CLASSES.JINX_ACTIVE
      );
    }
  }
  
  /**
   * Create the boost control HTML
   * @returns {string} HTML string for the boost control panel
   */
  static createBoostControl() {
    return `
      <div class="${ZWOLF_CONSTANTS.CSS_CLASSES.BOOST_CONTROL}">
        <div class="zwolf-boost-header">
          <button id="${ZWOLF_CONSTANTS.ELEMENTS.QUICK_ROLL}" class="zwolf-icon-button" title="Quick roll with current boosts">
            <i class="fas fa-dice-d12"></i>
          </button>
          <span class="zwolf-boost-label">Net Boosts: 0</span>
        </div>
        <div class="zwolf-boost-inputs">
          <button id="${ZWOLF_CONSTANTS.ELEMENTS.BOOST_MINUS}" title="Remove Boost / Add Jinx">
            <i class="fas fa-minus"></i>
          </button>
          <input type="number" id="${ZWOLF_CONSTANTS.ELEMENTS.NET_BOOSTS_INPUT}" 
                 value="0" min="${ZWOLF_CONSTANTS.MIN_BOOSTS}" max="${ZWOLF_CONSTANTS.MAX_BOOSTS}" 
                 title="Positive = Boosts, Negative = Jinxes"/>
          <button id="${ZWOLF_CONSTANTS.ELEMENTS.BOOST_PLUS}" title="Add Boost / Remove Jinx">
            <i class="fas fa-plus"></i>
          </button>
          <button id="${ZWOLF_CONSTANTS.ELEMENTS.BOOST_RESET}" title="Reset to 0">
            <i class="fas fa-undo"></i>
          </button>
        </div>
        <div class="zwolf-boost-quick">
          ${this._createQuickBoostButtons()}
        </div>
      </div>
    `;
  }

  /**
   * Create quick boost buttons HTML
   * @private
   */
  static _createQuickBoostButtons() {
    const buttons = [];
    
    // Jinx buttons (-3 to -1)
    for (let i = -3; i <= -1; i++) {
      const absValue = Math.abs(i);
      const title = absValue === 1 ? '1 Jinx' : `${absValue} Jinxes`;
      buttons.push(`<button class="zwolf-quick-boost" data-value="${i}" title="${title}">${i}</button>`);
    }
    
    // Boost buttons (+1 to +3)
    for (let i = 1; i <= 3; i++) {
      const title = i === 1 ? '1 Boost' : `${i} Boosts`;
      buttons.push(`<button class="zwolf-quick-boost" data-value="${i}" title="${title}">+${i}</button>`);
    }
    
    return buttons.join('');
  }
  
  /**
   * Initialize event listeners for boost controls using event delegation
   */
  static initializeEventListeners() {
    // Main click handler for all buttons
    document.addEventListener('click', async (event) => {
      await this._handleButtonClick(event);
    });
    
    // Input change handler
    document.addEventListener('change', (event) => {
      if (event.target.id === ZWOLF_CONSTANTS.ELEMENTS.NET_BOOSTS_INPUT) {
        this.updateNetBoostsDisplay();
      }
    });
    
    // Prevent input keydown from interfering with chat
    document.addEventListener('keydown', (event) => {
      if (event.target.id === ZWOLF_CONSTANTS.ELEMENTS.NET_BOOSTS_INPUT) {
        event.stopPropagation();
      }
    });
  }

  /**
   * Handle button click events
   * @private
   */
  static async _handleButtonClick(event) {
    const target = event.target.closest('button');
    if (!target) return;
    
    const id = target.id;
    const current = this.getNetBoosts();
    
    try {
      switch (id) {
        case ZWOLF_CONSTANTS.ELEMENTS.BOOST_PLUS:
          this.setNetBoosts(current + 1);
          break;
          
        case ZWOLF_CONSTANTS.ELEMENTS.BOOST_MINUS:
          this.setNetBoosts(current - 1);
          break;
          
        case ZWOLF_CONSTANTS.ELEMENTS.BOOST_RESET:
          this.setNetBoosts(0);
          break;
          
        case ZWOLF_CONSTANTS.ELEMENTS.QUICK_ROLL:
          event.preventDefault();
          event.stopPropagation();
          await this._performQuickRoll(current);
          break;
      }
      
      // Handle quick boost buttons
      if (target.classList.contains('zwolf-quick-boost')) {
        const value = parseInt(target.dataset.value);
        if (!isNaN(value)) {
          this.setNetBoosts(value);
        }
      }
    } catch (error) {
      console.error("Z-Wolf Epic | Error handling button click:", error);
      ui.notifications.error("Button action failed. Check console for details.");
    }
  }

  /**
   * Perform a quick roll with current boosts
   * @private
   */
  static async _performQuickRoll(netBoosts) {
    // Dynamic import to avoid circular dependency
    const { ZWolfDiceCore } = await import('./dice-core.mjs');
    const { ZWolfChat } = await import('./dice-chat.mjs');
    
    const rollResult = await ZWolfDiceCore.roll({
      netBoosts: netBoosts,
      modifier: 0,
      flavor: "Quick Z-Wolf Roll"
    });
    
    if (rollResult) {
      await ZWolfChat.createChatMessage(rollResult);
      
      // Auto-reset if enabled
      if (this._shouldAutoReset()) {
        this.setNetBoosts(0);
      }
    }
  }

  /**
   * Check if auto-reset is enabled
   * @private
   */
  static _shouldAutoReset() {
    try {
      return game.settings.get(game.system.id, ZWOLF_CONSTANTS.SETTINGS.AUTO_RESET_BOOSTS);
    } catch (error) {
      console.warn("Z-Wolf Epic | Could not read auto-reset setting, defaulting to true");
      return true;
    }
  }
  
  /**
   * Add boost controls to the chat interface
   * @param {jQuery|HTMLElement} html - The chat HTML element
   */
  static addToChat(html) {
    const $html = html instanceof jQuery ? html : $(html);
    
    // Check if controls already exist
    if ($html.find(ZWOLF_CONSTANTS.ELEMENTS.BOOST_CONTROL).length > 0) {
      return;
    }
    
    const controlHtml = this.createBoostControl();
    const $control = $(controlHtml);
    
    // Insert after chat form (below chat input)
    const chatForm = $html.find('#chat-form');
    if (chatForm.length > 0) {
      chatForm.after($control);
    } else {
      // Fallback if chat form not found
      $html.append($control);
    }
    
    // Initialize display after short delay to ensure DOM is ready
    setTimeout(() => {
      this.updateNetBoostsDisplay();
    }, 100);
  }

  /**
   * Remove boost controls from the interface
   */
  static removeFromChat() {
    document.querySelectorAll(ZWOLF_CONSTANTS.ELEMENTS.BOOST_CONTROL).forEach(el => {
      el.remove();
    });
  }

  /**
   * Refresh the boost controls (remove and re-add)
   * @param {jQuery|HTMLElement} html - The chat HTML element
   */
  static refreshControls(html) {
    this.removeFromChat();
    this.addToChat(html);
  }
}
