# 3D site transformation plan

Turn Tim's Experiments into a cinematic, interactive 3D research campus with high quality models and rendering, responsive controls, and practical access to the site's content. The primary purpose is to attract freelance clients and fractional roles, while also supporting applications for employment and project work. Visitors should leave impressed and understand why they might hire Tim.

Status: futuristic research campus and first person viewpoint selected. Individual exhibits and movement mechanics remain open for discussion. Development stays local on `feat/3d-site-transformation` until a preview deployment is wanted.

## Requirements from the design interview

- All professional work presented is software engineering related. The specific software engineering services to emphasize remain open.
- Articles belong within the lab experience. The user proposes physical recipe books on a 3D bookshelf that visitors can pull out and open, or a computer/tablet at a desk for browsing them. These are alternatives under discussion, not a requirement to build every interface.
- Support adding new articles alongside the existing writing.
- All campus experiences are first person, from the visitor's viewpoint. No third person player character is needed.
- Preserve the current website's visual identity and original logo. Recipe books are the article presentation in the lab. A 3D logo should derive from the existing SVG geometry, retaining its recognizable silhouette, proportions, and colors rather than redesigning the mark.
- Add a contact station where typing visibly writes a letter, or appears on a virtual computer. Send should deliver the visitor's message to Tim by email, with a mailbox-slot animation as the preferred physical metaphor under discussion. This is a new delivery capability; the existing contact link must not be mistaken for an email form backend.
- Explore an in-app conversational host using the existing Resume MCP, represented by a small version of Tim or a little robot. The model must run on each visitor's device, with no inference server and no paid inference. Model/runtime feasibility, fallback behavior, and how chat relates to MCP-only experience access need resolution before implementation. Fetching resume evidence from the existing MCP is separate from model inference; the evidence delivery approach remains open.
- WebLLM is the user's intended browser inference approach and the leading candidate for evaluation. Chrome's built-in Gemini Nano Prompt API is a different mechanism and is not the selected direction. Choose a model only after checking its license, download/memory requirements, answer quality, and performance alongside the 3D scene. WebLLM requires compatible WebGPU support; feature detection and a non-generative fallback remain necessary. Reference: [official WebLLM documentation](https://webllm.mlc.ai/).
- Create an interactive universe without a required storyline. Optional minigames and small interactions complement practical site functions.
- Add interactive challenges after articles, with runnable examples that let readers try the concepts themselves.
- Aim for accessibility across the whole site. The relationship between spatial exploration, accessible navigation, and challenge equivalents still needs agreement.
- Keep visitor example execution in the browser as the desired direction. Clarify the required languages and system capabilities before selecting a runtime; a browser playground does not automatically provide a Linux container.
- Use no paid external services or assets. Free tools and downloads, including Blender if useful, are authorized for asset production. Existing AI subscriptions may be used, including Claude Opus when useful and available; no additional paid usage is authorized.
- The user wants substantial useful progress before the next morning's Codex reset. A specific deliverable for that deadline remains to be agreed. Usage consumption itself is not a product acceptance criterion.

The remaining sections are an initial proposal. Camera, asset pipeline, technical architecture, and acceptance targets have not yet been confirmed in the interview. Initial subagents are preparing concrete plans while the design discussion continues. Their proposals do not settle the remaining user decisions.

## Proposed experience

Build a futuristic research campus visitors can explore, with distinct buildings, convincing materials, deliberate lighting, and experiments they can operate. Start with one courtyard connected to a lab entrance and one playable exhibit. Make the environment feel authored through custom models, animation, sound, and consistent interaction feedback.

Use a central arrival plaza to make the campus legible. An experiments lab houses playable projects and writing, and a visitor center provides career information and contact. Give each destination a recognizable silhouette and clear signage. Keep walking distances short and provide direct travel through a persistent destination menu. These spaces are proposed roles for the selected campus setting; expand beyond the first courtyard only after the controls and visual quality work.

### Lab reading proposal

Make each recipe book an entrance to an article. A proposed interaction sequence is approach the shelf, identify a clearly labeled title, select the book, and open its article in a readable HTML view. Pulling out and opening the 3D book is optional animation; reading never requires deciphering text rendered on a tiny in-world page. Reduced motion skips the transition. An equivalent article list exposes the same titles and links without requiring spatial aiming.

A nearby computer or tablet could host the runnable challenges, giving the shelf and workstation distinct purposes. An article's Try it action would open its associated workspace directly, without requiring a walk back to the desk. Preserve direct article URLs and browser navigation. Decide between the shelf, computer catalog, or combined approach before producing their final assets.

The professional twist is that each playable experiment demonstrates an actual engineering idea. For example, visitors could adjust load on a miniature system and see queues form, or change an encoding and see a physical representation of message size. These are proposed interpretations of project topics, not claims about measured project results. Every exhibit should connect the interaction to a real project, article, implementation decision, or lesson.

A short visit should work as well as a long one. Show Tim's name, role, and direct links immediately. Let curious visitors spend several minutes experimenting without making discovery a prerequisite for reading the portfolio.

## First visit

1. Load a lightweight introduction with Work, Writing, Resume, and Contact available as ordinary links while the scene loads.
2. Offer an explicit entry into exploration. Show movement and interaction hints appropriate to the visitor's input device.
3. Place the visitor in the arrival courtyard facing a visible lab entrance and a compelling experiment with one obvious interaction. Give visible and optional audible feedback immediately.
4. Let the experiment reveal a concise explanation with a link to the full project or article.
5. Keep a map or destination menu available for jumping directly to another exhibit or leaving exploration.

Avoid mandatory tutorials, collectible gates, login requirements, and tasks that delay access to professional information.

## Visual direction

Use the current theme as the visual authority: mint primary `#17B897`, rhino neutrals including near-black `#0A0B0A` and off-white `#FAFAFA`, Urbanist display typography, and Inter body typography, as declared in `apps/timsexperiments/tailwind.config.mjs`. Translate these into architectural materials, equipment, signage, recipe covers, and interface controls. Lighting and additional materials may support that identity without replacing its palette. Preserve existing light/dark logo variants.

Create the 3D logo from `src/assets/tim_s_experiments_logo.svg` and its dark variant within the site app. Use restrained extrusion and bevels while keeping the exact front outline and brand color regions. Keep the original SVGs as the canonical header/fallback marks. A mounted sign at the lab entrance is a proposed first use, with no forced logo animation.

Prioritize silhouette, composition, material response, shadow quality, and purposeful animation. Use a small number of detailed focal objects, backed by simpler architecture. Establish a consistent model scale and asset style before producing the rest of the world.

Start with baked environmental lighting and selective dynamic lighting as a candidate approach. Evaluate reflections, shadows, and postprocessing against measured frame time. Asset production needs explicit ownership, licensing, source files, and export conventions. The existing cube can become a recognizable kinetic sculpture in the arrival plaza if it fits the final art direction.

## Camera and controls

Use first person views for exploration and all stations. Camera movement, destination transitions, and optional walking must preserve the visitor's viewpoint. Prototype movement and station framing without producing a third person character. Whether visitors walk freely, select destinations, or use both remains open.

- Desktop: WASD and arrow keys for movement, pointer drag for camera, an interaction key, and Escape to pause or release captured input. Treat pointer lock as an explicit optional mode.
- Touch: large movement and camera controls, a clear interaction action, and tap destinations where precision movement is unnecessary. Keep important content outside the touch control areas.
- Keyboard navigation: reach destinations and open exhibits through semantic controls without requiring precise movement or camera aiming.
- Reading: opening content pauses movement, releases game input, and moves focus into the content panel. Closing restores focus predictably.

Tune acceleration, braking, turn response, camera collision, and interaction distance in a simple courtyard and lab threshold before adding final assets. Prevent input sticking after tab switches. Pause rendering and clear input on lost focus. Avoid camera bob and automatic spinning; provide sensitivity and reduced motion settings. Audio starts only after an explicit action and always has a mute control.

## Content and navigation

Keep project and article text in the existing Astro content system. Give exhibits stable identifiers that map to real routes, so shared links, browser Back, and direct entry work outside the game.

- Work and experiments become playable stations with concise project summaries.
- Writing remains readable on `/lab` and its article routes, with contextual entrances from exhibits.
- Career information gets a visible resume destination. Preserve the existing public MCP integration and its current choice to keep experience stories available through MCP only.
- Contact and subscription remain ordinary accessible controls, with the existing integrations preserved.

### Contact station

Proposed interaction: approach a writing desk, focus a labeled HTML form, and see the same draft appear on a letter in the scene as it is typed. Include name, reply email, subject, and message. The 3D paper is a visual representation of the form state; the actual editable fields and errors remain accessible. A computer terminal is an alternative presentation of the same form, not a second delivery implementation.

Send is an explicit visitor action. Validate before submission, prevent duplicate requests, and distinguish submitting, accepted, failed, and unknown outcome states. A short folding and mailbox-slot animation may accompany submission, but a sent confirmation requires backend acceptance. Preserve the draft and provide recovery if delivery fails. Reduced motion uses an immediate state change. Never imply that acceptance proves inbox delivery or that a draft was sent because an animation finished.

Inspect existing hosting and available free email delivery options before choosing the backend. Keep delivery credentials server-side, send from a verified site identity with the visitor's address as Reply-To, and bound/validate input. Do not introduce a paid service. Use local delivery fixtures during development; do not send test mail to real recipients without an explicit request. This planning requirement does not itself send any message.

Provide a complete text navigation mode when 3D is unwanted or unavailable. A canvas should never be the sole way to find information. Handle reduced motion, loading failure, unsupported graphics, and graphics context loss explicitly.

## Technical approach

Keep Astro as the site shell and content renderer. Build an isolated browser scene using the already installed Three.js dependency, with clear ownership of rendering, input, navigation, assets, and cleanup. Reassess engine choice only if the first playable campus area exposes a concrete limitation.

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

1. **Define the experience.** Develop the selected campus setting and confirm the preferred camera, audience priority, one representative project, and asset production approach. Produce a visual reference board and a courtyard layout before final asset work.
2. **Prove movement.** Build a temporary local development route with a simple courtyard and lab entrance, camera, collision, one interaction, pause, and a DOM content panel. Validate desktop and touch controls before expanding scope.
3. **Finish the first campus area.** Replace the temporary courtyard and lab entrance with final quality architecture, lighting, materials, one playable exhibit, and optional sound. Measure performance on the chosen devices. This is the decision point for whether the visual ambition and browser constraints work together.
4. **Connect the portfolio.** Add real project and writing content, resume and contact navigation, stable links, loading recovery, and the text navigation mode.
5. **Expand selectively.** Add exhibits only after each has a purpose, content, asset budget, and interaction design. Reuse established controls and visual conventions.
6. **Prepare release.** Verify accessibility, performance, direct routes, integration behavior, asset licenses, and failure states. Review locally, then establish a hosted preview before replacing the production homepage.

The next implementation task is the movement prototype. A whole world, multiplayer, an inventory system, and a large quest structure are outside the initial milestone.

## Decisions still open

- First person movement mechanics: free walking, destination selection, or both.
- Specific freelance and fractional services to emphasize, and the first project or article challenge.
- Custom asset creation, free licensed asset adaptation, or a combination.
- Supported device range and how much of the full scene should run on mobile.
- Browser execution capabilities and accessibility expectations for interactive challenges.
- Concrete deliverable before the subscription reset.
- Bookshelf, computer/tablet catalog, or bookshelf plus challenge workstation as the first lab reading interaction.
- Letter-writing desk or computer contact station, and a verified free email delivery path.
