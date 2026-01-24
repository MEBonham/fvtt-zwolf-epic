/**
 * Sheet State Manager
 * Handles scroll positions, tab states, and accordion states across re-renders
 * 
 * Usage in your sheet class:
 * 
 * class MySheet extends ApplicationV2 {
 *   constructor(options) {
 *     super(options);
 *     this.stateManager = new SheetStateManager(this);
 *   }
 * 
 *   _prepareContext(options) {
 *     this.stateManager.captureState();
 *     // ... rest of context prep
 *   }
 * 
 *   _onRender(context, options) {
 *     super._onRender(context, options);
 *     this.stateManager.restoreState();
 *   }
 * }
 */

export class SheetStateManager {
  /**
   * @param {Application} sheet - The sheet application instance
   * @param {Object} options - Configuration options
   * @param {string[]} options.scrollSelectors - CSS selectors for scrollable containers
   * @param {string} options.tabSelector - CSS selector for tabs
   * @param {string} options.accordionSelector - CSS selector for accordion sections
   */
  constructor(sheet, options = {}) {
    this.sheet = sheet;
    
    // Configuration
    this.config = {
      scrollSelectors: options.scrollSelectors || [
        '.window-content',
        '.tab',
        '.scrollable',
        '[data-scrollable]'
      ],
      tabSelector: options.tabSelector || '.tab[data-tab]',
      tabNavSelector: options.tabNavSelector || '.sheet-tabs .item[data-tab]',
      accordionSelector: options.accordionSelector || 'details[data-accordion]',
      
      // Debugging
      debug: options.debug || false
    };
    
    // State storage
    this.state = {
      scrollPositions: {},
      activeTab: null,
      accordionStates: {}
    };
  }

  /**
   * Capture current sheet state before re-render
   * Call this in _prepareContext
   */
  captureState() {
    if (!this.sheet.element) return;
    
    this._captureScrollPositions();
    this._captureActiveTab();
    this._captureAccordionStates();
    
    if (this.config.debug) {
      console.log('Sheet State Captured:', this.state);
    }
  }

