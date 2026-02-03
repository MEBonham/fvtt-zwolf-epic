# Localization and Proficiency Label Fixes

**Date:** 2026-02-01
**Topic:** Minor fixes for localization strings and proficiency menu labels

## Summary

Two small fixes were made to the Z-Wolf Epic system:

### 1. Added ZWOLF.TalentMenu Localization String

**File:** [lang/en.json](../../lang/en.json)
**Change:** Added `"TalentMenu": "Talent Menu"` at line 131, placed after the similar `"KnackMenu"` entry.

### 2. Fixed Unarmed Proficiency Label

**File:** [module/helpers/config.mjs](../../module/helpers/config.mjs)
**Change:** In the miscellaneous proficiencies section (~line 439), changed the label from `"<Unarmed> weapons"` to `"Unarmed"`.

## Files Modified

- `lang/en.json` - Added TalentMenu localization key
- `module/helpers/config.mjs` - Fixed unarmed proficiency label

## Current State

Both changes are complete and ready for use. No further action required.