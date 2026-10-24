# Tablet recipe reader v2

Implemented locally on `feat/3d-site-transformation`, starting at `52edd372`, for [PR 38](https://github.com/timsexperiments/timsexperiments.foo/pull/38). No commits, pushes, deployment, package installation, or delegated agents.

## Reading experience

Opening a recipe lifts a tablet into the first-person view over the room. Its lit chassis surrounds an opaque `#101815` reading screen. The 320ms pickup settles upright, and the 180ms return puts it down. Text never fades into transparent prose. Motion is skipped when reduced motion is requested.

The article stays intact. A labeled native contents selector uses its existing h2/h3 headings, with Previous/Next navigation and a current-section count. Scrolling updates that count. A jump focuses the destination heading. Article text is 16px, with a reading width capped at 68ch; long code and tables have their own horizontal scroll areas. The controls remain visible while the article scrolls.

Shelf returns to the selected recipe link. Escape also returns to that link, and another Escape closes the shelf. Return closes the tablet and restores the original room/directory control. Native dialog semantics retain modal keyboard behavior. Opening any panel pauses the scene and makes its canvas inert; closing restores the user's pause preference. A changed reduced-motion preference also pauses the scene.

The shelf's recipe cards are real standalone article links. JavaScript intercepts an ordinary activation to pick up the tablet. Modified clicks, link copying, the article archive, and the no-script archive fallback remain available. A standalone link stays visible during loading and failure. It opens a new tab so the room and reading position remain available.

## Content and module boundaries

Read the original cube bridge, action protocol, and worker before making this split. The useful precedent is separation of page lifecycle and rendering. This reader does not need a worker or a published package.

- `CampusHome.astro` now gets article metadata only. It renders `RecipeShelf.astro` and `TabletReader.astro`; it does not call `entry.render()` for every article.
- `campus-home.ts` bridges scene state and station routing. Its lazy `import('../campus')` remains intact. It passes the main element as `controlsRoot` to the scene owner's new options API.
- `dialog-shell.ts` owns native panel switching, close events, dismissal, and original focus restoration.
- `tablet-reader.ts` owns loading, cancellation, timeout/retry, tablet motion, and heading navigation.
- `reader-content.ts` validates the fragment envelope, rebuilds allowed HTML, and wires code/heading-link copying.
- `ReaderArticle.astro` renders the original MDX inside an inert template. It preserves the existing `Astro.locals.campusNewsletter = true` behavior and existing subscription link, now in the request context that actually renders the article.
- `pages/article-fragments/[...slug].html.ts` statically generates fragments only for published, non-future articles. It uses Astro's build-time container with the MDX renderer. The generated worker endpoint is a prerender-only stub. No container code runs in the browser or deployed fragment request.
- `tablet-reader.css` owns the shelf and reading styles. Old reader rules were removed from `campus.css`; room and station styles remain there.

The static endpoint was chosen over an iframe to keep one focus/scroll context, and over standalone-page extraction to avoid fetching site chrome, newsletter islands, and an unrelated embedded workbench. It uses the original `Content` component. There is no authored summary or invented lesson segmentation. Astro's container API is experimental; this dependency is confined to the static endpoint. See the [Astro container reference](https://docs.astro.build/en/reference/container-reference/).

Fetches use a same-origin URL, same-origin credentials, an abort signal, and no redirects. HTTP errors, wrong content type, or a missing/mismatched fragment envelope produce the recovery view. A request has a 15-second deadline. Closing or changing recipes aborts the request immediately; session identity also rejects late responses from transports that ignore abort.

Fetched markup is never inserted as executable HTML. A fresh DOM is built from allowed tags/attributes. Scripts, stylesheets, event handlers, frames, forms, unsafe URL protocols, and island hydration attributes are excluded. Shiki token color styles, semantic article HTML, code-copy controls, and server-rendered widget text survive. Current published MDX widgets need only the existing newsletter link. An arbitrary future client widget would need an explicit integration; it is not silently hydrated from fetched code.

Fragment responses contain `noindex` metadata and are absent from the generated sitemap. Standalone canonicals and the crawlable archive remain unchanged. This fixes homepage weight; it does not adopt the earlier review's overstated duplicate-content blocker or undo the already-fixed newsletter behavior.

## Payload evidence

Measured the existing base build before editing, then the final production build. Gzip figures use Python's `gzip.compress`, not an HTTP transfer measurement. The shared checkout also includes the other owner's robot changes, so these are whole-homepage totals.

| Homepage artifact | Before | After |
| --- | ---: | ---: |
| HTML bytes | 177,521 | 28,582 |
| Gzip bytes | 34,047 | 7,937 |
| Full article bodies | 3 | 0 |

HTML is 83.9% smaller; gzip is 76.7% smaller. The final homepage contains zero React islands. The earlier newsletter fix already kept those article widgets static, so no additional React download reduction is claimed here.

On demand, the Protobuf fragment is 72,283 bytes, the dev environment fragment 73,459 bytes, and Hello World 4,354 bytes. All three contain zero script tags. Opening the shelf alone does not fetch article bodies. See [payload.json](../../output/tablet-reader-v2/payload.json).

## Verification

Production verification used a loopback static server on port 4324 and the T3 collaborative browser. Build and tests used placeholder database configuration and a local view-counter URL. No production subscriptions, contact forms, or inference endpoints were submitted.

```sh
DATABASE_URL=https://ci-build.invalid \
DATABASE_AUTH_TOKEN=ci-placeholder \
PUBLIC_VIEW_COUNTER_API=http://127.0.0.1:4324/__fixtures/views \
bun run --cwd apps/timsexperiments build

cd apps/timsexperiments
DATABASE_URL=https://ci-build.invalid \
DATABASE_AUTH_TOKEN=ci-placeholder \
PUBLIC_VIEW_COUNTER_API=http://127.0.0.1:4324/__fixtures/views \
bun test
```

- Build passed, including Astro checking with **0 errors, 0 warnings**, and 35 hints. Existing build warnings include chunk sizes and automatic Node externalization. [Build log](../../output/tablet-reader-v2/build.log).
- Earlier site suite passed: **260 tests, 0 failures, 775 assertions across 53 files**. After the scene owner's concurrent changes, the final integration rerun reports **262 pass, 1 fail, 862 assertions across 53 files**. `src/scripts/campus/campus.test.ts:180` expects at most 22 textures but the world creates 26. This file belongs to the scene owner and was not modified here. [Latest test log](../../output/tablet-reader-v2/tests.log).
- `git diff --check` passed. After wiring `controlsRoot`, the final production preview started its scene successfully, the walk-pad toggle worked, and the tablet opened with an inert canvas.
- Browser text comparison matched all three tablet bodies to their static fragments, then matched fragment body text to the standalone article bodies after excluding page title chrome and the separately appended workbench. No article source was edited.
- All **25 code blocks** matched their source text exactly. Clipboard calls were intercepted locally to avoid replacing the user's clipboard. The copied value matched the `pre.textContent`; the denied-clipboard case displayed the manual-copy recovery message. Native clipboard permissions were not tested.
- Heading navigation selected Performance Comparison, scrolled to it, and focused the heading. Original heading buttons copy links to the standalone article, not the fragment endpoint.
- Keyboard opening by Enter worked. Tab traversal through the Protobuf article reached the footer without focusing background controls. Enter on Previous moved to the preceding heading. Escape restored the selected recipe link, then restored Read articles. The native select was exercised through the browser's select control; no cross-browser native-popup claim is made.
- Injected offline failure displayed a status, retry, and working standalone URL. Restoring fetch and retrying recovered.
- The 15-second request deadline produced the recovery view after 15,002ms with `aria-busy=false`. Injected HTTP 503 and a response without the expected fragment envelope also reached recovery.
- Scene instrumentation recorded zero WebGL draw calls during a 180ms tablet-open sample and 1,490 during a 180ms sample after Return. The canvas became interactive again, the recipe station control regained focus, and the explicit user pause state stayed false. These are interaction checks, not performance benchmarks.
- A delayed fetch was aborted by an immediate Shelf action. Opening Hello World and then resolving the old Protobuf response left Hello World displayed, with only one dialog open.
- Injected hostile fragment HTML did not execute scripts or handlers. Scripts, iframe/island nodes, JavaScript links, and data-image URLs were absent after insertion. Static widget text and Shiki token color remained. [Browser evidence](../../output/tablet-reader-v2/browser-checks.json).
- Standalone articles retain their canonical `/lab/<slug>/` URLs. Opening the existing newsletter target locally and activating its subscription button opened its dialog. No form was submitted.
- Reduced motion was checked with a local test server injecting the preference before application scripts and equivalent no-animation CSS. The tablet had zero animations, Escape returned immediately, focus restored correctly, and the scene remained user-paused. This tests the branch without changing OS settings. [Harness](../../output/tablet-reader-v2/motion-test-server.py).

Responsive measurements in CSS pixels:

| View | Page client / scroll width | Page client / scroll height | Tablet client / scroll width | Article viewport client / scroll width |
| --- | --- | --- | --- | --- |
| 320 × 740 | 320 / 320 | 740 / 740 | 302 / 302 | 290 / 290 |
| 390 × 844 | 390 / 390 | 844 / 844 | 372 / 372 | 360 / 360 |

The 390px code block measured 322px client width and 359px scroll width, intentionally contained within the code block. Body text remained 16px. Source-color contrast computations give 12.25:1 for body text, 11.51:1 for toolbar text, and 11.50:1 for article links on their opaque backgrounds. These figures do not audit every Shiki syntax token. [Contrast calculations](../../output/tablet-reader-v2/contrast.json).

## Screenshots

Desktop, 1280 × 900, showing the actual first-person room around the held tablet:

![Desktop tablet reader](../../output/tablet-reader-v2/desktop-1280.png)

320 × 740, article start:

![320px tablet reader](../../output/tablet-reader-v2/reader-320.png)

390 × 844, heading navigation and code-copy control:

![390px article and code](../../output/tablet-reader-v2/reader-390-code.png)

390 × 844, network failure and recovery:

![Network failure recovery](../../output/tablet-reader-v2/reader-390-failure.png)

## Remaining limits

No blocking reader issue remains in this scope. The current full-suite integration blocker is the scene texture-budget assertion described above; the scene owner needs to reconcile its world allocation and test budget before calling the whole checkout green. The initial dev preview's shared Vite cache returned `504 (Outdated Optimize Dep)`; production preview rendered the scene successfully. Three errors initially reported in the other owner's `browser-answer.test.ts` were subsequently resolved by that owner, and the final full build passes.

This is an accessible DOM tablet presented over the 3D room, not a new hand mesh or camera animation in the scene owner's renderer. The native modal provides focus isolation; its presentation and object motion changed. The long original articles still scroll, with heading navigation to skip directly to relevant sections. Reading position resets when a recipe is opened again.

Physical iOS/Android devices, Safari/Firefox, OS-level reduced-motion settings, screen-reader announcements, native clipboard permissions, production CDN behavior, offline caching, and field performance metrics were not tested. The existing scene and robot implementations were not audited here. Future interactive MDX beyond the current newsletter needs a deliberate trusted initializer or a standalone link.

Owned application edits are limited to CampusHome, the extracted shelf/tablet/article components, the site bridge and extracted modules, campus reader styles, and the static fragment endpoint. No edits to `scripts/campus`, RobotHost/RobotConversation, robot/chat scripts, or SerializationBench were made by this task. Their independent shared-checkout changes were preserved.
