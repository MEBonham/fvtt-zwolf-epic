// module/data/item-base.js

/**
 * Base template for all items
 */
class BaseItemTemplate extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      description: new fields.HTMLField({ required: false, blank: true, initial: "" }),
      grantedAbilities: new fields.ObjectField({ required: false, initial: {} })
    };
  }
}

/**
 * Template for items with side effects
 */
class SideEffectsCapableTemplate extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      sideEffects: new fields.SchemaField({
        speedProgression: new fields.StringField({ required: false, blank: true, initial: "" }),
        toughnessTNProgression: new fields.StringField({ required: false, blank: true, initial: "" }),
        destinyTNProgression: new fields.StringField({ required: false, blank: true, initial: "" }),
        nightsightRadius: new fields.NumberField({ required: false, nullable: true, initial: null, integer: true }),
        darkvisionRadius: new fields.NumberField({ required: false, nullable: true, initial: null, integer: true }),
        maxBulkBoost: new fields.NumberField({ required: false, initial: 0, integer: true }),
        grantedProficiency: new fields.StringField({ required: false, blank: true, initial: "" }),
        sizeSteps: new fields.NumberField({ required: false, initial: 0, integer: true })  // ADD THIS LINE
      })
    };
  }
}

/**
 * Ancestry Item DataModel
 */
class AncestryData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...BaseItemTemplate.defineSchema(),
      ...SideEffectsCapableTemplate.defineSchema(),
      buildPoints: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true, min: 0 }),
      tags: new fields.StringField({ required: false, blank: true, initial: "" }),
      characterTags: new fields.StringField({ required: false, blank: true, initial: "" }),
      sizeOptions: new fields.ArrayField(
        new fields.StringField({ required: true }),
        { required: false, initial: ["medium"] }
      ),
      required: new fields.HTMLField({ required: false, blank: true, initial: "" }),
      knacksProvided: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true, min: 0 }),
      knackMenu: new fields.HTMLField({ required: false, blank: true, initial: "" })
    };
  }
}

/**
 * Fundament Item DataModel
 */
class FundamentData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...BaseItemTemplate.defineSchema(),
      ...SideEffectsCapableTemplate.defineSchema(),
      buildPoints: new fields.NumberField({ required: true, nullable: false, initial: 15, integer: true, min: 0 }),
      knacksProvided: new fields.NumberField({ required: true, nullable: false, initial: 4, integer: true, min: 0 }),
      requiredKnackTag: new fields.StringField({ required: false, blank: true, initial: "" }),
      vitalityFunction: new fields.StringField({ required: false, blank: true, initial: "" }),
      coastFunction: new fields.StringField({ required: false, blank: true, initial: "" })
    };
  }
}

/**
 * Equipment Item DataModel
 */
class EquipmentData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...BaseItemTemplate.defineSchema(),
      ...SideEffectsCapableTemplate.defineSchema(),
      tags: new fields.StringField({ required: false, blank: true, initial: "" }),
      quantity: new fields.StringField({ required: true, initial: "1", choices: ["1", "many"] }),
      placement: new fields.StringField({ 
        required: true, 
        initial: "stowed",
        choices: ["stowed", "wielded", "worn", "readily_available", "not_carried"]
      }),
      requiredPlacement: new fields.StringField({ required: false, blank: true, initial: "" }),
      price: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 }),
      bulk: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 }),
      structure: new fields.NumberField({ required: true, nullable: false, initial: 10, integer: true, min: 0 })
    };
  }
}

/**
 * Knack Item DataModel
 */
class KnackData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...BaseItemTemplate.defineSchema(),
      ...SideEffectsCapableTemplate.defineSchema(),
      tags: new fields.StringField({ required: false, blank: true, initial: "" }),
      characterTags: new fields.StringField({ required: false, blank: true, initial: "" }),
      required: new fields.HTMLField({ required: false, blank: true, initial: "" })
    };
  }
}

/**
 * Helper function to create tier schema
 * Returns a new schema each time to avoid field reuse errors
 */
function createTierSchema() {
  const fields = foundry.data.fields;
  return new fields.SchemaField({
    talentMenu: new fields.HTMLField({ required: false, blank: true, initial: "" }),
    grantedAbilities: new fields.ObjectField({ required: false, initial: {} }),
    characterTags: new fields.StringField({ required: false, blank: true, initial: "" }),
    sideEffects: new fields.SchemaField({
      speedProgression: new fields.StringField({ required: false, blank: true, initial: "" }),
      toughnessTNProgression: new fields.StringField({ required: false, blank: true, initial: "" }),
      destinyTNProgression: new fields.StringField({ required: false, blank: true, initial: "" }),
      nightsightRadius: new fields.NumberField({ required: false, nullable: true, initial: null, integer: true }),  // Changed from nightsight
      darkvisionRadius: new fields.NumberField({ required: false, nullable: true, initial: null, integer: true }),  // Changed from darkvision
      knacksProvided: new fields.NumberField({ required: false, initial: 0, integer: true, min: 0 }),
      grantedProficiency: new fields.StringField({ required: false, blank: true, initial: "" }),
      sizeSteps: new fields.NumberField({ required: false, initial: 0, integer: true })
    })
  });
}

/**
 * Track Item DataModel
 */
class TrackData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      ...BaseItemTemplate.defineSchema(),
      ...SideEffectsCapableTemplate.defineSchema(),
      tags: new fields.StringField({ required: false, blank: true, initial: "" }),
      required: new fields.HTMLField({ required: false, blank: true, initial: "" }),
      tiers: new fields.SchemaField({
        tier1: createTierSchema(),
        tier2: createTierSchema(),
        tier3: createTierSchema(),
        tier4: createTierSchema(),
        tier5: createTierSchema()
      })
    };
  }
}

/**
 * Talent Item DataModel
 */
class TalentData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...BaseItemTemplate.defineSchema(),
      ...SideEffectsCapableTemplate.defineSchema(),
      tags: new fields.StringField({ required: false, blank: true, initial: "" }),
      characterTags: new fields.StringField({ required: false, blank: true, initial: "" }),
      required: new fields.HTMLField({ required: false, blank: true, initial: "" }),
      knacksProvided: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true, min: 0 })
    };
  }
}

/**
 * Universal Item DataModel
 */
class UniversalData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...BaseItemTemplate.defineSchema(),
      ...SideEffectsCapableTemplate.defineSchema(),
      tags: new fields.StringField({ required: false, blank: true, initial: "" }),
      characterTags: new fields.StringField({ required: false, blank: true, initial: "" }),
      required: new fields.HTMLField({ required: false, blank: true, initial: "" })
    };
  }
}

// Export all DataModels
export {
  BaseItemTemplate,
  SideEffectsCapableTemplate,
  AncestryData,
  FundamentData,
  EquipmentData,
  KnackData,
  TrackData,
  TalentData,
  UniversalData
};
