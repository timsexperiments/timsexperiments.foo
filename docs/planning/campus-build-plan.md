# Campus prototype coding plan

Revised 2026-10-21 on `feat/3d-site-transformation`. This is a dependency-ordered implementation proposal following the native planning round. This research continuation changes only this file. It does not authorize installation, application edits, servers, deployment, or production requests during planning.

## Scope and reconciliation

Build a local `/campus` route with an authored courtyard, one lab threshold, a serialization bench, and two accessible destination controls. Preserve `/` and existing article URLs. The first useful coding result is a static, usable route, followed by a disposable procedural scene. Custom assets and edited-code execution follow separate gates.

The confirmed direction is a cinematic futuristic research campus with high quality models and rendering, practical accessible content, browser article challenges, and no additional paid tools, services, or assets. The scene must support the professional purpose without inventing client results or republishing MCP-only career stories.

Reconcile the three plans as follows:

- Use the courtyard, pavilion, and Serialization bench from `campus-experience.md`. The earlier suspended packet apparatus becomes the bench's byte visualization, rather than a competing exhibit.
- Recommend destination camera poses for the reversible prototype. First person is now confirmed throughout; destination poses must preserve the visitor viewpoint. Character rigs, walking physics, and collision do not block testing composition or useful navigation.
- Use `message-packing-lab` as the stable challenge ID and `/lab/json-vs-protobuf#challenge` as its canonical destination, as proposed in `article-playgrounds.md`. "Serialization bench" is the visible campus label, not a second challenge ID.
- Implement bounded structured data with a trusted serializer before arbitrary JavaScript. The later QuickJS Worker is the playground plan's recommendation, not a verified or selected installed runtime. Both modes must use the same schema, encoder, checks, and textual results.
- Preserve scene destination history using a small hash adapter. This adopts the experience plan's Back/direct-entry requirement and supersedes the earlier build plan's suggestion to postpone all scene history. Full articles still use ordinary page links.
- Keep the first challenge on its article page. An inline campus form is a later integration task using the same component and result contract, not a prerequisite for proving the courtyard.

Camera preference, service copy, mobile scene scope, runtime languages, and the deliverable before the next reset remain open. These recommendations do not settle them.

## Evidence and limits

This continuation read `CONTEXT.md`, `docs/3d-site-transformation.md`, all three plans and `docs/planning/README.md`. That README still labels the native planning agents as running; this continuation treats their returned documents as proposals and does not update their status file.

Source inspection also covered root and site `package.json`, `bun.lock`, root `README.md`, and these paths under `apps/timsexperiments/`:

- `astro.config.ts`, `src/pages/index.astro`, `src/layouts/BaseLayout.astro`, `src/components/BaseHead.astro`, `src/styles/global.css`.
- `src/scripts/cube/main.ts`, `src/scripts/cube/worker.ts`, `src/scripts/count_view.ts`.
- `src/layouts/BlogPost.astro`, `src/pages/lab/[...slug].astro`, `src/content/config.ts`, and the `Person` schema/sample in `src/content/blog/json-vs-protobuf.mdx`.
- `src/components/home/Contact.astro`, `src/db/config.ts`; source searches located subscription writes and unsubscribe behavior.

The existing homepage uses fixed sections and scroll transforms. The cube starts a Worker at module evaluation, forwards global input, and has no exposed disposal path. Do not import or repair it for the campus slice. `BaseLayout.astro` adds scrolling behavior and Google fonts. `BaseHead.astro` also requests Google fonts, so reusing it does not meet a local-only loading goal. The article layout runs `count_view.ts`, which immediately calls the configured view-counter API. Article MDX contains subscription controls.

The app declares Astro 5.12.8 and Three.js `^0.165.0`; `bun.lock` resolves Three 0.165.0 and the cube package 0.1.2. Root and app `node_modules` are still absent at this inspection. Installed Three support and its browser renderer have not been verified. The main plan's phrase "already installed" must not be used as proof of runtime readiness.

