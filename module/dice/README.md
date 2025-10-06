# Z-Wolf Epic Dice System

A clean, modular dice system for the Z-Wolf Epic RPG in Foundry VTT v13.

## File Structure

```
dice/
├── dice-system.mjs       # Core logic, chat, hooks (~400 lines)
├── dice-ui.mjs           # UI controls and interface (~300 lines)
└── dice-constants.mjs    # Constants and configuration (~60 lines)
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
await ZWolfDice.rollSkill(actor, "athletics");

// Attribute roll  
await ZWolfDice.rollAttribute(actor, "agility");
```

### UI Controls

```javascript
// Get current boosts from UI
const boosts = ZWolfDice.getNetBoosts();

// Set boosts in UI
ZWolfDice.setNetBoosts(3);
```

## Installation

1. Place all files in your system's dice module folder
2. Import the main module in your system:
   ```javascript
   import { ZWolfDice } from './modules/dice/dice-system.mjs';
   ```
3. Include the CSS file in your system's CSS imports
4. The system will auto-initialize when loaded

## Configuration

The system includes configurable settings accessible via Foundry's game settings:

- **Auto-Reset Boosts**: Automatically reset boosts to 0 after each roll (default: true)
- **Debug Mode**: Enable detailed console logging (default: false)

## Architecture

### dice-system.mjs
Contains all core functionality:
- **Public API**: `ZWolfDice.roll()`, `rollSkill()`, `rollAttribute()`
- **Roll Logic**: 3d12 mechanics with boost/jinx handling
- **Chat Integration**: Message formatting and display
- **Hooks**: Foundry VTT integration

### dice-ui.mjs
Manages user interface:
- Boost/jinx control panel
- Quick boost buttons (-3 to +3)
- Event handling via delegation
- Dynamic import to avoid circular dependencies

### dice-constants.mjs
Configuration and constants:
- Dice mechanics values
- UI element IDs
- CSS class names
- Messages and flavor text

## Benefits

### Separation of Concerns
- **dice-system.mjs**: All dice logic and integration
- **dice-ui.mjs**: Pure UI management
- **dice-constants.mjs**: Easy configuration

### Maintainable Code
- Clear organization within files
- Consistent error handling
- Self-documenting code structure
- No circular dependencies

### Performance
- Event delegation for UI efficiency
- Lazy loading of heavy components
- Minimal DOM manipulation

## Dice Mechanics

### Key Die Selection
- **No boosts/jinxes**: Median die (middle of 3d12)
- **Boosts (positive)**: Second-highest die
- **Jinxes (negative)**: Second-lowest die

### Critical Chances
- **Critical Success**: Die adjacent to key die = 12
- **Critical Failure**: Die adjacent to key die = 1
- **Wild Card**: Both conditions met simultaneously

### Progression Bonuses
Z-Wolf uses progression-based modifiers:
- **Mediocre**: `floor(0.6 × level - 0.3)`
- **Moderate**: `floor(0.8 × level)`
- **Specialty**: `floor(1.0 × level)`
- **Awesome**: `floor(1.2 × level + 0.8)`

## Troubleshooting

### Controls not appearing
Check console for hook registration errors. Ensure hooks are firing:
```javascript
Hooks.on('renderChatLog', () => console.log('Chat rendered'));
```

### Rolls failing
Enable debug mode in settings to see detailed logging.

### UI not responding
Verify event listeners are attached on 'ready' hook.

## Development

### Adding Features

1. Add constants to `dice-constants.mjs`
2. Implement logic in `dice-system.mjs`
3. Add UI elements in `dice-ui.mjs` if needed
4. Test thoroughly

### Modifying Roll Logic

All roll mechanics are in the `performRoll()` function in `dice-system.mjs`. Key die selection is in `determineKeyDie()`.

### Customizing UI

UI structure is in `ZWolfUI.createBoostControl()`. Styling should be in your CSS file using the classes defined in `dice-constants.mjs`.

## Migration from Multi-File System

The new 3-file system maintains full API compatibility with the previous 7-file version:

```javascript
// All these still work exactly the same
await ZWolfDice.roll({ netBoosts: 2, modifier: 5 });
await ZWolfDice.rollSkill(actor, "athletics");
ZWolfDice.setNetBoosts(3);
```

## API Reference

### ZWolfDice.roll(options)
Main roll function.

**Parameters:**
- `netBoosts` (number): Positive = boosts, negative = jinxes
- `modifier` (number): Flat modifier to add to result
- `targetNumber` (number): Target to beat (optional)
- `flavor` (string): Flavor text for roll
- `actor` (Actor): Actor making the roll (optional)

**Returns:** Promise<Object> with roll results

### ZWolfDice.rollSkill(actor, skillName, attributeName, netBoosts)
Quick skill roll using actor's progression.

### ZWolfDice.rollAttribute(actor, attributeName, netBoosts)
Quick attribute roll using actor's progression.

### ZWolfDice.getNetBoosts()
Get current net boosts from UI.

**Returns:** number

### ZWolfDice.setNetBoosts(value)
Set net boosts in UI.

**Parameters:**
- `value` (number): Value to set (clamped to -10 to +10)

## Credits

Built for Z-Wolf Epic system for Foundry VTT v13.
Uses Foundry's native Roll API and V2 data framework.
