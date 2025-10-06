// module/data/actor-base.js

/**
 * Helper function to create base actor fields
 * Returns a new object each time to avoid field reuse errors
 */
function createBaseActorFields() {
  const fields = foundry.data.fields;
  return {
    vitalityPoints: new fields.SchemaField({
      value: new fields.NumberField({ required: true, nullable: false, initial: 12, integer: true, min: 0 }),
      min: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true }),
      max: new fields.NumberField({ required: true, nullable: false, initial: 12, integer: true, min: 0 })
    }),
    languages: new fields.StringField({ required: false, blank: true, initial: "" }),
    liabilities: new fields.StringField({ required: false, blank: true, initial: "" }),
    notes: new fields.StringField({ required: false, blank: true, initial: "" }),
    size: new fields.StringField({ 
      required: true, 
      initial: "medium",
      choices: ["diminutive", "tiny", "small", "medium", "large", "huge", "gargantuan", "colossal"]
    }),
    effectiveSize: new fields.StringField({ 
      required: false, 
      initial: "medium",
      choices: ["diminutive", "tiny", "small", "medium", "large", "huge", "gargantuan", "colossal"]
    }),
    tags: new fields.StringField({ required: false, initial: "Humanoid" }),
    nightsight: new fields.NumberField({ required: true, nullable: false, initial: 1, integer: true, min: 0 }),
    darkvision: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true, min: 0 })
  };
}

/**
 * Helper function to create character fields
 */
function createCharacterFields() {
  const fields = foundry.data.fields;
  return {
    level: new fields.NumberField({ required: true, nullable: false, initial: 3, integer: true, min: 1 }),
    staminaPoints: new fields.SchemaField({
      value: new fields.NumberField({ required: true, nullable: false, initial: 4, integer: true, min: 0 }),
      min: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true }),
      max: new fields.NumberField({ required: true, nullable: false, initial: 4, integer: true, min: 0 })
    }),
    coastNumber: new fields.NumberField({ required: true, nullable: false, initial: 4, integer: true, min: 0 }),
    speed: new fields.SchemaField({
      progression: new fields.StringField({ required: false, nullable: true, initial: null })
    }),
    vitalityBoostCount: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true, min: 0 }),
    buildPointsLocked: new fields.BooleanField({ required: true, initial: false })
  };
}

/**
 * Helper function to create attributes and skills fields
 */
function createAttributesAndSkillsFields() {
  const fields = foundry.data.fields;
  
  return {
    attributes: new fields.SchemaField({
      agility: new fields.SchemaField({
        progression: new fields.StringField({ 
          required: false, 
          initial: "moderate",
          choices: ["mediocre", "moderate", "specialty", "awesome"]
        })
      }),
      fortitude: new fields.SchemaField({
        progression: new fields.StringField({ 
          required: false, 
          initial: "moderate",
          choices: ["mediocre", "moderate", "specialty", "awesome"]
        })
      }),
      perception: new fields.SchemaField({
        progression: new fields.StringField({ 
          required: false, 
          initial: "moderate",
          choices: ["mediocre", "moderate", "specialty", "awesome"]
        })
      }),
      willpower: new fields.SchemaField({
        progression: new fields.StringField({ 
          required: false, 
          initial: "moderate",
          choices: ["mediocre", "moderate", "specialty", "awesome"]
        })
      })
    }),
    skills: new fields.SchemaField({
      acumen: new fields.SchemaField({
        progression: new fields.StringField({ 
          required: false, 
          initial: "mediocre",
          choices: ["mediocre", "moderate", "specialty", "awesome"]
        })
      }),
      athletics: new fields.SchemaField({
        progression: new fields.StringField({ 
          required: false, 
          initial: "mediocre",
          choices: ["mediocre", "moderate", "specialty", "awesome"]
        })
      }),
      brawn: new fields.SchemaField({
        progression: new fields.StringField({ 
          required: false, 
          initial: "mediocre",
          choices: ["mediocre", "moderate", "specialty", "awesome"]
        })
      }),
      dexterity: new fields.SchemaField({
        progression: new fields.StringField({ 
          required: false, 
          initial: "mediocre",
          choices: ["mediocre", "moderate", "specialty", "awesome"]
        })
      }),
      glibness: new fields.SchemaField({
        progression: new fields.StringField({ 
          required: false, 
          initial: "mediocre",
          choices: ["mediocre", "moderate", "specialty", "awesome"]
        })
      }),
      influence: new fields.SchemaField({
        progression: new fields.StringField({ 
          required: false, 
          initial: "mediocre",
          choices: ["mediocre", "moderate", "specialty", "awesome"]
        })
      }),
      insight: new fields.SchemaField({
        progression: new fields.StringField({ 
          required: false, 
          initial: "mediocre",
          choices: ["mediocre", "moderate", "specialty", "awesome"]
        })
      }),
      stealth: new fields.SchemaField({
        progression: new fields.StringField({ 
          required: false, 
          initial: "mediocre",
          choices: ["mediocre", "moderate", "specialty", "awesome"]
        })
      })
    })
  };
}

/**
 * Helper function to create foundation reference fields
 */
function createFoundationFields() {
  const fields = foundry.data.fields;
  return {
    ancestryId: new fields.StringField({ required: false, nullable: true, initial: null }),
    fundamentId: new fields.StringField({ required: false, nullable: true, initial: null })
  };
}

/**
 * Helper function to create summoned creature fields
 */
function createSummonedFields() {
  const fields = foundry.data.fields;
  return {
    baseCreatureId: new fields.StringField({ required: false, nullable: true, initial: null })
  };
}

/**
 * PC Actor DataModel
 */
class PCData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...createBaseActorFields(),
      ...createCharacterFields(),
      ...createFoundationFields(),
      ...createAttributesAndSkillsFields(),
      wealth: new fields.NumberField({ required: true, nullable: false, initial: 10, min: 0 }),
      karmaPoints: new fields.SchemaField({
        value: new fields.NumberField({ required: true, nullable: false, initial: 1, integer: true, min: 0 }),
        min: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true }),
        max: new fields.NumberField({ required: true, nullable: false, initial: 3, integer: true })
      })
    };
  }
}

/**
 * NPC Actor DataModel
 */
class NPCData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...createBaseActorFields(),
      ...createCharacterFields(),
      ...createFoundationFields(),
      ...createAttributesAndSkillsFields(),
      wealth: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 })
    };
  }
}

/**
 * Eidolon Actor DataModel
 */
class EidolonData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...createBaseActorFields(),
      ...createFoundationFields(),
      ...createSummonedFields(),
      ...createAttributesAndSkillsFields()
    };
  }
}

/**
 * Mook Actor DataModel
 */
class MookData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...createBaseActorFields(),
      ...createSummonedFields()
    };
  }
}

/**
 * Spawn Actor DataModel
 */
class SpawnData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...createBaseActorFields(),
      ...createSummonedFields()
    };
  }
}

// Export all DataModels
export {
  PCData,
  NPCData,
  EidolonData,
  MookData,
  SpawnData
};