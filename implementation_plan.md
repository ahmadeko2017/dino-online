# Implementation Plan: Chrome Dino Clone (T-Rex Runner)

## Goal Description
Create a 100% accurate clone of the Chrome "No Internet" Dinosaur game. The target is to replicate the gameplay loop, physics, scoring, and visual aesthetics exactly. This allows for a nostalgic and practice-oriented project, focusing on precise game mechanics and canvas rendering.

## User Review Required
> [!IMPORTANT]
> **Scope Confirmation**: This plan assumes a web-based implementation (HTML5 Canvas + Vanilla JS) to best match the original behavior.
> **Assets**: We will need to generate or acquire assets that match the original pixel art style.

## Technical Architecture

### 1. Technology Stack
-   **Core**: HTML5, CSS3, JavaScript (ES6+).
-   **Rendering**: HTML5 `<canvas>` API for high-performance 2D rendering.
-   **Build Tool**: Vite (optional, but recommended for development).
-   **Storage**: `localStorage` to persist High Scores.

### 2. Game Loop System
A standard game loop using `requestAnimationFrame` to ensure smooth 60fps gameplay.
-   **`update(deltaTime)`**: Calculates physics, movement, and logic.
-   **`draw()`**: Renders the current state to the canvas.
-   **Speed Factor**: Unlike a constant speed runner, the game speed increases gradually over time, capping at a maximum value.

## Sprint 1: Chrome Dino Clone (Base Game)

This sprint focuses on the single-player experience with 100% fidelity.

### 1. Global Configuration (`src/constants.js`)
Define these constants to ensure "100% similarity" tuning.
```javascript
export const GAME_SPEED_START = 0.75; // Initial scrolling speed
export const GAME_SPEED_MAX = 1.6;
export const GRAVITY = 0.6;
export const JUMP_VELOCITY = -10;
export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 150;
```

### 2. Class Specifications

#### `src/Game.js`
-   **Properties**: `canvas`, `ctx`, `width`, `height`, `gameSpeed`, `score`, `highScore`, `dino`, `obstacleManager`, `frameId`, `gameOver`.
-   **Methods**:
    -   `init()`: Bind events, setup canvas.
    -   `start()`: Reset tracking variables, start loop.
    -   `update(deltaTime)`:
        1.  `this.gameSpeed += 0.00001 * deltaTime`
        2.  `this.dino.update()`
        3.  `this.obstacleManager.update()`
        4.  `this.score.update()`
        5.  `checkCollisions()` -> if true, `this.gameOver = true`.
    -   `draw()`: Clear canvas, call draw on all entities.

#### `src/entities/Dino.js`
-   **Properties**: `x` (fixed ~50px), `y`, `dy` (vertical velocity), `width` (44px), `height` (47px), `state` ('STANDING', 'JUMPING', 'DUCKING'), `jumpTimer`.
-   **Methods**:
    -   `jump()`: if on ground, `this.dy = JUMP_VELOCITY`.
    -   `duck(isKeyDown)`: if true, switch sprite, change collision box height.
    -   `update()`:
        -   Apply gravity: `this.y += this.dy`.
        -   `this.dy += GRAVITY`.
        -   Ground check: if `this.y > GROUND_Y`, `this.y = GROUND_Y`, `this.dy = 0`.
    -   `draw(ctx)`: Render current sprite frame (run animation toggles every 10 ticks).

#### `src/entities/ObstacleManager.js`
-   **Properties**: `obstacles[]`.
-   **Methods**:
    -   `spawnObstacle()`: Random chance based on `gameSpeed`.
    -   `update()`: Move all obstacles `x -= gameSpeed`. Remove if `x + width < 0`.

### 3. Canvas & Input
-   **Canvas**: `<canvas id="game" width="600" height="150"></canvas>`.
-   **Input**:
    -   `keydown` 'Space'/'ArrowUp' -> `dino.jump()`
    -   `keydown` 'ArrowDown' -> `dino.duck(true)`
    -   `keyup` 'ArrowDown' -> `dino.duck(false)`

### 4. Assets (`assets/`)
-   **`sprites.png`**:
    -   Dino (Standing, Run 1, Run 2, Duck 1, Duck 2, Dead).
    -   Cacti (Small x3, Big x3).
    -   Bird (Wing Up, Wing Down).
    -   Ground (Repeating texture).

## Sprint 2: Online Multiplayer (Firebase)

This sprint adds real-time capabilities to compete with others.

### [Infrastructure]

#### [NEW] `firebaseConfig.js`
-   Initialize Firebase App.
-   Setup Firestore (or Realtime Database) for low-latency sync.

### [Multiplayer Logic]

#### [NEW] `src/managers/NetworkManager.js`
-   **Lobby System**: Create/Join rooms.
-   **State Sync**:
    -   Send: `PlayerPosition` (Y-axis), `State` (Run/Jump/Duck), `Score`, `AliveStatus`.
    -   Receive: Opponent data to render a "Ghost Dino".

#### [MOD] `src/Game.js`
-   Update loop to handle `GhostDino` rendering.
-   Game Over logic to wait for opponent or declare winner.

#### [NEW] `src/entities/GhostDino.js`
-   Visual representation of the opponent.
-   Non-interactable (no collisions with local obstacles), purely visual.

## Verification Plan

### Manual Verification
1.  **Physics Check**: Verify that tapping jump performs a short hop, and holding performs a full jump. Verify ducking works.
2.  **Collision Check**: Intentionally run into hitboxes to ensure "Game Over" triggers correctly.
3.  **Speed Progression**: Play for 2-3 minutes to verify the game speeds up.
4.  **Persistence**: Refresh the page to verify High Score is saved.
5.  **Responsiveness**: Ensure the canvas scales or centers correctly on different window sizes.

### Automated Tests (Optional)
-   Possible unit tests for `ScoreManager` logic using a simple test runner.
