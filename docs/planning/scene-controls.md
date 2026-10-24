# First-person lab controls

Implemented on `feat/3d-site-transformation`, 2026-10-21. Scope is scene input in `scripts/campus/index.ts`, control markup in `CampusHome.astro`, and control styles in `campus.css`. Night lighting, `world.ts`, robot behavior, shell welcome, and `scripts/site/campus-home.ts` remain with their existing owners.

## Using the room

Choose Explore the room to focus the scene. While the canvas has focus:

- W/S or Up/Down walk forward/backward. A/D or Left/Right walk sideways.
- J/L turn left/right. I/K look up/down. Pitch stops at ±1.12 radians.
- Shift increases walking speed from 2.4 to 3.7 world units per second.
- E or Enter selects the station at the center of the view. A tap/click on a rendered station also selects it.
- Tab and Shift+Tab leave the scene. Escape releases held input. Normal buttons, links, fields, and dialogs do not send movement keys to the camera.

On a device reporting a coarse pointer, the named Walk forward/left/backward/right buttons appear after entering the room. The Walk pad toggle also lets other users show or hide them. Hold one or more buttons to walk and drag elsewhere in the room to look. Releasing a look gesture preserves a separately held walk button. The pad sits in the flexible scene row above the directory, with 44×44 CSS pixel buttons, visible focus, accessible names, and a visible held state. It leaves the center and station dock available.

The directory remains an equivalent direct route to every activity. Walking uses the existing collision checks and room bounds. Reduced motion still initializes the scene paused and snaps station navigation; users may explicitly resume movement.

## Release rules

Keyboard input clears on canvas blur and Tab exit. Each walk pointer has its own capture and direction; pointerup, pointercancel, and lostpointercapture release that pointer. Window blur, hidden document, orientation change, pad toggle, pause/modal pause, navigation, context loss, and disposal clear all held input. The scene's existing lifecycle API and `onStation` callback are preserved.

## Validation

The final local Chrome run passed at 320×568, 390×844, and 1280×800. Camera pose observations were injected into the dev module response only in the test browser, with no shipped debug API. Real browser keyboard events verified walking, J/L yaw, I/K pitch, release stability, Tab/Shift+Tab escape, and no movement with a normal button focused. E opened the rendered workbench at every size. Chrome CDP touch streams verified forward hold, simultaneous independent look drag, releasing look while continuing to walk, full release, cancellation, and opening/closing a modal while moving. Pose stayed stable after release.

Lifecycle checks passed for lost capture, orientation change, blur/focus, hidden/visible document, and pagehide disposal. Orientation, window blur, visibility, and disposal conditions were simulated DOM lifecycle events; hidden state was overridden only in the test browser. These checks exercise reset handlers and do not establish physical-device OS behavior.

Fine-pointer desktop defaults to a hidden pad, and the toggle reveals it. Additional 568×320 and 844×390 landscape checks passed with no header/dock overlap or document scroll. The short-height pad uses a horizontal row and replaces the redundant exploration hint. The 320×568 portrait pad ends at y=378 and the directory starts at y=384. The room center remains visible. Actual screenshots were reviewed at all five sizes.

Evidence: `/tmp/scene-controls-320x568.png`, `/tmp/scene-controls-390x844.png`, `/tmp/scene-controls-1280x800.png`, `/tmp/scene-controls-layout-568x320.png`, and `/tmp/scene-controls-layout-844x390.png`. Test scripts and logs are `/tmp/campus-pw-test/controls.cjs`, `/tmp/campus-pw-test/controls-layout.cjs`, `/tmp/scene-controls-browser-final.log`, and `/tmp/scene-controls-layout.log`.

T3 preview opened a dedicated tab, but two snapshots returned `Preview automation snapshot timed out after 15000ms.` Validation used an independent local Chrome browser. The iOS simulator opened but displayed a different localhost app, so it supplies no lab evidence. Android SDK was unavailable. Touch evidence is Chrome emulation, not physical iOS/Android hardware. No screen-reader test was performed. Live HMR and a shared-server shutdown interrupted earlier attempts; the final interaction run disabled HMR only in its own test browser and completed against 127.0.0.1:4321.

Astro check passed with zero errors/warnings and 32 existing hints. The final shared test suite passed 197 tests, zero failures, 471 assertions. No dependencies, commits, deployments, or contact submissions were made.
