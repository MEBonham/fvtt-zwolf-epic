/**
 * Hook to display actor levels in the sidebar
 */
export function registerActorDirectoryHook() {
  Hooks.on('renderActorDirectory', (app, html) => {
    // Find all actor entries in the sidebar
    const actorElements = html.querySelectorAll('.directory-item.entry.document.actor');
    
    actorElements.forEach(el => {
      const actorId = el.dataset.entryId;
      const actor = game.actors.get(actorId);
      
      // Only show level for pc and npc types
      if (actor?.system?.level && (actor.type === 'pc' || actor.type === 'npc')) {
        // Find the name element
        const nameElement = el.querySelector('.entry-name');
        if (nameElement) {
          // Append level to the name
          const currentText = nameElement.textContent;
          nameElement.textContent = `${currentText} (Lv ${actor.system.level})`;
        }
      }
    });
  });
}