The prior native inspection reported Bun 1.4.2, Node 24.22.0, Python 3.14.5, arm64, and 64 GiB memory. It found no Blender, gltf-transform, or toktx command, no Blender app at the checked locations, and no repository GLB/GLTF/BLEND assets. These are prior inspection findings, not newly executed tool/version checks. No GPU benchmark, browser test, build, installation, model export, license audit, or external documentation refresh was performed in this continuation.

## Ownership and contracts to land first

All `src/` and `public/` paths below are relative to `apps/timsexperiments/`. `tools/campus/` and `assets/campus/` are repository-level. Assign one writer to each file. The integration owner alone coordinates shared schema, package, lockfile, and article attachment edits. These are future coding roles, not additional agents authorized by this research task.

The integration owner creates `src/lib/campus/contracts.ts` and `src/lib/campus/destinations.ts`. They own scene IDs, the controller interface, destination URL parsing, and the mapping from bench action to challenge ID. The playground owner creates `src/lib/playgrounds/contracts.ts` and `src/lib/playgrounds/registry.ts`. They own challenge IDs, definition versions, validated payloads, result states, and canonical article targets. Imports must have no Worker, renderer, network, or DOM side effects. The scene imports types only from the playground contract; it never imports the runner, encoder, registry implementation, or UI.

Required controller behavior:

- `createCampusController` accepts an owned host element, initial destination, reduced-motion preference, quality tier, cancellation signal, and callbacks for destination completion, exhibit activation, and graphics failure. It returns a controller with `selectDestination`, `setChallengeResult`, `pause`, `resume`, and idempotent `dispose`.
- Scene destination IDs are `arrival` and `serialization-bench`. `selectDestination` accepts immediate placement for reduced motion and Skip movement. Selection cancels the previous transition. Destination completion callbacks do not write history themselves.
- Canvas bench picking calls `onActivateExhibit` with `message-packing-lab`. The route adapter handles the same action as the semantic HTML link. The renderer never opens URLs, owns focus, or executes code.
- `setChallengeResult` takes a completed, validated result or an explicit clear state. Results include challenge ID/version, run ID, actual JSON and Protobuf byte counts, and named round-trip checks. Error, running, cancelled, and completed are distinct states in the playground contract. Only completed current-run results affect ribbons; never manufacture byte counts to animate a placeholder.
- The DOM adapter owns state announcements, links, focus, and history. The playground owns Worker lifetime and validates external Worker messages as unknown data. A future inline adapter subscribes to that validated state and forwards completed results, without exposing source code or interpreter handles to the scene.

Use `/campus#arrival` and `/campus#serialization-bench`. Unknown hashes resolve to Arrival. Read the initial hash before scene initialization. User destination selection pushes history once; `hashchange` restores the view without another push. A selection while unloaded updates the pending destination. A failed renderer cannot break the semantic destination content or article link.

## Dependency-ordered coding tasks

### T0. Establish a safe local baseline

Owner: integration. Dependencies: none. No application changes yet.

Inspect package scripts, build hooks, and integration imports before installation or execution. Install the existing lockfile only in the later authorized coding phase, then record the site check/build/test baseline. Resolve Three from the app workspace. Do not upgrade it or add an engine for the first scene.

Use README's build-only database placeholders and loopback view-counter configuration. Audit configuration keys and destinations without printing secrets. Do not browse articles or `/` until request blocking or local fixtures are ready. An unset view-counter variable is not proof that a client cannot reach a default remote endpoint.

Done when dependencies resolve, baseline outcomes and pre-existing failures are recorded, and the browser verification session can allow only loopback requests. If installation or resolution fails, report the exact command/error before expanding scope. T1 can still be authored while verification is blocked.

### T1. Freeze the small integration contract

Owner: integration with playground review. Depends on: source inspection; T0 is required to type-check.

