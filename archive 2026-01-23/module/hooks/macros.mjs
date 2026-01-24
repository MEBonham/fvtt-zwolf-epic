/**
 * Hotbar Macro functionality for Z-Wolf Epic
 * Allows dragging items to the hotbar to create macros
 */

export function registerMacroHooks() {
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
  
  // Make rollItemMacro available globally
  game.zwolf.rollItemMacro = rollItemMacro;
}

/**
 * Create a Macro from an Item drop
 * Get an existing item macro if one exists, otherwise create a new one
 * @param {Object} data - The dropped data
 * @param {number} slot - The hotbar slot to use
 * @returns {Promise|boolean}
 */
async function createItemMacro(data, slot) {
  if (data.type !== "Item") return;
  if (!("data" in data)) {
    return ui.notifications.warn("You can only create macro buttons for owned Items");
  }
  
  const item = data.data;
  const command = `game.zwolf.rollItemMacro("${item.name}");`;
  
  // Find existing macro or create new one
  let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "zwolf-epic.itemMacro": true }
    });
  }
  
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Roll an item macro
 * @param {string} itemName - Name of the item to roll
 * @returns {Promise}
 */
function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  
  const item = actor ? actor.items.find(i => i.name === itemName) : null;
  if (!item) {
    return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);
  }

  return item.roll();
}
