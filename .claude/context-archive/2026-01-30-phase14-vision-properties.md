# Phase 14: Vision & Properties Implementation

**Date:** 2026-01-30
**Topic:** Phase 14 implementation - Vision radii, token integration, language limit, size validation

## Summary

Implemented Phase 14 of the Z-Wolf Epic system rebuild, covering vision system integration with FoundryVTT's token visibility engine.

## Files Created

### module/documents/Token.mjs
Custom TokenDocument class for vision sync and size management:
- `prepareBaseData()` - syncs vision before Foundry's preparation
- `_syncVisionFromActor()` - sets up detection modes (brightVision, lightVision, darkvision)
- `syncVisionFromActor()` - syncs vision values to token flags
- Getters: `nightsight`, `darkvision`, `baseNightsight`, `baseDarkvision`, `visionRanges`
- Override methods for custom vision values
- Hooks for `updateActor` to sync vision and size changes to tokens

### module/vision/vision-radius-display.mjs
Visual rings around controlled tokens showing vision ranges:
- Blue ring for nightsight (dim light vision)
- Red ring for darkvision (darkness vision)
- Uses PIXI.js graphics for rendering
- Hooks: `refreshToken`, `controlToken`

## Files Modified

### template.json
Added `effectiveSize` field to base actor template:
```json
"effectiveSize": "medium"
```

### module/sheets/actor-sheet.mjs
Added Phase 14 section with:
- `_calculateEffectiveSize(sideEffects)` - calculates size from base + sizeModifier
- `_calculateLanguageLimit()` - 2 base + 2 per Linguist knack
- Auto-updates actor's effectiveSize when it changes

### module/zwolf-epic.mjs
- Imported ZWolfTokenDocument and ZWolfVisionRadiusDisplay
- Registered `CONFIG.Token.documentClass = ZWolfTokenDocument`
- Initialize vision display in ready hook

### lang/en.json
Added localization keys:
- `LanguageLimit`, `LanguageLimitHint`

## Key Technical Details

### Detection Modes (Token.mjs:80-107)
The system integrates with Foundry's visibility engine through detection modes:
1. `brightVision` - sees in bright light (maxRange)
2. `lightVision` - sees in dim light (nightsight range)
3. `darkvision` - sees in total darkness (darkvision range)

### Default Values (template.json)
- `nightsight`: 1 meter (can see in dim light nearby)
- `darkvision`: 0.2 meters (essentially only own space in darkness)

### Size Calculation
Size order: diminutive → tiny → small → medium → large → huge → gargantuan → colossal → titanic
- Base size from actor + sizeModifier from side effects
- Clamped to valid range

### Token Visibility Behavior
Tokens appear/vanish based on:
- Scene's global illumination settings
- Light sources on the scene
- Observer's detection modes and ranges
- Walls that block vision

## Follow-up Q&A

**Q: Do tokens appear and vanish based on light levels and vision radii?**

**A:** Yes. The system sets up detection modes that integrate with Foundry's core visibility engine:
- In bright light: all tokens visible normally
- In dim light: only tokens with lightVision (nightsight > 0) can see, within range
- In darkness: only tokens with darkvision can see, within range

The visual rings from vision-radius-display.mjs help players understand their ranges, but actual visibility is calculated by Foundry's built-in engine.