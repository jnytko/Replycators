# Snake - Plugin Documentation

## Sections
- Overview
- Visual Style
- Game Controls
- Game States
- Storage
- Settings
- Startup Behavior
- Auto-Pause
- Public API
- Ownership Boundaries
- Design Exception

---

## Overview

| | |
|-|-|
| Plugin ID | `com.replycators.snake` |
| Version | 1.0.1 |
| Category | Games |
| Status | Active |

Classic retro arcade Snake game inside ReplyCators. Monochrome LCD green palette, pixelated segments, classic movement mechanics.

---

## Visual Style

- Canvas: 400x220 px at 10 px per cell (40 columns x 22 rows)
- HUD band: Top 2 rows (20 px) - score top-left, `BEST XXXX` top-right
- Play field: Bottom 20 rows with 1-cell dotted border
- Palette: `#9CBC0F` (LCD green), `#0F380F` (dark ink)
- Snake and food: Uniform solid squares (9x9 px)

---

## Game Controls

| Input | Action |
|-------|--------|
| Arrow keys | Steer the snake |
| WASD | Steer (alternative) |
| Space | Pause / Resume |
| Side Panel D-pad | On-screen directional buttons (Side Panel mode only) |

---

## Game States

| State | Description |
|-------|-------------|
| `start` | Title screen - press any arrow key to start |
| `running` | Active game loop |
| `paused` | Game suspended - resumed by pressing Space |
| `over` | Game over overlay - press Space or arrow to restart |

---

## Storage

| Key | Content |
|-----|---------|
| `rc:plugin:com.replycators.snake:state` | `{ highScore }` |

High score persists across sessions. All other game state is session-only.

---

## Settings

| Setting | Options | Default |
|---------|---------|---------|
| Snake Speed | slow, classic, fast | classic |

| Speed | Interval |
|-------|---------|
| slow | 220 ms |
| classic | 135 ms |
| fast | 70 ms |

Stored in `appSettings.snakeSpeed` (`rc:session:app-settings`).

---

## Startup Behavior

1. `init()` - loads high score from storage, updates Dashboard widget.
2. `onNavigate()` - initialises canvas, loads high score, shows start screen.
3. `onLeave()` - pauses game loop and detaches keyboard listeners.

---

## Auto-Pause

Navigating away pauses the game automatically:

```js
if (currentView === 'plugin-snake' && view !== 'plugin-snake') {
  window.ReplyCatorsPlugins?.Snake?.onLeave?.();
}
```

---

## Public API

```js
window.ReplyCatorsPlugins.Snake = {
  init,        // called once at startup; loads high score and wires widget
  onNavigate,  // called on navigate to view; initialises canvas and game
  onLeave,     // called on navigate away; pauses game and detaches key listeners
};
```

---

## Ownership Boundaries

| Responsibility | Owner |
|----------------|-------|
| Game loop and rendering | Plugin |
| Canvas management | Plugin |
| Keyboard and D-pad input | Plugin |
| High score persistence | Plugin |
| Speed setting consumption | Plugin (reads `window.ReplyCatorsApp.appSettings.snakeSpeed`) |
| Dashboard widget (high score display) | Plugin |

---

## Design Exception

Snake preserves a nostalgic visual treatment that intentionally deviates from the enterprise platform design language. Documented in `PLUGIN-SDK.md` and `ARCHITECTURE.md`. Logging, notifications, and persistence still follow platform standards.
