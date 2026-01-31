/**
 * Enhanced helper class for handling rich text editor operations in V2 framework
 */
export class EditorSaveHandler {

    /**
     * Activate V2 editors for a sheet
     */
    static activateEditors(sheet) {
        const editorButtons = sheet.element.querySelectorAll(".editor-edit");

        editorButtons.forEach(button => {
            const editor = button.closest(".editor");
            const editorContent = editor?.querySelector(".editor-content");

            if (editorContent) {
                const target = editorContent.dataset.edit;

                button.addEventListener("click", async (event) => {
                    event.preventDefault();
                    await this.createManualEditor(sheet, target, button, editorContent);
                });
            }
        });
    }

    /**
     * Create a manual ProseMirror editor with Save/Cancel controls
     */
    static async createManualEditor(sheet, target, button, editorContent) {
        // Get existing content from the data model
        let content = "";
        try {
            if (target.startsWith("system.")) {
                const propertyPath = target.replace("system.", "");
                content = foundry.utils.getProperty(sheet.document.system, propertyPath) || "";
            } else {
                content = foundry.utils.getProperty(sheet.document, target) || "";
            }
        } catch (error) {
            console.error("Z-Wolf Epic | Failed to get existing content:", error);
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
                editorContent.style.display = "block";
            }

            const toolbar = button.parentElement;
            if (toolbar) {
                toolbar.style.display = "flex";
            }
        };

        try {
            // Hide the view mode content and toolbar
            editorContent.style.display = "none";
            const toolbar = button.parentElement;
            if (toolbar) {
                toolbar.style.display = "none";
            }

            // Create editor container
            editorContainer = document.createElement("div");
            editorContainer.className = "prosemirror-editor-container";

            const editorElement = document.createElement("div");
            editorElement.className = "prosemirror-editor";
            editorContainer.appendChild(editorElement);

            // Create Save/Cancel buttons
            const controls = document.createElement("div");
            controls.className = "editor-controls";

            const saveBtn = document.createElement("button");
            saveBtn.type = "button";
            saveBtn.className = "save-editor-btn";
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';

            const cancelBtn = document.createElement("button");
            cancelBtn.type = "button";
            cancelBtn.className = "cancel-editor-btn";
            cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';

            controls.appendChild(saveBtn);
            controls.appendChild(cancelBtn);
            editorContainer.appendChild(controls);

            // Insert editor into DOM
            const parent = editorContent.parentNode;
            parent.insertBefore(editorContainer, editorContent);

            // Debug: log the content being loaded
            console.log("Z-Wolf Epic | Editor loading content for", target, ":", content ? content.substring(0, 100) : "(empty)");

            // Create ProseMirror editor
            await foundry.applications.ux.TextEditor.create({
                target: editorElement,
                engine: "prosemirror",
                height: 150
            });

            // Set initial content after editor is fully initialized
            if (content && content.trim() !== "") {
                // Wait for ProseMirror to fully initialize
                await new Promise(resolve => setTimeout(resolve, 100));

                // Search in multiple locations - the editor structure may vary
                let prosemirrorDiv = editorElement.querySelector(".ProseMirror");
                if (!prosemirrorDiv) {
                    prosemirrorDiv = editorContainer.querySelector(".ProseMirror");
                }
                if (!prosemirrorDiv) {
                    // Try finding it as a sibling or in the parent
                    prosemirrorDiv = editorElement.parentElement?.querySelector(".ProseMirror");
                }

                if (prosemirrorDiv) {
                    prosemirrorDiv.innerHTML = content;
                    console.log("Z-Wolf Epic | Content set in editor");
                } else {
                    // Debug: log the actual DOM structure
                    console.warn("Z-Wolf Epic | Could not find .ProseMirror element");
                    console.log("Z-Wolf Epic | editorElement innerHTML:", editorElement.innerHTML.substring(0, 500));
                    console.log("Z-Wolf Epic | editorContainer innerHTML:", editorContainer.innerHTML.substring(0, 500));
                }
            }

            // Save handler
            const handleSave = async () => {
                if (isCleanedUp) return;

                try {
                    // Try multiple selectors to find the ProseMirror editor
                    let prosemirrorDiv = editorContainer.querySelector(".ProseMirror");
                    if (!prosemirrorDiv) {
                        prosemirrorDiv = editorContainer.querySelector(".editor-container .ProseMirror");
                    }
                    if (!prosemirrorDiv) {
                        prosemirrorDiv = editorElement.querySelector(".ProseMirror");
                    }

                    const newContent = prosemirrorDiv ? prosemirrorDiv.innerHTML : "";

                    // Update via form submission to ensure proper handling
                    const form = sheet.element.querySelector("form");
                    if (form) {
                        // Find or create hidden input for this field
                        let hiddenInput = form.querySelector(`input[name="${target}"]`);
                        if (!hiddenInput) {
                            hiddenInput = document.createElement("input");
                            hiddenInput.type = "hidden";
                            hiddenInput.name = target;
                            form.appendChild(hiddenInput);
                        }
                        hiddenInput.value = newContent;

                        // Trigger form change event to initiate auto-save
                        form.dispatchEvent(new Event("change", { bubbles: true }));

                        // Wait a moment for the form to process
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } else {
                        // Fallback: direct update if no form found
                        await sheet.document.update({ [target]: newContent });
                    }

                    cleanup();

                } catch (error) {
                    console.error("Z-Wolf Epic | Failed to save editor content:", error);
                    ui.notifications.error("Failed to save content");
                    cleanup();
                }
            };

            // Event listeners
            saveBtn.addEventListener("click", handleSave);
            cancelBtn.addEventListener("click", cleanup);

            // ESC to cancel
            const escapeHandler = (event) => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    cleanup();
                    document.removeEventListener("keydown", escapeHandler);
                }
            };
            document.addEventListener("keydown", escapeHandler);

        } catch (error) {
            console.error("Z-Wolf Epic | Failed to create editor:", error);
            cleanup();
            ui.notifications.error("Failed to activate editor");
        }
    }
}