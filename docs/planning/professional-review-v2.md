# Professional review v2 — maintainability and SEO

**Date:** 2026-10-21
**Branch:** `feat/3d-site-transformation` (base `52edd372`, [PR #38](https://github.com/timsexperiments/timsexperiments.foo/pull/38))
**Scope:** Read-only audit of app code and existing `apps/timsexperiments/dist/` build output. No application edits in this pass.
**Prior work:** UX/integration findings in `docs/planning/final-integrated-audit.md` and `docs/planning/integration-review.md` are referenced where they overlap; this document adds architecture/SEO verdicts and implementation scopes.

## Executive verdict

The campus experience is shippable as a product surface, but two SEO issues and one structural maintainability debt should be addressed before calling the transformation “done.” The old **cube** stack had a clean worker + npm-package boundary; the new **campus** stack inverts that into a ~1,530-line in-repo 3D module plus a ~230-line DOM orchestrator, with the renderer still reaching into page markup by ID. **Workspace packages** (`views-client`, `http`, `view-storage`) are unrelated to the 3D work and should not be expanded for campus; **`lib/playgrounds`** should stay in-app.

---

## Part A — Maintainability: cube modules vs campus shell

### What “cube” was (main branch pattern)

| Layer | Location | Role |
| --- | --- | --- |
| DOM bridge | `src/scripts/cube/main.ts` (~132 lines) | Offscreen canvas transfer, resize/theme, event forwarding |
| Worker + scene | `src/scripts/cube/worker.ts` (~279 lines) | `@timsexperiments/three-rubiks-cube` owns Three.js |
| Actions protocol | `src/scripts/cube/actions.ts` (~10 lines) | Small message enum |

**Strengths:** Hard boundary between page and 3D; 3D logic is testable/publishable via the npm package; main thread only mutates DOM classes/selectors the worker names.

**Tradeoffs:** Worker complexity; cube-specific; no shared “station” model with the new site.

### What campus is now

| Layer | Lines (approx.) | Role |
| --- | --- | --- |
| `CampusHome.astro` | markup + SSG content | Shell, dialogs, **all published MDX pre-rendered** into hidden articles |
| `src/scripts/site/campus-home.ts` | 228 | Dialogs, a11y, lazy `import('../campus')`, article copy wiring |
| `src/scripts/campus/index.ts` | 598 | WebGL renderer, input, navigation, **queries `#scene-walk-pad` / `#toggle-touch-controls`** |
| `src/scripts/campus/world.ts` | 932 | Procedural room, stations, logo GLB/SVG, collisions, animation |
| `src/scripts/robot/host.ts` | 462 | Evidence/MCP chat UI (WeakSet singleton per root) |
| `src/lib/playgrounds/*` + `SerializationBench.astro` | shared | Serializer bench (also on `/lab/json-vs-protobuf`) |

There is no literal `GroupX` module in the repo; the comparison that matters is **hand-rolled Three.js `Group`/mesh construction in `world.ts`** versus the **extracted cube library + worker** pattern.

### Actual defects (maintainability)

#### 1. Renderer coupled to global DOM IDs (defect)

`createCampus()` documents that it “owns only the canvas,” but it immediately binds walk-pad controls by ID:

```135:137:apps/timsexperiments/src/scripts/campus/index.ts
  const pad = document.querySelector<HTMLElement>('#scene-walk-pad');
  const padToggle = document.querySelector<HTMLButtonElement>('#toggle-touch-controls');
```

**Impact:** Cannot reuse the renderer on another page without duplicating markup; unit tests must mock `document`; changes to `CampusHome.astro` IDs silently break touch controls.

**Fix (bounded):** Pass an optional `controlsRoot: HTMLElement` (or explicit element refs) from `campus-home.ts` into `createCampus`. Keep IDs as defaults for one release if needed.

#### 2. `world.ts` monolith (maintainability debt, not a runtime bug)

932 lines mix environment art, station interactives, logo loading (SVG + dynamic `GLTFLoader` import), robot animation, and disposal. `campus.test.ts` only asserts aggregate invariants (stations, stars, moon, GLB magic bytes).

**Fix (bounded, in-repo only):** Split into files under `src/scripts/campus/world/` — e.g. `lighting.ts`, `architecture.ts`, `stations.ts`, `logo.ts`, `dispose.ts` — without publishing a package. Export the same `buildWorld` surface.

#### 3. Shell owns too many integration concerns (overcoupling)

`campus-home.ts` simultaneously handles: scene pause/focus, five native dialogs, recipe reader switching, clipboard for code blocks, and dynamic import of the scene. `robot/host.ts` is reasonably isolated (setup per root), but **articles + newsletter widgets** embedded from MDX pull Radix/React into the campus reader (see `final-integrated-audit.md` — newsletter opens behind native dialog). That is a **product integration defect**, not a scene defect.

**Fix (bounded):** Campus-specific article surface (static newsletter link or native modal) owned by `CampusHome.astro` / `campus-home.ts`; defer `client:load` islands until reader open.

#### 4. Positive boundary: lazy scene load

```213:221:apps/timsexperiments/src/scripts/site/campus-home.ts
if (canvas) {
  import('../campus').then(async ({ createCampus }) => {
```

Dynamic import keeps Three.js off the critical path until canvas exists. Preserve this in any refactor.

### TypeScript package extraction — worth it?

| Candidate | Verdict | Reason |
| --- | --- | --- |
| `@timsexperiments/three-rubiks-cube` (existing) | **Keep as-is** | Still used by `/classic` cube worker; good precedent |
| New npm package for `world.ts` / campus | **No** | Single consumer, heavy art/content coupling, GLB asset paths, no reuse story |
| `lib/playgrounds` → package | **No** | Cohesive with site content + bench UI; already has focused tests |
| `views-client` / `http` / `view-storage` | **No change for campus** | View counter on lab pages only (`count_view.ts`); API packages serve Workers |

### Recommended component boundaries (ownership scopes for parent)

| Scope | Owns | Must not own |
| --- | --- | --- |
| **Campus shell** | `CampusHome.astro`, `campus.css`, `campus-fonts.css`, `campus-home.ts` | Three.js meshes, robot inference |
| **Campus scene** | `campus/index.ts`, `campus/world/*`, `campus.test.ts`, logo assets | Dialog HTML, MDX content |
| **Robot station** | `RobotHost.astro`, `scripts/robot/*`, `chat-view/presentation.ts` | World geometry |
| **Workbench** | `SerializationBench.astro`, `lib/playgrounds/*`, `serialization-bench.ts` | Scene navigation |
| **Lab articles** | `BlogPost.astro`, `lab/[...slug].astro`, content collection | Campus dialog embedding rules |
| **SEO** | `SeoHead.astro`, `consts.ts`, `astro.config.ts` sitemap filter, `public/robots.txt` | 3D |

### Preserve constraints (non-negotiables from product direction)

- Original SVG logos and dark extruded GLB fallback (`world.ts` ~554–643, `campus.test.ts` GLB size assertion).
- Dark moody first-person lab (`world.ts` fog/light palette; `CampusHome` `class="dark"`).
- No page-level scrolling on campus (`campus.css` + verified in integrated audit).
- Accessibility patterns in shell (skip link, canvas `inert`/`aria-hidden`, directory fallback).

---

## Part B — SEO audit (commit `52edd372` + built `dist/`)

Evidence sources: built HTML/XML in `apps/timsexperiments/dist/`, source in `SeoHead.astro`, `astro.config.ts`, `BlogPost.astro`, `CampusHome.astro`. Google canonical guidance checked against [Search Central — consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) (prefer one `rel=canonical` in initial HTML; align sitemap and canonical).

### What improved on this branch

| Item | Evidence |
| --- | --- |
| Site title **TimsExperiments** | `consts.ts` `SITE_TITLE`; `dist/index.html` `<title>TimsExperiments</title>` |
| Centralized head tags | `SeoHead.astro` — canonical, OG, Twitter, RSS, sitemap link |
| `/classic` canonical → `/` | `BaseHead.astro` line 33 |
| Sitemap excludes duplicates/utility | `astro.config.ts` filter removes `/campus`, `/classic`, `/unsubscribe`, `/parser` |
| `robots.txt` sitemap URL | `public/robots.txt` → `https://timsexperiments.foo/sitemap-index.xml` |
| Published lab routes in sitemap | `dist/sitemap-0.xml`: `/`, `/lab/`, three articles, `/resume/mcp/` |
| RSS channel + items | `dist/rss.xml` titles/links match lab slugs |
| Article JSON-LD | `BlogPost.astro` `BlogPosting`; e.g. `dist/lab/json-vs-protobuf/index.html` |
| Homepage WebSite JSON-LD | `CampusHome.astro` lines 30–34; present in `dist/index.html` |
| Crawlable landing copy | `dist/index.html` — visible `<h1>`, station directory, footer links to `/lab` |
| Social preview baseline | `og:image` / Twitter image → absolute `timothy_altemus_headshot.jpeg` |

### Blockers (fix before calling SEO “clean”)

#### B1. Full article bodies duplicated on `/` (and `/campus`)

**Location:** `CampusHome.astro` line 88 — every published recipe is SSG’d into `#reader-dialog` with `hidden` but full MDX HTML in the document.

**Built evidence:**

- `dist/index.html` ≈ **177,521 bytes**; **3** `campus-article` blocks with complete article text.
- Same slug on `dist/lab/json-vs-protobuf/index.html` ≈ **95,742 bytes** with `BlogPosting` JSON-LD and canonical `/lab/json-vs-protobuf/`.
- Homepage canonical is `https://timsexperiments.foo/` only (`SeoHead` via `canonicalPath="/"`).

Google can index HTML that is hidden in the UI ([Search Central / webmaster guidance on source-visible text](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) — canonical signals must be consistent). Here the homepage aggregates **multiple article-length documents** under one **WebSite** canonical, while lab pages declare themselves canonical **BlogPosting** URLs. That invites duplicate clustering and unpredictable canonical selection.

**Minimal fix options (pick one):**

1. **Preferred:** Reader loads article content on open (fetch `/lab/[slug]/` fragment, or Astro endpoint / content API) — homepage keeps teasers + permalinks only.
2. **SSG compromise:** Inline only excerpt/teaser in campus; full body only on `/lab/*`.
3. **Not recommended alone:** `noindex` on `/` — would harm the primary landing URL.

#### B2. `/campus` is a byte-identical duplicate of `/` without redirect

**Locations:** `pages/index.astro` and `pages/campus.astro` both render `CampusHome`; built `dist/campus/index.html` matches `dist/index.html` size; both declare `rel=canonical` → `/`.

Sitemap correctly **excludes** `/campus`, but the URL remains crawlable if linked. There is no entry in `astro.config.ts` `redirects` for `/campus` → `/`.

**Fix:** 301 `/campus` → `/` (or remove the route and rely on `_redirects` in deploy config).

### Medium / preferences (not blockers)

| ID | Issue | Evidence | Note |
| --- | --- | --- | --- |
| M1 | Trailing slash mismatch on resume MCP | Sitemap `.../resume/mcp/` vs canonical `.../resume/mcp` in `dist/resume/mcp/index.html` | Align `SeoHead` path style with sitemap |
| M2 | All pages share one `og:image` (headshot) | `SeoHead.astro` default image | Lab index has per-article images in UI but not OG; optional `tldr` + hero per post |
| M3 | Brand string split | Title `TimsExperiments` vs logo alt `Tim's Experiments` | Consistency preference for SERP vs accessibility |
| M4 | `/classic` canonicalized to `/` while content differs | `BaseHead.astro` | Intentional consolidation; ensure `/classic` stays out of sitemap (already filtered) and internal links prefer `/` |
| M5 | Homepage HTML weight + TTFB | 177 KB static HTML before JS | Tied to B1; hurts performance signals indirectly |
| M6 | RSS items lack `description` / encoded content | `rss.xml.js` maps title/link only | Optional enrichment |

### JavaScript / performance (SEO-adjacent, from build artifacts)

Validated from existing production build referenced in `final-integrated-audit.md` and `dist/_astro/` (2026-10-21 build on disk):

| Asset | Size (approx.) | Notes |
| --- | --- | --- |
| Scene chunk (`index.BghF8jU3.js`) | 558 KB (~151 KB gzip cited in integrated audit) | Loaded via dynamic import on homepage arrival |
| Robot host | 261 KB (+ 5.9 MB inference worker separate) | Only when robot station used |
| Logo GLB | ~3 MB | Lazy via GLTFLoader in `world.ts` |
| Hidden MDX + `client:load` widgets | — | React/Radix hydrate on load per integrated audit |

**Not measured this pass:** LCP/INP/CrUX, live crawl of production URL, Search Console canonical reports.

### Social / preview assets

- Default share image exists at `/timothy_altemus_headshot.jpeg` (absolute URLs in meta).
- Campus uses local font preload (`/fonts/campus/inter-400.ttf`) — good for privacy/perf vs `BaseHead` Google Fonts on classic/lab.
- No dedicated `og:image` for campus hero or per-article recipe cards.

---

## Part C — Tests (existing and recommended)

### Ran this pass

```sh
DATABASE_URL=https://ci-build.invalid \
DATABASE_AUTH_TOKEN=ci-placeholder \
PUBLIC_VIEW_COUNTER_API=http://127.0.0.1:4321/__fixtures/views \
bun test apps/timsexperiments/src/scripts/campus/campus.test.ts
```

**Result:** 3 pass, 0 fail.

### Existing SEO-related tests (weak)

`pages/_index.test.ts`, `_rss.xml.test.ts`, `lab/_[slug].test.ts` only assert **file existence** — no metadata assertions.

### Narrow tests worth adding (implementation phase)

1. **`seo-dist.test.ts`** (after `build`): parse `dist/index.html`, `dist/lab/json-vs-protobuf/index.html`, `dist/classic/index.html` — assert single canonical, expected title suffix `| TimsExperiments` on inner pages, `BlogPosting` on lab slugs.
2. **`sitemap.test.ts`**: load `dist/sitemap-0.xml`; assert URLs include `/lab/*`; assert **no** `/campus`, `/classic`, `/unsubscribe`.
3. **Homepage duplicate guard:** assert `dist/index.html` does **not** contain a known long phrase from protobuf article **or** assert `campus-article` count === 0 after B1 fix; interim: assert size &lt; 80 KB budget post-fix.
4. **`redirects.test.ts`:** when `/campus` redirect added, assert 301 target `/` in `_redirects` or Astro config.

---

## Blockers vs preferences (summary)

| Severity | ID | Topic |
| --- | --- | --- |
| **Blocker** | B1 | Full MDX on `/` duplicates `/lab/*` SEO |
| **Blocker** | B2 | `/campus` duplicate URL without redirect |
| **Blocker (UX/integration)** | — | Newsletter Radix dialog behind native reader (`final-integrated-audit.md`) |
| Medium | M1–M6 | SEO polish |
| Maintainability | 1–3 | DOM coupling, `world.ts` split, shell/integration |

---

## Limits of this audit

- No live production crawl, Search Console, or Rich Results Test.
- No full Lighthouse/CWV run this pass (relied on built artifacts + prior integrated audit for scene behavior).
- No screen reader session.
- Did not re-run full `bun test` / `build` suite (integrated audit reported 199 tests passing on same branch).
- Did not read secrets, `.env`, or deploy credentials.

---

## Handoff for parent (implementation order)

1. **SEO owner:** Resolve B1 (stop shipping full articles on `/`) and B2 (`/campus` → `/` redirect). Add `seo-dist` + sitemap tests.
2. **Campus shell owner:** Newsletter/reader integration fix from integrated audit; defer React islands until reader open.
3. **Scene owner:** Inject touch-control refs into `createCampus`; split `world.ts` into internal modules; keep logo GLB + SVG fallback tests green.
4. **No action:** Extract campus to npm; move playgrounds to workspace packages.

### Changed paths (this audit pass only)

- `docs/planning/professional-review-v2.md` (created/updated)

### Exact blockers requiring decision

- **B1** needs a product choice: client-fetch reader vs excerpt-only SSG (affects offline/SSR behavior in dialogs).
- **Newsletter** needs a pattern choice: native campus modal vs portal container vs link-out to standalone lab article.
