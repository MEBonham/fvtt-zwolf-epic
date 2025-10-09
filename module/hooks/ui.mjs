/**
 * Hook to display actor levels in the sidebar
 */
export function registerActorDirectoryHook() {
  Hooks.on('renderActorDirectory', (app, html) => {
    // Find all actor entries in the sidebar
    const actorElements = html.querySelectorAll('.directory-item.entry.document.actor');
    
    actorElements.forEach(el => {
      const actorId = el.dataset.entryId; // Changed from documentId to entryId
      const actor = game.actors.get(actorId);
      
      if (actor?.system?.level) {
        // Find the name element
        const nameElement = el.querySelector('.entry-name'); // Changed from .document-name a to .entry-name
        if (nameElement) {
          // Append level to the name
          const currentText = nameElement.textContent;
          nameElement.textContent = `${currentText} (Lv ${actor.system.level})`;
        }
      }
    });
  });
}
