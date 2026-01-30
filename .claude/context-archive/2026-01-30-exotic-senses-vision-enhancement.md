# Context Archive: Exotic Senses Tooltip Enhanced with Vision Effects
**Date:** 2026-01-30
**Topic:** Adding Nightsight/Darkvision to Exotic Senses Tooltip

---

## Summary

Enhanced the exotic senses tooltip in the actor header to display not just granted abilities of type "exoticSenses", but also enhanced vision effects (Nightsight and Darkvision) from side effects.

---

## Problem

The exotic senses tooltip (purple eye icon in header) only appeared when a character had granted abilities with type "exoticSenses". It did not show enhanced Nightsight or Darkvision from side effects, even though these are also "exotic senses" in the game's terminology.

---

## Solution

Created a combined display system that aggregates:
1. **Enhanced Nightsight** - When radius > 1m (base value)
2. **Enhanced Darkvision** - When radius > 0.2m (base value)
3. **Exotic Senses abilities** - From granted abilities with type "exoticSenses"

---

## Implementation

### New Method: `_buildExoticSensesDisplay()`
**File:** [actor-sheet.mjs:551-596](module/sheets/actor-sheet.mjs#L551-L596)

```javascript
_buildExoticSensesDisplay(exoticSensesAbilities, sideEffects) {
    const items = [];
    const baseNightsight = 1;
    const baseDarkvision = 0.2;

    // Check for enhanced nightsight
    const nightsightRadius = sideEffects.nightsightRadius || baseNightsight;
    if (nightsightRadius > baseNightsight) {
        items.push({
            name: game.i18n.localize("ZWOLF.Nightsight"),
            tags: `${nightsightRadius}m`,
            source: sideEffects.nightsightRadiusSource || ""
        });
    }

    // Check for enhanced darkvision
    const darkvisionRadius = sideEffects.darkvisionRadius || baseDarkvision;
    if (darkvisionRadius > baseDarkvision) {
        items.push({
            name: game.i18n.localize("ZWOLF.Darkvision"),
            tags: `${darkvisionRadius}m`,
            source: sideEffects.darkvisionRadiusSource || ""
        });
    }

    // Add exotic senses abilities
    exoticSensesAbilities.forEach(ability => {
        items.push({
            name: ability.name,
            tags: ability.tags || "",
            source: ability.itemName || ""
        });
    });

    return {
        hasContent: items.length > 0,
        items: items
    };
}
```

### Context Preparation Update
**File:** [actor-sheet.mjs:171-175](module/sheets/actor-sheet.mjs#L171-L175)

```javascript
// Build exotic senses display data (includes abilities + vision enhancements)
context.exoticSensesDisplay = this._buildExoticSensesDisplay(
    context.abilityCategories.exoticSenses,
    sideEffects
);
```

### Template Update
**File:** [actor-header.hbs:201-206](templates/actor/parts/actor-header.hbs#L201-L206)

```handlebars
{{#if exoticSensesDisplay.hasContent}}
  <div class="exotic-senses-icon"
       title="{{#each exoticSensesDisplay.items}}{{name}}{{#if tags}} ({{tags}}){{/if}}{{#if source}} — {{source}}{{/if}}{{#unless @last}}&#10;{{/unless}}{{/each}}">
    <i class="fas fa-eye"></i>
  </div>
{{/if}}
```

### Localization Keys Added
**File:** [en.json:241-242](lang/en.json#L241-L242)

```json
"Nightsight": "Nightsight",
"Darkvision": "Darkvision",
```

---

## Tooltip Format

Each exotic sense appears on its own line:
```
Nightsight (5m) — Ancestry Name
Darkvision (3m) — Track Name (Tier 2)
Tremorsense (10m radius) — Some Ability Source
```

---

## Files Modified

| File | Changes |
|------|---------|
| `module/sheets/actor-sheet.mjs` | Added `_buildExoticSensesDisplay()` method, updated `_prepareContext()` |
| `templates/actor/parts/actor-header.hbs` | Updated to use `exoticSensesDisplay` instead of direct `abilityCategories.exoticSenses` |
| `lang/en.json` | Added "Nightsight" and "Darkvision" keys |

---

## Related Context

- Phase 13 originally implemented exotic senses tooltip for abilities only
- Vision radii (nightsight/darkvision) tracked in side effects system
- Base values defined in template.json: nightsight=1, darkvision=0.2