/**
 * Preload Handlebars templates for the system.
 * @returns {Promise}
 */
export async function preloadTemplates() {
    const templatePaths = [
        // Actor partials
        "systems/zwolf-epic/templates/actor/actor-sheet.hbs",

        // Item partials
        "systems/zwolf-epic/templates/item/item-sheet.hbs"
    ];

    return foundry.applications.handlebars.loadTemplates(templatePaths);
}
