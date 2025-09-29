/**
 * Z-Wolf Epic Configuration
 * Defines all system constants and enumerations
 */

export const ZWOLF = {};

/**
 * The set of Attributes used within the system.
 * @type {Object}
 */
ZWOLF.attributes = {
  "agility": "ZWOLF.AttributeAgility", 
  "fortitude": "ZWOLF.AttributeFortitude",
  "perception": "ZWOLF.AttributePerception",
  "willpower": "ZWOLF.AttributeWillpower"
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
  "bludgeoning": {
    label: "ZWOLF.DamageBludgeoning",
    icon: "icons/skills/melee/unarmed-punch-fist.webp",
    color: "#808080"
  },
  "piercing": {
    label: "ZWOLF.DamagePiercing",
    icon: "icons/skills/melee/spear-tip-blood.webp",
    color: "#800000"
  },
  "slashing": {
    label: "ZWOLF.DamageSlashing",
    icon: "icons/skills/melee/sword-damaged-broken-grey.webp",
    color: "#8B4513"
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
  "corrosion": {
    label: "ZWOLF.DamageCorrosion",
    icon: "icons/consumables/potions/bottle-round-corked-green.webp",
    color: "#00ff00"
  },
  "force": {
    label: "ZWOLF.DamageForce",
    icon: "icons/magic/air/wind-vortex-blue.webp",
    color: "#9370db"
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
  },
  "offGuard": {
    label: "ZWOLF.ConditionOffGuard",
    icon: "icons/skills/social/intimidation-impressing.webp",
    description: "ZWOLF.ConditionOffGuardDesc"
  },
  "paralyzed": {
    label: "ZWOLF.ConditionParalyzed",
    icon: "icons/svg/paralysis.svg",
    description: "ZWOLF.ConditionParalyzedDesc"
  },
  "momentum": {
    label: "ZWOLF.ConditionMomentum",
    icon: "icons/skills/movement/arrow-upward-yellow.webp",
    description: "ZWOLF.ConditionMomentumDesc"
  },
  "grabbed": {
    label: "ZWOLF.ConditionGrabbed",
    icon: "icons/skills/melee/unarmed-punch-fist.webp",
    description: "ZWOLF.ConditionGrabbedDesc"
  },
  "helpless": {
    label: "ZWOLF.ConditionHelpless",
    icon: "icons/skills/wounds/injury-triple-slash-blood.webp",
    description: "ZWOLF.ConditionHelplessDesc"
  },
  "shaken": {
    label: "ZWOLF.ConditionShaken",
    icon: "icons/magic/control/fear-fright-monster-grin-red.webp",
    description: "ZWOLF.ConditionShakenDesc"
  },
  "battered": {
    label: "ZWOLF.ConditionBattered",
    icon: "icons/skills/wounds/injury-pain-body-red.webp",
    description: "ZWOLF.ConditionBatteredDesc"
  },
  "immobilized": {
    label: "ZWOLF.ConditionImmobilized",
    icon: "icons/magic/control/bind-shackles-rope.webp",
    description: "ZWOLF.ConditionImmobilizedDesc"
  },
  "invisible": {
    label: "ZWOLF.ConditionInvisible",
    icon: "icons/magic/perception/eye-ringed-glow-black.webp",
    description: "ZWOLF.ConditionInvisibleDesc"
  },
  "quickened": {
    label: "ZWOLF.ConditionQuickened",
    icon: "icons/magic/time/clock-time-white.webp",
    description: "ZWOLF.ConditionQuickenedDesc"
  }
};

/**
 * Skill definitions
 * @type {Object}
 */
ZWOLF.skills = {
  "acumen": {
    label: "ZWOLF.SkillAcumen"
  },
  "athletics": {
    label: "ZWOLF.SkillAthletics"
  },
  "brawn": {
    label: "ZWOLF.SkillBrawn"
  },
  "dexterity": {
    label: "ZWOLF.SkillDexterity"
  },
  "glibness": {
    label: "ZWOLF.SkillGlibness"
  },
  "influence": {
    label: "ZWOLF.SkillInfluence"
  },
  "insight": {
    label: "ZWOLF.SkillInsight"
  },
  "stealth": {
    label: "ZWOLF.SkillStealth"
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
  "thickLine": {
    label: "ZWOLF.AreaThickLine",
    template: "ray",
    width: 2,
    icon: "icons/svg/wall.svg"
  }
};

/**
 * Spell seeds for magic categorization
 * @type {Object}
 */
ZWOLF.spellSeeds = {
  "aether": "ZWOLF.SeedAether",
  "air": "ZWOLF.SeedAir",
  "animal": "ZWOLF.SeedAnimal",
  "earth": "ZWOLF.SeedEarth",
  "fire": "ZWOLF.SeedFire",
  "frost": "ZWOLF.SeedFrost",
  "glory": "ZWOLF.SeedGlory",
  "lightning": "ZWOLF.SeedLightning",
  "mind": "ZWOLF.SeedMind",
  "plant": "ZWOLF.SeedPlant",
  "shadow": "ZWOLF.SeedShadow",
  "water": "ZWOLF.SeedWater"
};

/**
 * Proficiencies available in the system
 * @type {Object}
 */
ZWOLF.proficiencies = {
  // Seed Proficiencies (Magic)
  "aether": {
    type: "seed",
    label: "Aether Seed"
  },
  "air": {
    type: "seed",
    label: "Air Seed"
  },
  "animal": {
    type: "seed",
    label: "Animal Seed"
  },
  "earth": {
    type: "seed",
    label: "Earth Seed"
  },
  "fire": {
    type: "seed",
    label: "Fire Seed"
  },
  "frost": {
    type: "seed",
    label: "Frost Seed"
  },
  "glory": {
    type: "seed",
    label: "Glory Seed"
  },
  "lightning": {
    type: "seed",
    label: "Lightning Seed"
  },
  "mind": {
    type: "seed",
    label: "Mind Seed"
  },
  "plant": {
    type: "seed",
    label: "Plant Seed"
  },
  "shadow": {
    type: "seed",
    label: "Shadow Seed"
  },
  "water": {
    type: "seed",
    label: "Water Seed"
  },
  
  // Weapon Proficiencies
  "sword": {
    type: "weapon",
    label: "swords"
  },
  "axe": {
    type: "weapon",
    label: "axes"
  },
  "club": {
    type: "weapon",
    label: "clubs"
  },
  "knife": {
    type: "weapon",
    label: "knives"
  },
  "polearm": {
    type: "weapon",
    label: "polearms"
  },
  "spear": {
    type: "weapon",
    label: "spears"
  },
  "bow": {
    type: "weapon",
    label: "bows"
  },
  "sling": {
    type: "weapon",
    label: "slings"
  },
  "flail": {
    type: "weapon",
    label: "flails"
  },
  "bomb": {
    type: "weapon",
    label: "bombs"
  },
  "rifle": {
    type: "weapon",
    label: "rifles"
  },
  "dart": {
    type: "weapon",
    label: "darts"
  },
  
  // Miscellaneous Proficiencies
  "unarmed": {
    type: "miscellaneous",
    label: "<Unarmed> weapons"
  },
  "improvised": {
    type: "miscellaneous",
    label: "improvised weapons"
  }
};
