// /helpers/sheet-event-handlers.mjs - All sheet event handling logic

import { ZWolfDice } from "../dice/index.mjs";
import { RestHandler } from "./rest-handler.mjs";

export class SheetEventHandlers {
  
  constructor(sheet) {
    this.sheet = sheet;
    this.actor = sheet.actor;
  }

  /**
   * Bind all event listeners to the sheet HTML
   */
  bindEventListeners(html) {
    // Dice roll handlers
    html.find('.progression-die').click(ev => {
      ev.preventDefault();
      ev.stopPropagation();
      this._onProgressionDiceRoll(ev);
    });

    // Accordion handlers
    html.find('.progression-header').click(ev => {
      ev.preventDefault();
      const header = ev.currentTarget;
      const group = $(header).closest('.progression-group');
      const wasExpanded = group.hasClass('expanded');
      
      html.find('.progression-group').removeClass('expanded');
      
      if (!wasExpanded) {
        group.addClass('expanded');
      }
    });

    // Stat roll handlers
    html.find('.stat-rollable').click(ev => {
      ev.preventDefault();
      this._onStatRoll(ev);
    });

    // Speed roll handler
    html.find('.speed-roll-die').click(ev => {
      ev.preventDefault();
      ev.stopPropagation();
      this._onSpeedRoll(ev);
    });

    // Progression slider handlers
    html.find('.progression-slider').on('input change', ev => {
      this._onProgressionSliderChange(ev);
    });

    // Level change handler
    const levelInput = html.find('input[name="system.level"], input[name="data.level"], .level-input, input.level');
    console.log("Z-Wolf Epic | Level input found:", levelInput.length, "elements");
    
    if (levelInput.length > 0) {
      levelInput.on('change', ev => {
        console.log("Z-Wolf Epic | Level changed to:", ev.currentTarget.value);
        this._onLevelChange(ev);
      });
    } else {
      console.warn("Z-Wolf Epic | No level input field found. Check your HTML template.");
    }

    // Item control handlers
    html.find('.item-control.item-delete, .item-control.item-remove').click(this._onUnifiedItemDelete.bind(this));
    html.find('.item-control.item-edit').click(this._onItemEdit.bind(this));

    // Build Points Lock Button Handler
    html.find('.build-points-lock-btn').click(ev => {
      ev.preventDefault();
      this._onBuildPointsLockToggle(ev);
    });

    // Rest Button Handlers
    html.find('.short-rest-btn').click(ev => {
      ev.preventDefault();
      this._onShortRest(ev);
    });

    html.find('.extended-rest-btn').click(ev => {
      ev.preventDefault();
      this._onExtendedRest(ev);
    });

    // Equipment placement change handler
    html.find('.equipment-placement-select').change(ev => {
      this._onEquipmentPlacementChange(ev);
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
    const statKey = element.dataset.stat;
    const statType = element.dataset.type;
    const progression = element.dataset.progression;
    
    // Get progression bonuses
    const level = this.actor.system.level ?? 0;
    const progressionOnlyLevel = this._getProgressionOnlyLevel();
    const bonuses = this._calculateProgressionBonuses(level, progressionOnlyLevel);
    const modifier = bonuses[progression];
    
    // Create flavor text
    const statName = $(element).find('.stat-name').text();
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
      await this.actor.update({ [updatePath]: newProgression });
      console.log(`Z-Wolf Epic | Updated ${statKey} (${statType}) to ${newProgression}`);
      
      this.sheet.render(false);
    }
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
    const currentLockState = this.actor.system.buildPointsLocked || false;
    const newLockState = !currentLockState;
    
    await this.actor.update({ 'system.buildPointsLocked': newLockState });
    
    this.updateSliderStates(newLockState);
    
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
    const sliders = html.find('.progression-slider');
    sliders.prop('disabled', locked);
    
    if (locked) {
      sliders.addClass('locked');
    } else {
      sliders.removeClass('locked');
    }
    
    // Update lock button appearance
    const lockBtn = html.find('.build-points-lock-btn');
    const lockIcon = lockBtn.find('i');
    const lockLabel = lockBtn.find('.lock-label');
    
    if (locked) {
      lockBtn.removeClass('unlocked').addClass('locked');
      lockIcon.removeClass('fa-unlock').addClass('fa-lock');
      lockLabel.text('Locked');
      lockBtn.attr('title', 'Unlock progression sliders');
    } else {
      lockBtn.removeClass('locked').addClass('unlocked');
      lockIcon.removeClass('fa-lock').addClass('fa-unlock');
      lockLabel.text('Unlocked');
      lockBtn.attr('title', 'Lock progression sliders');
    }
  }

  _applyItemLockStates(html) {
    html.find('.item').each((i, element) => {
      const itemId = element.dataset.itemId;
      const item = this.actor.items.get(itemId);
      
      const isLocked = item?.getFlag('zwolf-epic', 'locked');
      const isEquipment = item?.type === 'equipment';
      
      if (isLocked && !isEquipment) {
        $(element).find('input, select, textarea, button')
          .not('.item-delete, .item-remove')
          .prop('disabled', true)
          .addClass('locked');
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
      awesome: Math.floor(1.2 * totalLevel + 0.80001)
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
