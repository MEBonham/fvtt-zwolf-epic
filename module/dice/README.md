# Z-Wolf Epic Dice System

A clean, modular dice system for the Z-Wolf Epic RPG in Foundry VTT v13.

## File Structure

```
dice-system/
├── index.mjs              # Module exports
├── dice.mjs               # Main entry point and public API
├── dice-core.mjs          # Core dice rolling logic
├── dice-ui.mjs            # UI management and controls
├── dice-chat.mjs          # Chat message formatting
├── dice-hooks.mjs         # Foundry hook registration
├── dice-constants.mjs     # Constants and configuration
├── styles/
│   └── dice.css          # All dice system CSS styles
└── README.md             # This file
```

## Key Features

- **3d12 + modifier** core mechanic
- **Boosts/Jinxes** system affecting key die selection
- **Critical success/failure chances** based on adjacent dice
- **Clean UI controls** integrated into chat panel
- **Modular architecture** for easy maintenance
- **Error handling** and debug mode support

## Usage

### Basic Usage

```javascript
// Simple roll with current UI boosts
await ZWolfDice.roll({ modifier: 5, flavor: "Attack Roll" });

// Roll with specific boosts/jinxes
await ZWolfDice.roll({ 
  netBoosts: 2, 
  modifier: 3, 
  targetNumber: 15,
  flavor: "Skill Check" 
});
```

### Actor Rolls

```javascript
// Skill roll
await ZWolfDice.rollSkill(actor, "athletics", "strength");

// Attribute roll  
await ZWolfDice.rollAttribute(actor, "dexterity");
```

### UI Controls

```javascript
// Get current boosts from UI
const boosts = ZWolfDice.getNetBoosts();

// Set boosts in UI
ZWolfDice.setNetBoosts(3);
```

### Advanced Usage

```javascript
// Multiple rolls with summary
await ZWolfDice.rollMultiple([
  { modifier: 5, flavor: "First Roll" },
  { modifier: 3, netBoosts: 1, flavor: "Second Roll" }
], "Combat Round");

// Access individual components
import { ZWolfDiceCore, ZWolfUI, ZWolfChat } from './index.mjs';
```

## Installation

1. Place all files in your system's dice module folder
2. Import the main module in your system:
   ```javascript
   import { ZWolfDice } from './modules/dice-system/index.mjs';
   ```
3. Include the CSS file in your system's CSS imports
4. The system will auto-initialize when loaded

## Configuration

The system includes several configurable settings:

- **Auto-Reset Boosts**: Automatically reset boosts to 0 after each roll
- **Debug Mode**: Enable detailed console logging  
- **Default Modifier**: Default modifier for quick rolls

Access via Foundry's game settings or programmatically:

```javascript
import { getSetting, setSetting } from './dice-hooks.mjs';

const autoReset = getSetting('autoResetBoosts', true);
await setSetting('debugMode', true);
```

## Architecture Benefits

### Separation of Concerns
- **dice-core.mjs**: Pure dice logic, no UI dependencies
- **dice-ui.mjs**: UI management, no dice logic
- **dice-chat.mjs**: Message formatting only
- **dice-hooks.mjs**: Foundry integration only

### Easy Testing
Each component can be tested independently:

```javascript
// Test the system
await ZWolfDice.test();

// Get system info
console.log(ZWolfDice.getSystemInfo());
```

### Maintainable Code
- Constants centralized in one file
- Clear import/export structure
- Consistent error handling
- Debug logging throughout

### Performance
- Event delegation for UI efficiency
- Lazy loading of heavy components
- Minimal DOM manipulation

## Migration from Old System

The new system maintains API compatibility with the old `dice.mjs` file:

```javascript
// Old way (still works)
await ZWolfDice.roll({ netBoosts: 2, modifier: 5 });

// New capabilities
await ZWolfDice.rollMultiple([...configs], "Title");
const info = ZWolfDice.getSystemInfo();
```

## Troubleshooting

1. **Controls not appearing**: Check console for hook registration errors
2. **Rolls failing**: Enable debug mode to see detailed logging
3. **UI not responding**: Verify event listeners are attached

```javascript
// Enable debug mode
await setSetting('debugMode', true);

// Manual test
await ZWolfDice.test();
```

## Development

### Adding New Features

1. Add constants to `dice-constants.mjs`
2. Implement core logic in `dice-core.mjs`
3. Add UI elements in `dice-ui.mjs` 
4. Update chat formatting in `dice-chat.mjs`
5. Register hooks in `dice-hooks.mjs`
6. Expose via public API in `dice.mjs`

### CSS Customization

All styles are in `styles/dice.css` with:
- CSS custom properties for easy theming
- Responsive design support
- Accessibility features
- High contrast mode support
- Reduced motion support

## Contributing

When modifying the system:
1. Maintain the separation of concerns
2. Add appropriate error handling  
3. Update constants file for magic numbers
4. Add debug logging for complex operations
5. Test with `ZWolfDice.test()`
