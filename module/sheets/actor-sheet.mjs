export default class ZWolfActorSheet extends ActorSheet {
  
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["zwolf-epic", "sheet", "actor"],
      width: 850,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }]
    });
  }

  /** @override */
  get template() {
    // Return different templates based on actor type
    if (this.actor.type === "spawn") {
      return "systems/z-wolf-epic/templates/actor/actor-spawn-sheet.hbs";
    } else if (this.actor.type === "mook") {
      return "systems/z-wolf-epic/templates/actor/actor-mook-sheet.hbs";
    }
    // Default template for pc, npc, eidolon
    return "systems/z-wolf-epic/templates/actor/actor-character-sheet.hbs";
  }

  /** @override */
  getData() {
    const context = super.getData();
    
    // Add any additional data processing here
    
    return context;
  }

  // Add your event handlers, dice rolling logic, etc. here
}
