# Mobile 3D rendering v2

Implemented locally on `feat/3d-site-transformation`, starting at `52edd372`, for [PR 38](https://github.com/timsexperiments/timsexperiments.foo/pull/38). Owned paths: `apps/timsexperiments/src/scripts/campus/` and `docs/planning/mobile-rendering-v2.md`. No commits, pushes, deployments, package installations, or delegated agents.

The independent review found three introduced correctness defects. They are repaired in [renderer-review-fixes-v2.md](renderer-review-fixes-v2.md). Browser counters and screenshots below are historical observations from the initial v2 pass, before these repairs. Focused regression tests and a campus-only TypeScript check validate the repairs; the integration agent owns current whole-app build and browser verification.

## Diagnosed causes of mobile blur and jank

1. **Sub-native drawing buffer and disabled antialiasing on mobile**:
   - `index.ts` created `THREE.WebGLRenderer` with `antialias: !mobile` (`0` MSAA samples) and capped mobile pixel ratio at `Math.min(window.devicePixelRatio, 1.25)`.
   - On a `390 × 844` (`devicePixelRatio = 2`) mobile viewport, the WebGL drawing buffer rendered at **`487 × 1055`** (`513,785` pixels, `1.2487` effective DPR) with zero hardware antialiasing. On `320 × 568`, it rendered at **`400 × 710`** (`284,000` pixels). Thin geometry edges (window mullions, book spines, desk trims, and 3D logo bevels) aliased and upscaled softly.
   - `resize()` updated `renderer.setSize(...)` and `camera.aspect` only; it never updated `renderer.setPixelRatio(...)` or `camera.fov` when rotating or resizing.
2. **Narrow portrait horizontal field-of-view compression**:
   - A fixed `66°` vertical FOV on a `390 × 844` portrait viewport (`aspect = 0.462`) narrowed the horizontal FOV to `~34°`, cropping peripheral stations and exaggerating perspective stretch near viewport edges.
3. **530 shadow-map draw calls every frame and opaque window-pane shadow bug**:
   - `mesh()` in `world.ts` set `castShadow = true` and `receiveShadow = true` unconditionally on **577 of 581 meshes**—including 52 individual keyboard keys, 42 flat floor tiles, 216 plant sub-meshes, 120 book sub-meshes, and all `label()` text planes.
   - The three `19.2m × 4.1m` north window glass panes (`z = -7.48`) also had `castShadow = true`, casting a solid shadow that blocked `moonLight` (`z = -16`) from shining into the lab.
   - Because `renderer.shadowMap.autoUpdate` remained `true` (default), Three.js re-rendered **530 shadow-map draw calls (`72,270` shadow triangles)** on every single frame, although most architecture and station casters are static. The robot head animates and is excluded from the frozen bake after the review repair.
4. **Unbatched repeated geometry and zero `BufferGeometry` sharing**:
   - Every call to `box()`, `cylinder()`, `rounded()`, and `label()` allocated a fresh `BufferGeometry` (**581 unique geometries for 581 meshes**).
   - The 42 terrazzo floor tiles (`7 × 6` grid) and 52 mechanical keyboard keys were individual `THREE.Mesh` objects, adding 94 separate meshes before batching; actual draws depend on pass visibility.
5. **Duplicate `CanvasTexture` allocations and missing anisotropic filtering**:
   - The 24 recipe-shelf books generated 24 separate `1024px`-wide `CanvasTexture` instances (`36` total scene textures totaling `8,118,368` base-level pixels / `30.97 MiB` estimated base RGBA bytes), even though they cycled through 7 cover titles.
   - `CanvasTexture` already defaults to `LinearMipmapLinearFilter` in installed Three.js r165. `label()` requested `anisotropy = 4`; the workbench monitor and fallback logo left it at 1. Higher anisotropy is a separate change intended to improve oblique readability, subject to hardware capability.
6. **Distant scene haze and glass material overhead**:
   - `THREE.Fog(0x070c0b, 38, 102)` and a `MeshPhysicalMaterial` window pane dulled the north courtyard trees, path, and distant fascia.
7. **Unthrottled idle / reduced-motion `requestAnimationFrame` loop and fragment light load**:
   - `render()` scheduled `requestAnimationFrame(render)` unconditionally on every frame unless `running === false`. Even with zero user input or `prefers-reduced-motion: reduce`, the browser ran full WebGL passes at 60–120Hz and evaluated 8 `PointLight` sources per fragment on mobile.

## Comparison with handwritten Rubik's cube modules

Inspected `/Users/tim/Projects/rubiks/lib/src/{index.ts,cube.ts,transform.ts,types.ts}`, `/Users/tim/Projects/rubiks/example/src/main.ts`, `/Users/tim/Projects/3js-microscope/src/{main.ts,size.ts}`, and `apps/timsexperiments/src/scripts/cube/{main.ts,worker.ts,actions.ts}`:

- `rubiks/lib/src/` separates public orchestration (`index.ts`), 3D object construction (`cube.ts`), easing/interpolation math (`transform.ts`), and shared contracts (`types.ts`).
- `3js-microscope/src/size.ts` isolates viewport sizing and camera aspect math from scene creation.
- `src/scripts/cube/main.ts` injects explicit DOM control roots and bridges UI state cleanly without coupling UI markup to Three.js internals.

Following that structure without adding external packages, `src/scripts/campus/` is split into six focused local modules:

- [`types.ts`](../../apps/timsexperiments/src/scripts/campus/types.ts) — Public and internal contracts (`StationId`, `StationView`, `CampusOptions`, `CampusCallbacks`, `CampusController`, `RenderQualityInput`, `RenderQualityProfile`, `WorldHandle`).
- [`quality.ts`](../../apps/timsexperiments/src/scripts/campus/quality.ts) — Pure viewport and DPI policy (`isCompactViewport`, `computeBoundedPixelRatio`, `computeAdaptiveFov`, `computeRenderQuality`).
- [`scheduler.ts`](../../apps/timsexperiments/src/scripts/campus/scheduler.ts) — Pure frame-loop scheduling and cubic ease-in-out math (`easeInOutCubic`, `computeFrameSchedule`).
- [`textures.ts`](../../apps/timsexperiments/src/scripts/campus/textures.ts) — Procedural `CanvasTexture` registry, label material cache, and anisotropic mipmap filtering (`configureCrispTexture`, `createTextureRegistry`).
- [`world.ts`](../../apps/timsexperiments/src/scripts/campus/world.ts) — Scene graph builder with quantized geometry/material caches, `THREE.InstancedMesh` batching for floor tiles and keyboard keys, curated shadow casters/receivers, and deduplicated book textures.
- [`index.ts`](../../apps/timsexperiments/src/scripts/campus/index.ts) — Public entry (`createCampus`, `views`, `StationId` re-export), camera/input controller, dynamic `resize()` quality updates, on-demand shadow map invalidation, and adaptive frame loop.

## Bounded quality and performance changes

1. **Pixel-budget-bounded high-DPI rendering + requested antialiasing (`quality.ts`, `index.ts`)**:
   - Enabled `antialias: true`, a best-effort request; four samples were observed locally and bounded `pixelRatio` by both a per-tier cap (`2.0` mobile, `1.75` desktop) and a total drawing-buffer pixel budget (`1,350,000` pixels on compact/mobile viewports; `2,400,000` pixels on desktop).
   - On `320 × 568` (`640 × 1136`), `390 × 844` (`780 × 1688`), and `844 × 390` (`1688 × 780`), mobile renders at a full `2.0` pixel ratio (`1.317M` pixels max). On `3x` DPR phones (`390 × 844 @ 3x`), the cap prevents a `2.96M`-pixel buffer (`1170 × 2532`) and holds it at `780 × 1688` (`2.0x`). On large tablets (`768 × 1024 @ 2x`), DPR is about `1.310196` (`1006 × 1341 = 1,349,046` pixels). After review repair, the helper retains full precision, permits DPR below 1 and checks floored buffer sizes against the ceiling. For example, `3840 × 2160` uses about `0.537914` DPR and `2065 × 1161` pixels; `400 × 844 @ 3x` uses `799 × 1687`, avoiding the former 1,350,400-pixel overflow.
   - `resize()` recalculates `computeRenderQuality` on every viewport or orientation change, updating `renderer.setPixelRatio(quality.pixelRatio)` and `camera.fov`.
2. **Adaptive portrait FOV (`quality.ts`)**:
   - `computeAdaptiveFov` widens vertical FOV up to `72°` on narrow portrait viewports (`aspect < 1`) and restores `66°`/`65°` on landscape and desktop viewports.
3. **On-demand shadow map + curated shadow casters (`index.ts`, `world.ts`)**:
   - Set `renderer.shadowMap.autoUpdate = false` and `renderer.shadowMap.needsUpdate = true` on initial build and inside the `onInvalidate` callback when the async 3D GLB logo finishes loading.
   - Reduced `castShadow = true` meshes from **577 to 32** primary structural and stationary station silhouettes in the fallback-logo phase after repair, previously 33 including the animated head, and disabled `castShadow` on the three north window glass panes so `moonLight` shines cleanly into the room.
4. **Instanced floor tiles & keycaps + geometry/material caching (`world.ts`)**:
   - Replaced 42 individual floor-tile meshes and 52 individual keyboard-key meshes with 2 `THREE.InstancedMesh` instances.
   - Cached box, cylinder, plane, and rounded-box geometries plus standard materials by quantized parameter keys, reducing unique `BufferGeometry` allocations from **581 to 96** and unique `Material` instances from **129 to 52**.
5. **Anisotropic mipmapped textures & book spine deduplication (`textures.ts`, `world.ts`)**:
   - Configured all readable signage, workbench monitor, book spine, and fallback logo textures with `SRGBColorSpace`, `LinearMipmapLinearFilter`, `LinearFilter`, and requested `anisotropy = 8`, capped by the reported device capability. Mipmap filtering was already the default; explicitly setting it documents the policy.
   - Deduplicated the 24 shelf book spine textures to the 7 canonical cover titles at `512px` width, cutting total scene textures from **36 to 20** and estimated base-level RGBA bytes from **30.97 MiB to 11.95 MiB** (`-61.4%`).
6. **Distant scene clarity (`index.ts`, `world.ts`)**:
   - Extended scene fog from `Fog(0x070c0b, 38, 102)` to `Fog(0x070c0b, 44, 118)` and replaced `MeshPhysicalMaterial` on the north window panes with a non-shadow-casting `MeshStandardMaterial` (`opacity: 0.06, depthWrite: false`).
7. **Adaptive frame scheduler & mobile light consolidation (`scheduler.ts`, `index.ts`)**:
   - `computeFrameSchedule` runs full-rate `requestAnimationFrame` during active movement, pointer look, camera transitions, and a `450ms` post-input settle window.
   - When paused (`#toggle-scene`) or idle under `prefers-reduced-motion: reduce`, the loop stops completely (`0` RAF calls/sec) and wakes immediately on user input, station selection, or resize.
   - During normal unpaused idle, ambient robot breathing is throttled to `66ms` (`~15 fps`) on mobile and `40ms` (`~25 fps`) on desktop.
   - Consolidated mobile `PointLight` count from 8 to 4 while retaining three warm ceiling point lights and the host point light. Directional moonlight and fill remain separate. A smaller point-light loop does not establish a proportional change in total fragment cost.

## Before and after measurements

Measured in the T3 collaborative browser (`http://localhost:4321/`) using WebGL context call instrumentation and `buildWorld` scene traversal. These counts do not measure GPU time, physical-device FPS, power or thermal behavior. The sharper portrait buffer has about 2.56 times the old pixel count; antialiasing, transparency and filtering can add bandwidth and fill cost. Raw historical data is saved in [metrics.json](../../output/mobile-rendering-v2/metrics.json).

### Mobile portrait (`390 × 844`, `devicePixelRatio = 2`)

| Metric | Before | After | Change |
| --- | ---: | ---: | ---: |
| Drawing buffer (`width × height`) | `487 × 1055` | `780 × 1688` | **+156.3% pixels** (`513,785` → `1,316,640`) |
| Effective pixel ratio | `1.2487` | `2.0` | **Full 2x Retina** (bounded at `1.35M` px) |
| WebGL `antialias` / `SAMPLES` | `false` / `0` | `true` / `4` | Four samples observed locally; device dependent |
| Vertical FOV (portrait `aspect = 0.462`) | `66.0°` | `72°` | Wider horizontal framing |
| Per-frame total WebGL draw calls | `738` | `159` | **-78.5%** (`-579` draw calls/frame) |
| Per-frame shadow-pass draw calls | `530` | `0` (on-demand) | **-100% per-frame shadow pass** |
| Per-frame main-pass draw calls | `208` | `159` | **-23.6%** |
| Per-frame total triangles | `125,766` | `52,890` | **-57.9%** (`-72,876` triangles/frame) |
| Per-frame `bindFramebuffer` calls | `2` | `0` | **-100%** during normal frames |
| Active `PointLight` count | `8` | `4` | Four fewer point lights; GPU cost unmeasured |

### Historical viewport resolution matrix (`devicePixelRatio = 2`)

The repaired full-precision DPR policy now computes `1959 × 1224` for `1280 × 800`, replacing the previously rounded `1958 × 1224` below. The phone buffers remain unchanged. Sample counts are observations of that local Chromium context, not guarantees of `antialias: true`.

| Viewport | Before buffer (`eff. DPR`) | After buffer (`eff. DPR`) | MSAA samples (Before → After) | Page scroll overflow (`X / Y`) |
| --- | --- | --- | --- | --- |
| `320 × 568` (narrow mobile) | `400 × 710` (`1.25x`) | `640 × 1136` (`2.0x`) | `0` → `4` | `false / false` (`320/320`, `568/568`) |
| `390 × 844` (mobile portrait) | `487 × 1055` (`1.25x`) | `780 × 1688` (`2.0x`) | `0` → `4` | `false / false` (`390/390`, `844/844`) |
| `844 × 390` (mobile landscape) | `1055 × 487` (`1.25x`) | `1688 × 780` (`2.0x`) | `0` → `4` | `false / false` (`844/844`, `390/390`) |
| `1280 × 800` (desktop) | `1920 × 1200` (`1.50x`) | `1958 × 1224` (`1.53x`) | `4` → `4` | `false / false` (`1280/1280`, `800/800`) |

### Historical scene resource counts and base texture sizes

Counts describe the synchronous fallback-logo phase, including the two Points objects. Loaded GLB replacement changes this phase. Estimated base RGBA bytes omit mipmaps, environment/shadow targets, depth/MSAA buffers, driver allocation and CPU canvases; they are not measured total GPU memory. Repair reduces fallback-phase casters from the historical 33 below to 32.

| Resource metric | Before | After | Change |
| --- | ---: | ---: | ---: |
| Total `THREE.Mesh` objects | `581` | `489` | `-92` individual meshes (`2` `InstancedMesh`) |
| Shadow-casting meshes (`castShadow`) | `577` | `33` | **-94.3%** |
| Shadow-receiving meshes (`receiveShadow`) | `578` | `154` | **-73.4%** |
| Unique `BufferGeometry` allocations | `581` | `96` | **-83.5%** |
| Unique `Material` allocations | `129` | `52` | **-59.7%** (`0` `MeshPhysicalMaterial`) |
| Unique `Texture` allocations | `36` | `20` | **-44.4%** |
| Total texture pixels (base level) | `8,118,368` | `3,132,000` | **-61.4%** (`30.97 MiB` → `11.95 MiB` base RGBA estimate) |
| Label / screen texture anisotropy | `1`–`4` | `8` (`LinearMipmapLinearFilter`) | Requested filtering policy, capped by capability |

### Frame scheduling behavior

Idle timeout values are nominal upper cadence targets followed by RAF, not guaranteed FPS. Simulation dt is clamped to 50ms, so normal mobile idle animation advances slower than wall time. Paused explicit navigation/resize/asset invalidation can render one frame without restarting ambient animation.

| Mode | Before (`RAF` calls/sec) | After (`RAF` calls/sec) |
| --- | ---: | ---: |
| Active look / walk / camera flight | `60` | `60` (full-rate `requestAnimationFrame`) |
| Unpaused idle after `450ms` settle (mobile) | `60` | `~15` (`66ms` idle timer, immediate wake on input) |
| `prefers-reduced-motion: reduce` (idle) | `60` | **`0`** (renders on-demand only when input/station changes) |
| Scene paused (`#toggle-scene`) | `0` | **`0`** |

## Visual evidence (Before vs. After)

### Mobile `390 × 844` — Exploring room

Before (`487 × 1055` buffer, `0` MSAA, `738` draw calls/frame):

![Before mobile 390x844 exploring](../../output/mobile-rendering-v2/before-mobile-390-exploring.png)

After (`780 × 1688` buffer, `4x` MSAA, `159` draw calls/frame, walk pad active):

![After mobile 390x844 exploring](../../output/mobile-rendering-v2/after-mobile-390-exploring.png)

### Mobile `390 × 844` — Arrival overlay

Before:

![Before mobile 390x844 arrival](../../output/mobile-rendering-v2/before-mobile-390-arrival.png)

After:

![After mobile 390x844 arrival](../../output/mobile-rendering-v2/after-mobile-390-arrival.png)

### Narrow mobile `320 × 568` — Exploring room

Before (`400 × 710` buffer):

![Before mobile 320x568 exploring](../../output/mobile-rendering-v2/before-mobile-320-exploring.png)

After (`640 × 1136` buffer):

![After mobile 320x568 exploring](../../output/mobile-rendering-v2/after-mobile-320-exploring.png)

### Mobile landscape `844 × 390` — Exploring room

Before (`1055 × 487` buffer):

![Before mobile 844x390 landscape](../../output/mobile-rendering-v2/before-mobile-844x390-exploring.png)

After (`1688 × 780` buffer):

![After mobile 844x390 landscape](../../output/mobile-rendering-v2/after-mobile-844x390-exploring.png)

### Desktop `1280 × 800` — Arrival and exploring

Before arrival (`1920 × 1200` buffer, `966` draw calls/frame):

![Before desktop 1280x800 arrival](../../output/mobile-rendering-v2/before-desktop-1280-arrival.png)

After arrival (`1958 × 1224` buffer, `450` draw calls/frame, `0` per-frame shadow draw calls):

![After desktop 1280x800 arrival](../../output/mobile-rendering-v2/after-desktop-1280-arrival.png)

After exploring (`1280 × 800`):

![After desktop 1280x800 exploring](../../output/mobile-rendering-v2/after-desktop-1280-exploring.png)

## Historical verification and current limits

The commands and results below are recorded from the initial v2 implementation. They are not a fresh whole-app validation of the repaired shared tree. Current focused repair results are in [renderer-review-fixes-v2.md](renderer-review-fixes-v2.md).

```sh
cd apps/timsexperiments
bun test src/scripts/campus/campus.test.ts

DATABASE_URL=https://ci-build.invalid \
DATABASE_AUTH_TOKEN=ci-placeholder \
PUBLIC_VIEW_COUNTER_API=http://127.0.0.1:4324/__fixtures/views \
bun test

DATABASE_URL=https://ci-build.invalid \
DATABASE_AUTH_TOKEN=ci-placeholder \
PUBLIC_VIEW_COUNTER_API=http://127.0.0.1:4324/__fixtures/views \
bunx astro build
```

- **Unit tests**: `bun test src/scripts/campus/campus.test.ts` passed (**5 pass, 0 fail, 109 `expect()` assertions**), verifying all `StationId` views, canonical dark GLB logo asset presence, instanced meshes (`2`), shadow caster cap (`33 < 60`), geometry reuse (`96 < 100`), texture deduplication (`20 <= 22`), bounded DPR & adaptive FOV across mobile/tablet/desktop viewports, and frame scheduling decisions. That original suite missed the budget counterexamples and disposal/static-caster defects; its passing result was insufficient to establish those claims.
- **Full repository test suite**: `bun test` in `apps/timsexperiments` passed (**288 pass, 0 fail, 1015 `expect()` assertions across 54 files**). This also resolved the temporary texture-count assertion mismatch (`20 <= 22`) noted during concurrent testing in `docs/planning/tablet-reader-v2.md`.
- **Typecheck and production bundle**: `astro check` reported **0 errors, 0 warnings, and 0 hints** in `src/scripts/campus/*` (it currently exits non-zero only on two unrelated errors in `src/lib/resume/browser-answer.ts:161,167` owned by the resume/robot lane). `bunx astro build` succeeded cleanly in `6.32s`.
- **Browser interaction checks**: Verified in the T3 collaborative browser across `320 × 568`, `390 × 844`, `844 × 390`, and `1280 × 800`:
  - Original extruded 3D dark logo (`tims-experiments-dark.glb`) + SVG fallback, dark moody lab palette, and zero page scrolling (`scrollWidth === clientWidth`, `scrollHeight === clientHeight`) are preserved.
  - `#enter-lab`, station navigation (`recipes`, `workbench`, `robot`, `contact`, `arrival`), walk-pad hold (`[data-walk="KeyW"]` sets/clears `.is-held`), and `#toggle-scene` pause (`aria-pressed="true"`, `0` RAF calls over `600ms`) all work as expected.
  - Dynamic viewport resizing (`390 × 844` → `320 × 568` → `844 × 390`) updates `drawingBufferWidth × drawingBufferHeight` and `camera.fov` immediately without page reload.
- **Limits**: All browser measurements were collected in the local Chromium-based T3 collaborative browser with emulated mobile viewports and device scale factors (`dpr = 2`). No physical iOS/Android GPU hardware timings or physical-device FPS numbers are claimed. Confirming thermal throttling and tile-memory bandwidth on physical mobile Safari / Android Chrome requires a physical device check.

The inherited WebGL context-loss handler leaves the controller stopped after restoration. Re-entering the lab does not rebuild it; a full page reload is the available restart path. Generated environment/shadow target contents need recreation for same-page recovery. This repair does not rewrite that lifecycle, and real `WEBGL_lose_context` loss/restore behavior remains unverified. Dynamic resize updates buffer/FOV/scheduling, while light rig, shadow-map size and geometry detail remain chosen at construction; DPR-only changes without resize are not independently observed.