  /**
   * Restore sheet state after re-render
   * Call this in _onRender (after super._onRender)
   */
  restoreState() {
    if (!this.sheet.element) return;
    
    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      this._restoreActiveTab();
      this._restoreAccordionStates();
      this._restoreScrollPositions();
      
      if (this.config.debug) {
        console.log('Sheet State Restored:', this.state);
      }
    });
  }

  /**
   * Clear all stored state
   */
  clearState() {
    this.state = {
      scrollPositions: {},
      activeTab: null,
      accordionStates: {}
    };
  }

  // ========================================
  // SCROLL POSITION MANAGEMENT
  // ========================================

  /**
   * Capture scroll positions of all scrollable containers
   * @private
   */
  _captureScrollPositions() {
    this.state.scrollPositions = {};
    
    this.config.scrollSelectors.forEach(selector => {
      const containers = this.sheet.element.querySelectorAll(selector);
      
      containers.forEach((container, index) => {
        if (container.scrollTop > 0) {
          // Create unique key for this container
          const key = this._getScrollKey(selector, index, container);
          this.state.scrollPositions[key] = container.scrollTop;
          
          if (this.config.debug) {
            console.log(`Captured scroll: ${key} = ${container.scrollTop}px`);
          }
        }
      });
    });
  }

  /**
   * Restore scroll positions to all scrollable containers
   * @private
   */
  _restoreScrollPositions() {
    Object.entries(this.state.scrollPositions).forEach(([key, scrollTop]) => {
      const container = this._findScrollContainer(key);
      
      if (container) {
        container.scrollTop = scrollTop;
        
        if (this.config.debug) {
          console.log(`Restored scroll: ${key} = ${scrollTop}px`);
        }
      }
    });
  }

  /**
   * Generate a unique key for a scroll container
   * @private
   */
  _getScrollKey(selector, index, container) {
    // Try to use data attributes for more stable keys
    const tabId = container.dataset?.tab;
    const accordionId = container.dataset?.accordion;
    
    if (tabId) return `tab-${tabId}`;
    if (accordionId) return `accordion-${accordionId}`;
    
    return `${selector}-${index}`;
  }

  /**
   * Find a scroll container by its key
   * @private
   */
  _findScrollContainer(key) {
    // Try tab-specific containers first
    if (key.startsWith('tab-')) {
      const tabId = key.replace('tab-', '');
      return this.sheet.element.querySelector(`.tab[data-tab="${tabId}"]`);
    }
    
    // Try accordion-specific containers
    if (key.startsWith('accordion-')) {
      const accordionId = key.replace('accordion-', '');
      return this.sheet.element.querySelector(`[data-accordion="${accordionId}"]`);
    }
    
    // Fall back to selector-based lookup
    const [selector, index] = key.split('-');
    const containers = this.sheet.element.querySelectorAll(selector);
    return containers[parseInt(index)];
  }

  // ========================================
  // TAB MANAGEMENT
  // ========================================

  /**
   * Capture the currently active tab
   * @private
   */
  _captureActiveTab() {
    const activeTab = this.sheet.element.querySelector(`${this.config.tabSelector}.active`) ||
                      this.sheet.element.querySelector(`${this.config.tabNavSelector}.active`);
    
    if (activeTab) {
      this.state.activeTab = activeTab.dataset.tab;
      
      if (this.config.debug) {
        console.log(`Captured active tab: ${this.state.activeTab}`);
      }
    }
  }

  /**
   * Restore the previously active tab
   * @private
   */
  _restoreActiveTab() {
    if (!this.state.activeTab) return;
    
    // Find and activate the tab content
    const tabContent = this.sheet.element.querySelector(
      `${this.config.tabSelector}[data-tab="${this.state.activeTab}"]`
    );
    
    if (tabContent) {
      // Hide all tabs
      this.sheet.element.querySelectorAll(this.config.tabSelector).forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
      });
      
      // Show the active tab
      tabContent.classList.add('active');
      tabContent.style.display = 'block';
    }
    
    // Update tab navigation
    const tabNav = this.sheet.element.querySelector(
      `${this.config.tabNavSelector}[data-tab="${this.state.activeTab}"]`
    );
    
    if (tabNav) {
      this.sheet.element.querySelectorAll(this.config.tabNavSelector).forEach(nav => {
        nav.classList.remove('active');
      });
      
      tabNav.classList.add('active');
    }
    
    if (this.config.debug) {
      console.log(`Restored active tab: ${this.state.activeTab}`);
    }
  }

  /**
   * Set the active tab programmatically
   * @param {string} tabId - The tab ID to activate
   */
  setActiveTab(tabId) {
    this.state.activeTab = tabId;
    this._restoreActiveTab();
  }

  // ========================================
  // ACCORDION MANAGEMENT
  // ========================================

  /**
   * Capture the open/closed state of all accordions
   * @private
   */
  _captureAccordionStates() {
    this.state.accordionStates = {};
    
    const accordions = this.sheet.element.querySelectorAll(this.config.accordionSelector);
    
    accordions.forEach(accordion => {
      const id = accordion.dataset.accordion || accordion.id;
      if (id) {
        this.state.accordionStates[id] = accordion.open;
        
        if (this.config.debug) {
          console.log(`Captured accordion: ${id} = ${accordion.open}`);
        }
      }
    });
  }

  /**
   * Restore the open/closed state of all accordions
   * @private
   */
  _restoreAccordionStates() {
    Object.entries(this.state.accordionStates).forEach(([id, isOpen]) => {
      const accordion = this.sheet.element.querySelector(
        `${this.config.accordionSelector}[data-accordion="${id}"], ` +
        `${this.config.accordionSelector}[id="${id}"]`
      );
      
      if (accordion) {
        accordion.open = isOpen;
        
        if (this.config.debug) {
          console.log(`Restored accordion: ${id} = ${isOpen}`);
        }
      }
    });
  }

  /**
   * Toggle an accordion's state
   * @param {string} accordionId - The accordion ID to toggle
   */
  toggleAccordion(accordionId) {
    const accordion = this.sheet.element.querySelector(
      `${this.config.accordionSelector}[data-accordion="${accordionId}"], ` +
      `${this.config.accordionSelector}[id="${accordionId}"]`
    );
    
    if (accordion) {
      accordion.open = !accordion.open;
      this.state.accordionStates[accordionId] = accordion.open;
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get current state as a plain object
   * @returns {Object}
   */
  getState() {
    return foundry.utils.deepClone(this.state);
  }

  /**
   * Load state from a plain object
   * @param {Object} state
   */
  setState(state) {
    this.state = foundry.utils.deepClone(state);
  }
}

/**
 * Simplified Tab Manager (if you don't need full state management)
 * Just handles tab switching without state persistence
 */
export class TabManager {
  /**
   * @param {HTMLElement} element - The sheet element
   * @param {Object} options - Configuration options
   */
  constructor(element, options = {}) {
    this.element = element;
    this.config = {
      tabSelector: options.tabSelector || '.tab[data-tab]',
      tabNavSelector: options.tabNavSelector || '.sheet-tabs .item[data-tab]'
    };
    
    this._attachListeners();
  }

  /**
   * Attach click listeners to tab navigation
   * @private
   */
  _attachListeners() {
    const navItems = this.element.querySelectorAll(this.config.tabNavSelector);
    
    navItems.forEach(nav => {
      nav.addEventListener('click', (event) => {
        event.preventDefault();
        const tabId = nav.dataset.tab;
        if (tabId) this.activateTab(tabId);
      });
    });
  }

  /**
   * Activate a specific tab
   * @param {string} tabId - The tab to activate
   */
  activateTab(tabId) {
    // Hide all tabs
    this.element.querySelectorAll(this.config.tabSelector).forEach(tab => {
      tab.classList.remove('active');
      tab.style.display = 'none';
    });
    
    // Show the selected tab
    const activeTab = this.element.querySelector(`${this.config.tabSelector}[data-tab="${tabId}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
      activeTab.style.display = 'block';
    }
    
    // Update navigation
    this.element.querySelectorAll(this.config.tabNavSelector).forEach(nav => {
      nav.classList.remove('active');
    });
    
    const activeNav = this.element.querySelector(`${this.config.tabNavSelector}[data-tab="${tabId}"]`);
    if (activeNav) {
      activeNav.classList.add('active');
    }
  }
}

/**
 * Accordion Manager (standalone utility)
 * Manages accordion state without full sheet integration
 */
export class AccordionManager {
  /**
   * @param {HTMLElement} element - The container element
   * @param {Object} options - Configuration options
   */
  constructor(element, options = {}) {
    this.element = element;
    this.config = {
      accordionSelector: options.accordionSelector || 'details[data-accordion]',
      rememberState: options.rememberState !== false
    };
    
    this.state = {};
    
    if (this.config.rememberState) {
      this._attachListeners();
    }
  }

  /**
   * Attach listeners to track accordion state changes
   * @private
   */
  _attachListeners() {
    const accordions = this.element.querySelectorAll(this.config.accordionSelector);
    
    accordions.forEach(accordion => {
      accordion.addEventListener('toggle', () => {
        const id = accordion.dataset.accordion || accordion.id;
        if (id) {
          this.state[id] = accordion.open;
        }
      });
    });
  }

  /**
   * Get current accordion states
   * @returns {Object} Map of accordion ID to open state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Restore accordion states
   * @param {Object} state - Map of accordion ID to open state
   */
  restoreState(state) {
    Object.entries(state).forEach(([id, isOpen]) => {
      const accordion = this.element.querySelector(
        `${this.config.accordionSelector}[data-accordion="${id}"], ` +
        `${this.config.accordionSelector}[id="${id}"]`
      );
      
      if (accordion) {
        accordion.open = isOpen;
      }
    });
    
    this.state = { ...state };
  }

  /**
   * Open all accordions
   */
  expandAll() {
    const accordions = this.element.querySelectorAll(this.config.accordionSelector);
    accordions.forEach(accordion => {
      accordion.open = true;
      const id = accordion.dataset.accordion || accordion.id;
      if (id) this.state[id] = true;
    });
  }

  /**
   * Close all accordions
   */
  collapseAll() {
    const accordions = this.element.querySelectorAll(this.config.accordionSelector);
    accordions.forEach(accordion => {
      accordion.open = false;
      const id = accordion.dataset.accordion || accordion.id;
      if (id) this.state[id] = false;
    });
  }
}
