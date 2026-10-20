# 3D site transformation plan

Turn Tim's Experiments into a playable 3D portfolio with high quality graphics, responsive controls, and experiments that communicate Tim's engineering judgment. Visitors should enjoy exploring and quickly understand what Tim builds, how he thinks, and how to contact him.

Status: initial proposal. The world setting and camera direction are open for discussion. Development stays local on `feat/3d-site-transformation` until a preview deployment is wanted.

## Proposed experience

Build an inventor's workshop with a distinctive architectural identity, convincing materials, deliberate lighting, and machines visitors can operate. Start with one carefully composed room. Make the environment feel authored through custom models, animation, sound, and consistent interaction feedback.

The professional twist is that each playable experiment demonstrates an actual engineering idea. For example, visitors could adjust load on a miniature system and see queues form, or change an encoding and see a physical representation of message size. These are proposed interpretations of project topics, not claims about measured project results. Every exhibit should connect the interaction to a real project, article, implementation decision, or lesson.

A short visit should work as well as a long one. Show Tim's name, role, and direct links immediately. Let curious visitors spend several minutes experimenting without making discovery a prerequisite for reading the portfolio.

## First visit

1. Load a lightweight introduction with Work, Writing, Resume, and Contact available as ordinary links while the scene loads.
2. Offer an explicit entry into exploration. Show movement and interaction hints appropriate to the visitor's input device.
3. Place the visitor near a compelling machine with one obvious interaction. Give visible and optional audible feedback immediately.
4. Let the experiment reveal a concise explanation with a link to the full project or article.
5. Keep a map or destination menu available for jumping directly to another exhibit or leaving exploration.

Avoid mandatory tutorials, collectible gates, login requirements, and tasks that delay access to professional information.

## Visual direction

Proposed palette: warm architectural light against graphite machinery, with restrained amber and cool cyan signals. Use readable neutral typography for content and compact technical labels on instruments. Reuse suitable existing fonts and tokens where they support the direction.

Prioritize silhouette, composition, material response, shadow quality, and purposeful animation. Use a small number of detailed focal objects, backed by simpler architecture. Establish a consistent model scale and asset style before producing the rest of the world.

Start with baked environmental lighting and selective dynamic lighting as a candidate approach. Evaluate reflections, shadows, and postprocessing against measured frame time. Asset production needs explicit ownership, licensing, source files, and export conventions. The existing cube can become a recognizable workshop artifact if it fits the final art direction.

## Camera and controls

Prototype a third person character with a constrained orbit camera as the initial candidate. Compare it with a close exploration camera before committing to character production. Third person offers a visible identity but adds animation, collision, and camera work that must earn its cost.

- Desktop: WASD and arrow keys for movement, pointer drag for camera, an interaction key, and Escape to pause or release captured input. Treat pointer lock as an explicit optional mode.
- Touch: large movement and camera controls, a clear interaction action, and tap destinations where precision movement is unnecessary. Keep important content outside the touch control areas.
- Keyboard navigation: reach destinations and open exhibits through semantic controls without requiring precise movement or camera aiming.
- Reading: opening content pauses movement, releases game input, and moves focus into the content panel. Closing restores focus predictably.

Tune acceleration, braking, turn response, camera collision, and interaction distance in a simple room before adding final assets. Prevent input sticking after tab switches. Pause rendering and clear input on lost focus. Avoid camera bob and automatic spinning; provide sensitivity and reduced motion settings. Audio starts only after an explicit action and always has a mute control.

## Content and navigation

Keep project and article text in the existing Astro content system. Give exhibits stable identifiers that map to real routes, so shared links, browser Back, and direct entry work outside the game.

- Work and experiments become playable stations with concise project summaries.
- Writing remains readable on `/lab` and its article routes, with contextual entrances from exhibits.
- Career information gets a visible resume destination. Preserve the existing public MCP integration and its current choice to keep experience stories available through MCP only.
- Contact and subscription remain ordinary accessible controls, with the existing integrations preserved.

Provide a complete text navigation mode when 3D is unwanted or unavailable. A canvas should never be the sole way to find information. Handle reduced motion, loading failure, unsupported graphics, and graphics context loss explicitly.

## Technical approach

Keep Astro as the site shell and content renderer. Build an isolated browser scene using the already installed Three.js dependency, with clear ownership of rendering, input, navigation, assets, and cleanup. Reassess engine choice only if the first playable room exposes a concrete limitation.

Separate world state from content navigation and DOM overlays. Dispose of GPU resources and event handlers on exit. Use simple movement bounds and collision geometry first; choose a physics dependency only when the interaction requires it. Do not rewrite unrelated services as part of the visual transformation.

Load the experience on demand, stream optional exhibits, and provide adaptive quality settings. Use compressed assets and textures through a verified local asset pipeline. Check the existing Three.js version and local build support before choosing exporter formats or adding tooling.

During development, avoid real subscription writes and use fixtures for integration interactions. Audit existing environment configuration before running interactive flows, since a local front end can still point at production services.

## Quality targets to validate

These are proposed acceptance targets, not measured results. Select and record representative desktop and phone hardware during the first prototype.

- Target 60 fps on the selected desktop at the default quality level, with a usable 30 fps floor on the selected phone. Record frame time, stalls, and quality settings during traversal and interaction.
- Target a first playable scene within five seconds on a cold load at a defined 10 Mbps connection and 100 ms latency. Begin with a 5 MB compressed transfer budget for entry assets, then validate decoding and GPU upload costs separately.
- Keep name, purpose, and direct navigation usable before the 3D download completes.
- Allow visitors to reach a project, resume, or contact from the initial screen without moving a character.
- Verify focus order, keyboard operation, readable contrast, touch sizing, reduced motion, resize behavior, and input release. Test graphics failure recovery and the text mode directly.

Reduce scene complexity or initial asset size when a target fails. Do not hide slow loading behind an indefinite animation.

## Delivery sequence

1. **Define the experience.** Confirm the setting, preferred camera, audience priority, one representative project, and asset production approach. Produce a visual reference board and a room layout before final asset work.
2. **Prove movement.** Build a temporary local development route with a simple room, camera, collision, one interaction, pause, and a DOM content panel. Validate desktop and touch controls before expanding scope.
3. **Finish one room.** Replace the temporary room with final quality architecture, lighting, materials, one playable exhibit, and optional sound. Measure performance on the chosen devices. This is the decision point for whether the visual ambition and browser constraints work together.
4. **Connect the portfolio.** Add real project and writing content, resume and contact navigation, stable links, loading recovery, and the text navigation mode.
5. **Expand selectively.** Add exhibits only after each has a purpose, content, asset budget, and interaction design. Reuse established controls and visual conventions.
6. **Prepare release.** Verify accessibility, performance, direct routes, integration behavior, asset licenses, and failure states. Review locally, then establish a hosted preview before replacing the production homepage.

The next implementation task is the movement prototype. A whole world, multiplayer, an inventory system, and a large quest structure are outside the initial milestone.

## Decisions still open

- Workshop, research campus, or surreal project world.
- Third person character or closer exploration camera, informed by a playable comparison.
- Primary audience and the first project that best demonstrates the professional twist.
- Custom asset creation, licensed asset adaptation, or a combination, including available time and budget.
- Supported device range and how much of the full scene should run on mobile.
