// module/data/default-items.mjs

import { ZWOLF } from "../helpers/config.mjs";

/**
 * Default virtual items that all actors have access to
 * These are not stored in the database but appear in the UI
 */
export const DEFAULT_ITEMS = {
  slam: {
    _id: "ZWVirtualSlam000",
    name: "Slam",
    type: "universal",
    img: "icons/skills/melee/unarmed-punch-fist.webp",
    system: {
        description: "",
        grantedAbilities: {
            0: {
                name: "Slam",
                tags: "Attack",
                type: "strike",
                description: "<p>&lt;Unarmed&gt; weapon; range Melee 0m; Damage Type Bludgeoning.</p>"
            }
        },
        sideEffects: {
            speedProgression: "",
            toughnessTNProgression: "",
            destinyTNProgression: "",
            nightsight: null,
            darkvision: null,
            maxBulkBoost: 0
        }
    },
    flags: {
      "zwolf-epic": {
        isVirtual: true,
        locked: true
      }
    }
  },

  universalActivities: {
    _id: "ZWVirtualActz000",
    name: "Universal Activities",
    type: "universal",
    img: "icons/skills/movement/figure-running-gray.webp",
    system: {
      description: "",
      grantedAbilities: {
        0: {
            name: "Generic Dominant Activities",
            type: "dominantAction",
            description: "<p>Be Careful, Charge, Disarm, Encourage, Grab, Prepare Aid, Ready, Strike, Sunder, Total Defense, Trip</p>"
        },
        1: {
            name: "Generic Swift Activities",
            type: "swiftAction",
            description: "<p>Cleave, Declare Attack Aspect (Brutal), Declare Attack Aspect (Precise), Demoralize, Escape, Hustle, Interact, Recall Knowledge, Recover, Stand, Step, Stride</p>"
        },
        2: {
            name: "Generic Reaction Activities",
            type: "reaction",
            description: "<p>Aid, Opportune Strike</p>"
        },
        3: {
            name: "Generic Free Activities",
            type: "freeAction",
            description: "<p>Exclaim, Release, Seize the Moment</p>"
        },
      },
      sideEffects: {
        speedProgression: "",
        toughnessTNProgression: "",
        destinyTNProgression: "",
        nightsight: null,
        darkvision: null,
        maxBulkBoost: 0
      }
    },
    flags: {
      "zwolf-epic": {
        isVirtual: true,
        locked: true
      }
    }
  },

  proficienciesSummary: {
    _id: "ZWVirtualProfs00",
    name: "Proficiencies",
    type: "universal",
    img: "icons/skills/trades/academics-study-reading.webp",
    system: {
      description: "",
      tags: "Universal",
      characterTags: "",
      grantedAbilities: {
        0: {
            name: "Proficiencies",
            type: "passive",
            description: `<p><em>This summary is automatically generated from your items.</em></p>
                <p>Your proficiencies will be listed here based on items that grant them.</p>`,
        }
      },
      sideEffects: {
        speedProgression: "",
        toughnessTNProgression: "",
        destinyTNProgression: "",
        nightsight: null,
        darkvision: null,
        maxBulkBoost: 0
      }
    },
    flags: {
      "zwolf-epic": {
        isVirtual: true,
        locked: true,
        isDynamic: true  // Indicates content is generated dynamically
      }
    }
  }
};

/**
 * Get default items appropriate for a given actor type
 * @param {string} actorType - The type of actor (pc, npc, eidolon, mook, spawn)
 * @returns {Array} Array of default item data
 */
export function getDefaultItemsForActor(actorType) {
  const items = [];
  
  // All character types get these defaults
  if (['pc', 'npc', 'eidolon'].includes(actorType)) {
    items.push(
      foundry.utils.deepClone(DEFAULT_ITEMS.slam),
      foundry.utils.deepClone(DEFAULT_ITEMS.universalActivities),
      foundry.utils.deepClone(DEFAULT_ITEMS.proficienciesSummary)
    );
  }
  
  // Mooks and spawns get unarmed strike only
  if (['mook', 'spawn'].includes(actorType)) {
    items.push(
      foundry.utils.deepClone(DEFAULT_ITEMS.slam),
      foundry.utils.deepClone(DEFAULT_ITEMS.universalActivities)
    );
  }
  
  return items;
}

/**
 * Generate dynamic proficiencies description from actor's items
 * @param {Actor} actor - The actor to generate proficiencies for
 * @returns {string} HTML description of proficiencies
 */
export function generateProficienciesDescription(actor) {
  const proficiencies = new Set();
  
  // Collect proficiencies from all items via their sideEffects
  for (const item of actor.items) {
    // Skip virtual items
    if (item.flags?.['zwolf-epic']?.isVirtual) continue;
    
    // Check item-level sideEffects (for ancestry, fundament, equipment, knack, talent)
    if (item.system.sideEffects?.grantedProficiency) {
      let prof = item.system.sideEffects.grantedProficiency;
      if (prof) {
        proficiencies.add(CONFIG.ZWOLF.proficiencies[prof]?.label || prof);
      }
    }
    
    // Check tier-level sideEffects (for track items)
    if (item.type === 'track' && item.system.tiers) {
      Object.values(item.system.tiers).forEach(tier => {
        if (tier.sideEffects?.grantedProficiency) {
          const prof = tier.sideEffects.grantedProficiency;
          if (prof && prof.trim()) {
            proficiencies.add(prof.trim());
          }
        }
      });
    }
  }
  
  if (proficiencies.size === 0) {
    return `<p><em>This summary is automatically generated from your items.</em></p>
      <p>You currently have no proficiencies granted by your items.</p>`;
  }
  
  // Escape HTML in proficiency names to display angle brackets correctly
  const escapeHtml = (text) => {
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#039;');
  };
  
  const profList = Array.from(proficiencies)
    .map(prof => escapeHtml(prof))
    .join(', ');
    
  return `<p><strong>Proficiencies:</strong> ${profList}</p>`;
}
