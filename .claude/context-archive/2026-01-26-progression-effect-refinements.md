# Progression Effect Refinements
**Date:** 2026-01-26
**Topic:** Refined progression effect dropdown options for Speed, Toughness TN, and Destiny TN

## Summary

Made targeted improvements to side effect dropdown options to better reflect game logic where effects represent boosts above default values.

## Changes Made

### File: `templates/item/partials/side-effects-form.hbs`

Split the progression effect types into three separate conditionals (lines 113-153):

1. **Speed Progression** (lines 113-128)
   - Options: Mediocre, Moderate, Specialty, Awesome
   - Removed "None" option - if no progression boost is needed, don't add the effect at all

2. **Toughness TN Progression** (lines 130-142)
   - Options: Moderate, Specialty, Awesome
   - Rationale: Defaults to Mediocre Bonus, so only higher values are meaningful

3. **Destiny TN Progression** (lines 144-153)
   - Options: Specialty, Awesome
   - Rationale: Defaults to Moderate, so only higher values are meaningful

## Rationale

Side effects should only represent actual boosts above defaults:
- **Speed Progression**: Has no inherent default, so all progression levels are valid options
- **Toughness TN**: Defaults to Mediocre Bonus baseline
- **Destiny TN**: Defaults to Moderate baseline

This prevents unnecessary "no effect" entries and makes the interface clearer for users.

## Technical Details

- Previously all three types shared the same dropdown with "None" option
- Now each has its own conditional block with appropriate options
- No data model or logic changes required - purely UI refinement