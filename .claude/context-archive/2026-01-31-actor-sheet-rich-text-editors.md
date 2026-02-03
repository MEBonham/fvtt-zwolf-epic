# Actor Sheet Rich Text Editors

**Date**: 2026-01-31
**Topic**: Hooking up Rich Text Editors on Actor Sheets (Biography tab)

## Summary

Connected the three Rich Text Editors on the Actor Sheet Biography tab (Liabilities, Languages, Notes) to the same `EditorSaveHandler` workflow used by Item sheets.

## Problem

The Actor sheet Biography tab had three RTEs that weren't working. When clicking the Edit button, the content would disappear instead of showing a ProseMirror editor with Save/Cancel controls.

**Root Cause**: The biography template used Foundry's built-in `{{editor}}` helper, which produces a different HTML structure than what the custom `EditorSaveHandler` expects. Item sheets use a custom `{{> rich-editor}}` partial that produces the correct structure.

## Solution

Changed the Actor sheet to use the same patterns as Item sheets:

1. Import and activate `EditorSaveHandler` in the actor sheet
2. Use the custom `{{> rich-editor}}` partial instead of `{{editor}}`
3. Add required context variables (`owner`, `editable`)
4. Extend CSS selectors to include actor sheets

## Files Modified

### module/sheets/actor-sheet.mjs
- Added import: `import { EditorSaveHandler } from "../helpers/editor-save-handler.mjs";`
- Added in `_prepareContext()`:
  ```javascript
  context.owner = this.actor.isOwner;
  context.editable = this.isEditable;
  ```
- Added in `_onRender()`:
  ```javascript
  EditorSaveHandler.activateEditors(this);
  ```

### templates/actor/parts/actor-biography-content.hbs
Changed all three editors from:
```handlebars
{{editor system.liabilities target="system.liabilities" button=true owner=owner editable=editable height=120}}
```
To:
```handlebars
{{> rich-editor
    value=system.liabilities
    target="system.liabilities"
    editable=editable
    owner=owner
    placeholder="ZWOLF.NoLiabilities"}}
```

### lang/en.json
Added placeholder localization keys:
- `NoLiabilities`: "No liabilities"
- `NoLanguages`: "No languages"
- `NoNotes`: "No notes"

### styles/item-sheets.css
Updated all Rich Text Editor CSS rules (lines 440-824) to include both `.zwolf-epic.sheet.item` and `.zwolf-epic.sheet.actor` selectors, ensuring consistent styling across both sheet types.

## Key Files Reference

| File | Purpose |
|------|---------|
| `module/helpers/editor-save-handler.mjs` | Handles Edit/Save workflow for ProseMirror editors |
| `templates/item/partials/rich-editor.hbs` | Custom RTE partial with correct HTML structure |
| `module/helpers/templates.mjs` | Registers partials including `rich-editor` |

## Technical Details

The `rich-editor.hbs` partial produces this structure:
```html
<div class="editor">
  <div class="editor-content" data-edit="{{target}}">...</div>
  <div class="editor-toolbar">
    <button class="editor-edit">Edit</button>
  </div>
</div>
```

`EditorSaveHandler.activateEditors()` finds `.editor-edit` buttons, gets the closest `.editor` parent, finds `.editor-content` with `data-edit` attribute, and attaches click handlers that create ProseMirror editors with Save/Cancel controls.