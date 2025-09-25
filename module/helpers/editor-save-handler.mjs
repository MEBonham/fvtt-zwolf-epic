/**
 * Enhanced helper class for handling rich text editor operations in V2 framework
 * Handles both automatic saves and manual ProseMirror editor creation
 */
export class EditorSaveHandler {

  /**
   * Handle rich text editor saves for items and actors
   * In V2, most saves are handled automatically - this is mainly for debugging
   * @param {ZWolfItem|ZWolfActor} document - The document being edited
   * @param {string} target - The target field being saved
   * @param {HTMLElement} element - The editor element
   * @param {string} content - The saved content
   * @returns {Promise<boolean>} - True if handled, false if not
   */
  static async handleEditorSave(document, target, element, content) {
    console.log("=== V2 EDITOR SAVE DEBUG ===");
    console.log("Target:", target);
    console.log("Content length:", content?.length);
    console.log("Document type:", document.type || document.documentName);

    // In V2, the {{editor}} helper handles saves automatically
    // We mainly need this for special validation or processing
    
    // Validate ability descriptions have reasonable content
    if (target && target.includes('grantedAbilities') && target.includes('description')) {
      console.log("Processing ability description save");
      
      // Log for debugging but let V2 handle the actual save
      if (content && content.length > 10000) {
        console.warn("Very long description detected:", content.length, "characters");
        ui.notifications.warn("Description is very long - consider breaking it into multiple abilities");
      }
      
      // Let V2 framework handle the save
      return false;
    }
    
    // Handle other special cases if needed
    if (document.type === 'track' && target && target.includes('tier') && target.includes('description')) {
      console.log("Processing track tier description save");
      return false; // Let V2 handle it
    }
    
    // For main description fields
    if (target === 'system.description') {
      console.log("Processing main description save");
      return false; // Let V2 handle it
    }
    
    console.log("No special handling needed, letting V2 framework handle save");
    return false; // Let V2 framework handle all saves
  }

  /**
   * Debug helper to log editor activation
   * @param {HTMLElement} element - The editor element
   * @param {string} target - The target field
   */
  static logEditorActivation(element, target) {
    console.log("=== EDITOR ACTIVATION ===");
    console.log("Target:", target);
    console.log("Element:", element);
    console.log("Editor button found:", !!element.querySelector('.editor-edit'));
    console.log("ProseMirror found:", !!element.querySelector('.ProseMirror'));
  }

