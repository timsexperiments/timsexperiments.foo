# Game homepage UX audit

Audit date: 2026-10-21. Local server: http://127.0.0.1:4321/. Shared branch: `feat/3d-site-transformation`.

## Scope and evidence

This pass used actual browser interactions, not source review alone. A dedicated T3 preview tab `tab_1b_09004dc4-0001-41b1-86f7-ea319f4aba93` opened successfully, but two snapshot attempts each returned `Preview automation snapshot timed out after 15000ms.` The audit then used a new Chrome computer-use tab `1938492161`. It did not operate parent tab12 or Chrome tab1938492157.

Desktop viewport was 1280 × 800. Narrow viewport was 390 × 844. Narrow tests used a desktop browser viewport override and pointer input. They do not establish real iOS/Android touch, virtual-keyboard, safe-area, or browser-toolbar behavior. No screen reader was used. Contrast, reduced motion, 200% browser zoom, and full WCAG conformance were not verified.

Only `LetterStation.astro` and this document were edited. Cursor owns `CampusHome.astro`, `campus.css`, and `campus-home.ts`; Antigravity owns the campus scene pass; another Codex agent owns robot behavior. No dependencies, delivery scripts, commits, deployment, billing, or message sends were changed or triggered. Screenshot artifacts are in `output/game-ux-audit/`.

The shared server changed during testing. Measurements below identify the earlier arrival layout with “Good ideas start with an experiment.” They are a reproducible baseline, not a claim about Cursor's eventual completed shell.

## Findings in priority order

Retest status: Cursor updated the shell during this audit. The arrival-scroll finding passed the final 1280×800, 390×844, and 320×568 size checks. The sticky dialog header passed the final mobile letter check. The remaining scene input and return-focus findings need owner verification. Keep the baseline reproduction below for regression coverage.

### High: arrival homepage has vertical document scrolling

Location: `src/styles/campus.css:4`, `.campus-page`, `.arrival-copy`, `.lab-directory`, `.lab-footer`; breakpoint overrides at lines 7–14 in the inspected version.

Reproduction: load `/` at 1280 × 800 before entering the room. The document and body measured 855 px high. A real wheel scroll changed `window.scrollY` from 0 to 55. The dock and footer extended below the first viewport. At 390 × 844 the document measured about 905 px high, and a real wheel scroll reached `scrollY = 61.5`. Horizontal document overflow was absent at that mobile width, with `scrollWidth = 390`.

Impact: the entrance behaves as a scrolling landing page rather than the required viewport-sized first-person game. A user can displace the HUD relative to the scene before entering. Evidence: `desktop-arrival.jpg`, `mobile-arrival.jpg`.

Remedy: implement the viewport shell described below. Do not solve this with `overflow:hidden` alone while retaining a taller normal-flow entrance.

### High: mobile-width scene has look input but no visible walk controls

Location: `src/components/campus/CampusHome.astro`, scene controls and exploration HUD; `src/scripts/campus/index.ts:250–280`, `293–344`, `439–444`.

Reproduction: enter the room at 390 × 844. The visible hint still says “Drag to look · WASD to walk · Select a station.” Dragging changes the camera's orientation. The only visible action controls are the station directory and Pause scene. No walk pad, joystick, or forward/back buttons appeared. Source inspection confirms pointer drag changes camera rotation while translation reads keyboard W/A/S/D or arrow keys.

Impact: a phone user can use station shortcuts but cannot walk through the game using visible touch controls. This violates the requested walk/look experience. Evidence: `mobile-exploring.jpg`. Actual touch hardware remains untested.

Remedy: add accessible press-and-hold movement buttons or a left movement pad plus a right look region. Keep station buttons as an equivalent direct route. Label touch instructions appropriately, avoid covering the center raycast target, release movement on pointerup, pointercancel, blur, modal open, and visibility change, and test real touch separately.

### Medium: article exit controls scroll away

Location: `src/styles/campus.css:4`, `.lab-dialog` and `.dialog-topbar`; `CampusHome.astro`, reader dialog.

Reproduction: Recipe shelf → Protobuf article → wheel-scroll inside the article. The reader had 13,981 px of content in a 734 px client area. At `scrollTop = 12000`, the Close button's viewport top measured approximately −11,938 px. The document itself stayed at `scrollY = 0`.

Impact: pointer and touch users must return through a long article to find Close or Back. Escape remains available to keyboard users. This is a usability finding, not a claim that all exit paths are absent.

