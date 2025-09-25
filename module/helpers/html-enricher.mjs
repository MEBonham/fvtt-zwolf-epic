// module/helpers/html-enricher.mjs

const TextEditorImpl = foundry.applications.ux.TextEditor.implementation;

/**
 * Helper class for enriching HTML content with links, references, etc.
 * Designed to handle both array and object data structures robustly.
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
   * Helper method to determine if data should be treated as a collection
   * @param {*} data - Data to check
   * @returns {boolean} - True if it's a non-empty array or object with numeric keys
   */
  static isCollection(data) {
    if (Array.isArray(data)) {
      return true;
    }
    if (data && typeof data === 'object') {
      const keys = Object.keys(data);
      return keys.length > 0 && keys.some(key => !isNaN(parseInt(key)));
    }
    return false;
  }

  /**
   * Helper method to iterate over collections (arrays or objects) safely
   * @param {Array|Object} collection - Collection to iterate
   * @param {Function} callback - Callback function (item, index/key) => enrichedItem
   * @returns {Array|Object} - Result in same format as input
   */
  static async mapCollection(collection, callback) {
    if (Array.isArray(collection)) {
      const result = [];
      for (let i = 0; i < collection.length; i++) {
        if (collection[i] !== undefined && collection[i] !== null) {
          result[i] = await callback(collection[i], i);
        }
      }
      return result;
    } else if (collection && typeof collection === 'object') {
      const result = {};
      for (const [key, item] of Object.entries(collection)) {
        if (item !== undefined && item !== null) {
          result[key] = await callback(item, key);
        }
      }
      return result;
    }
    return collection;
  }

  /**
   * Enrich granted abilities descriptions
   * @param {Array|Object} abilities - Array or object of granted abilities
   * @param {Item} item - The item for context
   * @returns {Promise<Object|Array>} - Abilities with enriched descriptions (preserves input format)
   */
  static async enrichGrantedAbilities(abilities, item) {
    if (!this.isCollection(abilities)) {
      // Return empty structure matching expected format
      return Array.isArray(abilities) ? [] : {};
    }

    return await this.mapCollection(abilities, async (ability, index) => {
      if (!ability || typeof ability !== 'object') {
        return ability;
      }

      const enrichedAbility = { ...ability };
      
      if (ability.description) {
        enrichedAbility.enrichedDescription = await this.enrichContent(
          ability.description,
          item,
          `ability ${index} description`
        );
      } else {
        enrichedAbility.enrichedDescription = "";
      }
      
      return enrichedAbility;
    });
  }

  /**
   * Enrich track tier data (talent menus and abilities)
   * @param {Object} tierData - Tier data object
   * @param {number} tierNum - Tier number for logging
   * @param {Item} item - The item for context
   * @returns {Promise<Object>} - Enriched tier data
   */
  static async enrichTrackTierData(tierData, tierNum, item) {
    if (!tierData || typeof tierData !== 'object') {
      return tierData;
    }

    const enriched = { ...tierData };

    // Enrich talent menu description
    if (enriched.talentMenu?.description) {
      enriched.talentMenu.enrichedDescription = await this.enrichContent(
        enriched.talentMenu.description,
        item,
        `tier ${tierNum} talent menu description`
      );
    }

    // Enrich granted abilities for this tier - handle both arrays and objects
    if (this.isCollection(enriched.grantedAbilities)) {
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
    if (!tiersData || typeof tiersData !== 'object') {
      return tiersData;
    }

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
   * @param {Array|Object} knackMenus - Array or object of knack menus
   * @param {Item} item - The item for context
   * @returns {Promise<Array|Object>} - Enriched knack menus (preserves input format)
   */
  static async enrichKnackMenus(knackMenus, item) {
    if (!this.isCollection(knackMenus)) {
      // Return empty structure matching expected format
      return Array.isArray(knackMenus) ? [] : {};
    }

    return await this.mapCollection(knackMenus, async (menu, index) => {
      if (!menu || typeof menu !== 'object') {
        return menu;
      }

      const enrichedMenu = { ...menu };
      
      if (menu.description) {
        enrichedMenu.enrichedDescription = await this.enrichContent(
          menu.description,
          item,
          `knack menu ${index} description`
        );
      } else {
        enrichedMenu.enrichedDescription = "";
      }
      
      return enrichedMenu;
    });
  }

  /**
   * Generic method to enrich any collection of items with descriptions
   * @param {Array|Object} collection - Collection of items to enrich
   * @param {Item} item - The item for context
   * @param {string} collectionName - Name for logging purposes
   * @returns {Promise<Array|Object>} - Enriched collection (preserves input format)
   */
  static async enrichDescriptions(collection, item, collectionName = 'items') {
    if (!this.isCollection(collection)) {
      return collection;
    }

    return await this.mapCollection(collection, async (collectionItem, index) => {
      if (!collectionItem || typeof collectionItem !== 'object') {
        return collectionItem;
      }

      const enrichedItem = { ...collectionItem };
      
      // Enrich main description field
      if (collectionItem.description) {
        enrichedItem.enrichedDescription = await this.enrichContent(
          collectionItem.description,
          item,
          `${collectionName} ${index} description`
        );
      }
      
      // Also handle nested descriptions if they exist
      const descriptionFields = ['details', 'effect', 'summary', 'notes'];
      for (const field of descriptionFields) {
        if (collectionItem[field] && typeof collectionItem[field] === 'string') {
          enrichedItem[`enriched${field.charAt(0).toUpperCase() + field.slice(1)}`] = await this.enrichContent(
            collectionItem[field],
            item,
            `${collectionName} ${index} ${field}`
          );
        }
      }
      
      return enrichedItem;
    });
  }

  /**
   * Enrich any object that may contain description fields
   * @param {Object} data - Data object to enrich
   * @param {Item} item - The item for context
   * @param {string} dataName - Name for logging purposes
   * @returns {Promise<Object>} - Enriched data object
   */
  static async enrichObject(data, item, dataName = 'object') {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const enriched = { ...data };
    
    // Standard description fields to enrich
    const descriptionFields = ['description', 'details', 'effect', 'summary', 'notes', 'flavor'];
    
    for (const field of descriptionFields) {
      if (data[field] && typeof data[field] === 'string') {
        const enrichedFieldName = `enriched${field.charAt(0).toUpperCase() + field.slice(1)}`;
        enriched[enrichedFieldName] = await this.enrichContent(
          data[field],
          item,
          `${dataName} ${field}`
        );
      }
    }
    
    return enriched;
  }
}