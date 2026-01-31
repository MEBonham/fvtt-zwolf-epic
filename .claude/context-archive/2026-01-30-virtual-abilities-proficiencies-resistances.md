# Virtual Abilities: Proficiencies, Resistances, Vulnerabilities

**Date:** 2026-01-30
**Topic:** Restoring legacy display of proficiencies, resistances, and vulnerabilities as virtual abilities on actor sheets

## Summary

Restored legacy functionality where collected side effects (proficiencies, resistances, vulnerabilities) are displayed as virtual "abilities" in the actor sheet's abilities accordion.

## Changes Made

### actor-sheet.mjs

**Injection logic (lines 185-200):**
- After `_gatherGrantedAbilities()`, checks for proficiencies/resistances/vulnerabilities in sideEffects
- Injects virtual abilities using `unshift()` to place them at the top of their respective categories

**New methods added:**

1. **`_buildProficienciesAbility(proficiencyKeys)`** (lines 630-674)
   - Groups proficiencies by type (seed, weapon, miscellaneous)
   - Sorts each group alphabetically
   - Creates HTML description with bold category headers
   - Returns virtual passive ability object

2. **`_buildResistancesAbility(resistanceKeys)`** (lines 686-717)
   - Looks up damage type keys in `CONFIG.ZWOLF.damageTypes`
   - Gets localized labels, sorts alphabetically
   - Returns virtual passive ability with comma-separated damage types

3. **`_buildVulnerabilitiesAbility(vulnerabilityKeys)`** (lines 724-755)
   - Same pattern as resistances
   - Returns virtual drawback ability

### lang/en.json

- Added `"Proficiencies": "Proficiencies"` (line 252)
- `"Resistances"` and `"Vulnerabilities"` keys already existed

## Display Format

**Proficiencies** (under Passive Abilities):
> **Seed Proficiencies:** Aether Seed, Fire Seed
> **Weapon Proficiencies:** axes, swords
> **Miscellaneous Proficiencies:** \<Unarmed\> weapons

**Resistances** (under Passive Abilities):
> Bludgeoning, Cold, Heat

**Vulnerabilities** (under Drawbacks):
> Lightning, Piercing

## Data Flow

1. `_processSideEffects()` collects proficiencies/resistances/vulnerabilities from all active items into Sets, then converts to arrays
2. `_prepareContext()` calls `_gatherGrantedAbilities()` then injects virtual abilities if any exist
3. Virtual abilities have `itemId: null` and `itemName: ""` to indicate they're not from a specific item
4. Virtual ability IDs: `virtual-proficiencies`, `virtual-resistances`, `virtual-vulnerabilities`

## Key Files

- [module/sheets/actor-sheet.mjs](../module/sheets/actor-sheet.mjs) - Main implementation
- [module/helpers/config.mjs](../module/helpers/config.mjs) - `ZWOLF.proficiencies` and `ZWOLF.damageTypes` definitions
- [lang/en.json](../lang/en.json) - Localization strings