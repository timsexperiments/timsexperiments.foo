# Independent renderer review v2

Reviewed the uncommitted `feat/3d-site-transformation` checkout on 2026-10-21. Verdict: **needs fixes** for three introduced correctness issues below. The module boundaries and current instanced layout pass this bounded review. This is not a physical-mobile performance sign-off.

Only this report was written. No application edits, builds, package changes, commits, pushes, deployments, or new agents. Parent typecheck results are outside this review.

## Findings requiring fixes

### P2: renderer disposal leaves shadow and instance allocations without explicit cleanup

Locations: `src/scripts/campus/index.ts:798-826`, `world.ts:1148-1153`, and `textures.ts:178-183`, relative to `apps/timsexperiments/`.

The controller disposes mesh geometries and materials, but never calls `dispose()` on either new `InstancedMesh`. Their instance matrices are object-owned attributes, outside `geometry.attributes`. Installed Three.js r165 deletes them through the instanced object's `dispose` event in `node_modules/three/src/renderers/webgl/WebGLObjects.js:70-78`. Its renderer-level `objects.dispose()` only resets a WeakMap. Geometry and renderer disposal do not perform that object cleanup.

The change also removes the previous `moonLight.shadow.dispose()`. The shadow render target is outside the scene's mesh traversal. `LightShadow.dispose()` explicitly releases its map and optional map pass; `WebGLRenderer.dispose()` does not replace this call. These resources are left to eventual browser reclamation rather than the controller's promised cleanup, which matters when a canvas/context is reused.

Ownership is also duplicated. `textureRegistry.dispose()` disposes label materials, and the controller immediately disposes those same attached materials again. Loaded GLB geometries/materials follow the same duplicated path through the extra-resource sets and scene traversal. Double disposal alone is not evidence of double GPU deletion, but it makes the cleanup contract unclear.

Reproduction: build the real world with the existing test canvas/Image stubs, attach `dispose` listeners to its geometries, materials and instanced objects, call `world.dispose()`, then execute the controller's set-based traversal cleanup. The fallback-logo scene produced 15 resources with two dispose events and two instanced objects with zero dispose events. This is a lifecycle probe, not a measurement of retained GPU bytes.

Minimal fix: restore shadow disposal, dispose each instanced object, and assign each resource one owner. Keeping ordinary geometry/material disposal in the controller and procedural texture disposal in the registry is sufficient; let the late GLB callback dispose resources that never attach. Add a focused cleanup assertion for the shadow target and both instance objects. No new package or module split is needed.

### P2: the stated framebuffer pixel ceiling is not enforced

Location: `src/scripts/campus/quality.ts:24-38`; related expectations in `campus.test.ts:236-259`.

`Math.max(1, ...)` forces DPR back to 1 when the viewport's CSS area already exceeds the budget. Rounding the candidate to two decimals can also increase it past the ceiling.

Direct calls to the shipped helper returned:

- Desktop 2560x1440 at DPR 2: DPR 1, 3,686,400 pixels against 2,400,000.
- Desktop 3840x2160 at DPR 2: DPR 1, 8,294,400 pixels against 2,400,000.
- Coarse-pointer 2048x2732 at DPR 2: DPR 1, 5,595,136 pixels against 1,350,000.
- Coarse-pointer 400x844 at DPR 3: DPR 2, 1,350,400 pixels against 1,350,000.

Reproduce from the app directory with `bun -e 'import {computeRenderQuality} from "./src/scripts/campus/quality.ts"; console.log(computeRenderQuality({width:2560,height:1440,devicePixelRatio:2,coarsePointer:false}))'`.

The existing test explicitly expects DPR 1 at 2560x1440 and never checks that buffer against the desktop ceiling. The passing suite therefore does not prove the advertised budget.

Minimal fix: allow a budget-limited DPR below 1 and avoid upward rounding, then check the actual floored buffer dimensions. If native CSS resolution is intentionally a minimum, rename/document the ceiling as a soft target instead and accept the resulting GPU cost explicitly. Add cases above the budget at DPR 1 and cases near the rounding boundary. The normal 390x844 phone case already returns the intended 780x1688 buffer.

### P2: the frozen shadow map contains an animated caster

Locations: `src/scripts/campus/index.ts:93-95,182-195,750-752`; `world.ts:973-979,1142-1145`.

The robot's ceramic head casts a shadow, then `world.update()` changes its height and yaw on every normal-motion update. Shadow rendering is disabled after initial/asset invalidation, so the visible head moves while its stored shadow remains at the last baked pose. The static-caster premise in the report and source comment is false for this mesh.

