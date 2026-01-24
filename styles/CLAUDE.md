# PATTERNS

## Form Element of Sheets
Note the pattern used by the actor sheet CSS:
```
/* ApplicationV2 renders parts into window-content */
.application.actor .window-content {
    height: 100%;
    overflow: hidden;
    background: #1e1e1e;
    display: grid;
    grid-template-rows: auto auto 1fr;
    grid-template-columns: 200px 1fr;
}

/* Form should fill its container */
.application.actor form {
    height: 100%;
    display: contents;
}
```
The item sheet should eventually use the same pattern.
