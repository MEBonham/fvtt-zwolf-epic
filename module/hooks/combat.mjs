/**
 * Combat Tracker enhancement hooks for Z-Wolf Epic
 * Adds custom initiative rolling with boosts/jinxes
 */

import { ZWolfDice } from "../dice/index.mjs";

export function registerCombatHooks() {
  Hooks.on('renderCombatTracker', (app, html, data) => {
    addInitiativeBoostButton(html);
  });
}

/**
 * Add initiative boost button to combat tracker
 * @param {HTMLElement|jQuery} html - The combat tracker HTML
 */
function addInitiativeBoostButton(html) {
  const hudElement = html instanceof HTMLElement ? html : html[0];
  const header = hudElement.querySelector('.combat-tracker-header');
  
  // Only add if header exists and button not already added
  if (header && !header.querySelector('.zwolf-initiative-boost')) {
    const boostButton = createInitiativeButton();
    const controlsElement = header.querySelector('.combat-controls');
    if (controlsElement) {
      controlsElement.prepend(boostButton);
      attachInitiativeButtonHandler(boostButton);
    }
  }
}

/**
 * Create the initiative boost button element
 * @returns {HTMLElement} The button element
 */
function createInitiativeButton() {
  const button = document.createElement('a');
  button.className = 'combat-control zwolf-initiative-boost';
  button.title = 'Roll Initiative with Current Boosts/Jinxes';
  
  const icon = document.createElement('i');
  icon.className = 'fas fa-dice-d12';
  button.appendChild(icon);
  
  return button;
}

/**
 * Attach click handler to initiative button
 * @param {HTMLElement} button - The button element
 */
function attachInitiativeButtonHandler(button) {
  button.addEventListener('click', async (event) => {
    event.preventDefault();
    await handleInitiativeRoll();
  });
}

/**
 * Handle the initiative roll for selected tokens
 */
async function handleInitiativeRoll() {
  const combat = game.combat;
  if (!combat) {
    return ui.notifications.warn("No active combat");
  }
  
  const controlled = canvas.tokens.controlled;
  if (!controlled.length) {
    return ui.notifications.warn("No tokens selected");
  }
  
  const netBoosts = ZWolfDice.getNetBoosts();
  
  for (const token of controlled) {
    await rollInitiativeForToken(token, combat, netBoosts);
  }
}

/**
 * Roll initiative for a specific token
 * @param {Token} token - The token to roll for
 * @param {Combat} combat - The active combat
 * @param {number} netBoosts - Current net boosts/jinxes
 */
async function rollInitiativeForToken(token, combat, netBoosts) {
  const combatant = combat.combatants.find(c => c.tokenId === token.id);
  if (!combatant) return;
  
  const agilityMod = token.actor.system.attributes?.agility?.value || 0;
  
  const rollResult = await ZWolfDice.roll({
    netBoosts: netBoosts,
    modifier: agilityMod,
    flavor: generateInitiativeFlavor(netBoosts, combatant.name),
    actor: token.actor
  });
  
  await combat.updateEmbeddedDocuments("Combatant", [{
    _id: combatant.id,
    initiative: rollResult.finalResult
  }]);
}

/**
 * Generate flavor text for initiative roll
 * @param {number} netBoosts - Net boosts/jinxes
 * @param {string} name - Combatant name
 * @returns {string} Flavor text
 */
function generateInitiativeFlavor(netBoosts, name) {
  let boostText = 'No Boosts';
  if (netBoosts > 0) {
    boostText = `${netBoosts} Boost${netBoosts > 1 ? 's' : ''}`;
  } else if (netBoosts < 0) {
    boostText = `${Math.abs(netBoosts)} Jinx${Math.abs(netBoosts) > 1 ? 'es' : ''}`;
  }
  
  return `Initiative Roll (${boostText}) - ${name}`;
}
