import { ZWolfDice } from "../dice/dice-system.mjs";
import { RestHandler } from "./rest-handler.mjs";
import { ActorDataCalculator } from "./actor-data-calculator.mjs";

export class SheetEventHandlers {
  
  constructor(sheet) {
    this.sheet = sheet;
    this.actor = sheet.actor;
    this.calculator = new ActorDataCalculator(this.actor);
  }

  /**
   * Bind all event listeners to the sheet HTML
   */
  bindEventListeners(html) {
    // Dice roll handlers
    html.querySelectorAll('.progression-die').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this._onProgressionDiceRoll(ev);
      });
    });

    html.querySelectorAll('.speed-roll-die').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this._onSpeedRoll(ev);
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

    // Progression slider handlers
    html.querySelectorAll('.progression-slider').forEach(el => {
      el.addEventListener('input', (ev) => this._onProgressionSliderChange(ev));
      el.addEventListener('change', (ev) => this._onProgressionSliderChange(ev));
    });

    // Level change handler
    const levelInputs = html.querySelectorAll('input[name="system.level"], input[name="data.level"], .level-input, input.level');
    levelInputs.forEach(el => {
      el.addEventListener('change', (ev) => this._onLevelChange(ev));
    });

    // Exotic senses tooltip enhancement
    this._setupExoticSensesTooltip(html);

    // Item control handlers
    html.querySelectorAll('.item-control.item-delete, .item-control.item-remove').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this._onUnifiedItemDelete(ev);
      });
    });

    html.querySelectorAll('.item-control.item-edit').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        this._onItemEdit(ev);
      });
    });

    // Rest button handlers
    html.querySelectorAll('.short-rest-btn').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this._onShortRest(ev);
      });
    });

    html.querySelectorAll('.extended-rest-btn').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this._onExtendedRest(ev);
      });
    });

    // Equipment placement change handler
    html.querySelectorAll('.equipment-placement-select').forEach(el => {
      el.addEventListener('change', (ev) => this._onEquipmentPlacementChange(ev));
    });

    // Apply item lock states
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
    const statKey = element.dataset.stat;
    const progression = element.dataset.progression;
    
    // Get progression bonuses
    const level = this.actor.system.level ?? 0;
    const progressionOnlyLevel = this.calculator._getProgressionOnlyLevel(this.actor);
    const bonuses = this.calculator._calculateProgressionBonuses(level, progressionOnlyLevel);
    const modifier = bonuses[progression];
    
    // Create flavor text
    const statNameEl = element.querySelector('.stat-name');
    const statName = statNameEl ? statNameEl.textContent : statKey;
    const flavor = `${statName} (${progression.charAt(0).toUpperCase() + progression.slice(1)})`;
    
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
    
    // Use V2 API - _preparedContext instead of getData()
    const sheetData = this.sheet._preparedContext;
    const sideEffects = sheetData?.sideEffects;
    
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
      // Handle the +0 speed case (no enhanced progression)
      const modifier = parseInt(element.dataset.modifier) || 0;
      const flavor = element.dataset.flavor || "Speed Check";
      const netBoosts = ZWolfDice.getNetBoosts();
      
      await ZWolfDice.roll({
        netBoosts: netBoosts,
        modifier: modifier,
        flavor: flavor,
        actor: this.actor
      });
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
      await this.actor.update({ [updatePath]: newProgression });
      // Don't call render() - submitOnChange handles it automatically
      // SheetStateManager will handle scroll restoration
    }
  }

async _onLevelChange(event) {
  event.preventDefault();
  const newLevel = parseInt(event.currentTarget.value) || 0;
  const clampedLevel = Math.max(0, Math.min(20, newLevel));
  
  await this.actor.update({ 'system.level': clampedLevel });
  // Remove this line:
  // this.sheet.render(false);
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
    
    const currentLockState = this.actor.system.buildPointsLocked || false;
    await this.actor.update({ 'system.buildPointsLocked': !currentLockState });
    
    const message = !currentLockState ? "Build Points locked" : "Build Points unlocked";
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
  // UI STATE METHODS
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

  _setupExoticSensesTooltip(html) {
    const exoticSensesIcon = html.querySelector('.exotic-senses-icon');
    if (!exoticSensesIcon) return;
    
    exoticSensesIcon.addEventListener('mouseenter', (e) => {
      const abilities = this.sheet._preparedContext?.abilityCategories?.exoticSenses || [];
      if (abilities.length === 0) return;
      
      const tooltip = document.createElement('div');
      tooltip.className = 'exotic-senses-tooltip';
      tooltip.innerHTML = `
        <strong>Exotic Senses:</strong>
        <ul>
          ${abilities.map(a => `<li><strong>${a.name}</strong>${a.tags ? ` · <${a.tags}>` : ''}<br><small>${a.description}</small></li>`).join('')}
        </ul>
      `;
      document.body.appendChild(tooltip);
      
      const rect = e.target.getBoundingClientRect();
      tooltip.style.position = 'absolute';
      tooltip.style.left = `${rect.left}px`;
      tooltip.style.top = `${rect.bottom + 5}px`;
      
      e.target._tooltip = tooltip;
    });
    
    exoticSensesIcon.addEventListener('mouseleave', (e) => {
      if (e.target._tooltip) {
        e.target._tooltip.remove();
        delete e.target._tooltip;
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
    // Clear the reference in actor data first
    const updateData = {};
    if (item.type === 'ancestry') {
      updateData['system.ancestryId'] = null;
    } else if (item.type === 'fundament') {
      updateData['system.fundamentId'] = null;
    }
    
    if (Object.keys(updateData).length > 0) {
      await this.actor.update(updateData);
    }
    
    await item.delete();
  }

  async _handleRegularItemDeletion(item) {
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
      
      await this.actor.update({ 'system.size': newSize });
      
      ui.notifications.info(`Size changed to ${newSize.charAt(0).toUpperCase() + newSize.slice(1)} to match ancestry restrictions.`);
      
      return true;
    }
    
    return false;
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
