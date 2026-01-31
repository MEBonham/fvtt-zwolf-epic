/**
 * Hook module for logging condition changes to chat
 * @module hooks/condition-logger
 */

export function registerConditionLogger() {
    Hooks.on("createActiveEffect", onEffectCreate);
    Hooks.on("deleteActiveEffect", onEffectDelete);
}

/**
 * Handle active effect creation (condition added)
 * @param {ActiveEffect} effect - The created effect
 * @param {object} options - Creation options
 * @param {string} userId - ID of user who created the effect
 */
async function onEffectCreate(effect, options, userId) {
    // Only log for token actors and status effects (conditions)
    if (!effect.parent?.isToken || !effect.statuses.size) return;

    const token = effect.parent.token;
    const condition = Array.from(effect.statuses)[0]; // Get first status

    await postConditionMessage(token, condition, "added", userId);
}

/**
 * Handle active effect deletion (condition removed)
 * @param {ActiveEffect} effect - The deleted effect
 * @param {object} options - Deletion options
 * @param {string} userId - ID of user who deleted the effect
 */
async function onEffectDelete(effect, options, userId) {
    // Only log for token actors and status effects (conditions)
    if (!effect.parent?.isToken || !effect.statuses.size) return;

    const token = effect.parent.token;
    const condition = Array.from(effect.statuses)[0]; // Get first status

    await postConditionMessage(token, condition, "removed", userId);
}

/**
 * Post a chat message about the condition change
 * @param {Token} token - The token that changed
 * @param {string} condition - The condition that changed
 * @param {string} action - "added" or "removed"
 * @param {string} userId - ID of user who made the change
 */
async function postConditionMessage(token, condition, action, userId) {
    const user = game.users.get(userId);

    // Try to get condition label from our config, fall back to Foundry's status effects
    let conditionLabel = CONFIG.ZWOLF?.conditions?.[condition]?.label;
    if (conditionLabel) {
        conditionLabel = game.i18n.localize(conditionLabel);
    } else {
        conditionLabel = CONFIG.statusEffects.find(e => e.id === condition)?.label || condition;
    }

    const actionText = action === "added"
        ? game.i18n.localize("ZWOLF.ConditionGained")
        : game.i18n.localize("ZWOLF.ConditionLost");

    const messageData = {
        user: userId,
        speaker: ChatMessage.getSpeaker({ token }),
        content: `
            <div class="zwolf-condition-change">
                <strong>${token.name}</strong> ${actionText}
                <strong>${conditionLabel}</strong>.
                ${user ? `<div class="zwolf-condition-user">(${game.i18n.format("ZWOLF.ByUser", { user: user.name })})</div>` : ""}
            </div>
        `
    };

    await ChatMessage.create(messageData);
}