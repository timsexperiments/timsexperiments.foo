# Final integrated local-site audit

2026-10-21. Shared branch `feat/3d-site-transformation`, local site `http://127.0.0.1:4321/`. App code was read-only. This audit writes only this document. No commit, staging, deployment, PR, email, subscription submission, secret-file read, dependency installation, model download, or external message.

## Decision

Core room, articles, serializer, letter draft UI, and deterministic evidence chat work together. One newly exposed integration blocker remains in the embedded articles' newsletter action. The parent should resolve that small integration issue before treating the whole reader as complete. Two medium findings follow. No broad implementation or model search is warranted.

The optional 360M model is not answer-quality ready. Prior validation found no useful representative answers, and the model evaluation recommends evidence-only release behavior. This pass did not repeat inference or change that decision. Direct contact delivery is visibly unconfigured and offers an email-app draft instead. These are known limitations, separate from the new defects below.

## Findings for the parent

### High: embedded article newsletter dialog opens behind the native reader

Locations: `apps/timsexperiments/src/components/campus/CampusHome.astro:78`, `:81`; `src/components/ui/dialog.tsx:34`; `src/components/subscription/dialog.tsx:24`. Paths after the first are relative to `apps/timsexperiments`.

Reproduce: Recipe shelf → Protobuf article → scroll to the newsletter link near the end → click "subscribe to my newsletter". The trigger changes to `aria-expanded="true"`. Radix appends its `[role=dialog]` to `body`, outside `#reader-dialog`. The reader remains a native `showModal()` top-layer dialog. The subscription form is behind it and inert to the user. Focus stays on the article's trigger, rather than entering the form. Screenshot `/tmp/final-integrated-subscription.png` visibly shows only the article after opening; the browser DOM log shows both dialogs and the subscription form's 425×518 bounds. Escape dismissed the invisible Radix dialog while the reader remained open.

This is an integration regression caused by embedding formerly standalone article content. No subscription was submitted.

Minimal remedy: use a campus-specific subscription route that opens a standalone article or a native modal managed by the existing modal switcher. Alternatively, give the Radix portal a container inside the active native reader and verify its focus/close behavior. Keep the standalone article behavior intact. Retest pointer opening, keyboard opening, focus containment, Escape, and return to the reader. The existing trigger is a focusable `span`, so use a native button or link for the campus route instead of retaining its incomplete keyboard semantics.

Evidence log: `/tmp/final-integrated-subscription.log`; focused reproduction script `/tmp/campus-pw-test/final-subscription.cjs`.

### Medium: hidden articles eagerly hydrate subscription widgets on arrival

Locations: `src/components/campus/CampusHome.astro:12`, `:81`; `src/components/Subscribe.astro:5`.

All three articles render into hidden reader content on the homepage. The two newsletter islands use `client:load`, so hiding the article does not defer hydration. The initial T3 snapshot, before opening any article, recorded React, Radix, checkbox, and form-related requests. DOM inspection found two subscription islands with `client="load"`, including one in an unopened hidden article during the reader test. This adds initialization and script cost to arrival despite the widgets being unavailable until much later.

Minimal remedy: avoid mounting interactive article widgets until their article is opened, or use a campus-specific static link for the newsletter action. Changing only CSS or retaining `client:load` under `hidden` will not defer it. Addressing this alongside the modal blocker is preferable to a separate general performance rewrite.

The production build reports a 571.85 kB scene chunk, 151.11 kB gzip, and a 267.12 kB robot host chunk, 78.99 kB gzip. The logo GLB is 2,995.95 kB. These are emitted artifact sizes, not measured cold-load transfer or Core Web Vitals. The scene import is split but starts immediately on arrival. No additional benchmark was run.

### Medium: letter field labels and placeholders fall below normal-text contrast

Location: `src/components/campus/LetterStation.astro:14`, `.letter-signature label`, input/textarea `::placeholder`, and `.letter-actions button[type=button]`.

Computed from the opaque source colors on paper `#eee9d8`: labels `#6f7a67` are 3.71:1, placeholders `#7c8976` are 3.03:1, and Copy letter `#5f705d` is 4.36:1. These use ordinary 10–17px text, below the 4.5:1 normal-text threshold. Entered text `#354237` is 8.70:1. Paper rotation/shadow does not change the specified interior background. This is a source-color calculation, not a complete rendered contrast audit.