Create only `src/lib/campus/contracts.ts`, `src/lib/campus/destinations.ts`, `src/lib/playgrounds/contracts.ts`, and `src/lib/playgrounds/registry.ts`. Playground owner supplies the latter two; integration owner supplies the campus files. Implement the contract above with discriminated result states and a single definition of challenge identity. Registry initially contains metadata, not runtime imports.

Done when both owners can consume the contract without circular imports, unknown destination hashes have a documented fallback, and importing metadata starts no execution. Add focused tests for history parsing and result validation where malformed or stale data matters. Do not create a general event bus or plugin system.

### T2. Deliver a useful static `/campus`

Owner: route/integration. Depends on: T1. This is the smallest reviewable application slice.

Create `src/pages/campus.astro`, `src/layouts/CampusLayout.astro`, and `src/components/campus/CampusExperience.astro`. The thin layout owns its metadata and local stylesheet/font references. It may import `src/styles/global.css`, but must not import `BaseLayout`, `BaseHead`, homepage components, cube scripts, scroll animation, view counting, subscription UI, or database code. Use local Atkinson fonts if needed.

Show Tim's identity, Writing at `/lab`, Experience at `/resume/mcp`, and a mailto link using `CONTACT_EMAIL` from `src/consts.ts`. Use plain factual copy until services are chosen. Include a skip link, two semantic destination anchors, a bench description, and a working link to the existing article. Until T5 lands, label it "Read the article" and omit a claim that its challenge exists. Add Explore, Pause, Exit, status, and fallback markup without importing Three on page load.

Done when the page is useful without JavaScript or graphics, at 320 CSS pixels and enlarged text, and its import chain has no production integration. No link or navigation change on `/` is required to discover this local route.

### T3. Prove a disposable procedural scene

Owner: scene. Depends on: T1 and verified Three from T0. Can proceed independently of T2 once the contract exists.

Create `src/scripts/campus/controller.ts`, `src/scripts/campus/world.ts`, and `src/scripts/campus/camera.ts`. Use one normal browser canvas, procedural terrace/pavilion/bench geometry, one directional shadow light, restrained fill, and authored Arrival/bench poses. Use approximate 24 by 18 meter bounds to test composition. Implement bounded drag inspection, picking, resize, low/default quality, pause/resume, reduced motion, and transition cancellation. No character, pointer lock, physics engine, external environment map, or GLB is needed.

The controller owns one frame loop, listeners, observers, geometries, materials, textures, render targets, and renderer. Dispose shared resources once; disposing a material does not dispose its textures. Cancel frames, disconnect observers, release pointer capture, clear input, and dispose the renderer. Avoid PMREM until needed; if introduced, track its generator and output target separately.

Done when focused lifecycle/camera tests cover cancellation, repeated disposal, and teardown after partial initialization. Real GPU cleanup still requires T4 browser checks. Keep the apparatus static until real challenge output is available.

### T4. Wire scene entry, history, and recovery

Owner: route/integration. Depends on: T2 and T3.

Create `src/scripts/campus/element.ts` and wire it from `CampusExperience.astro`. Dynamically import the controller only after Explore. Model unloaded/loading/ready/failed/disposed states. Disconnect, Exit, and page navigation cancel initialization; dispose any controller that finishes after cancellation. Re-entry creates one fresh instance.

Own hash navigation, location announcements, Skip movement, blur/visibility behavior, and context-loss recovery. Stop camera input while a DOM control is active. Pause when hidden; returning to the tab must respect a deliberate user pause. Escape releases camera interaction. Do not add an article modal for this slice.

Done when ten enter/pause/resume/exit cycles have one canvas and at most one active loop, direct hashes and Back work, and failed WebGL/context loss preserve all useful DOM actions. Verify with JavaScript disabled, reduced motion, keyboard, touch viewport, resize, and rapid double Explore/Exit. This is the first scene demonstration gate; final assets and a runtime are not prerequisites.

### T5. Add the independent trusted serialization challenge

