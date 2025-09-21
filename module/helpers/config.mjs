/**
 * Z-Wolf Epic Configuration
 * Defines all system constants and enumerations
 */

export const ZWOLF = {};

/**
 * The set of Ability Scores used within the system.
 * @type {Object}
 */
ZWOLF.attributes = {
  "might": "ZWOLF.AttributeMight",
  "agility": "ZWOLF.AttributeAgility", 
  "intellect": "ZWOLF.AttributeIntellect",
  "willpower": "ZWOLF.AttributeWillpower",
  "presence": "ZWOLF.AttributePresence"
};

ZWOLF.attributeAbbreviations = {
  "might": "ZWOLF.AttributeMightAbbr",
  "agility": "ZWOLF.AttributeAgilityAbbr",
  "intellect": "ZWOLF.AttributeIntellectAbbr", 
  "willpower": "ZWOLF.AttributeWillpowerAbbr",
  "presence": "ZWOLF.AttributePresenceAbbr"
};

/**
 * Character/Creature sizes
 * Measured in meters diameter for gridless play
 * @type {Object}
 */
ZWOLF.sizes = {
  "diminutive": {
    label: "ZWOLF.SizeDiminutive",
    diameter: 0.25,
    tokenScale: 0.25
  },
  "tiny": {
    label: "ZWOLF.SizeTiny",
    diameter: 0.5,
    tokenScale: 0.5
  },
  "small": {
    label: "ZWOLF.SizeSmall",
    diameter: 0.7,
    tokenScale: 0.7
  },
  "medium": {
    label: "ZWOLF.SizeMedium",
    diameter: 1,
    tokenScale: 1
  },
  "large": {
    label: "ZWOLF.SizeLarge",
    diameter: 2,
    tokenScale: 2
  },
  "huge": {
    label: "ZWOLF.SizeHuge",
    diameter: 3,
    tokenScale: 3
  },
  "gargantuan": {
    label: "ZWOLF.SizeGargantuan",
    diameter: 4,
    tokenScale: 4
  },
  "colossal": {
    label: "ZWOLF.SizeColossal",
    diameter: 5,
    tokenScale: 5
  }
};

/**
 * Damage types in the system
 * @type {Object}
 */
ZWOLF.damageTypes = {
  "physical": {
    label: "ZWOLF.DamagePhysical",
    icon: "icons/skills/melee/sword-damaged-broken-grey.webp",
    color: "#808080"
  },
  "fire": {
    label: "ZWOLF.DamageFire",
    icon: "icons/magic/fire/flame-burning-campfire.webp",
    color: "#ff4500"
  },
  "cold": {
    label: "ZWOLF.DamageCold",
    icon: "icons/magic/water/snowflake-ice-crystal-shard.webp",
    color: "#00bfff"
  },
  "lightning": {
    label: "ZWOLF.DamageLightning",
    icon: "icons/magic/lightning/bolt-strike-blue.webp",
    color: "#4169e1"
  },
  "poison": {
    label: "ZWOLF.DamagePoison",
    icon: "icons/consumables/potions/bottle-round-corked-green.webp",
    color: "#00ff00"
  },
  "psychic": {
    label: "ZWOLF.DamagePsychic",
    icon: "icons/magic/control/mind-influence-puppet.webp",
    color: "#ff1493"
  },
  "radiant": {
    label: "ZWOLF.DamageRadiant",
    icon: "icons/magic/light/beam-rays-yellow.webp",
    color: "#ffd700"
  },
  "necrotic": {
    label: "ZWOLF.DamageNecrotic",
    icon: "icons/magic/death/skull-horned-goat-pentagram.webp",
    color: "#4b0082"
  }
};

/**
 * Conditions that can affect actors
 * @type {Object}
 */