Remedy: keep a sticky dialog topbar with an opaque background, or separate a fixed dialog header from its scrolling content region. Preserve space for focus outlines and ensure tabbed controls scroll into the content viewport without hiding under the header.

### Medium: raycast-opened dialog closes to an unrelated dock button

Location: `src/scripts/site/campus-home.ts:84–87`, `117–124`, campus `onStation` callback.

Reproduction: enter scene → W → drag look → click workbench monitor in the 3D scene → run comparison → Escape. The dialog closed and focus landed on the Recipe shelf dock button, rather than the scene canvas or workbench. DOM inspection confirmed the active text was `01Recipe shelfRead something. Make something.↗`.

Impact: keyboard continuation loses the scene context after an activity. Directly opening and closing the letter desk from its dock button correctly restored that letter trigger in this pass.

Remedy: record canvas as the return target for scene raycasts. Use the corresponding dock button as fallback when the canvas cannot be focused. For article-to-workbench transitions, keep an explicit origin target rather than a now-hidden reader CTA. Do not restore focus while intentionally switching between modal dialogs.

### Medium: keyboard-only look control is missing in inspected scene code

Location: `src/scripts/campus/index.ts:250–280`, `439–444`.

The actual W hold visibly moved the camera forward. Drag visibly rotated it. Tab escaped from the canvas to Pause scene. Source inspection shows arrow left/right translate laterally, while rotation is pointer-driven. A fully keyboard-only walk-and-look route was not established. This is source-supported missing functionality, not a failed screen-reader test.

Remedy: provide documented keyboard look controls, such as dedicated turn/look keys, while keeping Tab and Shift+Tab available for leaving the scene. Avoid intercepting movement keys when a normal button/link has focus. Verify key release and blur reset before calling this fixed.

## Interaction results

- Desktop scene entry focused `#campus-canvas` and exposed its accessible description. W held for one second visibly advanced the viewpoint. A horizontal pointer drag visibly changed yaw.
- Tab from the active canvas moved focus to `#toggle-scene`. The exploration page measured exactly 800 px high at that point, with `scrollY = 0`.
- Clicking the rendered workbench monitor opened the workbench dialog. This confirms one scene raycast target through actual interaction. Recipe, robot, and correspondence raycasts were not all independently verified.
- Workbench “Run comparison” executed locally and returned JSON 107 bytes, Protobuf 68 bytes, and 3/3 round-trip checks passed.
- Workbench internal wheel scrolling reached about 890 px while page scroll remained zero. Escape closed it.
- Recipe shelf → Protobuf article → “Take this to the workbench” opened the workbench. Its Close button worked.
- Letter dock → letter dialog opened with initial focus on Close. A harmless local draft was entered in the message textarea; Tab moved to `#letter-name`; Escape restored focus to the letter dock trigger. No Copy, email-app action, or Send action was activated.
- The letter stamp was visually inspected at desktop size. It shows the original tilted flask and green droplets inside the retained dotted stamp border. Asset is the unchanged `/favicon.svg`, 36 CSS px wide, intrinsic ratio preserved. The stamp uses a light color scheme so the asset's dark-outline variant remains legible on paper. Evidence: `desktop-letter-stamp.jpg`.
- At narrow width, scene entry and pointer drag worked and the four station shortcuts were visible. The narrow letter test was interrupted by the live shell parse error below, then resumed after a clean reload. See the final retest below.

## Live-edit interruptions, separate from product defects

During the narrow raycast attempt, scene state reset and arrival content reappeared. That click cannot establish a raycast failure because the shared shell was actively changing.

