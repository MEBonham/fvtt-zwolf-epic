/**
 * Preload Handlebars templates for the system.
 * @returns {Promise}
 */
export async function preloadTemplates() {
    console.log("Starting V2-compatible template preload...");

    // V2 Parts are loaded automatically via the PARTS config - don't preload them
    const templates = [];

    // Only actual Handlebars partials need to be registered
    const partials = [
        // Item partials
        "systems/zwolf-epic/templates/item/partials/ability-item.hbs",
        "systems/zwolf-epic/templates/item/partials/form-field.hbs",
        "systems/zwolf-epic/templates/item/partials/progression-select.hbs",
        "systems/zwolf-epic/templates/item/partials/side-effects-form.hbs",
        "systems/zwolf-epic/templates/item/partials/tier-template.hbs",

        // Actor partials (NOT parts!)
        "systems/zwolf-epic/templates/actor/partials/ability-category.hbs",
        "systems/zwolf-epic/templates/actor/partials/ability-detail.hbs",
        "systems/zwolf-epic/templates/actor/partials/attunement-slot.hbs",
        "systems/zwolf-epic/templates/actor/partials/base-creature-selector.hbs",
        "systems/zwolf-epic/templates/actor/partials/equipment-item.hbs",
        "systems/zwolf-epic/templates/actor/partials/foundation-slot.hbs",
        "systems/zwolf-epic/templates/actor/partials/item-slot.hbs",
        "systems/zwolf-epic/templates/actor/partials/progression-slider.hbs",
        "systems/zwolf-epic/templates/actor/partials/resource-display.hbs",
        "systems/zwolf-epic/templates/actor/partials/tn-display.hbs",
    ];

    const templateResults = await foundry.applications.handlebars.loadTemplates(templates);
    const partialResults = await foundry.applications.handlebars.loadTemplates(partials);

    // Register partials in Handlebars cache
    for (let i = 0; i < partials.length; i++) {
        const fullPath = partials[i];
        const partialName = fullPath.split("/").pop().replace(".hbs", "");
        let template = partialResults[i];

        if (template) {
            Handlebars.partials[partialName] = template;
            console.log(`Successfully registered partial: ${partialName}`);
        }
    }

    return { ...templateResults, ...partialResults };
}