Minimal remedy: darken these muted foregrounds enough to reach 4.5:1 on the paper, preserving the existing paper design. The message field also has only a visually hidden label; a short visible label would keep its purpose apparent after the placeholder disappears.

## Actual combined checks

Read all seven requested planning documents and inspected the tracked app diff plus the new campus components, scene/world, shell, chat presentation/host, evidence/GPU/MCP code, serializer UI, contact endpoint/delivery code, styles, and relevant article widgets. The checkout was already dirty; preexisting `output/`, `tmp/`, assets, tools, and implementation files were not staged or edited.

Ran once against the integrated app:

```sh
DATABASE_URL=https://ci-build.invalid \
DATABASE_AUTH_TOKEN=ci-placeholder \
PUBLIC_VIEW_COUNTER_API=http://127.0.0.1:4321/__fixtures/views \
bun run --cwd apps/timsexperiments test

DATABASE_URL=https://ci-build.invalid \
DATABASE_AUTH_TOKEN=ci-placeholder \
PUBLIC_VIEW_COUNTER_API=http://127.0.0.1:4321/__fixtures/views \
bun run --cwd apps/timsexperiments build
```

- Tests: 199 passed, zero failed, 477 assertions across 52 files.
- Build includes Astro check: zero errors, zero warnings, 32 existing hints. Production build completed successfully with ES worker output. Existing chunk-size and Browserslist age advisories remain.
- `git diff --check` passed. No second broad test/check/build run was needed because this audit did not change the app.
- Logs: `/tmp/final-integrated-tests.log`, `/tmp/final-integrated-build.log`.

## Live browser evidence

Started in owned T3 tab `tab_1o_09004dc4-0001-41b1-86f7-ea319f4aba93`. Initial snapshots, article/serializer/contact flow, and actual chat succeeded. Later the same interaction step repeatedly returned `Preview automation click timed out after 15000ms.` Snapshot attempts returned `Preview automation snapshot timed out after 15000ms.` Used the already installed `/tmp/campus-pw-test/node_modules/playwright-core` with a separate headless Google Chrome process for remaining scene and responsive checks. No user tabs were operated. Chrome used Metal WebGL and CDP touch emulation. HMR sockets were closed only in that test context to keep the audit stable.

The Chrome context instrumented only its served copy of the dev scene module to expose camera poses after rendering. The repository and shipped module were unchanged. This made movement/release checks observable without a production debug API.

### Scene and shell

- Visually reviewed the actual dark moonlit room, stars, original flask/logo, bookshelf, monitor workbench, robot, and correspondence desk. The scene is first person, with the room supplying spatial movement and the document staying fixed.
- Independently clicked all four physical targets at desktop size from a fresh arrival pose: shelf at 335,410; monitor at 555,385; robot at 895,430; letter desk at 1030,400. Each opened the correct native panel. Escape restored `#campus-canvas` after each scene-origin interaction.
- Native keyboard W moved camera z from 7.6 to 6.59992. Position stayed unchanged after release. J changed yaw to 0.375 radians. Tab moved focus to `#toggle-scene`.
- At 390×844, Chrome CDP touch held Walk forward and advanced z from 2.4 to about 1.4. Release removed every `.is-held` state and subsequent camera poses stayed stable. This is emulated touch, not physical-device evidence. The prior scene-controls document covers the broader multi-touch/reset matrix; it was not duplicated here.
- Reduced-motion reload initialized "Resume scene". Entry snapped to the arrival pose and remained stable over the sampled interval. CSS disables campus transitions/animations under the preference.
- Desktop 1280×800 measured document size 1280×800 and scrollY zero. At 390×844, 320×568, 844×390, and 640×400, document dimensions exactly matched the viewport, with zero page scroll before and after real wheel input. All four station panels opened at every sampled responsive size without horizontal panel overflow; close controls stayed inside the viewport.
- 640×400 supplies the CSS layout/reflow dimensions of a 1280×800 browser at 200% zoom. Actual browser zoom and 200% text-only enlargement were not exercised. This is not a claim that they passed.

### Article, workbench, and letter