Owner: playground. Depends on: T1, T0; does not depend on T3/T4.

Create `src/components/playgrounds/ArticleChallenge.astro`, `src/scripts/playgrounds/element.ts`, `src/lib/playgrounds/person.proto`, `src/lib/playgrounds/generated/person.js`, `src/lib/playgrounds/generated/person.d.ts`, `src/lib/playgrounds/serialization.ts`, and `src/lib/playgrounds/serialization.test.ts`. Extend the registry with instructions, defaults, solution, limits, and named checks. Use the article's exact name/age/email/hobbies field numbers and types. Validate bounded inputs including signed int32 age and non-ASCII text. Compute UTF-8 JSON and real Protobuf bytes and compare decoded supported values. Label the exercise as structured-data editing; arbitrary code remains disabled.

The integration owner alone edits `src/content/config.ts`, `src/layouts/BlogPost.astro`, and `src/content/blog/json-vs-protobuf.mdx`. Add an optional validated challenge ID, render the component after article prose with `id="challenge"`, and reject unknown IDs during the content/build path. Existing `src/pages/lab/[...slug].astro` already spreads post data into the layout; change it only if a concrete integration need appears. Do not alter other articles or historical benchmark claims.

If adopting protobuf.js generation, first choose and record exact free generator/runtime versions and licenses. Integration owner alone changes `apps/timsexperiments/package.json` and root `bun.lock`. Commit generated outputs and document a reproducible generator command. Runtime visitor requests must use bundled local assets and never invoke a remote generator.

Done when the emoji sample round-trips, invalid age and malformed input recover, actual byte counts are textual, Reset works, the article is readable without JavaScript, and the challenge works without a canvas. Verify article browsing only with the production-request controls below. Runtime dependency changes belong to this task, not T0's frozen install.

### T6. Connect the bench to the real challenge

Owner: integration. Depends on: T4 and T5.

Update only campus mapping/UI files owned by integration. Both HTML activation and canvas picking open `/lab/json-vs-protobuf#challenge` through the same adapter. Keep ordinary link behavior, direct entry, and Back. No Worker or challenge package enters the scene bundle.

Done when the same destination is reachable from text mode and 3D, and article reading initializes neither Three nor a challenge runtime. This completes the minimal connected prototype.

### T7. Prove edited JavaScript separately

Owner: playground; integration owns package/lock changes. Depends on: T5. Optional for the first visual gate, required before claiming editable code execution.

Add `src/scripts/playgrounds/runner.ts`, `src/scripts/playgrounds/worker.ts`, and `src/scripts/playgrounds/protocol.test.ts` plus runner tests. Pin and self-host a synchronous QuickJS WASM build after verifying its exact API/license. Create a fresh interpreter runtime per run in a disposable Worker. Expose no host network, filesystem, DOM, storage, imports, or timers. Share T5's trusted bounded-data serializer; never execute returned guest functions in the host.

Start from the playground plan's proposed 64 KiB source, 32 MiB guest allocation, two-second execution deadline, 16 KiB output, bounded stack, and one active run. Set a separate initialization timeout. Validate messages, check run IDs, enforce guest interrupt limits, and terminate on Stop, Reset, replacement, or navigation. Test actual bundled WASM/Worker delivery and CSP without enabling native eval or adding site-wide COOP/COEP. These proposed limits are not browser-process quotas.

Done only after real-browser syntax-error, infinite-loop, memory/output exhaustion, stale-result, cancellation, and capability-denial cases pass and a subsequent valid run succeeds. If exact pinning, bundling, or policy fails, keep T5 available and edited-code mode disabled. WebContainers, Python, Linux/container claims, and package-manager UI are outside this gate.

### T8. Mirror results in an optional inline bench

Owner: integration for `CampusExperience.astro` and `element.ts`; playground for component adapter; scene for result rendering. Depends on: T6; T7 only if exposing code editing.

