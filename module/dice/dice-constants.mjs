/**
 * Z-Wolf Epic Dice System Constants
 *
 * Configuration values for the 3d12 dice system with boosts/jinxes.
 * User-facing strings are localized in lang/en.json under ZWOLF_DICE
 */

export const ZWOLF_DICE_CONSTANTS = {
    // Dice mechanics
    BASE_DICE_COUNT: 3,
    MAX_BOOSTS: 10,
    MIN_BOOSTS: -10,
    CRIT_SUCCESS_VALUE: 12,
    CRIT_FAILURE_VALUE: 1,

    // UI Element IDs
    ELEMENTS: {
        NET_BOOSTS_INPUT: "zwolf-net-boosts",
        BOOST_PLUS: "zwolf-boost-plus",
        BOOST_MINUS: "zwolf-boost-minus",
        BOOST_RESET: "zwolf-boost-reset",
        QUICK_ROLL: "zwolf-quick-roll",
        BOOST_LABEL: ".zwolf-boost-label",
        BOOST_CONTROL: ".zwolf-boost-control",
        QUICK_BOOST: ".zwolf-quick-boost"
    },

    // CSS Classes
    CSS_CLASSES: {
        BOOST_CONTROL: "zwolf-boost-control",
        BOOST_ACTIVE: "boost-active",
        JINX_ACTIVE: "jinx-active",
        DIE_RESULT: "die-result",
        KEY_DIE: "key-die",
        CRIT_TRIGGER: "crit-trigger",
        CRIT_SUCCESS_CHANCE: "crit-success-chance",
        CRIT_FAILURE_CHANCE: "crit-failure-chance",
        CRIT_BOTH: "crit-both"
    },

    // Settings
    SETTINGS: {
        AUTO_RESET_BOOSTS: "autoResetBoosts"
    },

    // Key die positions (internal use - not localized)
    KEY_DIE_POSITIONS: {
        SECOND_HIGHEST: "second-highest",
        SECOND_LOWEST: "second-lowest",
        MEDIAN: "median"
    }
};
