/**
 * Register custom Handlebars helpers.
 */
export function registerHandlebarsHelpers() {
    // Example helper: concatenate strings
    Handlebars.registerHelper("concat", function (...args) {
        args.pop(); // Remove the Handlebars options object
        return args.join("");
    });

    // Example helper: localize with fallback
    Handlebars.registerHelper("localize", function (key) {
        return game.i18n.localize(key);
    });
}
