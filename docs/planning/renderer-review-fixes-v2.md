# Renderer review fixes v2

Repaired the three introduced P2 findings in [renderer-independent-v2.md](renderer-independent-v2.md) on the shared, uncommitted `feat/3d-site-transformation` checkout. Read that review and the full [mobile rendering report](mobile-rendering-v2.md) before editing. Changes are confined to `apps/timsexperiments/src/scripts/campus/`, this report and corrections to the mobile rendering report. No commit, push, deployment, dependency change, new agent or full application build was performed.

## Changes

- `index.ts` extracts the controller's existing attached-resource traversal into `disposeSceneResources`, which the controller calls on exit. It now calls `InstancedMesh.dispose()` for each instance object and `LightShadow.dispose()` for directional, point and spot lights, releasing the shadow map and optional map pass. Shared mesh/Points/Line geometries and materials are still collected in sets and disposed once. The controller retains ownership of the generated environment target and renderer.
- `textures.ts` disposes procedural textures and clears its caches; it no longer disposes attached label materials. Those materials have the same controller owner as other attached materials.
- `world.ts` removes the extra GLB geometry/material ownership sets. An attached GLB joins controller cleanup. A GLB delivered after world disposal stays unattached and its callback disposes unique geometries/materials once, including resources shared across nodes or repeated material-array entries. The replaceable SVG fallback uses its own plane geometry, avoiding direct disposal of a cached geometry. Replacement disposes that detached plane and its material; its texture remains owned by the procedural registry until world disposal.
- `quality.ts` removes the DPR floor of 1 and two-decimal rounding. It retains the budget-derived full-precision ratio and checks the floored dimensions used by Three.js, reducing the ratio if floating-point evaluation crosses the ceiling. The 390x844 phone buffer remains 780x1688. The review's counterexamples now fit their ceilings: 2560x1440 and 3840x2160 use 2065x1161 buffers; coarse-pointer 2048x2732 uses 1005x1341; coarse-pointer 400x844 at DPR 3 uses 799x1687.
- `world.ts` excludes the animated ceramic head from the frozen shadow bake. The robot's five stationary base, pedestal, body and arm casters remain. Its head animation and receiving shadows remain enabled. The synchronous fallback phase now has 32 mesh casters rather than 33. GLB-load shadow invalidation remains connected to the controller's existing callback.
- Corrected the mobile rendering report: 42 floor tiles in a seven-by-six grid, 94 repeated meshes consolidated into two, mipmap filtering already present by default, device-dependent antialias sample counts, capability-capped anisotropy, actual compact point lights, rounded FOV, nominal idle cadence and inherited context recovery limits. Historical browser observations are marked separately from current source-derived values. Scene counts and base RGBA estimates do not establish GPU timing or total GPU memory.

No scene dimensions, vertex construction parameters, instance transforms, station layout, logo asset, views, input bindings, pause behavior, reduced-motion scheduler or module boundaries changed. The only casting change is the animated head. The source comment about compact lights now states the actual lights without claiming proportional GPU savings.

## Focused verification

Final source verification completed at 2026-10-21 18:48 UTC, 13:48 CDT. The shared tree can change during integration; the hashes below identify this checked renderer state.

From `apps/timsexperiments`:

```sh
bun test src/scripts/campus/campus.test.ts
bunx tsc --noEmit --strict --skipLibCheck --target ESNext \
  --module ESNext --moduleResolution Bundler --lib ESNext,DOM,DOM.Iterable \
  --types bun,astro/client src/scripts/campus/*.ts
```

- Focused tests passed: 8 tests, 0 failures, 815 assertions. Bun reported 70ms; wall time was 0.08s.
- Campus-only strict TypeScript check passed with no diagnostics. Wall time was 1.06s. This checks all campus modules and tests, with installed dependency declarations skipped; it is not a whole-app Astro check.
- Scoped `git diff --check` passed.
- Disposal regression builds the real fallback world with canvas/Image stubs, watches real Three.js disposal events for unique geometries, materials, procedural map textures and both instance objects, adds real shadow map/map-pass targets, and runs `world.dispose()` plus the same cleanup helper called by the controller. Every watched resource emits exactly one dispose event. Repeating registry disposal does not duplicate events. These are CPU lifecycle assertions, not measurements of GPU allocation or reclamation.
- GLB regressions parse the actual canonical dark asset with Three.js. Only network delivery is intercepted. Both attached-before-disposal and delivered-after-disposal paths exercise shared nodes and repeated material-array entries. Each unique watched geometry/material disposes once; the live load invalidates once, while the late load neither attaches nor invalidates. Removal of the SVG fallback is included in attached-load disposal accounting.
- Budget regressions cover the four review counterexamples, large CSS areas at native DPR, DPR 1/2/3, fractional CSS dimensions, a budget-exact area and a tablet near the old rounding boundary. Assertions compare actual floored buffer dimensions with both the profile and the hard tier ceiling. Existing normal-phone/FOV checks remain.
- Caster regression snapshots every baked caster's world matrix, advances normal animation through three times, and asserts every caster stays fixed. It also verifies five robot silhouettes remain, moving head meshes still move without casting, and reduced motion preserves their current pose. The instance counts remain 42 tiles and 52 keys.
- Existing station, canonical logo and scheduler regressions still pass. Source input wake, pause and async invalidation paths are preserved; no live browser input timing is claimed.

SHA-256 for the checked sources, relative to `apps/timsexperiments/src/scripts/campus/`:

```text
cee74dcdc3455e03668c40a876661ce3c6c398092f4cf7064ab8a6eb1686ee21  index.ts
0c1adec1700f8f120c6a8f041f290d97d4b393082fa1bf2a26aebb7d203a3ec2  world.ts
46b62fdb0d6bef6c2951610c44d38e9780f34a7cfb1886902bcf33eed27a80fa  quality.ts
a931405a3b5c33323fd29ec5c4623bdfb99ad668ae2d8bc036b222fe11b737a5  textures.ts
3d4872bbf8f37efe2bcf47d367f35ffd1f254faaa99caff77f9ea90f740d4a3f  campus.test.ts
```

## Remaining limits and integration handoff

The existing context-loss handler leaves the controller's `contextLost` flag set after WebGL restoration. Re-entering does not recreate the controller; full page reload remains the restart path. Same-page recovery also needs regenerated environment/shadow contents. That inherited gap is documented rather than rewritten here. Real `WEBGL_lose_context` loss/restore testing remains outstanding.

No full app build, repository-wide suite, browser render, touch interaction, hardware GPU timing or physical-mobile thermal test was run in this repair pass. Those checks belong to integration or physical-device verification. Historical screenshots and draw counters were not recaptured. Async GLB geometry/material cleanup matches the current texture-free canonical asset; a future asset containing textures would require explicit texture ownership. Dynamic quality-tier reconstruction and the existing idle dt clamp remain outside these three repairs.
