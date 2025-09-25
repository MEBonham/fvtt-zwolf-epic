export const preloadHandlebarsTemplates = async function() {
  console.log("Starting V2-compatible template preload...");
  
  // Regular templates (non-partials)
  const templates = [
    "systems/zwolf-epic/templates/actor/actor-character-sheet.hbs", 
    "systems/zwolf-epic/templates/actor/actor-mook-sheet.hbs",
    "systems/zwolf-epic/templates/actor/actor-spawn-sheet.hbs",
  ];

  // ONLY partials that are actually being used and don't create circular references
  const partials = [
    "systems/zwolf-epic/templates/item/partials/ability-item.hbs",
    "systems/zwolf-epic/templates/item/partials/tier-template.hbs",
    "systems/zwolf-epic/templates/item/partials/tier-accordion.hbs",
    "systems/zwolf-epic/templates/item/partials/side-effects-form.hbs",
  ];

  const templateResults = await foundry.applications.handlebars.loadTemplates(templates);
  const partialResults = await foundry.applications.handlebars.loadTemplates(partials);
  
  // V2 approach: Register partials directly in the Handlebars.partials cache
  for (let i = 0; i < partials.length; i++) {
    const fullPath = partials[i];
    const partialName = fullPath.split('/').pop().replace('.hbs', '');
    let template = partialResults[i];
    
    if (template) {
      Handlebars.partials[partialName] = template;
      console.log(`Successfully registered partial: ${partialName}`);
    }
  }

  console.log("Final check - ability-item in cache:", !!Handlebars.partials['ability-item']);
  return { ...templateResults, ...partialResults };
};
