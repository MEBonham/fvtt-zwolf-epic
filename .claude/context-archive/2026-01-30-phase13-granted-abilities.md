# Context Archive: Phase 13 Granted Abilities Display
**Date:** 2026-01-30
**Topic:** Categorized Abilities, Exotic Senses Tooltip, Character Tags

---

## Summary

Phase 13 implements the granted abilities display system for the actor sheet. This includes:
1. **Categorized abilities** - Abilities from items organized by type in an accordion UI
2. **Exotic senses tooltip** - Special hover icon in header showing exotic senses
3. **Character tags display** - Tags formatted and displayed in header

---

## Key Implementation

### Ability Gathering Method
**File:** [actor-sheet.mjs:446-540](module/sheets/actor-sheet.mjs#L446-L540)

New method `_gatherGrantedAbilities()` collects abilities from all items:
- Iterates through all actor items
- For track items, processes tier-specific abilities based on character level
- Skips inactive equipment (not in required placement)
- Skips inactive attunements (linked equipment not placed)
- Organizes abilities by type: passive, drawback, exoticSenses, dominantAction, swiftAction, reaction, freeAction, strike, journey, miscellaneous
- Sorts each category alphabetically by name

```javascript
const categories = {
    passive: [],
    drawback: [],
    exoticSenses: [],
    dominantAction: [],
    swiftAction: [],
    reaction: [],
    freeAction: [],
    strike: [],
    journey: [],
    miscellaneous: []
};
```

### Context Preparation
**File:** [actor-sheet.mjs:165-169](module/sheets/actor-sheet.mjs#L165-L169)

Added to `_prepareContext()`:
```javascript
// Gather granted abilities (Phase 13)
context.abilityCategories = this._gatherGrantedAbilities();

// Format character tags for display (Phase 13)
context.characterTags = sideEffects.characterTags?.join(", ") || "";
```

---

## Template Structure (Pre-existing)

Templates were already set up from previous work:

### Main Accordion
**File:** [actor-abilities-accordion.hbs](templates/actor/parts/actor-abilities-accordion.hbs)
- Renders categories: Passive, Dominant Actions (with Strike subsection), Swift, Reactions, Free, Drawbacks
- Uses `{{> ability-category}}` partial for each section

### Category Partial
**File:** [ability-category.hbs](templates/actor/partials/ability-category.hbs)
- Collapsible `<details>` element
- Shows count in header
- Renders "no abilities" message when empty

### Ability Detail Partial
**File:** [ability-detail.hbs](templates/actor/partials/ability-detail.hbs)
- Shows ability name, tags (in angle brackets), source item name
- Expandable description using `<details>` element

### Exotic Senses in Header
**File:** [actor-header.hbs:201-206](templates/actor/parts/actor-header.hbs#L201-L206)
```handlebars
{{#if abilityCategories.exoticSenses.length}}
  <div class="exotic-senses-icon"
       title="{{#each abilityCategories.exoticSenses}}{{name}}{{#if tags}} · {{tags}}{{/if}}{{#unless @last}}, {{/unless}}{{/each}}">
    <i class="fas fa-eye"></i>
  </div>
{{/if}}
```

---

## CSS Styling

**File:** [actor-sheets.css](styles/actor-sheets.css) (lines 1836-2049)

Added comprehensive styling for:
- `.exotic-senses-icon` - Purple-themed icon with hover effect
- `.abilities-accordion` - Container layout
- `.ability-category` - Accordion sections with collapsible headers
- `.ability-category-header` - Category headers with icons and counts
- `.ability-list` - List container
- `.ability-subsection` - For Strike Actions under Dominant
- `.ability-item` - Individual ability display
- `.ability-name` - Name with tags and source
- `.ability-description` - Expandable description content
- `.drawback-category` / `.drawback-ability` - Red-themed drawback styling
- `.strike-ability` - Orange left border for strikes

---

## Localization Keys Added

**File:** [en.json](lang/en.json)

New keys for "No X" empty state messages:
```json
"NoPassiveAbilities": "No passive abilities",
"NoSwiftActions": "No swift actions",
"NoReactions": "No reactions",
"NoFreeActions": "No free actions",
"NoDrawbacks": "No drawbacks",
"NoStrikeActions": "No strike actions",
"ExoticSenses": "Exotic Senses",
"NoExoticSenses": "No exotic senses"
```

---

## Ability Object Structure

Each ability in the categories has this shape:
```javascript
{
    id: "abc123",              // Random ID from grantedAbilities object
    name: "Fireball",          // Display name
    type: "dominantAction",    // Category type
    tags: "Fire, Spell",       // Comma-separated tags
    description: "<p>...</p>", // HTML description
    itemId: "xyz789",          // Source item ID
    itemName: "Pyromancer (Tier 2)" // Source item name with tier if applicable
}
```

---

## Tier-Based Ability Filtering

For track items, abilities are filtered based on unlocked tiers:
1. Get track's slot index using `_getTrackSlotIndex()`
2. Calculate unlocked tiers using `_getUnlockedTiers(slotIndex, characterLevel)`
3. Only process abilities from tiers the character has unlocked
4. Source name includes tier info: "Track Name (Tier 2)"

---

## Files Modified

| File | Changes |
|------|---------|
| `module/sheets/actor-sheet.mjs` | Added `_gatherGrantedAbilities()` method, updated `_prepareContext()` |
| `styles/actor-sheets.css` | Added abilities accordion and exotic senses styling |
| `lang/en.json` | Added "No X" localization keys |

---

## Current State

Phase 13 is complete:
- ✅ Abilities gathered from all items
- ✅ Tier-based filtering for track abilities
- ✅ Categorized display in accordion UI
- ✅ Exotic senses tooltip in header
- ✅ Character tags formatted and displayed
- ✅ Full CSS styling for abilities
- ✅ Localization keys for empty states