# Biography Tab Styling & Collapsible Section Fixes

**Date:** 2026-01-30
**Topic:** Biography tab formatting, collapsible section chevron icons

---

## Summary

Styled the Biography tab and fixed collapsible section icons across Main and Biography tabs.

## Changes Made

### 1. Biography Tab Styling (actor-sheets.css)

Added new CSS section for biography tab:
- `.biography-content` - flex column with `gap: 1.5rem` for section spacing
- `.languages-section`, `.liabilities-section`, `.notes-section` - background, border, padding, border-radius
- `.biography-content h3` - override to remove underline (`border-bottom: none`)
- Languages collapsible section styling with header, title, count, and content rules

### 2. Localization Strings (lang/en.json)

Added missing strings at lines 357-358:
- `"NoJourneyAbilities": "No journey abilities"`
- `"NoMiscellaneousAbilities": "No miscellaneous abilities"`

### 3. Collapsible Section Chevron Fix

**Problem:** Collapsible sections showed empty rectangles instead of chevron icons. CSS pseudo-elements with `font-family: "Font Awesome 6 Free"` don't work reliably in FoundryVTT.

**Solution:** Replaced CSS pseudo-element approach with actual `<i>` icon elements.

**Templates updated:**
- `templates/actor/partials/ability-category.hbs` - added chevron icon
- `templates/actor/parts/actor-abilities-accordion.hbs` - added chevron to Dominant Actions section
- `templates/actor/partials/ability-detail.hbs` - added chevron for individual abilities
- `templates/actor/parts/actor-biography-content.hbs` - added chevron to Languages section

**CSS updated (actor-sheets.css):**
- Replaced `.ability-category-header::before` with `.ability-category-header .accordion-chevron`
- Replaced `.languages-header::before` with `.languages-header .accordion-chevron`
- Added `.ability-name .accordion-chevron` styling for individual abilities
- All chevrons rotate 90deg when parent `[open]`

## Files Modified

- `styles/actor-sheets.css` - Biography tab CSS, accordion chevron styling
- `lang/en.json` - NoJourneyAbilities, NoMiscellaneousAbilities strings
- `templates/actor/partials/ability-category.hbs` - chevron icon
- `templates/actor/partials/ability-detail.hbs` - chevron icon
- `templates/actor/parts/actor-abilities-accordion.hbs` - chevron icon
- `templates/actor/parts/actor-biography-content.hbs` - chevron icon, languages section

## Pattern Established

For collapsible `<details>` sections, use:
```html
<summary class="...-header">
  <i class="fas fa-chevron-right accordion-chevron"></i>
  <!-- other content -->
</summary>
```

With CSS:
```css
.header .accordion-chevron {
    font-size: 0.7em;
    transition: transform 0.2s ease;
    width: 12px;
    text-align: center;
}

.section[open] > .header .accordion-chevron {
    transform: rotate(90deg);
}
```