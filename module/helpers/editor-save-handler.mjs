/**
 * Enhanced helper class for handling rich text editor operations in V2 framework
 */
export class EditorSaveHandler {

  /**
   * Activate V2 editors for a sheet
   */
  static activateEditors(sheet) {
    console.log("=== ACTIVATING V2 EDITORS ===");

    const editorButtons = sheet.element.querySelectorAll('.editor-edit');
    console.log("Found editor buttons:", editorButtons.length);

    editorButtons.forEach(button => {
      const editor = button.closest('.editor');
      const editorContent = editor?.querySelector('.editor-content');

      if (editorContent) {
        const target = editorContent.dataset.edit;
        console.log("Setting up editor for target:", target);

        button.addEventListener('click', async (event) => {
          event.preventDefault();
          console.log("Editor button clicked for:", target);

          await this.createManualEditor(sheet, target, button, editorContent);
        });
      }
    });
  }

  /**
   * Create a manual ProseMirror editor with Save/Cancel controls
   */
  static async createManualEditor(sheet, target, button, editorContent) {
    console.log("=== CREATING MANUAL EDITOR ===");
    console.log("Target:", target);

    // Get existing content
    let content = "";
    try {
      if (editorContent && editorContent.innerHTML && !editorContent.innerHTML.includes("<em>No description</em>")) {
        content = editorContent.innerHTML;
      } else if (target.startsWith("system.")) {
        const propertyPath = target.replace("system.", "");
        content = foundry.utils.getProperty(sheet.document.system, propertyPath) || "";
      } else {
        content = foundry.utils.getProperty(sheet.document, target) || "";
      }

      // Special handling for abilities
      if (!content && target.includes("grantedAbilities")) {
        const abilityMatch = target.match(/system\.grantedAbilities\.(\d+)\.description/);
        if (abilityMatch) {
          const abilityIndex = abilityMatch[1];
          const abilities = sheet.document.system.grantedAbilities || {};
          if (abilities[abilityIndex]) {
            content = abilities[abilityIndex].description || "";
          }
        }
      }

      // Special handling for tier abilities
      if (!content && target.includes("tiers.tier")) {
        const tierMatch = target.match(/system\.tiers\.tier(\d+)\.grantedAbilities\.(\d+)\.description/);
        if (tierMatch) {
          const tier = tierMatch[1];
          const abilityIndex = tierMatch[2];
          const tierAbilities = sheet.document.system.tiers?.[`tier${tier}`]?.grantedAbilities || {};
          if (tierAbilities[abilityIndex]) {
            content = tierAbilities[abilityIndex].description || "";
          }
        }
      }

      console.log("Retrieved content length:", content.length);

    } catch (error) {
      console.error("Failed to get existing content:", error);
      content = "";
    }

    let editorContainer = null;
    let isCleanedUp = false;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;

      if (editorContainer && editorContainer.parentNode) {
        editorContainer.remove();
      }

      if (editorContent) {
        editorContent.style.display = 'block';
      }

      if (button) {
        button.style.display = 'block';
      }
    };

    try {
      button.style.display = 'none';

      // Create editor container
      editorContainer = document.createElement('div');
      editorContainer.className = 'prosemirror-editor-container';

      const editorElement = document.createElement('div');
      editorElement.className = 'prosemirror-editor';
      editorContainer.appendChild(editorElement);

      // Create Save/Cancel buttons
      const controls = document.createElement('div');
      controls.className = 'editor-controls';
      controls.style.cssText = 'display: flex; gap: 8px; margin-top: 4px; justify-content: flex-end;';

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'save-editor-btn';
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
      saveBtn.style.cssText = 'background: var(--z-wolf-success); color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer;';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'cancel-editor-btn';
      cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
      cancelBtn.style.cssText = 'background: var(--z-wolf-danger); color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer;';

      controls.appendChild(saveBtn);
      controls.appendChild(cancelBtn);
      editorContainer.appendChild(controls);

      // Insert editor
      const parent = editorContent.parentNode;
      parent.insertBefore(editorContainer, editorContent);
      editorContent.style.display = 'none';

      // Create ProseMirror editor
      await foundry.applications.ux.TextEditor.create({
        target: editorElement,
        engine: "prosemirror",
        height: 150
      });

      // Wait for editor to initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      // Set content
      if (content && content.trim() !== "") {
        editorElement.innerHTML = content;
        editorElement.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Save handler - CRITICAL: Update using form submission, not direct document update
      const handleSave = async () => {
        if (isCleanedUp) return;

        try {
          const prosemirrorDiv = editorElement.querySelector('.ProseMirror');
          const newContent = prosemirrorDiv ? prosemirrorDiv.innerHTML : editorElement.innerHTML;

          console.log("Saving content for:", target);
          console.log("Content length:", newContent.length);

          // Instead of updating directly, trigger form submission with this data
          // This ensures all form data is captured together
          const form = sheet.element.querySelector('form');
          if (form) {
            // Find or create hidden input for this field
            let hiddenInput = form.querySelector(`input[name="${target}"]`);
            if (!hiddenInput) {
              hiddenInput = document.createElement('input');
              hiddenInput.type = 'hidden';
              hiddenInput.name = target;
              form.appendChild(hiddenInput);
            }
            hiddenInput.value = newContent;

            // Trigger form change event to initiate auto-save
            form.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            // Fallback: direct update if no form found
            await sheet.document.update({ [target]: newContent });
          }

          cleanup();
          ui.notifications.info("Content saved");

        } catch (error) {
          console.error("Failed to save:", error);
          ui.notifications.error("Failed to save content");
          cleanup();
        }
      };

      // Event listeners
      saveBtn.addEventListener('click', handleSave);
      cancelBtn.addEventListener('click', cleanup);

      // ESC to cancel
      const escapeHandler = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          cleanup();
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);

    } catch (error) {
      console.error("Failed to create editor:", error);
      cleanup();
      ui.notifications.error("Failed to activate editor");
    }
  }
}