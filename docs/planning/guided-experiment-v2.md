# Guided serialization experiment v2

Implemented on `feat/3d-site-transformation`, starting from the supplied
`52edd372` base, on 2026-10-21. No commits, pushes, deployments, package installs,
or delegated agents. The shared checkout has other active owners. Changes here
are confined to SerializationBench, its child stylesheet, playground modules,
and this document.

## Direction and interaction

The first view presents a prediction and real starting byte counts. It does not
show the JSON editor, schema, long explanations, or wire dumps. The existing
black, gray and mint module styling stays local to the bench. Numbered steps
carry progress; the current activity has one heading and one main action.
Mobile uses the same flow with wrapping record values and 44px controls.

1. Predict which format changes more. Any choice advances; skipping is allowed.
2. Manipulate Pixel's concrete record. Add/undo an emoji, add/remove stargazing
   hobbies, or clear/restore values. Lesson controls are bounded to eight added
   emoji and eight added hobbies. The sandbox retains the serializer's full limits.
3. Run the existing synchronous evaluator. Counts and deltas appear immediately;
   a 450ms bar reveal shows their computed relative lengths. There is no simulated
   execution, delayed outcome, timing score, countdown, or speed claim.
4. Check the actual decoded values and the three existing round-trip checks.
   Next challenge clears the result and prediction. After defaults, replay starts
   challenge one. Restart resets the current challenge. Restart, next challenge, and replay also
   collapse the opt-in inspectors.

The step buttons allow direct access. An unmeasured Measure or Check view offers
Run comparison rather than fabricated output. Back retains a valid measurement;
changing the record invalidates it. Sandbox and Skip lesson are available without
answering a question. Returning preserves the lesson, including a still-valid
measurement. Sandbox keeps its separate draft, but clears its result on a mode
switch. Clear editor, reset, recipes, validation errors, and both wire inspectors
remain available there. Reconnect starts the lesson over and retains the editor
value, with no stale result or completion status.

`lesson.ts` owns the small pure transition model and prediction arithmetic.
The custom element owns DOM updates, focus, animation cleanup, and the unchanged
`serialization-result` event. The existing serializer and event types are reused
without changes. Completed snapshots remain deeply frozen. Edits, clear/reset,
next/restart, errors, mode changes, and disconnect publish null. A valid lesson
snapshot is republished when returning to it. No scene globals or layout
measurements are needed to initialize, including inside a closed dialog.

## Measurements checked

The actual evaluator produces these fixture values. Deltas compare with Pixel's
107-byte compact JSON and 68-byte Protobuf starting record.

| Record                   | JSON bytes | Protobuf bytes | JSON delta | Protobuf delta |
| ------------------------ | ---------: | -------------: | ---------: | -------------: |
| Add one 🐶               |        111 |             72 |         +4 |             +4 |
| Add one stargazing hobby |        120 |             80 |        +13 |            +12 |
| Empty values and list    |         43 |              0 |        -64 |            -68 |

Predictions compare computed deltas, including an unchanged or undone record.
They do not assume the expected activity was performed. Checks inspect actual
statuses and can display failure. Proto3 default restoration checks values,
not explicit scalar presence. Hex and decoded data use textContent.

## Verification

Commands run from the repository root:

```sh
bun test apps/timsexperiments/src/lib/playgrounds
./node_modules/.bin/tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022,DOM,DOM.Iterable --types bun-types --skipLibCheck apps/timsexperiments/src/scripts/playgrounds/serialization-bench.ts apps/timsexperiments/src/scripts/playgrounds/serialization-bench.browser.ts apps/timsexperiments/src/lib/playgrounds/lesson.test.ts apps/timsexperiments/src/lib/playgrounds/serialization.test.ts
bunx --no-install astro check --root apps/timsexperiments
```

- Unit tests: 58 passed, 120 assertions. This includes 51 existing serializer
  tests, the complete independent wire fixture, malformed wire data, Unicode,
  int32 limits, input bounds, deliberate round-trip failures, and seven new
  transition/lesson tests. No serializer tests were removed or mocked.
- Browser: the real Astro dev server already running at `127.0.0.1:4321`.
  T3 collaborative preview, Chromium 154, desktop user agent at resized CSS
  viewports. No new server was started or stopped.