Reproduction: build the world, call `scene.updateMatrixWorld(true)`, record the robot target's casting meshes, call `world.update(2, false)`, and update matrices again. One casting `ExtrudeGeometry` changes its world matrix. Installed `WebGLShadowMap.js:75` skips the shadow pass when both renderer `autoUpdate` and `needsUpdate` are false. Normal world updates do not set `needsUpdate`.

Minimal fix: exclude the animated head from the static shadow bake, retaining the stationary body/base silhouettes. If its moving shadow is required, dirty the map when that caster changes and revise the zero-steady-shadow-pass claim. Keep the existing GLB-load invalidation. Add an assertion that every baked caster remains stationary across normal world updates, or that a moving caster dirties shadows.

## Existing recovery gap, not an introduced regression

`index.ts:633-644` sets `contextLost = true`, stops input/frames and reports failure. No application handler ever clears this flag on `webglcontextrestored`. Three.js restores its own renderer state, but cannot clear the controller's separate flag. `running()` and `invalidate()` continue rejecting work. The shell's `enterLab()` only calls `navigate('arrival')`; it does not reconstruct the controller. Re-entering therefore cannot restart the scene after loss.

This handler already exists in HEAD. The current shell displays a generic fallback-directory message and keeps content reachable, so it is an inherited first-person recovery limitation, not evidence that this patch introduced a failure. A full reload is the available restart path. If same-page recovery is an acceptance requirement, handle restoration by recreating the lost generated environment/shadow resources and resuming the controller, or recreate the controller explicitly. Merely clearing the flag is insufficient for generated render-target contents. A real `WEBGL_lose_context` loss/restore check remains unverified here.

## Checks that passed and remaining implementation limits

- **Caching and geometry equivalence.** Caches are scoped to one world, not shared across controllers. A read-only, in-memory probe transpiled `world.ts` with the four geometry-cache lookups disabled and compared position, normal, UV and index buffers against the real cached world. All 489 mesh records matched exactly for both compact and desktop construction. No current-scene quantization defect was found. Keys quantize to 0.001 while constructors use the first original dimensions, so future near-but-distinct dimensions could become order-dependent; this is a policy to preserve or make explicit, not a reproduced current defect. Shared standard materials are not subsequently mutated by scene construction. GLB materials have separate ownership.
- **Instancing transforms and bounds.** There are 42 tiles and 52 keys. Tile translations reproduce the original seven-by-six grid; keys stay in bench-local coordinates. Expanded box geometry/world positions matched the prior layout at six decimal places. Computed tile bounds were approximately x [-10.485, 10.485], y [-0.0375, -0.0125], z [-7.485, 10.485]. Key world bounds were x [-1.5575, -0.3425], y [1.2175, 1.2325], z [-4.0625, -3.7275]. Both spheres have finite radii. Three.js r165 lazily computes an instanced bounding sphere in `Frustum.intersectsObject`; explicit bounds computation before the first render is not required here because matrices are populated once before rendering. Later matrix edits would require bounds refresh.
- **Async assets.** `alive` gates image/GLB callbacks after disposal, and a late unattached GLB disposes its meshes. The actual dark GLB contains nine meshes and no textures/images, so a hypothetical untracked GLB texture leak is not a current finding. Replacing the SVG fallback disposes its cached geometry directly while leaving its cache entry; that dimension has no other current consumer. Preserve single ownership when fixing cleanup.
- **Scheduling and input wake.** Pure scheduler branches pass. Keyboard movement, pad pointer-down, drag movement, station navigation and resize invalidate immediately, clear an idle timer and request RAF without waiting for the idle interval. Held pad pointers support simultaneous input and release/cancel/capture-loss cleanup; blur/pause clear them. Hover raycasts are limited to about 32ms. Reduced-motion idle schedules no frames; shell pause intentionally blocks movement until resumed. `invalidate()` can still render one frame while paused for explicit navigation/resize/assets, which is consistent with a paused ambient scene. These are source checks, not browser latency measurements.
- **Cadence limits.** A 66ms timeout schedules a subsequent RAF, so 15Hz is a nominal upper target rather than a guaranteed frame rate. The renderer also clamps simulation `dt` to 50ms, so the normal mobile idle interval advances ambient animation slower than wall time. This affects the subtle robot animation; it is not evidence of active-input FPS or GPU time.
- **Controls and shell integration.** `CampusOptions.controlsRoot`, `walkPad` and `walkPadToggle` permit injected controls with document defaults for compatibility. The shell supplies `#lab-main`, which contains both controls. Button names match the movement codes. CSS retains 44px pad buttons, `touch-action:none`, the hidden state and a landscape row. First-person WASD/arrows, IJKL, E/Enter, pointer look, pause, focus release and reduced-motion paths remain present. Dialog shell state pauses the controller. No source-level ref mismatch was found; actual touch hit testing remains unverified.
- **Resize and quality.** Canvas bounds clamp zero sizes, resize recalculates DPR/aspect/FOV, and projection updates. At 390x844, the shipped FOV is rounded to 72 degrees, not 71.95. The light rig, shadow-map size and geometry detail are chosen only at construction. Resizing a desktop-created scene into a compact viewport updates buffer/FOV/scheduling but retains eight point lights and its 2048 shadow map. That is a limit of dynamic tier adaptation, not a phone-rotation regression where coarse-pointer compactness stays true. DPR-only monitor/zoom changes with no resize notification are not independently observed.
- **Original boundaries and identity.** Types, pure quality policy, pure scheduling policy, procedural texture ownership, world construction and canvas/input orchestration have distinct responsibilities consistent with the cube-style approach. Dark GLB/SVG assets, dark scene/background, station views and content navigation remain. No file split based on line count, external abstraction package or feature addition is recommended.

