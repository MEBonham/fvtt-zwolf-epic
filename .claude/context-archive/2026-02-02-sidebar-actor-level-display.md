# Sidebar Actor Level Display Fix

**Date:** 2026-02-02
**Topic:** Restoring legacy feature to display actor levels in sidebar

## Summary

Attempted to restore legacy feature that displays Actor levels (for PCs and NPCs) in the Foundry sidebar Actors directory.

## Key Findings

### The Hook Already Existed
- [module/hooks/ui.mjs](../../module/hooks/ui.mjs) already had `registerActorDirectoryHook()` function
- It was being imported and called in [module/zwolf-epic.mjs](../../module/zwolf-epic.mjs) line 30 and 90

### Root Cause: Wrong Actor Type Check
- The hook was checking for `actor.type === "character"`
- But [template.json](../../template.json) defines actor types as: `pc`, `npc`, `eidolon`, `mook`, `spawn`
- Fixed to check for `actor.type === "pc"` instead

### Data Model Registration Issue
- Attempted to also fix `CONFIG.Actor.dataModels` from `character: ZWolfActorBase` to `pc: ZWolfActorBase`
- **This broke actor sheets** because `ZWolfActorBase` is incomplete - only has `biography` and `fairWealthRolls` fields
- The `level` field exists in template.json but NOT in the data model
- Using `"character"` as a placeholder key means the data model doesn't match any real type, so template.json schema is used instead
- **Reverted** back to `character: ZWolfActorBase` with explanatory comment

## Code Changes

### module/hooks/ui.mjs
Made hook more robust for Foundry v13 compatibility:
- Added jQuery/HTMLElement compatibility check
- Multiple fallback selectors for actor entries
- Multiple fallback selectors for name element (`.entry-name` or `.document-name`)
- Duplicate prevention check to avoid repeated "(Lv X)" on re-renders
- Better null checks

### module/zwolf-epic.mjs
- Kept `character: ZWolfActorBase` (not matching real types intentionally)
- Added comment explaining this is a placeholder until data model is complete

## Current State

- Actor sheets should work correctly (using template.json schema)
- Sidebar level display may need further testing/debugging
- If sidebar still doesn't work, need to check browser console for errors

## Technical Note

The `ZWolfActorBase` data model needs to be fleshed out with all fields from the legacy `archive 2026-01-23/module/data/actor-base.mjs` before it can be properly registered for `pc` and `npc` types. Until then, template.json provides the schema.