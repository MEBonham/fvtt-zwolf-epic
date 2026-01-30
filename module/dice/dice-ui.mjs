/**
 * Z-Wolf Epic UI Management
 * Handles the boost/jinx control panel in the chat sidebar.
 */

import { ZWOLF_DICE_CONSTANTS } from "./dice-constants.mjs";

export class ZWolfDiceUI {
    /**
     * Get the current net boosts value from the UI
     * @returns {number} The current net boosts value
     */
    static getNetBoosts() {
        const input = document.getElementById(ZWOLF_DICE_CONSTANTS.ELEMENTS.NET_BOOSTS_INPUT);
        return parseInt(input?.value) || 0;
    }

    /**
     * Set the net boosts value in the UI
     * @param {number} value - The value to set
     */
    static setNetBoosts(value) {
        const input = document.getElementById(ZWOLF_DICE_CONSTANTS.ELEMENTS.NET_BOOSTS_INPUT);
        if (input) {
            const clampedValue = Math.max(
                ZWOLF_DICE_CONSTANTS.MIN_BOOSTS,
                Math.min(ZWOLF_DICE_CONSTANTS.MAX_BOOSTS, parseInt(value) || 0)
            );
            input.value = clampedValue;
            this.updateNetBoostsDisplay();
        }
    }

    /**
     * Update the net boosts display to show current state
     */
    static updateNetBoostsDisplay() {
        const input = document.getElementById(ZWOLF_DICE_CONSTANTS.ELEMENTS.NET_BOOSTS_INPUT);
        const label = document.querySelector(ZWOLF_DICE_CONSTANTS.ELEMENTS.BOOST_LABEL);
        const container = document.querySelector(ZWOLF_DICE_CONSTANTS.ELEMENTS.BOOST_CONTROL);

        if (!input || !label) return;

        const value = parseInt(input.value) || 0;

        // Update label text and styling
        if (value > 0) {
            label.textContent = `${game.i18n.localize("ZWOLF_DICE.Boosts")}: ${value}`;
            container?.classList.remove(ZWOLF_DICE_CONSTANTS.CSS_CLASSES.JINX_ACTIVE);
            container?.classList.add(ZWOLF_DICE_CONSTANTS.CSS_CLASSES.BOOST_ACTIVE);
        } else if (value < 0) {
            label.textContent = `${game.i18n.localize("ZWOLF_DICE.Jinxes")}: ${Math.abs(value)}`;
            container?.classList.remove(ZWOLF_DICE_CONSTANTS.CSS_CLASSES.BOOST_ACTIVE);
            container?.classList.add(ZWOLF_DICE_CONSTANTS.CSS_CLASSES.JINX_ACTIVE);
        } else {
            label.textContent = `${game.i18n.localize("ZWOLF_DICE.NetBoosts")}: 0`;
            container?.classList.remove(
                ZWOLF_DICE_CONSTANTS.CSS_CLASSES.BOOST_ACTIVE,
                ZWOLF_DICE_CONSTANTS.CSS_CLASSES.JINX_ACTIVE
            );
        }
    }

