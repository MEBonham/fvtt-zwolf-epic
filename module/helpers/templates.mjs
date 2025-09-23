export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([
    // Actor templates
    "systems/zwolf-epic/templates/actor/actor-character-sheet.html",
    "systems/zwolf-epic/templates/actor/actor-eidolon-sheet.html", 
    "systems/zwolf-epic/templates/actor/actor-mook-sheet.html",
    "systems/zwolf-epic/templates/actor/actor-spawn-sheet.html",
    
    // Item templates - ADD THESE
    "systems/zwolf-epic/templates/item/item-ancestry-sheet.html",
    "systems/zwolf-epic/templates/item/item-fundament-sheet.html",
    "systems/zwolf-epic/templates/item/item-equipment-sheet.html",
    "systems/zwolf-epic/templates/item/item-knack-sheet.html",
    "systems/zwolf-epic/templates/item/item-track-sheet.html",
    "systems/zwolf-epic/templates/item/item-talent-sheet.html"
  ]);
};