- Ran the real-component browser verification module at 320×740, 390×844,
  and 1280×900, and on the standalone article at
  `/lab/json-vs-protobuf/#article-serialization`. The final module has 27 passing
  assertions for records, actual counts, repeated run IDs, frozen events,
  null invalidation, cleared collapsed inspectors, back/edit, skipped predictions,
  next/replay/restart, direct sandbox access, invalid JSON, invalid int32, recipe
  error preservation, reset recovery, HTML-looking data, defaults, two independent
  instances, initially closed native dialog initialization, three reconnect cycles,
  draft retention, and disconnect.
- Real keyboard inputs at 320px: step navigation focuses its heading; Tab reaches
  Add emoji with a visible outline; Enter changes the record; subsequent Tab/Enter
  runs without moving focus away from the run control. Enter advances to Check.
  Tab/Enter opens Explore and the wire inspector, then Tab focuses its pre.
  ArrowRight moved the pre's scrollLeft from 0 to 40. Its scroll/client widths
  were 378/186px, while bench scroll/client widths both remained 240px.
- At 390px, sandbox error submission focused the textarea, set aria-invalid,
  and retained unique help/error references. Actual screen-reader speech was
  not tested. Completion uses the polite atomic status region.
- Dialog bench scroll/client widths matched at 320, 390, and desktop. At 320px
  the final default bench is about 614px tall inside the existing dialog shell;
  normal dialog scrolling remains necessary. No new nested lesson scroller.
  Wire dumps retain white-space: pre, horizontal scrolling, focus, and capped
  vertical height. At 390px article wire scrolling reached 60px with 378/318px
  scroll/client widths and no bench overflow.
- Reduced-motion script branch: temporarily supplied a matching media query in
  the browser, ran all 27 checks, and observed zero Element.animate calls, then
  restored the native APIs. This checks the guard, not OS-level media emulation.
  Ordinary runs animate only the already computed bar lengths. Reset/edit and
  disconnect cancel active animations. No CSS width transition leaves stale bars.
- Contrast computed from the opaque source colors: body text 18.89:1, muted text
  on panel 8.73:1, primary button text 7.67:1, control border on panel 3.51:1,
  pass text on background 12.07:1. This is not a complete contrast audit of every
  host or interaction state.

The full Astro check initially passed with zero errors and 35 hints outside this
work. A later run during concurrent edits reported two errors in
`src/lib/resume/browser-answer.ts`, at the then-current lines 161 and 167, involving
an inferred never parameter and a missing relevance field. That file is outside
this task's ownership. Final strict standalone TypeScript check passed. The final full Astro check
still reported those two errors, at lines 161 and 169, zero warnings, and 35
hints. No diagnostics were reported in the bench or playground modules.

## Screenshots inspected

These are local T3 browser artifacts, not added repository assets. Viewport sizes
are CSS pixels; captured images can have a higher device-pixel ratio.

- [320px dialog prediction](/Users/tim/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-mvighoa2-b978a90f.png)
- [320px keyboard wire inspector](/Users/tim/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-mvig6rq9-a707ad19.png)
- [390px measured comparison](/Users/tim/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-mvigc9zb-a2a21c57.png)
- [1280px dialog prediction](/Users/tim/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-mvighw9g-b8165f81.png)
- [1280px standalone article](/Users/tim/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-mvig98es-6a587582.png)
- [390px standalone byte inspector](/Users/tim/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-mvig9iww-6c6f915e.png)

## Limits and handoff

The surrounding standalone article has horizontal overflow outside the bench.
Its benchmark table reaches about 410px at 320px and 390px viewport widths. The
bench itself measured 302/302px scroll/client width at 320px and 372/372px at
390px. This article/global layout was left unchanged under the ownership rule.

The existing dialog shell adds its own heading and sticky close bar. The bench
keeps flow layout; small screens still scroll vertically through results and
opt-in inspectors. Shared-checkout HMR occasionally closed the dialog or detached
a control during multi-call browser checks. Retrying on current markup and the
synchronous fixture checks succeeded. No cross-browser, physical touch device,
VoiceOver/NVDA, browser text enlargement, production build, or deployment was
performed. Reduced-motion behavior was checked as described above, not through
an OS preference. No full WCAG conformance claim.

CampusHome, campus-home, scene, robot, reader, and global styles were not edited
by this task. Their concurrent modifications remain untouched.
