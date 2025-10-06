/**
 * Actor Data Models for Z-Wolf Epic
 * Defines schemas for all actor types using Foundry V2 framework
 */

const fields = foundry.data.fields;

// ========================================
// SHARED FIELD FACTORIES
// ========================================

/**
 * Create base actor fields (all actor types have these)
 */
function createBaseFields() {
  return {
    level: new fields.NumberField({ 
      required: true, 
      nullable: false, 
      initial: 3, 
      integer: true, 
      min: 1 
    }),
    vitalityPoints: new fields.SchemaField({
      value: new fields.NumberField({ 
        required: true, 
        nullable: false, 
        initial: 12, 
        integer: true, 
        min: 0 
      }),
      min: new fields.NumberField({ 
        required: true, 
        nullable: false, 
        initial: 0, 
        integer: true 
      }),
      max: new fields.NumberField({ 
        required: true, 
        nullable: false, 
        initial: 12, 
        integer: true, 
        min: 0 
      })
    }),
    languages: new fields.StringField({ 
      required: false, 
      blank: true, 
      initial: "" 
    }),
    liabilities: new fields.StringField({ 
      required: false, 
      blank: true, 
      initial: "" 
    }),
    notes: new fields.StringField({ 
      required: false, 
      blank: true, 
      initial: "" 
    }),
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
    tags: new fields.StringField({ 
      required: false, 
      initial: "Humanoid" 
    }),
    nightsight: new fields.NumberField({ 
      required: true, 
      nullable: false, 
      initial: 1, 
      min: 0 
    }),
    darkvision: new fields.NumberField({ 
      required: true, 
      nullable: false, 
      initial: 0.2, 
      min: 0 
    })
  };
}

/**
 * Create character-specific fields (pc, npc, eidolon)
 */
function createCharacterFields() {
  return {
    ancestryId: new fields.StringField({ 
      required: false, 
      nullable: true, 
      initial: null 
    }),
    fundamentId: new fields.StringField({ 
      required: false, 
      nullable: true, 
      initial: null 
    }),
    staminaPoints: new fields.SchemaField({
      value: new fields.NumberField({ 
        required: true, 
        nullable: false, 
        initial: 4, 
        integer: true, 
        min: 0 
      }),
      min: new fields.NumberField({ 
        required: true, 
        nullable: false, 
        initial: 0, 
        integer: true 
      }),
      max: new fields.NumberField({ 
        required: true, 
        nullable: false, 
        initial: 4, 
        integer: true, 
        min: 0 
      })
    }),
    coastNumber: new fields.NumberField({ 
      required: true, 
      nullable: false, 
      initial: 4, 
      integer: true, 
      min: 0 
    }),
    speed: new fields.SchemaField({
      progression: new fields.StringField({ 
        required: false, 
        nullable: true, 
        initial: null 
      })
    }),
    vitalityBoostCount: new fields.NumberField({ 
      required: true, 
      nullable: false, 
      initial: 0, 
      integer: true, 
      min: 0 
    }),
    buildPointsLocked: new fields.BooleanField({ 
      required: true, 
      initial: false 
    })
  };
}

/**
 * Create attributes and skills fields
 */
function createAttributesAndSkillsFields() {
  const progressionChoices = ["mediocre", "moderate", "specialty", "awesome"];
  
  const createProgressionField = (initial = "moderate") => {
    return new fields.SchemaField({
      progression: new fields.StringField({ 
        required: false, 
        initial: initial,
        choices: progressionChoices
      })
    });
  };
  
  return {
    attributes: new fields.SchemaField({
      agility: createProgressionField("moderate"),
      fortitude: createProgressionField("moderate"),
      perception: createProgressionField("moderate"),
      willpower: createProgressionField("moderate")
    }),
    skills: new fields.SchemaField({
      acumen: createProgressionField("mediocre"),
      athletics: createProgressionField("mediocre"),
      brawn: createProgressionField("mediocre"),
      dexterity: createProgressionField("mediocre"),
      glibness: createProgressionField("mediocre"),
      influence: createProgressionField("mediocre"),
      insight: createProgressionField("mediocre"),
      stealth: createProgressionField("mediocre")
    })
  };
}

/**
 * Create summoned creature fields
 */
function createSummonedFields() {
  return {
    baseCreatureId: new fields.StringField({ 
      required: false, 
      nullable: true, 
      initial: null 
    })
  };
}

// ========================================
// ACTOR DATA MODELS
// ========================================

/**
 * PC (Player Character) Actor Data Model
 */
export class PCData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...createBaseFields(),
      ...createCharacterFields(),
      ...createAttributesAndSkillsFields(),
      wealth: new fields.NumberField({ 
        required: true, 
        nullable: false, 
        initial: 10, 
        min: 0 
      }),
      karmaPoints: new fields.SchemaField({
        value: new fields.NumberField({ 
          required: true, 
          nullable: false, 
          initial: 1, 
          integer: true, 
          min: 0 
        }),
        min: new fields.NumberField({ 
          required: true, 
          nullable: false, 
          initial: 0, 
          integer: true 
        }),
        max: new fields.NumberField({ 
          required: true, 
          nullable: false, 
          initial: 3, 
          integer: true 
        })
      })
    };
  }
}

/**
 * NPC (Non-Player Character) Actor Data Model
 */
export class NPCData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...createBaseFields(),
      ...createCharacterFields(),
      ...createAttributesAndSkillsFields(),
      wealth: new fields.NumberField({ 
        required: true, 
        nullable: false, 
        initial: 0, 
        min: 0 
      })
    };
  }
}

/**
 * Eidolon Actor Data Model
 */
export class EidolonData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...createBaseFields(),
      ...createCharacterFields(),
      ...createSummonedFields(),
      ...createAttributesAndSkillsFields(),
      wealth: new fields.NumberField({ 
        required: true, 
        nullable: false, 
        initial: 0, 
        min: 0 
      })
    };
  }
}

/**
 * Mook Actor Data Model
 */
export class MookData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...createBaseFields(),
      ...createSummonedFields()
    };
  }
}

/**
 * Spawn Actor Data Model
 */
export class SpawnData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...createBaseFields(),
      ...createSummonedFields()
    };
  }
}