## Performance claims and report corrections

`output/mobile-rendering-v2/metrics.json` records local Chromium observations, including 738 to 159 draws for a particular mobile view and 0 shadow draws after baking. Those counts do not establish GPU execution time, power use, thermal stability or physical-device FPS. I could not independently repeat the browser counters in this review.

The resource counts are structurally plausible. The synchronous fallback-logo world has 489 meshes, 33 casters, 154 receivers, 94 mesh geometries, 50 mesh materials and 19 mesh textures. Including the two Points objects and their shared 64x64 star map yields the reported 96 geometries, 52 materials, 20 textures and 3,132,000 base-level texture pixels. These counts describe that asset phase, not a guarantee after nine GLB meshes replace the fallback. Base-level RGBA estimates omit mip levels, environment and shadow targets, depth/MSAA buffers, driver allocation details and retained CPU canvases. They are not total GPU memory measurements.

Correct these report statements before treating them as verified conclusions:

1. `CanvasTexture` already defaults to `LinearMipmapLinearFilter` in installed r165 through `Texture`'s constructor. Runtime probe returned constant 1008 for both the default and `THREE.LinearMipmapLinearFilter`. Explicitly setting it documents policy; it does not repair previously missing mip filtering. Increased anisotropy, deduplication and resolution changes are separate effects.
2. `antialias:true` requests antialiasing; it does not request or guarantee exactly four samples. Four samples is the recorded local observation. The [WebGL specification's drawing-buffer rules](https://registry.khronos.org/webgl/specs/latest/1.0/#the-webgl-drawing-buffer) explicitly treat antialiasing as a best-effort request. The application caps requested anisotropy by reported capability; eight is likewise not a universal hardware guarantee.
3. Both old and new tile loops contain 42 tiles, not 49. The actual consolidation is 94 individual meshes into two, saving 92 mesh objects. This agrees with 581 to 489.
4. Four mobile point lights are three warm ceiling lights plus the host light. The report's list of retained cyan/gold/green station lights does not describe `index.ts:130-139`. Fewer loop iterations do not prove half of total fragment cost.
5. The sharper 390x844 buffer has about 2.56 times the old pixel count, with antialiasing additionally requested. Fewer draws/shadow passes can help submission cost, but this pixel increase, transparent panes, filtering and sample storage can cost fill rate/bandwidth on mobile. The pixel budget is a useful policy after its enforcement is fixed. No universal smoothness claim follows from the counters alone.

## Evidence and limits

Ran `bun test src/scripts/campus/campus.test.ts` from `apps/timsexperiments`: **5 pass, 0 fail, 109 assertions**. The suite checks scene construction and pure helpers. It does not exercise `createCampus` with WebGL, context recovery, live RAF/timers, disposal completeness or real touch interaction. Additional read-only Bun probes checked the DPR counterexamples, defaults, cache equivalence, instance bounds, animated caster matrices, disposal events and GLB metadata. Canvas/Image stubs do not render pixels or allocate real GPU resources.

Read all six requested renderer modules, campus tests, mobile rendering report, metrics, shell markup/controller/CSS, relevant HEAD diffs, and installed Three.js r165 cleanup/culling/shadow/texture code. A broader HEAD geometry comparison also shows intentional cylinder/detail and book-label changes; cache equivalence above compares cached versus uncached current construction, not an assertion that every old vertex remains unchanged.

The T3 preview opened the existing localhost:4321 service, but two snapshot attempts failed with `Preview automation snapshot timed out after 15000ms.` No browser interaction, new visual inspection, WebGL timing or loss/restore result is claimed. No full build or independent typecheck was run. Physical iOS/Android clarity, sustained frame pacing and thermal behavior remain outside this review.

Fix the three introduced P2 findings and rerun their focused regressions before accepting the renderer changes. Keep the inherited recovery gap visible when stating the final acceptance scope.
