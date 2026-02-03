/**
 * UI-related hooks for Z-Wolf Epic
 * Handles sidebar enhancements and other UI modifications
 */

/**
 * Hook to display actor levels in the sidebar
 */
export function registerActorDirectoryHook() {
    Hooks.on("renderActorDirectory", (app, html) => {
        // Handle both jQuery and HTMLElement (v13 compatibility)
        const element = html instanceof jQuery ? html[0] : html;
        if (!element) return;

        // Find all actor entries in the sidebar (try multiple selectors for v13 compatibility)
        let actorElements = element.querySelectorAll(".directory-item.entry.document.actor");
        if (!actorElements.length) {
            actorElements = element.querySelectorAll(".directory-item.document.actor");
        }
        if (!actorElements.length) {
            actorElements = element.querySelectorAll("[data-entry-id]");
        }

        actorElements.forEach(el => {
            const actorId = el.dataset.entryId;
            if (!actorId) return;

            const actor = game.actors.get(actorId);

            // Only show level for pc and npc types
            if (actor?.system?.level && (actor.type === "pc" || actor.type === "npc")) {
                // Find the name element (try multiple selectors)
                const nameElement = el.querySelector(".entry-name") || el.querySelector(".document-name");
                if (nameElement && !nameElement.textContent.includes("(Lv")) {
                    // Append level to the name (avoid duplicates on re-render)
                    const currentText = nameElement.textContent.trim();
                    nameElement.textContent = `${currentText} (Lv ${actor.system.level})`;
                }
            }
        });
    });
}