- Shelf → Protobuf article worked. Real wheel input moved the reader to scrollTop 6000 while document scrollY stayed zero. Close stayed visible at about y=38 in the sampled desktop state.
- Article → Open workbench switched panels. Run comparison returned JSON 107 bytes, Protobuf 68 bytes, and 3/3 round-trip checks. Escape and the directory then reached the letter desk.
- Letter desk displayed the original `/favicon.svg` flask stamp. The delivery note honestly said direct delivery is not connected. No delivery, email-app action, clipboard action, or subscription submission was activated. Existing contact unit tests use injected/mock delivery and were included in the combined pass.
- Mobile field focus and reduced-height layouts were exercised. Chat input bottom was about 775px at 390×844, 499px at 320×568, and 331px at 640×400. Real mobile virtual-keyboard resizing, dynamic browser bars, and safe-area hardware behavior remain unverified.

### Actual chat

- Sent `What platform architecture has Tim led?` through the actual same-origin public MCP endpoint. It returned a deterministic platform summary and five source records.
- Expanded the Included Health practitioner source. Full details, dates, source ID, and qualifications distinguished five service lines from tens of processes.
- Sent `Tell me more` as the second turn. It retained the architecture topic and returned five records, including additional related material. Two visitor turns and ten source cards were present. The summary repeated; this is bounded topic-aware retrieval, not general conversational reasoning.
- While the older expanded source stayed in view, New reply appeared for the later response. Options → Clear removed all turns, restored the greeting, emptied the input, and focused the textarea.
- No worker, model-host, or WebLLM resource requests occurred on the tested evidence-only path. The inference bundle is emitted at build time, 6,194.12 kB, but the Worker constructor stays inside explicit enable. Source inspection found no evaluation fixture import in the production graph.

## Source review of performance and boundaries

Scene animation stops on pause, hidden document, window blur, context loss, and disposal. Input reset paths clear held keys/pointers. Disposal aborts the scene listener controller, disconnects resize observation, disposes scene textures/geometries/materials, shadows, environment, and renderer. World asset callbacks check whether the world is still alive. These are source findings plus the movement/pause observations above, not a heap or GPU leak measurement.

Chat cancellation increments its run token, aborts retrieval, terminates the worker, clears its deadline, and prevents a canceled result from replacing current output. The presentation observer has a destroy path on Astro swap. Serializer custom-element disconnection aborts its event listeners. No obvious unbounded render loop or active-worker leak was found in this bounded review. Long-session heap profiling and back-forward-cache lifecycle behavior were not tested.

Evidence is schema-validated and size-bounded. Chat renders retrieved/visitor text through DOM construction and `textContent`. External evidence links require HTTPS without embedded credentials and use `noopener noreferrer`. The MCP destination and tool are fixed, same-origin and read-only. Contact credentials are server-side configuration, not public browser variables; inspection did not read their values. No new unsafe content evaluation, public secret exposure, or accidental model-evaluation import was found in the inspected code. This is not a full security audit.

## Accessibility limits

Native named dialogs, named station shortcuts, labeled fields, keyboard exit/focus restoration, visible focus, 44px walk controls, reduced-motion startup, and sampled reflow were checked. No screen reader, full tab-order sweep, complete contrast inventory, physical phone keyboard, actual 200% browser zoom, or full WCAG conformance assessment. The newsletter modal and letter contrast findings must remain open despite the green test suite.

## Artifacts

- Final scene: `/tmp/final-integrated-scene.png`.
- Mobile scene: `/tmp/final-integrated-mobile-scene.png`.
- Mobile chat: `/tmp/final-integrated-mobile-chat.png`.
- Actual two-turn chat with expanded source: `/Users/tim/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-mvhwc11b-c734d0a6.png`.
- Desktop arrival-pose scene: `/Users/tim/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-mvhwalz1-05d5ad59.png`.
- Subscription blocker: `/tmp/final-integrated-subscription.png`.
- Browser log/script: `/tmp/final-integrated-browser.log`, `/tmp/campus-pw-test/final-audit.cjs`.

Screenshots listed above were opened and visually inspected, except the mobile scene artifact, whose behavior was measured in the browser log. All temporary Chrome processes created by the audit closed in `finally` blocks. The existing local server was left running.