Mount the same ArticleChallenge component at the campus bench if inline interaction is still wanted. Forward only validated completed current-run results through `setChallengeResult`. Use labeled JSON/Protobuf ribbons with relative lengths derived from actual bytes. Inputs, errors, checks, and complete results remain HTML. Clear visual results on Reset and stale runs. Pause camera input while editing; a modal, if chosen later, must add focus restoration and Escape handling.

Done when article and campus checks agree for identical input, no second implementation computes challenge results, and graphics failure preserves the full learning task. Cross-page draft persistence is deferred; no storage service is needed.

### T9. Replace one focal object with authored assets

Owner: asset for repository `tools/campus/`, `assets/campus/`, and app `public/models/campus/`; scene owner alone for `src/scripts/campus/assets.ts` and controller integration. Depends on: T4 composition review. Not a blocker for T5/T6.

Start with the pavilion or bench, not the whole campus. Install free official Blender only when this task begins. Record the version, then create `tools/campus/build_assets.py`, editable `.blend` sources, GLB exports, and `assets/campus/manifest.json`. Use meters, consistent pivots, applied transforms, named metallic/roughness materials, and repeatable geometry. Retain author/source/license/attribution/modification records for any downloaded asset. Free access does not establish redistribution rights.

First export an uncompressed GLB and verify it in the installed Three 0.165.0 loader. Proposed export command, after the script exists: `blender --background --factory-startup --python tools/campus/build_assets.py`. Exporter arguments must match the installed Blender version. Manifest records versions, object/material/triangle counts, paths, and notices. Asset failure leaves procedural geometry usable. A late load after disposal must release its resources.

Done when browser review confirms silhouette, scale, seams, normals, roughness, shadows, and the closest camera view, with before/after transfer and frame measurements. Add compression/transcoders only after a measured need. Blender, gltf-transform, toktx, external texture libraries, AI mesh generation, baked-lightmap tools, bloom, reflections, and transmission are asset or quality options, not first-scene dependencies. High quality remains a later measured visual gate; procedural completion alone does not establish it.

### T10. Review the local milestone

Owner: integration. Depends on: T6 for connected prototype; T7/T8/T9 only for the capabilities claimed in that review.

Run the checks below, record screenshots and measured limits, and list remaining failures. Keep every route local. Replacing the homepage, changing deployment settings, adding services, and publishing require separate implementation scope. Do not infer release readiness from a successful build.

## Validation commands for the coding phase

Run from repository root unless shown otherwise. These commands were not run by this research continuation.

```sh
bun install --frozen-lockfile
(cd apps/timsexperiments && bun -e 'console.log(import.meta.resolve("three"))')
DATABASE_URL=https://ci-build.invalid DATABASE_AUTH_TOKEN=ci-placeholder PUBLIC_VIEW_COUNTER_API=http://127.0.0.1:4321/__fixtures/views bun run check
DATABASE_URL=https://ci-build.invalid DATABASE_AUTH_TOKEN=ci-placeholder PUBLIC_VIEW_COUNTER_API=http://127.0.0.1:4321/__fixtures/views bun run build:site
DATABASE_URL=https://ci-build.invalid DATABASE_AUTH_TOKEN=ci-placeholder PUBLIC_VIEW_COUNTER_API=http://127.0.0.1:4321/__fixtures/views bun run test --filter=apps-timsexperiments
```

After adding the proposed tests, run the affected subsets from the app workspace before the full site checks:

```sh
bun test src/lib/campus src/scripts/campus
bun test src/lib/playgrounds src/scripts/playgrounds
```

Only after auditing configuration and preparing browser request controls, a later coding owner may start the local server:

```sh
DATABASE_URL=https://ci-build.invalid DATABASE_AUTH_TOKEN=ci-placeholder PUBLIC_VIEW_COUNTER_API=http://127.0.0.1:4321/__fixtures/views bun run dev
```

