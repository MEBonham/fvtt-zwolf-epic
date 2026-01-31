/**
 * Token-related hooks for Z-Wolf Epic
 * Handles Token HUD modifications, creation settings, and detection modes
 */

export function registerTokenHooks() {

    // Remove unwanted Token HUD buttons
    Hooks.on("renderTokenHUD", (app, html, data) => {
        removeUnwantedHUDButtons(html);
    });

    // Set default token settings on creation
    Hooks.on("preCreateToken", (document, data, options, userId) => {
        setDefaultTokenSettings(document, data);
    });

    // Handle post-creation token setup
    Hooks.on("createToken", async (document, options, userId) => {
        await handleTokenCreated(document);
    });

    // Prevent unwanted detection modes during updates
    Hooks.on("preUpdateToken", (document, changes, options, userId) => {
        filterDetectionModes(document, changes, options);
    });
}

/**
 * Remove unwanted buttons from Token HUD
 * @param {HTMLElement|jQuery} html - The Token HUD HTML
 */
function removeUnwantedHUDButtons(html) {
    const hudElement = html instanceof HTMLElement ? html : html[0];

    // Remove "Select Movement Action" button
    const movementButton = hudElement.querySelector("[data-action=\"togglePalette\"][data-palette=\"movementActions\"]");
    if (movementButton) {
        movementButton.remove();
        console.log("Z-Wolf Epic | Removed movement actions button");
    }

    // Remove "Toggle Target State" button
    const targetButton = hudElement.querySelector("[data-action=\"target\"]");
    if (targetButton) {
        targetButton.remove();
        console.log("Z-Wolf Epic | Removed target toggle button");
    }
}

/**
 * Set default token settings during creation
 * @param {TokenDocument} document - The token document being created
 * @param {Object} data - The creation data
 */
function setDefaultTokenSettings(document, data) {
    console.log("Z-Wolf Epic | preCreateToken - setting defaults");
    data.lockRotation = true;
}

/**
 * Handle token post-creation setup
 * @param {TokenDocument} document - The created token document
 */
async function handleTokenCreated(document) {
    console.log("Z-Wolf Epic | createToken hook fired");

    // Ensure lockRotation is set (backup in case preCreate didn't work)
    if (!document.lockRotation) {
        console.log("Z-Wolf Epic | Setting lockRotation");
        setTimeout(() => {
            document.update({ lockRotation: true });
        }, 0);
    }

    // Clean up detection modes after Foundry adds its defaults
    setTimeout(async () => {
        await cleanupDetectionModes(document);
    }, 250);
}

/**
 * Remove unwanted detection modes from a token
 * @param {TokenDocument} document - The token document to clean
 */
async function cleanupDetectionModes(document) {
    console.log("Z-Wolf Epic | Checking detection modes:", document.detectionModes);

    const hasUnwanted = document.detectionModes.some(m =>
        m.id === "basicSight" || m.id === "lightPerception"
    );

    if (hasUnwanted) {
        console.log("Z-Wolf Epic | Found unwanted detection modes, filtering...");
        const filtered = document.detectionModes.filter(m =>
            m.id !== "basicSight" && m.id !== "lightPerception"
        );

        console.log("Z-Wolf Epic | Filtered modes:", filtered);

        await document.update({
            detectionModes: filtered
        }, { _zwolfVisionUpdate: true });

        console.log("Z-Wolf Epic | Updated detection modes");
    }
}

/**
 * Filter out unwanted detection modes during token updates
 * @param {TokenDocument} document - The token being updated
 * @param {Object} changes - The proposed changes
 * @param {Object} options - Update options
 */
function filterDetectionModes(document, changes, options) {
    // Don't interfere with our own updates
    if (options._zwolfVisionUpdate) return;

    if (changes.detectionModes) {
        console.log("Z-Wolf Epic | preUpdateToken - filtering detection modes");
        changes.detectionModes = changes.detectionModes.filter(m =>
            m.id !== "basicSight" && m.id !== "lightPerception"
        );
    }
}