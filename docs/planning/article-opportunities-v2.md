# Article opportunities v2

2026-10-21. Read-only survey of Tim's side projects plus `timsexperiments` playground code. Goal: pick article ideas that support ordered, browser-local predict → change → run → inspect steps, not long scroll-only explainers or decorative minigames. Campus scene, tablet reader, and robot hosts are out of scope here; this file is selection notes only.

## Projects reviewed

| Project | Local path | Remote | Substance | Browser-lab fit |
| --- | --- | --- | --- | --- |
| Serialization bench (site) | `apps/timsexperiments/src/lib/playgrounds/` | [timsexperiments.foo](https://github.com/timsexperiments/timsexperiments.foo) (private visibility not checked) | Fixed Person codec, 51 unit tests, `SerializationBench.astro`, campus workbench hook | Already the reference implementation |
| serialization-simulation | `/Users/tim/Projects/serialization-simulation` | No commits in local git yet | React Vite app; side-by-side "servers" animate batch counts from hard-coded ms/request (`57.77` vs `51.689`) | Concept only; numbers are not measured from real encoders |
| chat-cli-protobuf-example | `/Users/tim/Projects/chat-cli-protobuf-example` | Empty repo (no commits) | No source files found | None until code exists |
| simple-programming-language | `/Users/tim/Projects/simple-programming-language` | Not checked | C++ lexer/parser tree; `main.cpp` emits LLVM IR for `ret i64 0` | Native toolchain; not a browser exercise today |
| ts-plugin-workers | `projects/ts-plugin-workers/` and `/Users/tim/Projects/timsexperiments/projects/ts-plugin-workers` | [timsexperiments/ts-plugin-workers](https://github.com/timsexperiments/ts-plugin-workers) | Rust WASM parses `wrangler.toml`, TS plugin writes `bindings.d.ts` on change | WASM bundle could run in-page without tsserver |
| rules_bun | `/Users/tim/Projects/rules_bun` | Not on GitHub from this scan | Bazel Starlark around Bun (`bun/BUILD`, `rules.bzl`); README is `bun init` boilerplate | Build-system article, not an in-tab lab |
| rules_elixir | `/Users/tim/Projects/rules_elixir` | [timsexperiments/rules_elixir](https://github.com/timsexperiments/rules_elixir) | Mix wrappers, hermetic toolchain repo rule, tests | Same: CI/Bazel story, weak browser angle |
| LocalBase | `/Users/tim/Projects/LocalBase` | [timsexperiments/LocalBase](https://github.com/timsexperiments/LocalBase) | Large Bun gateway; `ctxMode` / `ctxSize` in config and `listServedModels` | Honest article needs local CLI + GPU; browser piece would be a simplified budget model, not the real runtime |
| astro-pubsub-worker | `/Users/tim/Projects/astro-pubsub-worker` | [timsexperiments/astro-pubsub-worker](https://github.com/timsexperiments/astro-pubsub-worker) (`isFork: true` vs [astro-community/worker](https://github.com/astro-community/worker)) | Astro integration rewrites `Worker` URLs and polyfills SSR | Fork maintenance story; small demo possible |
| three-rubiks-cube | `/Users/tim/Projects/rubiks` | [timsexperiments/three-rubiks-cube](https://github.com/timsexperiments/three-rubiks-cube) | ~6.8k LOC TS; CSG cubelets, drag/keyboard slice rotation, animation queue | Strong WebGL + interaction lab |
| the-cube | `/Users/tim/Projects/rubix` | [timsexperiments/the-cube](https://github.com/timsexperiments/the-cube) | Smaller Three.js cube; shuffle added 2024-06 | Overlaps rubiks; prefer the library + site worker integration |
| rubik (folder) | `/Users/tim/Projects/rubik` | No remote in local git | Mixed assets; less structured than `rubiks` | Lower priority |
| 3js-microscope | `/Users/tim/Projects/3js-microscope` | No remote in local git | Vite + Draco GLB, PMREM env, manual light rig (~666 LOC TS) | Visual craft; thin software-engineering tension unless reframed as IBL tradeoffs |
| gleam_protobuf | `/Users/tim/Projects/gleam_protobuf` | [timsexperiments/gleam_protobuf](https://github.com/timsexperiments/gleam_protobuf) | ~995 LOC Gleam types/docs; no wire encode/decode modules found in repo search | Premature for hands-on wire lab |
| timsexperiments cube worker | `apps/timsexperiments/src/scripts/cube/` | Same monorepo | OffscreenCanvas transferred to worker; uses `@timsexperiments/three-rubiks-cube` | Pairs with rubiks article |

Also noted and skipped: `action-validator` and `GraphQLSP` under `/Users/tim/Projects` track upstream authors (mpalmer, 0no-co), not original Tim-led product code.

## Shortlist (strongest five)

Ranked for fit with the site's lab direction (`docs/planning/article-playgrounds.md`, existing `/lab/json-vs-protobuf`).

### 1. Guided serialization: proto3 presence, defaults, and wire size

**Sources:** `apps/timsexperiments/src/lib/playgrounds/serialization.ts`, `person.proto`, `serialization.test.ts`, `apps/timsexperiments/src/content/blog/json-vs-protobuf.mdx`, `docs/planning/article-playgrounds.md`.

**Public link:** Published article at `/lab/json-vs-protobuf/` (site repo).

**Tension:** JSON always carries four keys; proto3 omits default scalars, so byte counts and round-trip equality diverge in non-obvious ways. Negative `int32` uses ten-byte varints in this codec (sign-extended int64), which contradicts intuition from JSON's two-character `-1`.

**Tim can explain:** Google-scale protobuf use (already in the MDX intro), why the bench is a fixed schema codec rather than `protoc`, and why proto3 cannot distinguish omitted vs explicit default scalars (called out in playground README).

**Guided steps (browser):**

1. Predict JSON vs protobuf byte bars for the Pixel starter; run and compare to 107 / 68 fixture bytes.
2. Clear `name`, `email`, and set `age` to 0; predict protobuf size; observe 0-byte protobuf vs 43-byte JSON.
3. Set `age` to `-1`; predict which encoding grows more; inspect hex and varint width.
4. Add duplicate or empty-string hobbies; confirm repeated field order is preserved on decode.
5. Break wire bytes in the advanced view (if exposed) or paste malformed hex; observe which round-trip check fails first.

**Feasibility:** Implementation already shipped for stage 1; guided steps and campus ribbons are planned elsewhere. Runs sync on main thread, no Worker, bounded input (16 KiB JSON, 1 KiB strings, 32 hobbies). Pitfall: do not claim general protobuf or timing benchmarks; article Go numbers stay separate from browser measurements.

---

### 2. Rubik slice rotation: queue discipline on a worker-owned canvas

**Sources:** `/Users/tim/Projects/rubiks/lib/src/cube.ts` (ray pick → axis/section → `rotateSliceInternal`), `transform.ts` (`explodeAndReassemble`), `apps/timsexperiments/src/scripts/cube/worker.ts`, `main.ts` (OffscreenCanvas transfer).

**Public link:** [github.com/timsexperiments/three-rubiks-cube](https://github.com/timsexperiments/three-rubiks-cube)

**Tension:** A drag gesture must map a 2D delta to a legal slice move without breaking cube state; animations serialize through an internal queue while input events arrive faster than easing finishes. Moving WebGL to a worker keeps scroll and DOM responsive but forces explicit event forwarding (`WorkerCubeEventListener`).

**Tim can explain:** Building a publishable npm cube on top of three-bvh-csg, deprecating the old `async` export path, and wiring the same package into the personal site via offscreen rendering.

**Guided steps:**

1. Shuffle; predict whether rapid clicks queue or drop moves; perform three fast slice drags and watch completion order.
2. Toggle theme (site worker listens to `class` on `<html>`); observe sticker contrast without reloading the worker.
3. Resize the viewport; confirm aspect correction via posted `sizes` without losing cube state.
4. Optional advanced: trigger `explodeAndReassemble` from devtools/message hook; relate animation duration to main-thread vs worker responsibility.
5. Compare feel with worker disabled (hypothetical step): document jank on low-end hardware as motivation for offscreen path.

**Feasibility:** Package builds for npm; site integration already proves worker transfer. Pitfalls: WebGL context loss handling lives in campus code, not the library; article lab should not require the full 3D campus. Mobile touch needs explicit QA. CSG eval is GPU-heavy on weak devices.

---

### 3. Wrangler.toml → `Env` types in the browser (WASM, no tsserver)

**Sources:** `projects/ts-plugin-workers/packages/wasm/src/lib.rs` (`WorkerBindingGenerator`), `packages/plugin/src/write_definitions.ts`, README example `bindings.d.ts` merge.

**Public link:** [github.com/timsexperiments/ts-plugin-workers](https://github.com/timsexperiments/ts-plugin-workers) (npm `@timsexperiments/ts-plugin-workers`, beta).

**Tension:** Cloudflare Workers bind KV, D1, R2, queues, etc. TypeScript does not read TOML; duplicating binding names in types drifts from config. The plugin watches `wrangler.toml` and regenerates `Env`, but developers only see value after restarting or saving config in the IDE.

**Tim can explain:** Why WASM parses TOML in the plugin, beta limitations, and extending generated `Env` with `declare global` merges (README pattern).

**Guided steps:**

1. Start from sample `wrangler.toml` with two KV namespaces; predict property names on `Env`.
2. Add a D1 binding; run generate; diff the emitted `interface Env`.
3. Introduce a typo or unsupported binding; observe error surface from WASM parse vs silent skip (verify actual behavior in code paths).
4. Edit only `bindings.d.ts` manually; change TOML again; show regeneration overwriting stale types (`should_update` gate in Rust).
5. Optional: paste Worker's fetch handler snippet and mark type errors fixed after generate.

**Feasibility:** Needs bundling the existing WASM for browser (separate from VS Code workspace TS). No network; TOML stays user paste. Pitfalls: plugin `index.ts` still contains a stray "DO NOT SUBMIT" comment; clean before citing in article. Full tsserver plugin behavior (file watch) differs from in-browser one-shot generate.

---

### 4. Honest throughput: bytes on the wire vs animated "requests per day"

**Sources:** `/Users/tim/Projects/serialization-simulation/src/App.tsx`, merge with `serialization.ts` evaluator from the site.

**Public link:** None (local project, no git history).

**Tension:** The simulation animates batches from fixed `processingTime` constants tied to an old benchmark narrative, while protobuf wins on the wire mainly on payload size and parse cost, not magically shorter "simulation days." Teaching value is showing when animation misleads.

**Tim can explain:** Evolution from the published Go benchmark in `json-vs-protobuf.mdx` toward an interactive bench that measures actual UTF-8 byte lengths in JS.

**Guided steps:**

1. Run paired encoders on the same Person; record JSON and protobuf byte counts.
2. Predict which side would finish first if throughput were byte-bound at fixed Mbps; compute manually, then reveal.
3. Replace fixed `57.77s` / `51.689s` animation rates with rates derived from measured bytes (slider for link speed).
4. Crank hobby count to 32 long strings; watch JSON bar dominate while protobuf repeated strings stay length-prefixed.
5. Debrief: list what the original React demo asserted vs what the codec proves.

**Feasibility:** Reuse `evaluateSerialization` in a new Vite chunk or fold into playground recipes. Pitfall: retire misleading constants entirely or label them fictional; do not imply Go numbers were re-run in 2026 without evidence.

---

### 5. LocalBase context budget (companion sim, not the gateway itself)

**Sources:** `/Users/tim/Projects/LocalBase/README.md` (context sizing, one active model per service), `src/domains/models/served-models.test.ts` (`ctxMode`, `ctxSize`, `context_length` on listed models).

**Public link:** [github.com/timsexperiments/LocalBase](https://github.com/timsexperiments/LocalBase)

**Tension:** Local LLM hosts advertise large context windows, but RAM, parallel slots, and "auto" reduction shrink what you can actually load. LocalBase exposes effective limits via `/v1/models`; readers without a GPU still benefit from understanding the arithmetic.

**Tim can explain:** Building a unified OpenAI-shaped gateway, explicit vs auto context mode (recent commit message on local clone: persist explicit context mode), and why one active model per service is a product constraint.

**Guided steps (browser sim using catalog constants, not running inference):**

1. Pick a catalog model id from README table; enter RAM budget; predict admitted context tokens.
2. Switch `ctxMode` auto → explicit; change ceiling; read which reductions apply (mirror rules extracted from `listServedModels` tests).
3. Add a second modality selection; observe that simultaneous multi-model pools are unsupported (README).
4. Optional: compare STT GPU requirement on Linux vs macOS Metal note from README.
5. Close with when to use LocalBase vs cloud APIs (scope only what Tim can demo locally).

**Feasibility:** Browser tab cannot download multi-GB weights. Pitfall: memory figures in README are estimates; article must not state measured minimum hardware unless qualified. Extract reduction rules from TypeScript, do not invent formulas.

---

## Deferred or weak fits

- **rules_elixir / rules_bun:** Real engineering, zero browser manipulate step unless reduced to a sandboxed Starlark string quiz (not worth it).
- **3js-microscope:** Pretty IBL/lighting sandbox; article would read like a graphics diary unless tied to a measurable perf claim Tim has not recorded.
- **gleam_protobuf:** Types without encoders; wire lab would be fiction.
- **astro-pubsub-worker:** Fork; article belongs to upstream unless Tim documents a distinct pub/sub layer (name suggests pubsub but README matches worker URL fix).
- **simple-programming-language:** Lexer tests exist; compiler story stops at LLVM hello. WASM LLVM in browser is a different project.
- **the-ultimate-dev-environment MDX:** Devcontainers cannot run in-tab; playground plan already defers it (`article-playgrounds.md`).

## Draft outlines (two leads)

### A. "Proto3 is smaller until it isn't" (extend serialization bench)

**Working thesis:** For one stable Person schema, size wins come from omitted defaults and binary packing, not from hand-wavy "protobuf is faster." Readers earn the claim by breaking and fixing round trips.

**Outline:**

1. Hook: Pixel record on the wire (reuse MDX persona, no new dog facts).
2. Show JSON always serializes four keys; run bench; introduce byte bars tied to `serialization-result` events.
3. Lesson proto3 scalar omission with all-default record (0-byte protobuf case from tests).
4. Lesson negative int32 varint width (cite code comment in `serialization.ts` linking to protobuf encoding guide).
5. Lesson repeated strings vs JSON escaping for emoji hobby (Unicode section in tests).
6. Close: when protobuf is wrong choice (human inspection, schema churn, browser debugging hex).

**Questions for Tim:**

- Should the guided flow live only on `/lab/json-vs-protobuf`, or also as a campus workbench recipe with the same steps?
- Are you willing to show raw hex by default, or only behind an "advanced" step?
- How much Google war story belongs in this piece vs staying in the 2024 article?
- Is ZigZag or packed repeated fields in scope for v2, or explicitly out of scope to keep the codec small?

**Code anchors:** `validatePerson`, `encodePerson` default omission, `decodePerson` unknown field skip, fixture asserting 107/68 bytes in `serialization.test.ts`.

---

### B. "Offscreen cube, on-screen input" (rubiks + site worker)

**Working thesis:** Interactive 3D on a portfolio site belongs in a worker once input mapping and animation queues are treated as part of the public API, not as implementation details.

**Outline:**

1. Hook: reader performs one slice move; mention CSG-built cubelets briefly (link repo, not full CSG tutorial).
2. Explain pick → axis → section → queued rotation with reference to drag threshold in `cube.ts`.
3. Diagram (static) main thread vs worker messages mirroring `cube/main.ts` and `worker.ts` INIT/RESIZE/UPDATE_THEME.
4. Guided queue saturation exercise and what happens when `isTranforming` blocks new drags.
5. Optional explode animation as stress test for worker messaging.
6. Close: package boundaries (`three-rubiks-cube` npm vs inline campus fork per `professional-review-v2.md`).

**Questions for Tim:**

- Should the article lab embed the npm example app, the site's offscreen worker, or both with a toggle?
- Is keyboard notation (arrow keys) in scope for readers, or mouse/touch only?
- Any appetite to explain BVH-CSG construction, or keep focus on interaction architecture?
- Publish under Writing/lab or a standalone technical post outside the freelance funnel?

**Code anchors:** `RubiksCube` constructor listener wiring, `rotateSliceInternal` options forwarding (rubiks commit 2024-07-14), offscreen transfer in `apps/timsexperiments/src/scripts/cube/main.ts`.

---

## Evidence and limitations

**Methods:** Listed directories under `/Users/tim/Projects` and read READMEs, selected source, and git remotes where present. GitHub `gh repo view` checked public metadata for LocalBase, ts-plugin-workers, three-rubiks-cube, rules_elixir, gleam_protobuf, astro-pubsub-worker (fork flag). Did not open `.env`, credentials, employer paths (`r1rcm`, `UTHealth`), or run builds/tests.

**Not verified:** Whether timsexperiments.foo GitHub repo is public; npm download counts for ts-plugin-workers; whether serialization-simulation was ever pushed; current LocalBase release behavior beyond README and unit fixtures; browser QA on Safari/Firefox for existing bench (playground README notes Chrome-only standalone check).

**Conflicts with prior docs:** Campus agents own guided-experiment UX on the serialization bench; this file does not specify UI copy or scene ribbons. Existing published protobuf article predates the bench; updating prose vs new follow-up article is an editorial choice left to Tim.

**Intentionally excluded:** Invented benchmark numbers, completed article drafts, and claims about gleam_protobuf wire compatibility before encoders land.
