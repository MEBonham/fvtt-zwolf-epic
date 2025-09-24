// module/helpers/html-enricher.mjs

const TextEditorImpl = foundry.applications.ux.TextEditor.implementation;

/**
 * Helper class for enriching HTML content with links, references, etc.
 */
export class HtmlEnricher {

  /**
   * Standard enrichment options for item content
   * @param {Item} item - The item for context
   * @returns {Object} - Enrichment options
   */
  static getEnrichmentOptions(item) {
    return {
      secrets: item.isOwner,
      documents: true,
      links: true,
      async: true,
      rollData: item.getRollData(),
      relativeTo: item
    };
  }

  /**
   * Enrich HTML content safely with error handling
   * @param {string} content - Raw HTML content
   * @param {Item} item - The item for context
   * @param {string} fieldName - Name of field for error logging
   * @returns {Promise<string>} - Enriched HTML content
   */
  static async enrichContent(content, item, fieldName = 'content') {
    if (!content || typeof content !== 'string') {
      return "";
    }

    try {
      return await TextEditorImpl.enrichHTML(
        content,
        this.getEnrichmentOptions(item)
      );
    } catch (error) {
      console.error(`Error enriching ${fieldName}:`, error);
      return content; // Return original content on error
    }
  }

  /**
   * Enrich granted abilities descriptions
   * @param {Array} abilities - Array of granted abilities
   * @param {Item} item - The item for context
   * @returns {Promise<Array>} - Abilities with enriched descriptions
   */
  static async enrichGrantedAbilities(abilities, item) {
    if (!Array.isArray(abilities)) {
      return [];
    }

    const enrichedAbilities = [];
    for (let i = 0; i < abilities.length; i++) {
      const ability = { ...abilities[i] };
      
      if (ability.description) {
        ability.enrichedDescription = await this.enrichContent(
          ability.description,
          item,
          `ability ${i} description`
        );
      } else {
        ability.enrichedDescription = "";
      }
      
      enrichedAbilities.push(ability);
    }

    return enrichedAbilities;
  }

  /**
   * Enrich track tier data (talent menus and abilities)
   * @param {Object} tierData - Tier data object
   * @param {number} tierNum - Tier number for logging
   * @param {Item} item - The item for context
   * @returns {Promise<Object>} - Enriched tier data
   */
  static async enrichTrackTierData(tierData, tierNum, item) {
    const enriched = { ...tierData };

    // Enrich talent menu description
    if (enriched.talentMenu?.description) {
      enriched.talentMenu.enrichedDescription = await this.enrichContent(
        enriched.talentMenu.description,
        item,
        `tier ${tierNum} talent menu description`
      );
    }

    // Enrich granted abilities for this tier
    if (enriched.grantedAbilities && Array.isArray(enriched.grantedAbilities)) {
      enriched.grantedAbilities = await this.enrichGrantedAbilities(
        enriched.grantedAbilities,
        item
      );
    }

    return enriched;
  }

  /**
   * Enrich all track tiers
   * @param {Object} tiersData - All tiers data
   * @param {Item} item - The item for context
   * @returns {Promise<Object>} - Enriched tiers data
   */
  static async enrichAllTrackTiers(tiersData, item) {
    const enrichedTiers = { ...tiersData };

    for (let tierNum = 1; tierNum <= 5; tierNum++) {
      const tierKey = `tier${tierNum}`;
      if (enrichedTiers[tierKey]) {
        enrichedTiers[tierKey] = await this.enrichTrackTierData(
          enrichedTiers[tierKey],
          tierNum,
          item
        );
      }
    }

    return enrichedTiers;
  }

  /**
   * Enrich ancestry knack menus
   * @param {Array} knackMenus - Array of knack menus
   * @param {Item} item - The item for context
   * @returns {Promise<Array>} - Enriched knack menus
   */
  static async enrichKnackMenus(knackMenus, item) {
    if (!Array.isArray(knackMenus)) {
      return [];
    }

    const enrichedMenus = [];
    for (let i = 0; i < knackMenus.length; i++) {
      const menu = { ...knackMenus[i] };
      
      if (menu.description) {
        menu.enrichedDescription = await this.enrichContent(
          menu.description,
          item,
          `knack menu ${i} description`
        );
      } else {
        menu.enrichedDescription = "";
      }
      
      enrichedMenus.push(menu);
    }

    return enrichedMenus;
  }
}
