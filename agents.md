# 🤖 Overlay Development Agents & Context

**Project:** Interactive Stream Overlays (Ball Pit, Tetris, Plinko)
**Environment:** OBS Browser Source (Local File)
**Backend:** Streamer.bot (v0.2.x+) via WebSocket (Localhost:8080)
**Physics Engine:** Matter.js (2D)

## 🧠 Core Memory & "Golden Rules"

### 1. The Streamer.bot Connection Protocol

* **The "Nuclear Option" (`onData`) is Forbidden for Controls:** Never use the raw `onData` listener for game controls (Left, Right, Drop). It causes double-triggering because it hears both the raw packet and the processed event.

* **Use `General.Custom`:** The correct way to handle internal signals (from Stream Deck/C#) is listening to `client.on('General.Custom', ...)` and checking `payload.eventName` (or parsing the raw string if using `BroadcastString`).

* **C# Actions:** The preferred method to trigger overlay events from Streamer.bot is:
  CPH.WebsocketBroadcastJson("{\"event\":{\"source\":\"General\",\"type\":\"Custom\"},\"data\":{\"eventName\":\"MyEventName\"}}");

### 2. Physics Engine (Matter.js) Stability

* **Initialization Order:** To prevent "Hearing sounds but seeing nothing," the Matter.js loop must be started in this specific order:
  1. `Engine.create()`
  2. `Render.create()` (Let Matter.js generate the canvas, do not put an empty `<canvas>` in HTML body).
  3. `Runner.create()`
  4. `Runner.run(runner, engine)`
  5. `Render.run(render)`

* **Spawning Safety:** Never spawn objects inside walls. Always offset spawn coordinates (e.g., `y: -100` or `y: 150`) to ensure they are inside the bounds but off-screen if necessary.

### 3. Visual Design Standards

* **Resolution:** Always design for **1920x1080** but keep in mind scaling for different aspect ratios and resolutions
* **Fonts:** Use **"Barlow"** (SemiBold/Bold) for all UI. Fallback to Arial.
* **UI Style:** JoyUI
* **Colors:**
  * Red: `#ff0000`
  * Yellow: `#ffea00`
  * Cyan: `#05ff74`
  * Blue: `#5fffff`

## 🕵️ Active Agents (Personas)

### 🟢 The Physics Engineer
**Focus:** Matter.js, Collision logic, Performance.
**Directives:**
* Ensure objects don't tunnel through walls (High iterations).
* Manage the "Garbage Collector" (remove bodies that fall off-screen).

### 🔵 The Integrator
**Focus:** Streamer.bot C#, WebSocket payloads, JSON parsing.
**Directives:**
* Ensure data types match (Strings vs Integers).
* Handle "Twitch.Follow" logic
* Handle "Twitch.Cheer" logic
* Handle "Twitch.Subscribe" logic
* Debug connection issues using the `debug-log` div (if active).

### 🟣 The Designer
**Focus:** CSS, Canvas Rendering, Animations.
**Directives:**
* Keep the overlay transparent (`background-color: transparent`).
* Ensure text stays **inside** physics objects when possible.
* If text is too long, wrap it or scale the font down, but never below ~10px legibility.
* Handle the "Stats Bar" and "Notification Popups" logic.

## ⚠️ Known Pitfalls (Do Not Repeat)

1. **Duplicate Listeners:** Do not add `client.on` listeners inside a loop or inside another function. They must be top-level.
2. **CSS Bleed:** When using SVG borders, ensure the background color is inside the SVG `<rect>`, not on the parent `div`, or it will bleed outside the rounded corners.
3. **Variable Scope:** When refactoring rendering loops, ensure variables like `availableWidth` are defined in the correct scope.
