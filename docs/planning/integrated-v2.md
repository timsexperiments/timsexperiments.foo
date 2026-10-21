# Combined v2 integration validation

October 21, 2026. Shared checkout `feat/3d-site-transformation`, base `52edd372`.
The requested eight handoff documents were read before testing. No commits,
pushes, deployments, package installations, new agents, model downloads, email
launches, contact submissions, or newsletter submissions were performed.

The non-scene integration checks pass. The standalone article overflow is
repaired, and built-output crawl/redirect regressions are in place. This is a
tested tree for parent review, **not a release approval**. The completed
[renderer review](renderer-independent-v2.md) reports three P2 findings for the
parent to resolve. Scene files were not edited or independently deep-audited.

## Changes owned by this integration pass

- `apps/timsexperiments/src/components/Prose.astro`: scope intrinsic sizing and
  wrapping to article prose; give tables and code local horizontal scrolling;
  preserve unbroken benchmark values. Remove the unused table padding utility.
  No page-level clipping, MDX content changes, or lesson styles were added.
- `tools/seo/validate-dist.test.ts`: extend the existing fragment test to reject
  built robots rules that block any generated fragment, including wildcard and
  end-anchored paths. Crawlers must fetch the fragment to read its `noindex`.
  Also assert the actual built `/campus / 301` redirect and the `/campus` and
  `/article-fragments/*` worker-route exclusions.
- This handoff document. Reproduction code, logs, measurements, and screenshots
  live in `output/integrated-v2/` as local review artifacts.

All other source changes and planning notes belong to the completed owners.
`tools/seo/` was already untracked when this pass began. Preserve its whole
implementation when selecting files for PR38. Do not add the compiled snapshot
or unrelated existing `output/` and `tmp/` artifacts to the PR by accident.

## Build and test evidence

Commands were run from the repository root with the exact requested placeholders:

```sh
DATABASE_URL=https://ci-build.invalid \
DATABASE_AUTH_TOKEN=ci-placeholder \
PUBLIC_VIEW_COUNTER_API=http://127.0.0.1:4321/__fixtures/views \
bun run --cwd apps/timsexperiments build

DATABASE_URL=https://ci-build.invalid \
DATABASE_AUTH_TOKEN=ci-placeholder \
PUBLIC_VIEW_COUNTER_API=http://127.0.0.1:4321/__fixtures/views \
bun run test

DATABASE_URL=https://ci-build.invalid \
DATABASE_AUTH_TOKEN=ci-placeholder \
PUBLIC_VIEW_COUNTER_API=http://127.0.0.1:4321/__fixtures/views \
bun test tools/seo/validate-dist.test.ts
```

- Fresh combined production build passed, then passed again after the article
  styling fix. Final Astro checking: **0 errors, 0 warnings, 35 hints across 168
  files**. Existing bundler warnings about automatic Node externalization and
  large chunks remain. See [build-final.log](../../output/integrated-v2/build-final.log).
  The parent's earlier host type fixes are included; worker notes reporting
  those two TypeScript failures are stale.
- Workspace tests: **5/5 tasks successful, 304 tests, 0 failures, 1,062 assertions**.
  Site: 288 tests/1,034 assertions; http: 10/19; views-client: 2/3;
  view-storage: 3/5; view-counter: 1/1. See
  [workspace-tests.log](../../output/integrated-v2/workspace-tests.log).
- Final built-output SEO suite: **11 passed, 0 failed, 51 assertions**. See
  [seo-tests.log](../../output/integrated-v2/seo-tests.log).
- Negative control: temporarily appended `Disallow: /article-fragments/` to
  **built** robots.txt, observed the fragment test fail, and restored it in a
  `finally` block. The restored suite passes. Source robots.txt was not changed.
  See [seo-crawl-negative-control.log](../../output/integrated-v2/seo-crawl-negative-control.log).
- `git diff --check` passed. The owned Prose diff and the extended SEO checks
  were inspected. Tests were not added for the reversible CSS declarations;
  browser measurements verify their actual effect.

Generated `_redirects` contains `/campus / 301`. Generated `_routes.json`
excludes `/campus` and `/article-fragments/*`; there is no `campus/index.html`.
Built robots.txt has `Allow: /` and no fragment Disallow. All three fragment
files begin with `noindex` and remain absent from the sitemap. This verifies
the generated hosting configuration, not a live Cloudflare HTTP redirect.

