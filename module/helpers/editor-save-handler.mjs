/**
 * Enhanced helper class for handling rich text editor operations in V2 framework
 */
export class EditorSaveHandler {

  /**
   * Handle rich text editor saves - mainly for validation
   */
  static async handleEditorSave(document, target, element, content) {
    if (content && content.length > 10000) {
      console.warn("Very long description detected:", content.length, "characters");
      ui.notifications.warn("Description is very long - consider breaking it into sections");
    }
    
    return false; // Let V2 framework handle the save
  }

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
      console.log("=== CONTENT RETRIEVAL DEBUG ===");
      console.log("Target:", target);
      console.log("editorContent element:", editorContent);
      console.log("editorContent.innerHTML:", editorContent?.innerHTML);
      
      if (editorContent && editorContent.innerHTML && !editorContent.innerHTML.includes("<em>No description</em>")) {
        content = editorContent.innerHTML;
        console.log("Strategy 1: Got from editorContent.innerHTML");
      } else if (target.startsWith("system.")) {
        const propertyPath = target.replace("system.", "");
        content = foundry.utils.getProperty(sheet.document.system, propertyPath) || "";
        console.log("Strategy 2: Got from system property:", propertyPath);
      } else {
        content = foundry.utils.getProperty(sheet.document, target) || "";
        console.log("Strategy 3: Got from document property");
      }
      
      // Special handling for abilities
      if (!content && target.includes("grantedAbilities")) {
        const abilityMatch = target.match(/system\.grantedAbilities\.(\d+)\.description/);
        if (abilityMatch) {
          const abilityIndex = abilityMatch[1];
          const abilities = sheet.document.system.grantedAbilities || {};
          console.log("All abilities:", abilities);
          console.log("Looking for ability at index:", abilityIndex);
          if (abilities[abilityIndex]) {
            content = abilities[abilityIndex].description || "";
            console.log("Strategy 4: Got from abilities array");
          }
        }
      }
      
      console.log("Final retrieved content:", content);
      console.log("Content length:", content.length);
      console.log("Content preview:", content.substring(0, 200));
      
    } catch (error) {
      console.error("Failed to get existing content:", error);
      content = "";
    }
    
    let proseMirrorEditor = null;
    let editorContainer = null;
    let isCleanedUp = false;
    
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      
      console.log("Cleaning up editor");
      
      if (editorContainer && editorContainer.parentNode) {
        editorContainer.remove();
      }
      
      if (editorContent) {
        editorContent.style.display = 'block';
      }
      
      if (button) {
        button.style.display = 'block';
      }
      
      if (proseMirrorEditor && typeof proseMirrorEditor.destroy === 'function') {
        try {
          proseMirrorEditor.destroy();
        } catch (error) {
          console.warn("Error destroying editor (this is usually harmless):", error.message);
        }
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
      
      // Create ProseMirror editor with V13 API
      console.log("Creating ProseMirror with content length:", content.length);
      
      proseMirrorEditor = await foundry.applications.ux.TextEditor.create({
        target: editorElement,
        engine: "prosemirror",
        height: 150
      });
      
      console.log("ProseMirror editor created");
      console.log("editorElement IS the editor:", editorElement.classList.contains('ProseMirror'));
      console.log("Current content:", editorElement.innerHTML);
      
      // The editorElement itself IS the ProseMirror editor now
      // Set content directly on it
      if (content && content.trim() !== "") {
        console.log("Setting content directly on editor element");
        
        // Small delay to ensure editor is fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Set the HTML content
        editorElement.innerHTML = content;
        
        // Trigger events to let ProseMirror know content changed
        editorElement.dispatchEvent(new Event('input', { bubbles: true }));
        
        console.log("Content set. Final innerHTML:", editorElement.innerHTML.substring(0, 100));
        console.log("Visible text:", editorElement.textContent.substring(0, 100));
      }
      
      // Save handler
      const handleSave = async () => {
        if (isCleanedUp) return;
        
        try {
          let newContent;
          if (proseMirrorEditor && typeof proseMirrorEditor.getContent === 'function') {
            newContent = proseMirrorEditor.getContent();
          } else {
            const prosemirrorDiv = editorElement.querySelector('.ProseMirror');
            newContent = prosemirrorDiv ? prosemirrorDiv.innerHTML : editorElement.innerHTML;
          }
          
          await sheet.document.update({ [target]: newContent });
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