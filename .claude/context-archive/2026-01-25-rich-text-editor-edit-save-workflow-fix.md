# Rich Text Editor Edit/Save Workflow Fix
**Date:** 2026-01-25

## Summary

Fixed the rich text editor Edit/Save workflow that was previously implemented but non-functional. The editors now properly activate, display formatting toolbars, and save content.

## Problem

After previous implementation of custom rich-editor partial with Edit/Save button workflow, the Edit button did nothing:
- No console errors
- No ProseMirror toolbar appearing
- Clicking Edit had no effect

## Root Causes Identified

1. **EditorSaveHandler not activated**: The `EditorSaveHandler.activateEditors()` was never called in item-sheet.mjs
2. **Missing CSS for ProseMirror menus**: Dropdown menus were visible by default and overlapping
3. **Incorrect element selector**: Save handler couldn't find the ProseMirror content div

## Changes Made

### 1. module/sheets/item-sheet.mjs
**Added import:**
```javascript
import { EditorSaveHandler } from "../helpers/editor-save-handler.mjs";
```

**Added activation call in _onRender() (line 115):**
```javascript
// Activate rich text editors with Edit/Save workflow
EditorSaveHandler.activateEditors(this);
```

### 2. styles/item-sheets.css
**Added ~100 lines of ProseMirror menu CSS** (after line 632):
- `.editor-menu` - Flexbox layout for menu bar
- `.pm-dropdown` - Dropdown button styling
- Dropdown menu styling with `display: none` by default
- `:hover > ul` to show menus on hover
- Nested submenu positioning (positioned to the right)
- Z-index layering for proper stacking
- Dark theme colors matching existing design

Key CSS patterns:
```css
.zwolf-epic.sheet.item .editor-menu .pm-dropdown > ul {
    display: none;
    position: absolute;
    /* ... */
}

.zwolf-epic.sheet.item .editor-menu .pm-dropdown:hover > ul {
    display: block;
}
```

### 3. module/helpers/editor-save-handler.mjs
**Improved ProseMirror selector** (lines 126-132):
```javascript
// Try multiple selectors to find the ProseMirror editor
let prosemirrorDiv = editorContainer.querySelector(".ProseMirror");
if (!prosemirrorDiv) {
    prosemirrorDiv = editorContainer.querySelector(".editor-container .ProseMirror");
}
if (!prosemirrorDiv) {
    prosemirrorDiv = editorElement.querySelector(".ProseMirror");
}
```

**Removed debug console.log statements** after confirming functionality.

## Current State

Rich text editors are now fully functional:
- ✅ Edit button activates ProseMirror editor
- ✅ Full formatting toolbar displays properly
- ✅ Dropdown menus work correctly (hidden until hover)
- ✅ Save button persists content via form submission
- ✅ Cancel button and ESC key discard changes
- ✅ Content loads correctly when reopening sheet
- ✅ All editors work: ability descriptions, talent menus, required fields

## Technical Details

The editor workflow:
1. Click **Edit** → `EditorSaveHandler.createManualEditor()` called
2. Hide view-mode content and toolbar
3. Create ProseMirror editor container with current content
4. Show formatting menu and Save/Cancel buttons
5. Click **Save** → Extract HTML from ProseMirror div
6. Create/update hidden input field with content
7. Trigger form change event → auto-save via `_onSubmitForm()`
8. Cleanup and restore view mode

## Files Modified

- `module/sheets/item-sheet.mjs` - Import and activate editors
- `styles/item-sheets.css` - ProseMirror menu CSS
- `module/helpers/editor-save-handler.mjs` - Better selectors, removed debug logs

## Related Context

This builds on previous work from the compacted session that created:
- `templates/item/partials/rich-editor.hbs` - Custom editor partial
- Initial `EditorSaveHandler` implementation
- Base editor CSS (~200 lines for content area, buttons, etc.)

The previous implementation created the infrastructure but wasn't wired up properly. This session completed the integration.