## Compiled browser verification

T3 collaborative preview was used first, with CSS viewports **320×740,
390×844, and 1280×900**, DPR 2. A private copy of the fresh build avoids shared
HMR and changing hashed assets. An integration-owned server remains available
for parent review:

```sh
python3 -m http.server 4350 --bind 127.0.0.1 \
  --directory output/integrated-v2/site
```

URL: `http://127.0.0.1:4350/`. Exec session: `82217`. This serves a compiled
snapshot, not live source. No pre-existing server was stopped or modified.
The static server does not implement the contact API or Cloudflare redirects.
Its contact capability GET returns 404 and the UI correctly offers an email
draft. Standalone view tracking used a loopback URL only and returned 404.

[integration.browser.js](../../output/integrated-v2/integration.browser.js)
exercises the real registered components. It imports the existing bench browser
verification module, bundled locally with installed Bun, and adds live root,
reader, host, contact, and page geometry assertions. It uses DOM activation,
injected network failures, and an intercepted clipboard. It does not replace
the serializer or local answer selector.

**70 checks passed at each of the three sizes**, including the following:

- Reader loads the original Protobuf article; contents, Previous and Next move
  and focus headings; code copy matches the full `pre.textContent`; Return
  restores the directory control. A throwing fetch produces recoverable failure
  and retry loads Hello World. Separate trusted Escape checks return to Shelf
  and then the room. Return motion is asynchronous, so verification waits for
  the dialog to close before inspecting focus.
- Lesson prediction/change/run/check/back/skip/sandbox/error/reset/replay paths
  pass the existing 27 assertions, including independent instances and
  reconnects. A live workbench run publishes a deeply frozen 111-byte JSON /
  72-byte Protobuf result. Back retains it; editing publishes null. Defaults
  and hobby challenges measure 43/0 and 120/80 respectively. Real Enter input
  at 320px also selected a prediction, added the emoji and ran the comparison;
  all three round-trip checks passed.
- At every size, the host answers Houston and Georgia Tech with completion
  uncertainty attached to Georgia Tech, refuses Harvard, and returns direct
  confirmation-needed replies to `Is Tim available?` and `Can Tim start?`.
  Counterpart availability retains routing evidence. Availability between a
  routing question and `Tell me more` preserves that prior topic. The exact
  database-availability tradeoff question retains its qualified answer.
- During each nine-question sequence, fetch, XHR, beacon, WebSocket,
  EventSource and Worker creation were replaced by throwing recorders after
  assets loaded. **Zero API calls and zero new resource requests** occurred.
  Full source disclosures retain the application-database tradeoff and the
  conditional 500ms metric limit. Conversation clear is scoped to the host,
  avoiding the workbench's separate `data-clear` control.
- Contact fields were filled with local test text. Copy produced the exact
  message/name/reply-to draft and retained the inputs. Neither Submit nor the
  email-app action was activated. Clipboard interception avoided changing the
  user's clipboard.
- Every modal makes the scene inert; returning restores scene focusability
  and preserves explicit user pause. Desktop focused keyboard-event fixtures
  changed the first-person view; before/after screenshots were inspected.
  Paused WebGL draw count remained zero over a 250ms sample. This is an
  interaction check, not a frame-rate measurement.

Raw checks, geometry, and visible host replies:
[browser-checks.json](../../output/integrated-v2/browser-checks.json).

Campus document client/scroll widths and heights matched at all tested sizes,
including with source details expanded. Dialog horizontal client/scroll widths:

| Viewport | Tablet | Lesson | Host | Contact |
| --- | --- | --- | --- | --- |
| 320×740 | 302/302 | 282/282 | 282/282 | 282/282 |
| 390×844 | 372/372 | 352/352 | 352/352 | 352/352 |
| 1280×900 | 1078/1078 | 998/998 | 998/998 | 998/998 |

Tall contact content and the 320px lesson intentionally scroll vertically
inside the dialog. They do not make the campus document scroll.