    /**
     * Create the boost control HTML
     * @returns {string} HTML string for the boost control panel
     */
    static createBoostControl() {
        return `
            <div class="${ZWOLF_DICE_CONSTANTS.CSS_CLASSES.BOOST_CONTROL}">
                <div class="zwolf-boost-header">
                    <button id="${ZWOLF_DICE_CONSTANTS.ELEMENTS.QUICK_ROLL}" class="zwolf-icon-button" title="${game.i18n.localize("ZWOLF_DICE.QuickRoll")}">
                        <i class="fas fa-dice-d12"></i>
                    </button>
                    <span class="zwolf-boost-label">${game.i18n.localize("ZWOLF_DICE.NetBoosts")}: 0</span>
                </div>
                <div class="zwolf-boost-inputs">
                    <button id="${ZWOLF_DICE_CONSTANTS.ELEMENTS.BOOST_MINUS}" title="${game.i18n.localize("ZWOLF_DICE.RemoveBoost")}">
                        <i class="fas fa-minus"></i>
                    </button>
                    <input type="number" id="${ZWOLF_DICE_CONSTANTS.ELEMENTS.NET_BOOSTS_INPUT}"
                           value="0" min="${ZWOLF_DICE_CONSTANTS.MIN_BOOSTS}" max="${ZWOLF_DICE_CONSTANTS.MAX_BOOSTS}"
                           title="${game.i18n.localize("ZWOLF_DICE.BoostsJinxes")}"/>
                    <button id="${ZWOLF_DICE_CONSTANTS.ELEMENTS.BOOST_PLUS}" title="${game.i18n.localize("ZWOLF_DICE.AddBoost")}">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button id="${ZWOLF_DICE_CONSTANTS.ELEMENTS.BOOST_RESET}" title="${game.i18n.localize("ZWOLF_DICE.ResetBoosts")}">
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
            const title = absValue === 1
                ? game.i18n.localize("ZWOLF_DICE.OneJinx")
                : game.i18n.format("ZWOLF_DICE.MultipleJinxes", { count: absValue });
            buttons.push(`<button class="zwolf-quick-boost" data-value="${i}" title="${title}">${i}</button>`);
        }

        // Boost buttons (+1 to +3)
        for (let i = 1; i <= 3; i++) {
            const title = i === 1
                ? game.i18n.localize("ZWOLF_DICE.OneBoost")
                : game.i18n.format("ZWOLF_DICE.MultipleBoosts", { count: i });
            buttons.push(`<button class="zwolf-quick-boost" data-value="${i}" title="${title}">+${i}</button>`);
        }

        return buttons.join("");
    }

    /**
     * Initialize event listeners for boost controls using event delegation
     */
    static initializeEventListeners() {
        console.log("Z-Wolf Epic | Initializing dice UI event listeners");

        // Main click handler for all buttons
        document.addEventListener("click", async (event) => {
            await this._handleButtonClick(event);
        });

        // Input change handler
        document.addEventListener("change", (event) => {
            if (event.target.id === ZWOLF_DICE_CONSTANTS.ELEMENTS.NET_BOOSTS_INPUT) {
                this.updateNetBoostsDisplay();
            }
        });

        // Prevent input keydown from interfering with chat
        document.addEventListener("keydown", (event) => {
            if (event.target.id === ZWOLF_DICE_CONSTANTS.ELEMENTS.NET_BOOSTS_INPUT) {
                event.stopPropagation();
            }
        });
    }

    /**
     * Handle button click events
     * @private
     */
    static async _handleButtonClick(event) {
        const target = event.target.closest("button");
        if (!target) return;

        // Check if this is one of our buttons
        const isBoostButton = target.closest(".zwolf-boost-control");
        if (!isBoostButton) return;

        console.log("Z-Wolf Epic | Button clicked:", target.id || target.className);

        const id = target.id;
        const current = this.getNetBoosts();

        try {
            switch (id) {
                case ZWOLF_DICE_CONSTANTS.ELEMENTS.BOOST_PLUS:
                    this.setNetBoosts(current + 1);
                    break;

                case ZWOLF_DICE_CONSTANTS.ELEMENTS.BOOST_MINUS:
                    this.setNetBoosts(current - 1);
                    break;

                case ZWOLF_DICE_CONSTANTS.ELEMENTS.BOOST_RESET:
                    this.setNetBoosts(0);
                    break;

                case ZWOLF_DICE_CONSTANTS.ELEMENTS.QUICK_ROLL:
                    event.preventDefault();
                    event.stopPropagation();
                    await this._performQuickRoll(current);
                    break;
            }

            // Handle quick boost buttons
            if (target.classList.contains("zwolf-quick-boost")) {
                const value = parseInt(target.dataset.value);
                if (!isNaN(value)) {
                    this.setNetBoosts(value);
                }
            }
        } catch (error) {
            console.error("Z-Wolf Epic | Error handling button click:", error);
            ui.notifications.error("Button action failed");
        }
    }

    /**
     * Perform a quick roll with current boosts
     * @private
     */
    static async _performQuickRoll(netBoosts) {
        // Dynamic import to avoid circular dependency
        const { ZWolfDice } = await import("./dice-system.mjs");
        await ZWolfDice.roll({
            netBoosts,
            modifier: 0,
            flavor: game.i18n.localize("ZWOLF_DICE.QuickZWolfRoll")
        });
    }

    /**
     * Add boost controls to the chat interface
     * Called from renderChatLog hook or directly during initialization
     * CSS handles positioning at bottom via flexbox order
     */
    static addToChat() {
        // Check if controls already exist anywhere in the document
        if (document.querySelector(ZWOLF_DICE_CONSTANTS.ELEMENTS.BOOST_CONTROL)) {
            return;
        }

        // Find the chat sidebar - try multiple selectors for v13 compatibility
        const chatSidebar = document.querySelector("#chat")
            || document.querySelector("#sidebar [data-tab='chat']")
            || document.querySelector(".chat-sidebar");

        if (!chatSidebar) {
            console.warn("Z-Wolf Epic | Could not find chat sidebar for boost controls");
            return;
        }

        // Create control element
        const controlHtml = this.createBoostControl();
        const controlElement = document.createElement("div");
        controlElement.innerHTML = controlHtml.trim();
        const $control = controlElement.firstChild;

        // Find the chat form - try multiple selectors for v13 compatibility
        const chatForm = chatSidebar.querySelector("#chat-form")
            || chatSidebar.querySelector("form.chat-form")
            || chatSidebar.querySelector("[id$='-chat-form']");

        if (chatForm) {
            // Insert dice controls after the chat form
            chatForm.after($control);
        } else {
            // Fallback: append to chat sidebar
            chatSidebar.appendChild($control);
        }

        // Initialize display after short delay
        setTimeout(() => {
            this.updateNetBoostsDisplay();
            // Debug: verify buttons exist
            const buttons = $control.querySelectorAll("button");
            console.log("Z-Wolf Epic | Boost control buttons found:", buttons.length);
        }, 100);

        console.log("Z-Wolf Epic | Boost controls added to chat sidebar");
    }

    /**
     * Remove boost controls from the interface
     */
    static removeFromChat() {
        document.querySelectorAll(ZWOLF_DICE_CONSTANTS.ELEMENTS.BOOST_CONTROL).forEach(el => {
            el.remove();
        });
    }
}
