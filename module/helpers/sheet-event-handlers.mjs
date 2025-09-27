// /helpers/sheet-event-handlers.mjs - All sheet event handling logic

import { ZWolfDice } from "../dice/index.mjs";
import { RestHandler } from "./rest-handler.mjs";
import { ActorDataCalculator } from "./actor-data-calculator.mjs";

export class SheetEventHandlers {
  
  constructor(sheet) {
    this.sheet = sheet;
    this.actor = sheet.actor;
  }

  /**
   * Bind all event listeners to the sheet HTML
   */
  bindEventListeners(html) {
    // TAB NAVIGATION HANDLERS
    html.querySelectorAll('[data-group="primary"] .item[data-tab]').forEach(tab => {
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        const tabId = event.currentTarget.dataset.tab;
        
        // Update the tab group
        this.sheet.tabGroups.primary = tabId;
        
        // Re-render the sheet to show the new tab
        this.sheet.render(false);
      });
    });

    // Dice roll handlers
    html.querySelectorAll('.progression-die').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this._onProgressionDiceRoll(ev);
      });
    });

    // Accordion handlers
    html.querySelectorAll('.progression-header').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        const header = ev.currentTarget;
        const group = header.closest('.progression-group');
        const wasExpanded = group.classList.contains('expanded');
        
        html.querySelectorAll('.progression-group').forEach(g => g.classList.remove('expanded'));
        
        if (!wasExpanded) {
          group.classList.add('expanded');
        }
      });
    });

    // Stat roll handlers
    html.querySelectorAll('.stat-rollable').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        this._onStatRoll(ev);
      });
    });

    // Speed roll handler
    html.querySelectorAll('.speed-roll-die').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this._onSpeedRoll(ev);
      });
    });

    // Progression slider handlers
    html.querySelectorAll('.progression-slider').forEach(el => {
      el.addEventListener('input', (ev) => this._onProgressionSliderChange(ev));
      el.addEventListener('change', (ev) => this._onProgressionSliderChange(ev));
    });

    // Level change handler
    const levelInputs = html.querySelectorAll('input[name="system.level"], input[name="data.level"], .level-input, input.level');
    console.log("Z-Wolf Epic | Level input found:", levelInputs.length, "elements");
    
    if (levelInputs.length > 0) {
      levelInputs.forEach(el => {
        el.addEventListener('change', (ev) => {
          console.log("Z-Wolf Epic | Level changed to:", ev.currentTarget.value);
          this._onLevelChange(ev);
        });
      });
    } else {
      console.warn("Z-Wolf Epic | No level input field found. Check your HTML template.");
    }

  // DIAGNOSTIC: Check what elements match our selectors
  const deleteElements = html.querySelectorAll('.item-control.item-delete, .item-control.item-remove');
  const shortRestElements = html.querySelectorAll('.short-rest-btn');
  const extendedRestElements = html.querySelectorAll('.extended-rest-btn');
  
  console.log('🔍 Z-Wolf Epic | Delete selector matched:', deleteElements.length, 'elements');
  deleteElements.forEach(el => {
    console.log('  - Delete element classes:', el.className);
  });
  
  console.log('🔍 Z-Wolf Epic | Short rest selector matched:', shortRestElements.length, 'elements');
  shortRestElements.forEach(el => {
    console.log('  - Short rest element classes:', el.className);
  });
  
  console.log('🔍 Z-Wolf Epic | Extended rest selector matched:', extendedRestElements.length, 'elements');
  extendedRestElements.forEach(el => {
    console.log('  - Extended rest element classes:', el.className);
  });

  // Item control handlers
  html.querySelectorAll('.item-control.item-delete, .item-control.item-remove').forEach(el => {
    el.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      console.log('🔴 DELETE HANDLER TRIGGERED');
      this._onUnifiedItemDelete(ev);
    });
  });

  // Rest Button Handlers
  html.querySelectorAll('.short-rest-btn').forEach(el => {
    el.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      console.log('🟢 SHORT REST HANDLER TRIGGERED');
      this._onShortRest(ev);
    });
  });

  html.querySelectorAll('.extended-rest-btn').forEach(el => {
    el.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      console.log('🟢 EXTENDED REST HANDLER TRIGGERED');
      this._onExtendedRest(ev);
    });
  });

    // // Item control handlers
    // html.querySelectorAll('.item-control.item-delete, .item-control.item-remove').forEach(el => {
    //   el.addEventListener('click', this._onUnifiedItemDelete.bind(this));
    // });
    // html.querySelectorAll('.item-control.item-edit').forEach(el => {
    //   el.addEventListener('click', this._onItemEdit.bind(this));
    // });

    // // Rest Button Handlers
    // html.querySelectorAll('.short-rest-btn').forEach(el => {
    //   el.addEventListener('click', (ev) => {
    //     ev.preventDefault();
    //     this._onShortRest(ev);
    //   });
    // });

    // html.querySelectorAll('.extended-rest-btn').forEach(el => {
    //   el.addEventListener('click', (ev) => {
    //     ev.preventDefault();
    //     this._onExtendedRest(ev);
    //   });
    // });

    // Equipment placement change handler
    html.querySelectorAll('.equipment-placement-select').forEach(el => {
      el.addEventListener('change', (ev) => {
        this._onEquipmentPlacementChange(ev);
      });
    });

    // Disable controls for locked items (except equipment)
    this._applyItemLockStates(html);
  }

  // =================================
  // DICE ROLLING HANDLERS
  // =================================

  async _onProgressionDiceRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const progression = element.dataset.progression;
    const bonus = parseInt(element.dataset.bonus) || 0;
    
    const progressionName = progression.charAt(0).toUpperCase() + progression.slice(1);
    const flavor = `${progressionName} Progression Roll`;
    
    const netBoosts = ZWolfDice.getNetBoosts();
    
    await ZWolfDice.roll({
      netBoosts: netBoosts,
      modifier: bonus,
      flavor: flavor,
      actor: this.actor
    });
  }

