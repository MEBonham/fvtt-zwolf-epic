export const preloadHandlebarsTemplates = async function() {
  return foundry.applications.handlebars.loadTemplates([
    // Actor templates
    "systems/zwolf-epic/templates/actor/actor-character-sheet.hbs", 
    "systems/zwolf-epic/templates/actor/actor-mook-sheet.hbs",
    "systems/zwolf-epic/templates/actor/actor-spawn-sheet.hbs",
    
    // Item templates - ADD THESE
    "systems/zwolf-epic/templates/item/item-ancestry-sheet.hbs",
    "systems/zwolf-epic/templates/item/item-fundament-sheet.hbs",
    "systems/zwolf-epic/templates/item/item-equipment-sheet.hbs",
    "systems/zwolf-epic/templates/item/item-knack-sheet.hbs",
    "systems/zwolf-epic/templates/item/item-track-sheet.hbs",
    "systems/zwolf-epic/templates/item/item-talent-sheet.hbs"
  ]);
};