ZWOLF.conditions = {
  "prone": {
    label: "ZWOLF.ConditionProne",
    icon: "icons/svg/falling.svg",
    description: "ZWOLF.ConditionProneDesc"
  },
  "dazed": {
    label: "ZWOLF.ConditionDazed",
    icon: "icons/svg/daze.svg",
    description: "ZWOLF.ConditionDazedDesc"
  },
  "stunned": {
    label: "ZWOLF.ConditionStunned",
    icon: "icons/svg/paralysis.svg",
    description: "ZWOLF.ConditionStunnedDesc"
  },
  "bruised": {
    label: "ZWOLF.ConditionBruised",
    icon: "icons/skills/wounds/injury-pain-body-orange.webp",
    description: "ZWOLF.ConditionBruisedDesc"
  },
  "wounded": {
    label: "ZWOLF.ConditionWounded",
    icon: "icons/skills/wounds/blood-spurt-spray-red.webp",
    description: "ZWOLF.ConditionWoundedDesc"
  },
  "dying": {
    label: "ZWOLF.ConditionDying",
    icon: "icons/svg/skull.svg",
    description: "ZWOLF.ConditionDyingDesc"
  },
  "dropped": {
    label: "ZWOLF.ConditionDropped",
    icon: "icons/svg/unconscious.svg",
    description: "ZWOLF.ConditionDroppedDesc"
  },
  "dead": {
    label: "ZWOLF.ConditionDead",
    icon: "icons/svg/skull.svg",
    description: "ZWOLF.ConditionDeadDesc"
  },
  "suffused": {
    label: "ZWOLF.ConditionSuffused",
    icon: "icons/magic/light/orb-lightbulb-yellow.webp",
    description: "ZWOLF.ConditionSuffusedDesc"
  }
};

/**
 * Skill definitions and their associated attributes
 * @type {Object}
 */
ZWOLF.skills = {
  "combat": {
    label: "ZWOLF.SkillCombat",
    attribute: "might"
  },
  "athletics": {
    label: "ZWOLF.SkillAthletics",
    attribute: "agility"
  },
  "stealth": {
    label: "ZWOLF.SkillStealth",
    attribute: "agility"
  },
  "knowledge": {
    label: "ZWOLF.SkillKnowledge",
    attribute: "intellect"
  },
  "perception": {
    label: "ZWOLF.SkillPerception",
    attribute: "intellect"
  },
  "magic": {
    label: "ZWOLF.SkillMagic",
    attribute: "willpower"
  },
  "resolve": {
    label: "ZWOLF.SkillResolve",
    attribute: "willpower"
  },
  "persuasion": {
    label: "ZWOLF.SkillPersuasion",
    attribute: "presence"
  },
  "deception": {
    label: "ZWOLF.SkillDeception",
    attribute: "presence"
  }
};

/**
 * Area of Effect template configurations
 * @type {Object}
 */
ZWOLF.areaTypes = {
  "cone": {
    label: "ZWOLF.AreaCone",
    template: "cone",
    angle: 57.3, // 1 radian in degrees (approximately)
    icon: "icons/svg/cone.svg"
  },
  "line": {
    label: "ZWOLF.AreaLine",
    template: "ray",
    width: 1, // 1 meter wide
    icon: "icons/svg/ray.svg"
  },
  "burst": {
    label: "ZWOLF.AreaBurst",
    template: "circle",
    icon: "icons/svg/circle.svg"
  },
  "wall": {
    label: "ZWOLF.AreaWall",
    template: "ray",
    width: 2, // 2 meters wide for wall effects
    icon: "icons/svg/wall.svg"
  }
};

/**
 * Item types that can be equipped
 * @type {Array}
 */
ZWOLF.equipableTypes = ["equipment", "weapon", "armor"];

/**
 * Resistance levels
 * @type {Object}
 */
ZWOLF.resistanceLevels = {
  "-2": "ZWOLF.Vulnerable2x",    // Double damage
  "-1": "ZWOLF.Vulnerable",       // +50% damage
  "0": "ZWOLF.Normal",           // Normal damage
  "1": "ZWOLF.Resistant",        // -50% damage
  "2": "ZWOLF.Resistant2x",      // -75% damage
  "3": "ZWOLF.Immune"           // No damage
};

/**
 * Range categories for gridless measurement
 * @type {Object}
 */
ZWOLF.ranges = {
  "touch": {
    label: "ZWOLF.RangeTouch",
    distance: 1
  },
  "close": {
    label: "ZWOLF.RangeClose",
    distance: 5
  },
  "short": {
    label: "ZWOLF.RangeShort",
    distance: 10
  },
  "medium": {
    label: "ZWOLF.RangeMedium",
    distance: 20
  },
  "long": {
    label: "ZWOLF.RangeLong",
    distance: 40
  },
  "extreme": {
    label: "ZWOLF.RangeExtreme",
    distance: 80
  },
  "sight": {
    label: "ZWOLF.RangeSight",
    distance: null
  }
};

/**
 * Spell schools for magic categorization
 * @type {Object}
 */
ZWOLF.spellSchools = {
  "elemental": "ZWOLF.SchoolElemental",
  "divine": "ZWOLF.SchoolDivine",
  "arcane": "ZWOLF.SchoolArcane",
  "primal": "ZWOLF.SchoolPrimal",
  "psychic": "ZWOLF.SchoolPsychic"
};