async _onStatRoll(event) {
  event.preventDefault();
  const element = event.currentTarget;
  
  console.log("Z-Wolf | Element HTML:", element.outerHTML);
  console.log("Z-Wolf | All datasets:", element.dataset);
  
  const statKey = element.dataset.stat;
  const statType = element.dataset.type;
  const progression = element.dataset.progression;
  // ... rest of method
  
  console.log("Z-Wolf | _onStatRoll - statKey:", statKey);
  console.log("Z-Wolf | _onStatRoll - statType:", statType);
  console.log("Z-Wolf | _onStatRoll - progression:", progression);
  
  // Get progression bonuses
  const level = this.actor.system.level ?? 0;
  const progressionOnlyLevel = this._getProgressionOnlyLevel();
  const bonuses = this._calculateProgressionBonuses(level, progressionOnlyLevel);
  const modifier = bonuses[progression];
  
  console.log("Z-Wolf | _onStatRoll - bonuses:", bonuses);
  console.log("Z-Wolf | _onStatRoll - modifier for", progression, ":", modifier);
  
  // Create flavor text
  const statNameEl = element.querySelector('.stat-name');
  const statName = statNameEl ? statNameEl.textContent : statKey;
  const flavor = `${statName} (${progression.charAt(0).toUpperCase() + progression.slice(1)})`;
  
  console.log("Z-Wolf | _onStatRoll - flavor:", flavor);
  
  const netBoosts = ZWolfDice.getNetBoosts();
  
  await ZWolfDice.roll({
    netBoosts: netBoosts,
    modifier: modifier,
    flavor: flavor,
    actor: this.actor
  });
}

  async _onSpeedRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    
    // Get the speed progression and bonus from the sheet data
    const sheetData = this.sheet.getData();
    const sideEffects = sheetData.sideEffects;
    
    if (sideEffects && sideEffects.speedProgression) {
      const speedProgression = sideEffects.speedProgression;
      const bonus = sheetData.progressionBonuses[speedProgression];
      
      const flavor = `Speed (${speedProgression.charAt(0).toUpperCase() + speedProgression.slice(1)})`;
      const netBoosts = ZWolfDice.getNetBoosts();
      
      await ZWolfDice.roll({
        netBoosts: netBoosts,
        modifier: bonus,
        flavor: flavor,
        actor: this.actor
      });
    } else {
      ui.notifications.warn("Character does not have enhanced speed progression.");
    }
  }

  // =================================
  // PROGRESSION & LEVEL HANDLERS
  // =================================

  async _onProgressionSliderChange(event) {
    event.preventDefault();

    // Check if sliders are locked
    const isLocked = this.actor.system.buildPointsLocked || false;
    if (isLocked) {
      ui.notifications.warn("Build Points are locked. Click the lock button to make changes.");
      return;
    }
    
    const element = event.currentTarget;
    const statKey = element.dataset.stat;
    const statType = element.dataset.type;
    const sliderValue = parseInt(element.value);
    
    const progressionMap = {
      1: 'mediocre',
      2: 'moderate', 
      3: 'specialty',
      4: 'awesome'
    };
    
    const newProgression = progressionMap[sliderValue];
    
    let updatePath;
    if (statType === 'attribute') {
      updatePath = `system.attributes.${statKey}.progression`;
    } else if (statType === 'skill') {
      updatePath = `system.skills.${statKey}.progression`;
    }
    
    if (updatePath && newProgression) {
      // Save scroll position of the configure tab
      const scrollableTab = this.sheet.element.querySelector('div.tab.configure');
      const scrollTop = scrollableTab?.scrollTop || 0;
      
      console.log('Z-Wolf Epic | Saved scroll position:', scrollTop);
      
      // Update the actor
      await this.actor.update({ [updatePath]: newProgression });
      console.log(`Z-Wolf Epic | Updated ${statKey} (${statType}) to ${newProgression}`);
      
      // Re-render
      await this.sheet.render(false);
      
      // Restore scroll position
      requestAnimationFrame(() => {
        const newScrollableTab = this.sheet.element.querySelector('div.tab.configure');
        if (newScrollableTab) {
          newScrollableTab.scrollTop = scrollTop;
          console.log('Z-Wolf Epic | Restored scroll position:', scrollTop);
        }
      });
    }
  }

  /**
   * Update the build points display and progression values without full re-render
   */
  _updateBuildPointsDisplay() {
    console.log("Z-Wolf Epic | _updateBuildPointsDisplay called");
    
    const html = this.sheet.element;
    const calculator = new ActorDataCalculator(this.actor);
    
    // Get level and progression data
    const level = this.actor.system.level ?? 0;
    const progressionOnlyLevel = calculator._getProgressionOnlyLevel(this.actor);
    
    console.log("Z-Wolf Epic | Level:", level, "Progression Only:", progressionOnlyLevel);
    
    // Calculate values
    const buildPoints = calculator._calculateTotalBP(
      this.actor.system,
      this.actor.items.get(this.actor.system.ancestryId)?.toObject(),
      this.actor.items.get(this.actor.system.fundamentId)?.toObject()
    );
    const progressionBonuses = calculator._calculateProgressionBonuses(level, progressionOnlyLevel);
    
    console.log("Z-Wolf Epic | Build Points:", buildPoints);
    console.log("Z-Wolf Epic | Progression Bonuses:", progressionBonuses);
    
    // Update the BP total display
    const bpTotalEl = html.querySelector('.bp-total');
    console.log("Z-Wolf Epic | BP Total Element:", bpTotalEl);
    
    if (bpTotalEl) {
      bpTotalEl.textContent = `${buildPoints.total} / ${buildPoints.max} BP`;
      
      // Update classes for visual feedback
      bpTotalEl.classList.remove('negative', 'over-max', 'at-max');
      if (buildPoints.total < 0) {
        bpTotalEl.classList.add('negative');
      } else if (buildPoints.total > buildPoints.max) {
        bpTotalEl.classList.add('over-max');
      } else if (buildPoints.total === buildPoints.max) {
        bpTotalEl.classList.add('at-max');
      }
    }
    
    // Update the breakdown
    const breakdownEl = html.querySelector('.bp-breakdown');
    console.log("Z-Wolf Epic | BP Breakdown Element:", breakdownEl);
    
    if (breakdownEl) {
      breakdownEl.innerHTML = `
        <span class="bp-breakdown-item">Attributes: ${buildPoints.attributes} BP</span>
        <span class="bp-breakdown-divider">•</span>
        <span class="bp-breakdown-item">Skills: ${buildPoints.skills} BP</span>
      `;
    }
    
    // Update progression values in sidebar for all attributes and skills
    const statRollables = html.querySelectorAll('.stat-rollable');
    console.log("Z-Wolf Epic | Found stat-rollable elements:", statRollables.length);
    
    statRollables.forEach(rollableEl => {
      const statKey = rollableEl.dataset.stat;
      const statType = rollableEl.dataset.type;
      
      if (statKey && statType) {
        let progression;
        if (statType === 'attribute') {
          progression = this.actor.system.attributes[statKey]?.progression || 'moderate';
        } else if (statType === 'skill') {
          progression = this.actor.system.skills[statKey]?.progression || 'mediocre';
        }
        
        if (progression && progressionBonuses[progression] !== undefined) {
          const statItem = rollableEl.closest('.stat-item');
          const valueEl = statItem?.querySelector('.stat-value');
          if (valueEl) {
            const bonus = progressionBonuses[progression];
            const newText = bonus >= 0 ? `+${bonus}` : `${bonus}`;
            console.log(`Z-Wolf Epic | Updating ${statKey} (${statType}) to ${newText}`);
            valueEl.textContent = newText;
          }
        }
      }
    });
    
    console.log("Z-Wolf Epic | _updateBuildPointsDisplay completed");
  }

  async _onLevelChange(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const newLevel = parseInt(element.value) || 0;
    
    console.log("Z-Wolf Epic | _onLevelChange triggered. New level:", newLevel);
    
    // Clamp level between 0 and 20
    const clampedLevel = Math.max(0, Math.min(20, newLevel));
    
    await this.actor.update({ 'system.level': clampedLevel });
    
    console.log("Z-Wolf Epic | Actor updated. Re-rendering sheet...");
    this.sheet.render(false);
  }

  // =================================
  // ITEM CONTROL HANDLERS
  // =================================

  async _onItemEdit(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemElement = element.closest('[data-item-id], .slotted-item');
    const itemId = itemElement?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (item) {
      item.sheet.render(true);
    }
  }

  async _onUnifiedItemDelete(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const element = event.currentTarget;
    const itemElement = element.closest('[data-item-id], .slotted-item');
    
    if (!itemElement) {
      ui.notifications.error('Could not find item to delete');
      return;
    }
    
    const itemId = itemElement.dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (!item) {
      ui.notifications.error('Could not find item to delete');
      return;
    }
    
    console.log(`Z-Wolf Epic | Unified delete triggered for: ${item.name} (${item.type})`);
    
    // Determine what type of deletion this is
    const isFoundationItem = this._isFoundationItem(item);
    const isSlotItem = ['knack', 'track', 'talent'].includes(item.type);
    
    let confirmMessage = `Delete ${item.name}?`;
    
    if (isFoundationItem) {
      const foundationType = item.type;
      confirmMessage = `Remove ${item.name} as your ${foundationType}? This will also delete the item from your character.`;
    } else if (isSlotItem) {
      confirmMessage = `Remove ${item.name} from your character? This will delete the item entirely.`;
    }
    
    // Show confirmation dialog
    const confirmed = await Dialog.confirm({
      title: "Delete Item",
      content: `<p>${confirmMessage}</p>`,
      yes: () => true,
      no: () => false,
      defaultYes: false
    });
    
    if (!confirmed) return;
    
    try {
      // Handle foundation items (ancestry/fundament)
      if (isFoundationItem) {
        await this._handleFoundationItemDeletion(item);
      } else {
        await this._handleRegularItemDeletion(item);
      }
      
      // Check if this item had special properties
      const hadSpecialProperties = item.system?.grantedAbilities?.length > 0 ||
                                 item.name === "Progression Enhancement" ||
                                 item.system?.knacksProvided > 0;
      
      if (isFoundationItem && item.type === 'ancestry') {
        // Validate size after ancestry removal
        setTimeout(async () => {
          await this._validateActorSize();
          this.sheet.render(false);
        }, 100);
      }
      
      ui.notifications.info(`${item.name} has been deleted.`);
      
      // Force re-render if the item affected calculated values
      if (hadSpecialProperties || isFoundationItem) {
        console.log(`Z-Wolf Epic | Item ${item.name} affected calculated values, forcing re-render`);
        setTimeout(() => {
          this.sheet.render(false);
        }, 50);
      }
      
    } catch (error) {
      console.error("Z-Wolf Epic | Error deleting item:", error);
      ui.notifications.error(`Failed to delete ${item.name}: ${error.message}`);
    }
  }

  // =================================
  // BUILD POINTS & REST HANDLERS
  // =================================

  async _onBuildPointsLockToggle(event) {
    event.preventDefault();
    
    const scrollableTab = this.sheet.element.querySelector('div.tab.configure');
    const scrollTop = scrollableTab?.scrollTop || 0;
    
    console.log('Lock toggle - saved scroll:', scrollTop);
    
    this._scrollToRestore = scrollTop;
    
    const currentLockState = this.actor.system.buildPointsLocked || false;
    const newLockState = !currentLockState;
    
    console.log('Lock toggle - about to update, calling stack:');
    console.trace();
    
    await this.actor.update({ 'system.buildPointsLocked': newLockState });
    
    console.log('Lock toggle - update complete');
    
    const message = newLockState ? "Build Points locked" : "Build Points unlocked";
    ui.notifications.info(message);
  }

  async _onShortRest(event) {
    event.preventDefault();
    const restHandler = new RestHandler(this.actor);
    await restHandler.performShortRest();
  }

  async _onExtendedRest(event) {
    event.preventDefault();
    const restHandler = new RestHandler(this.actor);
    await restHandler.performExtendedRest();
  }

  // =================================
  // EQUIPMENT HANDLERS
  // =================================

  async _onEquipmentPlacementChange(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.closest('.equipment-item').dataset.itemId;
    const newPlacement = element.value;
    const item = this.actor.items.get(itemId);
    
    if (!item) {
      ui.notifications.error('Could not find equipment item to update.');
      return;
    }
    
    console.log(`Z-Wolf Epic | Changing ${item.name} placement to: ${newPlacement}`);
    
    try {
      await item.update({ 'system.placement': newPlacement });
      
      // Check if this item has side effects or granted abilities
      const hasEffects = (item.system.sideEffects && Object.values(item.system.sideEffects).some(value => value && value !== '')) ||
                        (item.system.grantedAbilities && item.system.grantedAbilities.length > 0);
      
      if (hasEffects) {
        ui.notifications.info(`${item.name} placement changed. Recalculating character effects...`);
        this.sheet.render(false);
      } else {
        ui.notifications.info(`${item.name} placement changed to ${this._getPlacementDisplayName(newPlacement)}.`);
      }
      
    } catch (error) {
      console.error("Z-Wolf Epic | Error updating equipment placement:", error);
      ui.notifications.error(`Failed to update ${item.name} placement: ${error.message}`);
    }
  }

  // =================================
  // UTILITY METHODS
  // =================================

  /**
   * Update the visual state of sliders and lock button
   */
  updateSliderStates(locked) {
    const html = this.sheet.element;
    
    // Update all progression sliders
    const sliders = html.querySelectorAll('.progression-slider');
    sliders.forEach(slider => {
      slider.disabled = locked;
      if (locked) {
        slider.classList.add('locked');
      } else {
        slider.classList.remove('locked');
      }
    });
    
    // Update lock button appearance
    const lockBtn = html.querySelector('.build-points-lock-btn');
    if (!lockBtn) return;
    
    const lockIcon = lockBtn.querySelector('i');
    const lockLabel = lockBtn.querySelector('.lock-label');
    
    if (locked) {
      lockBtn.classList.remove('unlocked');
      lockBtn.classList.add('locked');
      if (lockIcon) {
        lockIcon.classList.remove('fa-unlock');
        lockIcon.classList.add('fa-lock');
      }
      if (lockLabel) lockLabel.textContent = 'Locked';
      lockBtn.setAttribute('title', 'Unlock progression sliders');
    } else {
      lockBtn.classList.remove('locked');
      lockBtn.classList.add('unlocked');
      if (lockIcon) {
        lockIcon.classList.remove('fa-lock');
        lockIcon.classList.add('fa-unlock');
      }
      if (lockLabel) lockLabel.textContent = 'Unlocked';
      lockBtn.setAttribute('title', 'Lock progression sliders');
    }
  }

  _applyItemLockStates(html) {
    html.querySelectorAll('.item').forEach(element => {
      const itemId = element.dataset.itemId;
      const item = this.actor.items.get(itemId);
      
      const isLocked = item?.getFlag('zwolf-epic', 'locked');
      const isEquipment = item?.type === 'equipment';
      
      if (isLocked && !isEquipment) {
        element.querySelectorAll('input, select, textarea, button').forEach(control => {
          if (!control.classList.contains('item-delete') && !control.classList.contains('item-remove')) {
            control.disabled = true;
            control.classList.add('locked');
          }
        });
      }
    });
  }

  // =================================
  // HELPER METHODS
  // =================================

  _isFoundationItem(item) {
    if (item.type === 'ancestry') {
      return this.actor.system.ancestryId === item.id;
    } else if (item.type === 'fundament') {
      return this.actor.system.fundamentId === item.id;
    }
    return false;
  }

  async _handleFoundationItemDeletion(item) {
    console.log(`Z-Wolf Epic | Handling foundation item deletion: ${item.name}`);
    
    // Clear the reference in actor data first
    const updateData = {};
    if (item.type === 'ancestry') {
      updateData['system.ancestryId'] = null;
    } else if (item.type === 'fundament') {
      updateData['system.fundamentId'] = null;
    }
    
    if (Object.keys(updateData).length > 0) {
      await this.actor.update(updateData);
      console.log(`Z-Wolf Epic | Cleared foundation reference for ${item.type}`);
    }
    
    await item.delete();
  }

  async _handleRegularItemDeletion(item) {
    console.log(`Z-Wolf Epic | Handling regular item deletion: ${item.name}`);
    await item.delete();
  }

  async _validateActorSize() {
    const ancestry = this.actor.items.get(this.actor.system.ancestryId);
    const currentSize = this.actor.system.size;
    
    let validSizes = ['medium'];
    
    if (ancestry && ancestry.system.sizeOptions && ancestry.system.sizeOptions.length > 0) {
      validSizes = ancestry.system.sizeOptions;
    }
    
    if (!validSizes.includes(currentSize)) {
      const newSize = validSizes[0];
      console.log(`Z-Wolf Epic | Invalid size "${currentSize}" for ancestry, changing to "${newSize}"`);
      
      await this.actor.update({ 'system.size': newSize });
      
      ui.notifications.info(`Size changed to ${newSize.charAt(0).toUpperCase() + newSize.slice(1)} to match ancestry restrictions.`);
      
      return true;
    }
    
    return false;
  }

  _getProgressionOnlyLevel() {
    if (this.actor.items) {
      const hasProgressionItem = this.actor.items.some(item => 
        item.name === "Progression Enhancement"
      );
      
      if (hasProgressionItem) {
        return 1;
      }
    }
    
    return 0;
  }

  _calculateProgressionBonuses(level, progressionOnlyLevel) {
    const totalLevel = level + progressionOnlyLevel;
    
    return {
      mediocre: Math.floor(0.6 * totalLevel - 0.3),
      moderate: Math.floor(0.8 * totalLevel),
      specialty: Math.floor(1 * totalLevel),
      awesome: Math.floor(1.2 * totalLevel + 0.8001)
    };
  }

  _getPlacementDisplayName(placement) {
    const displayNames = {
      'wielded': 'Wielded',
      'worn': 'Worn',
      'readily_available': 'Readily Available',
      'stowed': 'Stowed',
      'not_carried': 'Not Carried'
    };
    return displayNames[placement] || placement;
  }
}