The standalone article previously measured **320/410px** document client/scroll
width. Final article document widths are **320/320, 390/390, and 1280/1280**.
The benchmark table now scrolls locally at **304/402px** and **374/402px**, with
98px and 28px reachable horizontal scroll respectively. Long numbers remain
intact. At 320px the first code block is **304/420px**, with 115.5px reachable
scroll. At desktop the table fits its 820px prose column. Table, row, header,
and cell markup remain intact. See
[input-and-article-results.json](../../output/integrated-v2/input-and-article-results.json).

## Browser fallback and reduced motion

After the main T3 matrix passed, the preview disconnected during reduced-motion
navigation. Raw failures were `Preview automation navigate timed out after
15000ms.`, `Preview automation status timed out after 15000ms.`, and
`No preview automation host is available ...`. Retrying status and preview_open
did not recover it. No application failure was inferred from that connection
loss.

The available Chrome computer-use connector opened an isolated fallback tab.
A local copy of production HTML injects a matching reduced-motion query before
application scripts and equivalent no-animation/no-transition CSS. The full
70-check harness passed at its native 1504×879 viewport, with **zero
Element.animate calls** and user pause remaining true. This checks the script
guards and an equivalent CSS branch, not OS-level preference handling. See
[reduced-motion-results.json](../../output/integrated-v2/reduced-motion-results.json)
and [fixture](../../output/integrated-v2/reduced-motion-fixture.html).

Chrome fallback also verified trusted held W/J input at 320px, pointer drag-look
at 320/390px, held Walk forward at both sizes, and Pause scene. All four walk
buttons measured 44×44px and no held state remained after release. The viewport
override was reset and the temporary tab closed. These are desktop browser
input checks, not physical touch-device testing.

## Inspected screenshots

- [320px article, table scrolled right](../../output/integrated-v2/article-320-scrolled.png)
- [390px reader contents and copy feedback](../../output/integrated-v2/reader-390.png)
- [390px lesson](../../output/integrated-v2/lesson-390.png)
- [320px host conversation](../../output/integrated-v2/host-320-conversation.png)
- [Desktop reader](../../output/integrated-v2/reader-desktop.png)
- [Desktop before movement/look](../../output/integrated-v2/scene-desktop-before.png)
- [Desktop after movement/look](../../output/integrated-v2/scene-desktop-after-move-look.png)

The host screenshot shows the transcript viewport near its earlier turns; the
expanded source text and geometry are verified in the harness/JSON, not shown
in that screenshot. Screenshots are evidence of the captured state only.

## Parent disposition still required

The renderer review finished during this pass. Its three reported P2 issues are
resource cleanup for shadows/instances, budget enforcement at large/edge
viewports, and a moving head caster in a frozen shadow map. Its report also
documents an inherited context-restoration limitation and corrections to the
mobile-rendering narrative. Parent must resolve or explicitly dispose of these
findings and rerun the affected renderer regressions before release. No scene
edit was made under this task's ownership restriction.

PR38 is registered with this T3 thread. There was no commit, push, deployment,
PR content update, or watcher. Parent retains final git selection and publishing.
Source/built artifact hashes are in
[artifact-hashes.json](../../output/integrated-v2/artifact-hashes.json).

No physical iOS/Android, Safari/Firefox, screen-reader speech, native clipboard
permissions, OS reduced-motion, browser text enlargement, sustained GPU/thermal
performance, optional WebLLM execution, CDN behavior, or full WCAG conformance
claim is made. Default local answering after assets load is verified; offline
first visit/reload is not. The local static preview does not verify direct
contact delivery or an email client. These limits do not change the green
non-scene build, workspace tests, SEO checks, and browser integration results.

## Parent final integration, 2026-10-21

The three renderer findings above are repaired; see renderer-review-fixes-v2.md. Parent matched all five source hashes in that report before the final combined build. A fresh Astro build passed with 0 errors, 0 warnings and 35 hints. All 307 workspace tests passed with 1,768 assertions; the 11 built-output SEO tests passed with 51 assertions. git diff --check passed.

The T3 browser loaded this fresh dist at localhost:4351 in a 390x844 viewport. The title is TimsExperiments, the scene canvas is 780x1688, and the document stays 390x844 without page overflow. Entering the room preserves the first-person canvas. This is a bounded post-repair smoke check; the detailed interaction checks above refer to the earlier compiled snapshot. Physical-device performance and WebGL context restoration remain unverified.
