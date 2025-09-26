export const preloadHandlebarsTemplates = async function() {
  console.log("Starting V2-compatible template preload...");
  
  // V2 Parts are loaded automatically via the PARTS config - don't preload them
  const templates = [];

  // Only actual Handlebars partials need to be registered
  const partials = [
    // Item partials
    "systems/zwolf-epic/templates/item/partials/ability-item.hbs",
    "systems/zwolf-epic/templates/item/partials/tier-template.hbs",
    "systems/zwolf-epic/templates/item/partials/tier-accordion.hbs",
    "systems/zwolf-epic/templates/item/partials/side-effects-form.hbs",
    
    // Actor partials (NOT parts!)
    "systems/zwolf-epic/templates/actor/partials/base-creature-selector.hbs",
  ];

  const templateResults = await foundry.applications.handlebars.loadTemplates(templates);
  const partialResults = await foundry.applications.handlebars.loadTemplates(partials);
  
  // Register partials in Handlebars cache
  for (let i = 0; i < partials.length; i++) {
    const fullPath = partials[i];
    const partialName = fullPath.split('/').pop().replace('.hbs', '');
    let template = partialResults[i];
    
    if (template) {
      Handlebars.partials[partialName] = template;
      console.log(`Successfully registered partial: ${partialName}`);
    }
  }

  return { ...templateResults, ...partialResults };
};