  /**
   * Activate V2 editors for a sheet - tries native methods first, falls back to manual creation
   * @param {Object} sheet - The sheet instance
   */
  static activateEditors(sheet) {
    console.log("=== ACTIVATING V2 EDITORS ===");
    console.log("Available methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(sheet)).filter(name => name.includes('edit')));
    
    // Find all editor-edit buttons and bind them properly
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
          
          // Try native V2 methods first
          if (typeof sheet.activateEditor === 'function') {
            console.log("Using activateEditor");
            sheet.activateEditor(target);
            return;
          } else if (typeof sheet._activateEditor === 'function') {
            console.log("Using _activateEditor");
            sheet._activateEditor(target);
            return;
          } else if (typeof sheet.editors?.activate === 'function') {
            console.log("Using editors.activate");
            sheet.editors.activate(target);
            return;
          }
          
          // Fall back to manual creation
          await this.createManualEditor(sheet, target, button, editorContent);
        });
      }
    });
  }

  /**
   * Create a manual ProseMirror editor with Save/Cancel controls
   * @param {Object} sheet - The sheet instance
   * @param {string} target - The target field path
   * @param {HTMLElement} button - The edit button
   * @param {HTMLElement} editorContent - The editor content element
   */
  static async createManualEditor(sheet, target, button, editorContent) {
    console.log("=== MANUAL EDITOR CREATION DEBUG ===");
    console.log("Target field:", target);
    console.log("Sheet document:", sheet.document);
    console.log("Document system:", sheet.document.system);
    console.log("Editor content element:", editorContent);
    console.log("Editor content innerHTML:", editorContent?.innerHTML);
    console.log("Editor content textContent:", editorContent?.textContent);
    
    // FIXED: Comprehensive content retrieval with multiple fallbacks
    let content = "";
    try {
      console.log("=== CONTENT RETRIEVAL DEBUG ===");
      
      // Strategy 1: Get from the visible editor content HTML
      if (editorContent && editorContent.innerHTML && editorContent.innerHTML.trim() !== "" && !editorContent.innerHTML.includes("<em>No description</em>")) {
        content = editorContent.innerHTML;
        console.log("Strategy 1 - Got content from editor HTML:", content.substring(0, 100));
      }
      // Strategy 2: Get from document using full path
      else if (target.startsWith("system.")) {
        const propertyPath = target.replace("system.", "");
        content = foundry.utils.getProperty(sheet.document.system, propertyPath) || "";
        console.log("Strategy 2 - Got content from system property:", propertyPath, "->", content.substring(0, 100));
      }
      // Strategy 3: Get from document using full target path
      else {
        content = foundry.utils.getProperty(sheet.document, target) || "";
        console.log("Strategy 3 - Got content from document property:", target, "->", content.substring(0, 100));
      }
      
      // Strategy 4: For abilities, parse the index and get directly
      if (!content && target.includes("grantedAbilities")) {
        const abilityMatch = target.match(/system\.grantedAbilities\.(\d+)\.description/);
        if (abilityMatch) {
          const abilityIndex = abilityMatch[1];
          const abilities = sheet.document.system.grantedAbilities || {};
          console.log("Strategy 4 - All abilities:", JSON.stringify(abilities, null, 2));
          if (abilities[abilityIndex]) {
            content = abilities[abilityIndex].description || "";
            console.log("Strategy 4 - Got ability description for index", abilityIndex, ":", content.substring(0, 100));
          }
        }
      }
      
      console.log("Final retrieved content length:", content.length);
      console.log("Final content preview:", content.substring(0, 200) + (content.length > 200 ? "..." : ""));
      
    } catch (error) {
      console.error("Failed to get existing content:", error);
      content = "";
    }
    
    let proseMirrorEditor = null;
    let editorContainer = null;
    let isCleanedUp = false;
    let toolbarClickHandler = null;
    let escapeHandler = null;
    let toolbarObserver = null;
    let periodicCheck = null;
    
    // Cleanup function - ensure it only runs once
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      
      console.log("Cleaning up editor...");
      
      // Remove event listeners
      if (toolbarClickHandler) {
        document.removeEventListener('click', toolbarClickHandler);
      }
      if (escapeHandler) {
        document.removeEventListener('keydown', escapeHandler);
      }
      
      // Clean up observers and intervals
      if (toolbarObserver) {
        toolbarObserver.disconnect();
        toolbarObserver = null;
      }
      if (periodicCheck) {
        clearInterval(periodicCheck);
        periodicCheck = null;
      }
      
      // Remove any editor containers we created
      if (editorContainer && editorContainer.parentNode) {
        editorContainer.remove();
      }
      
      // Restore original content display
      if (editorContent) {
        editorContent.style.display = 'block';
      }
      
      // Restore edit button
      if (button) {
        button.style.display = 'block';
      }
      
      // Destroy ProseMirror editor
      if (proseMirrorEditor && typeof proseMirrorEditor.destroy === 'function') {
        try {
          proseMirrorEditor.destroy();
        } catch (error) {
          console.warn("Error destroying ProseMirror editor:", error);
        }
      }
      
      // Remove any toolbar buttons we added
      document.querySelectorAll('.zwolf-editor-save, .zwolf-editor-cancel').forEach(el => {
        el.remove();
      });
    };
    
    try {
      // Hide the edit button while editing
      button.style.display = 'none';
      
      // Create editor container with controls
      editorContainer = document.createElement('div');
      editorContainer.className = 'prosemirror-editor-container';
      
      // Create the actual editor element
      const editorElement = document.createElement('div');
      editorElement.className = 'prosemirror-editor';
      editorContainer.appendChild(editorElement);
      
      // Replace the editor content with our container
      const parent = editorContent.parentNode;
      parent.insertBefore(editorContainer, editorContent);
      editorContent.style.display = 'none';
      
      // Create the ProseMirror editor
      console.log("=== PROSEMIRROR CREATION DEBUG ===");
      console.log("Content being passed to ProseMirror:", content);
      console.log("Content length:", content.length);
      
      // FIXED: Try different approaches for content loading
      try {
        // Method 1: Use the new V13 API with content parameter
        proseMirrorEditor = await foundry.applications.ux.TextEditor.create({
          target: editorElement,
          content: content,  // Pass content in options
          engine: "prosemirror",
          height: 150,
          toolbar: "bold italic underline | bullist numlist | link | h2 h3 h4"
        });
        console.log("ProseMirror editor created successfully via Method 1");
      } catch (error1) {
        console.log("Method 1 failed, trying Method 2:", error1.message);
        
        try {
          // Method 2: Create without content, then set it
          proseMirrorEditor = await foundry.applications.ux.TextEditor.create({
            target: editorElement,
            engine: "prosemirror",
            height: 150,
            toolbar: "bold italic underline | bullist numlist | link | h2 h3 h4"
          });
          console.log("ProseMirror editor created successfully via Method 2");
        } catch (error2) {
          console.log("Method 2 failed, trying Method 3:", error2.message);
          
          // Method 3: Use global TextEditor
          proseMirrorEditor = await TextEditor.create({
            target: editorElement,
            content: content,
            engine: "prosemirror",
            height: 150,
            toolbar: "bold italic underline | bullist numlist | link | h2 h3 h4"
          });
          console.log("ProseMirror editor created successfully via Method 3");
        }
      }
      
      console.log("Final ProseMirror editor:", proseMirrorEditor);
      
      // FIXED: Multiple approaches to set content after creation
      if (content && content.trim() !== "" && proseMirrorEditor) {
        console.log("Attempting to set content after creation...");
        
        // FIXED: Use a more robust waiting strategy
        const setContentWithRetry = async (attempts = 0, maxAttempts = 10) => {
          if (attempts >= maxAttempts) {
            console.warn("Failed to set content after maximum attempts");
            return;
          }
          
          try {
            // Check for ProseMirror DOM elements with longer timeout
            const prosemirrorDiv = editorElement.querySelector('.ProseMirror');
            const editorView = proseMirrorEditor.view;
            
            console.log(`Attempt ${attempts + 1}: ProseMirror div exists:`, !!prosemirrorDiv);
            console.log(`Attempt ${attempts + 1}: Editor view exists:`, !!editorView);
            
            // Method A: Try using the editor view directly (V13 approach)
            if (editorView && typeof editorView.dispatch === 'function') {
              console.log("Using ProseMirror view.dispatch method");
              
              try {
                // Create a simple text replacement transaction
                const tr = editorView.state.tr;
                const textContent = content.replace(/<\/?[^>]+(>|$)/g, ""); // Strip HTML tags
                
                // Replace entire document content with new text
                tr.insertText(textContent, 0, editorView.state.doc.content.size);
                editorView.dispatch(tr);
                console.log("Content set via ProseMirror transaction");
                return; // Success
              } catch (transactionError) {
                console.error("Transaction method failed:", transactionError);
                // Continue to next method
              }
            }
            
            // Method B: Try DOM manipulation if ProseMirror div exists
            if (prosemirrorDiv) {
              console.log("Using direct DOM manipulation");
              prosemirrorDiv.innerHTML = content;
              
              // Trigger multiple events to ensure ProseMirror detects the change
              ['input', 'change', 'keyup'].forEach(eventType => {
                prosemirrorDiv.dispatchEvent(new Event(eventType, { bubbles: true }));
              });
              
              console.log("Content set via DOM manipulation with events");
              return; // Success
            }
            
            // Method C: If neither worked, wait and retry
            console.log("Neither method worked, retrying in 100ms...");
            setTimeout(() => setContentWithRetry(attempts + 1, maxAttempts), 100);
            
          } catch (contentError) {
            console.error(`Error setting content (attempt ${attempts + 1}):`, contentError);
            setTimeout(() => setContentWithRetry(attempts + 1, maxAttempts), 100);
          }
        };
        
        // Start the retry process after a brief initial delay
        setTimeout(() => setContentWithRetry(), 50);
        
        // Final verification after all attempts
        setTimeout(() => {
          const prosemirrorDiv = editorElement.querySelector('.ProseMirror');
          if (prosemirrorDiv) {
            console.log("Final content verification - DOM content:", prosemirrorDiv.innerHTML.substring(0, 100));
            
            // Check if content actually appears in the editor
            if (prosemirrorDiv.innerHTML.includes(content) || 
                prosemirrorDiv.textContent.includes(content.replace(/<\/?[^>]+(>|$)/g, ""))) {
              console.log("SUCCESS: Content is visible in editor");
            } else {
              console.log("FAILURE: Content not visible in editor");
              console.log("Expected:", content);
              console.log("Actual DOM:", prosemirrorDiv.innerHTML);
              console.log("Actual text:", prosemirrorDiv.textContent);
            }
          } else {
            console.log("Final verification: ProseMirror div still not found");
          }
        }, 1500);
      }
      
      console.log("Editor content after creation:", proseMirrorEditor?.getContent?.());
      
      // Save function
      const handleSave = async () => {
        if (isCleanedUp) return;
        
        try {
          console.log("Saving content to:", target);
          
          // Get content from ProseMirror editor
          let newContent;
          if (proseMirrorEditor && typeof proseMirrorEditor.getContent === 'function') {
            newContent = proseMirrorEditor.getContent();
          } else {
            // Fallback: get content directly from the editor element
            const prosemirrorDiv = editorElement.querySelector('.ProseMirror');
            newContent = prosemirrorDiv ? prosemirrorDiv.innerHTML : editorElement.innerHTML;
          }
          
          console.log("Content:", newContent);
          await sheet.document.update({ [target]: newContent });
          
          cleanup();
          
          // Show success feedback
          ui.notifications.info("Content saved successfully");
          
        } catch (error) {
          console.error("Failed to save content:", error);
          ui.notifications.error("Failed to save content");
          cleanup();
        }
      };
      
      // Cancel function
      const handleCancel = () => {
        console.log("Editor cancelled");
        cleanup();
      };
      
      // Set up toolbar button management
      this.setupToolbarButtons(handleSave, handleCancel, cleanup);
      
      // Set up event handlers
      toolbarClickHandler = (event) => {
        if (isCleanedUp) return;
        
        if (event.target.closest('[data-action="save-editor"]')) {
          event.preventDefault();
          handleSave();
          document.removeEventListener('click', toolbarClickHandler);
        } else if (event.target.closest('[data-action="cancel-editor"]')) {
          event.preventDefault();
          handleCancel();
          document.removeEventListener('click', toolbarClickHandler);
        }
      };
      document.addEventListener('click', toolbarClickHandler);
      
      // ESC key handler for cancel
      escapeHandler = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          handleCancel();
        }
      };
      document.addEventListener('keydown', escapeHandler);
      
      console.log("Manual V13 editor created successfully");
      
    } catch (error) {
      console.error("Failed to create ProseMirror editor:", error);
      cleanup();
      ui.notifications.error("Failed to activate editor");
    }
  }

  /**
   * Set up toolbar buttons with persistent monitoring
   * @param {Function} handleSave - Save handler function
   * @param {Function} handleCancel - Cancel handler function
   * @param {Function} cleanup - Cleanup function
   */
  static setupToolbarButtons(handleSave, handleCancel, cleanup) {
    let toolbarObserver = null;
    let periodicCheck = null;
    
    const addToolbarButtons = () => {
      console.log("Attempting to find ProseMirror toolbar...");
      
      // Strategy: Look for the most recent toolbar in the document
      const allToolbars = document.querySelectorAll('.editor-menu');
      const toolbar = allToolbars[allToolbars.length - 1];
      
      if (toolbar) {
        // Check if our buttons are already there
        const existingSave = toolbar.querySelector('.zwolf-editor-save');
        const existingCancel = toolbar.querySelector('.zwolf-editor-cancel');
        
        if (existingSave && existingCancel) {
          console.log("Toolbar buttons already exist");
          return true;
        }
        
        // Remove any existing buttons first
        if (existingSave) existingSave.remove();
        if (existingCancel) existingCancel.remove();
        
        console.log("Found ProseMirror toolbar, adding Save/Cancel buttons");
        
        // Create Save button for toolbar
        const toolbarSave = document.createElement('li');
        toolbarSave.className = 'text right zwolf-editor-save';
        toolbarSave.innerHTML = `
          <button type="button" data-tooltip="Save Changes" data-action="save-editor" class="zwolf-toolbar-save-btn">
            <i class="fa-solid fa-save fa-fw"></i>
          </button>
        `;
        
        // Create Cancel button for toolbar
        const toolbarCancel = document.createElement('li');
        toolbarCancel.className = 'text right zwolf-editor-cancel';
        toolbarCancel.innerHTML = `
          <button type="button" data-tooltip="Cancel Changes" data-action="cancel-editor" class="zwolf-toolbar-cancel-btn">
            <i class="fa-solid fa-times fa-fw"></i>
          </button>
        `;
        
        // Add buttons to toolbar
        const concurrentUsers = toolbar.querySelector('.concurrent-users');
        if (concurrentUsers) {
          toolbar.insertBefore(toolbarSave, concurrentUsers);
          toolbar.insertBefore(toolbarCancel, concurrentUsers);
        } else {
          toolbar.appendChild(toolbarSave);
          toolbar.appendChild(toolbarCancel);
        }
        
        console.log("Toolbar buttons added successfully");
        return true;
      } else {
        console.log("Could not find ProseMirror toolbar");
        return false;
      }
    };
    
    // Set up persistent monitoring for toolbar changes
    const setupToolbarMonitoring = () => {
      if (toolbarObserver) {
        toolbarObserver.disconnect();
      }
      
      toolbarObserver = new MutationObserver((mutations) => {
        let shouldCheckButtons = false;
        
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            const addedNodes = Array.from(mutation.addedNodes);
            const removedNodes = Array.from(mutation.removedNodes);
            
            const hasToolbarChanges = [...addedNodes, ...removedNodes].some(node => 
              node.nodeType === Node.ELEMENT_NODE && (
                node.classList?.contains('editor-menu') || 
                node.querySelector?.('.editor-menu') ||
                node.classList?.contains('zwolf-editor-save') ||
                node.classList?.contains('zwolf-editor-cancel') ||
                (mutation.target?.classList?.contains('editor-menu'))
              )
            );
            
            if (hasToolbarChanges) {
              shouldCheckButtons = true;
            }
          }
        }
        
        if (shouldCheckButtons) {
          console.log("Toolbar changes detected, re-checking buttons");
          setTimeout(() => {
            addToolbarButtons();
          }, 10);
        }
      });
      
      toolbarObserver.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: false
      });
      
      console.log("Toolbar monitoring set up");
    };
    
    // Set up periodic checking as a fallback
    const setupPeriodicCheck = () => {
      if (periodicCheck) {
        clearInterval(periodicCheck);
      }
      
      periodicCheck = setInterval(() => {
        const toolbar = document.querySelector('.editor-menu');
        if (toolbar) {
          const existingSave = toolbar.querySelector('.zwolf-editor-save');
          if (!existingSave) {
            console.log("Periodic check: toolbar buttons missing, re-adding");
            addToolbarButtons();
          }
        }
      }, 1000);
    };
    
    // Set up monitoring and try to add buttons
    setupToolbarMonitoring();
    setupPeriodicCheck();
    
    // Try to add toolbar buttons with retries
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryAddButtons = () => {
      attempts++;
      console.log(`Attempt ${attempts} to add toolbar buttons`);
      
      if (addToolbarButtons()) {
        console.log("Toolbar buttons added successfully on attempt", attempts);
        return;
      }
      
      if (attempts < maxAttempts) {
        setTimeout(tryAddButtons, attempts * 100);
      } else {
        console.log("Failed to add toolbar buttons after", maxAttempts, "attempts, but monitoring will continue");
      }
    };
    
    // Start trying to add buttons after a brief delay
    setTimeout(tryAddButtons, 50);
  }
}