The next narrow letter attempt displayed Astro's error page: `CampusHome.astro:16:82`, `Expected "}" but found "s"`. The inspected station description contained a single-quoted `Ask about Tim's work.` string. This belongs to the active Cursor edit and must be corrected by its owner. The screenshot `mobile-letter-top.jpg` captures this error page, not a mobile letter verification. Do not count it as a persistent delivered-site bug without a clean reload after Cursor finishes.

## Exact shell recommendations for handoff

The invariant is a stationary homepage document at every supported viewport. The game camera supplies spatial movement. Article, directory fallback, help, and form panels may scroll internally.

1. Give the homepage root a dedicated class and size it explicitly. For example, `html.campus-root { height:100%; overflow:hidden; }`, and `.campus-page { position:relative; width:100%; height:100svh; height:100dvh; min-height:0; overflow:hidden; overscroll-behavior:none; }`. Scope this to the homepage so standalone articles retain normal document scrolling. Preserve browser zoom.
2. Make the canvas fill a fixed scene layer. Give HUD regions explicit positions or grid rows within the viewport. Remove the entrance's accumulated normal-flow `vh` margins and the footer/directory flow height. Use `minmax(0,1fr)` for flexible grid tracks and `min-height:0; min-width:0` for their children.
3. Budget header and dock space including `env(safe-area-inset-*)`. Keep the dock inside the same viewport shell in both entrance and exploration states. On narrow/short screens, shorten the welcome copy, collapse secondary descriptions and decorative captions, and offer a compact Directory button that opens a scrollable panel. Do not retain a giant invisible entrance block during exploration.
4. At 320 CSS px and at 200% zoom, move secondary content into accessible internal panels rather than clipping it. Keep Explore, Directory, Contact, and close/help controls reachable. No page-wide minimum width or minimum height may exceed the viewport. A short landscape viewport needs the same treatment as a narrow phone.
5. Keep dialogs independently scrollable: `.lab-dialog { max-block-size:calc(100dvh - 2 * var(--dialog-gap)); overflow:auto; overscroll-behavior:contain; }`, with safe-area-aware gaps. Prefer a sticky topbar or grid header plus `.dialog-content { min-height:0; overflow:auto; overscroll-behavior:contain; }`. Keep native modal semantics, labels, Escape, focus containment, and return focus. Retain local horizontal scrolling for long code/table content.
6. Do not let dialog close code undo the homepage's no-scroll invariant. `document.body.style.overflow = ''` should reveal a stylesheet that still locks only the homepage document. When switching dialogs, avoid intermediate focus restoration and scene resumption. Treat raycast canvas origin, dock origin, and reader transition origin explicitly.
7. Supply visible mobile movement controls and a keyboard look route. The HUD must not intercept empty scene clicks through large transparent layout boxes. Use pointer-events deliberately on HUD wrappers versus their actual controls.

Acceptance checks after Cursor and scene owners finish: hard reload; test 1280×800, 1440×900, 390×844, 320×568, and a short landscape viewport; wheel/touch-scroll the homepage and assert document `scrollHeight <= innerHeight` and `scrollY === 0`; exercise W/A/S/D, arrow keys, keyboard look, Tab/Shift+Tab, pointer drag, mobile movement and release; click each station's actual 3D target; complete shelf → article → workbench → letter without sending; scroll each panel to both ends without moving the page; verify Close remains visible, keyboard focus stays visible and returns to the origin; repeat with reduced motion and 200% zoom. Test real mobile virtual keyboard and dynamic browser toolbars separately.

## Final retest after Cursor's live shell update

The parse error cleared without this audit changing the shell. A clean reload showed the shortened “Tim's Experiments” welcome panel.

- At 390×844, document scroll height was 844 and width was 390. At 320×568, both document dimensions matched the viewport with all four station buttons and the Explore action visible. Evidence: `small-arrival-retest.jpg`.
- At 1280×800, a real wheel-down action left `scrollY = 0`, with document scroll height exactly 800. Evidence: `desktop-arrival-retest.jpg`. These checks support the no-page-scroll requirement at the sampled sizes. They do not establish every viewport or zoom level.
- The mobile letter opened from Start a project and initially focused Close. The original flask was visible inside the dotted border. Evidence: `mobile-letter-verified.jpg`. The dialog measured 810 px high with 1,031 px of content and no horizontal overflow, both client width and scroll width were 352 px.
- Wheel scrolling the mobile letter reached `scrollTop = 221.5` while `window.scrollY` remained zero. Close stayed at viewport top 29 px, then worked and restored focus to Start a project. Evidence: `mobile-letter-bottom.jpg`. This verifies the updated sticky-header pattern in the letter; the long reader still needs a final equivalent check.
- The narrow letter heading visually joins “on” and “your” because a hidden line break has no surrounding whitespace. Low severity, separate from the authorized stamp change. Recommend adding a literal separating space or a breakpoint-aware separator in `LetterStation.astro:2`.
- A transient tiny rendered capture appeared during HMR, although DOM bounds matched the viewport. A clean reload returned the expected rendering. It was not used as a delivered-layout defect.

Viewport overrides were reset after testing. The audit left other agents' files and browser tabs untouched. No full build was run against the actively edited shared tree; the changed stamp markup compiled and rendered through Astro in both tested layouts.