The fixture URL above is a proposed local target, not an existing endpoint. Intercept it and fulfill an appropriate fixture response, or report its absence; do not let it fall back to production. Before the first article navigation, allowlist only loopback network destinations, block external requests including fonts and view tracking, and intercept subscription/unsubscribe routes. Never submit a real subscription or visit unsubscribe URLs with real addresses. Contact verification checks hrefs without sending email. This session-level request control avoids changing the homepage or global integration code. Record intentional blocked requests separately from genuine runtime failures. Build placeholders do not make an arbitrary `.env` configuration safe, and do not configure a working service.

Before any browser claim, record browser/version, viewport, DPR, hardware, quality tier, and network profile. Check actual Worker/CSP behavior in the browsers claimed as supported. If request interception is unavailable, restrict browser work to the audited isolated campus import chain and report article verification blocked until a safe local fixture or equivalent request control exists.

## Completion checks and proposed budgets

These are targets, not measurements. Use a local test report owned by the coding integrator; no report is claimed here.

- Before Explore, identity, Writing, Experience, Contact, and bench/article actions work without Three. No homepage, global navigation, cube, subscription, resume evidence, deployment, or production integration change appears in the diff.
- Verify direct hashes, destination Back behavior, article direct entry, unknown hashes, failed WebGL, context loss, resize, blur, hidden tab, cancellation during initialization, and ten lifecycle cycles. One entered scene has one renderer and at most one active loop. Inspect listeners/resources as well as `renderer.info.memory`; counters alone do not prove absence of leaks.
- Keyboard-only users reach all useful content and challenge actions without aiming or dragging. Test focus visibility, labels, announcements, reduced motion, pause, 320 CSS pixels, 200% text, and a screen reader. A narrow viewport is not a real-phone GPU test.
- Capture at 1440×900 and 390×844. Review composition, typography, occlusion, material response, seams, and shadows. User visual review remains necessary before calling the art direction successful.
- Start at 150k visible triangles and 100 draw calls maximum, DPR cap 1.5, shadow map 1024. Low tier disables shadows and caps DPR at 1. Measure Arrival and the closest bench view.
- Propose 5 MB compressed entry transfer and first scene ready within five seconds at 10 Mbps/100 ms cold load. Report entry assets, optional challenge runtime, and later model loads separately; measure combined cost when embedding an inline challenge.
- Target desktop 60 fps with p95 frame interval at most 20 ms over 30 seconds of transitions/bench interaction. Target real-phone 30 fps with p95 at most 40 ms. Record stalls; these values do not guarantee every frame meets the nominal rate. Select representative hardware before judging acceptance.
- T5 must pass the emoji round-trip and invalid-input cases. T7's real interpreter tests must pass before enabling edited code. No challenge-triggered external requests may occur after local initialization. Such tests are regression evidence, not a security audit.
- Report exact check/build/test failures and separate baseline failures from regressions. No browser, accessibility, performance, or graphics claims may be inferred from source inspection or Bun tests alone.

## Blockers and unresolved choices

No additional user answer blocks writing T1/T2 or a procedural T3. Actual build/browser verification currently lacks installed dependencies. Only the later coding owner can perform T0 within its authority. Blender absence blocks authored GLB production, not the procedural scene. Exact QuickJS/protobuf package pins, license notices, bundling, Worker response policy, and device behavior remain unverified technical gates.

Service positioning, first person movement mechanics, default still-versus-live arrival, mobile graphics scope, equivalent learning access expectations, desired runtime languages, and the reset deadline deliverable remain product choices. Use factual copy, explicit Explore, destination navigation, equivalent HTML results, and trusted structured data as reversible defaults. Do not add a physics engine, paid runtime, remote GPU pipeline, or production deployment to resolve these choices.

Escalate with the exact failing command/path, observed error, and dependent task if installation cannot resolve Three, safe local request controls cannot be established, the chosen free runtime fails its real-browser limits, or a required asset's redistribution rights cannot be verified. Keep independent static/content work moving. This continuation encountered no blocker to completing this planning document and performed no runtime validation.
