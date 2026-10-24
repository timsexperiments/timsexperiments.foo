# Final audit fixes

2026-10-21, `feat/3d-site-transformation`. Resolves the three findings in `final-integrated-audit.md`.

## Disposition

1. **Newsletter behind the native reader: resolved.** `CampusHome.astro` sets a typed request-local campus newsletter flag. `Subscribe.astro` renders a native link in that context. Both embedded articles open the existing `/lab/json-vs-protobuf#newsletter` destination in a new tab, keeping the campus reader available. The accessible link name announces the standalone article and new tab. This is a shared newsletter destination, including when opened from the development-environment article. The visitor activates the newsletter button there to open the existing form. No new subscription endpoint or delivery behavior.
2. **Hidden newsletter widgets hydrating on arrival: resolved.** The campus branch renders static HTML at the server, before any hydration. No CSS suppression or post-hydration DOM removal. Initial homepage browser inspection found zero Astro islands and no React, Radix, or subscription requests. Production HTML for both `/` and `/campus` also contains zero islands and two static newsletter links. Each affected standalone article still contains exactly one `SubscriptionDialog` island.
3. **Letter labels, placeholders, and Copy letter contrast: resolved.** Labels and placeholders now use `#596650`, computed at **5.02:1** against opaque paper `#eee9d8`. Copy letter uses `#52634f`, **5.31:1**. Calculations use WCAG sRGB relative luminance. Browser computed styles match these source colors at desktop and mobile sizes. The message textarea now has a visible, compact `Your message` label with its existing `for` association. Paper composition and delivery behavior remain intact.

## Integration choice and scope

The MDX articles import `Subscribe.astro` explicitly. A `Content` components map is not the appropriate replacement seam for those imports. Passing a prop to the MDX Content component also does not forward that prop to its imported Subscribe children. A typed `Astro.locals.campusNewsletter` flag supplies request context without editing article prose or relying on URL detection. Standalone requests leave the flag unset and use the existing React dialog.

The standalone anchor wraps the widget without changing its text. The existing Radix trigger was a focusable span; it is now a native `button type="button"`, preserving the styling and dialog flow while supporting Enter and Space. This is the only React implementation change.

Files changed for this fix: `CampusHome.astro`, `LetterStation.astro`, `Subscribe.astro`, `subscription/dialog.tsx`, `src/env.d.ts`, and this document. No article source, scene/chat code, contact scripts, or server delivery code changed. Existing shared-checkout changes were retained. No dependencies, commits, deployment, secrets, or model work.

## Actual verification

Owned T3 tab `tab_1p_09004dc4-0001-41b1-86f7-ea319f4aba93` opened the local homepage successfully. Snapshot and evaluation succeeded. Two real click attempts on the article entry, first with a locator and then a CSS selector, both returned exactly `Preview automation click timed out after 15000ms.` Switched to the already installed `/tmp/campus-pw-test/node_modules/playwright-core` with a separate headless Google Chrome process. No user tab was operated. HMR WebSockets were closed only in the fallback test context. Reduced motion was enabled. POST requests were blocked and counted; none were attempted.

Browser assertions exercised:

- Protobuf reader newsletter link by actual pointer click; development-environment reader link by keyboard Enter, after Tab/Shift+Tab confirmed the link's place in focus order.
- Both links opened the existing standalone newsletter anchor in a new tab. The form was visible and interactive outside any native reader dialog. Pointer and keyboard activated its native trigger.
- Focus entered the form and remained inside for twelve successive Tab presses. Escape dismissed the subscription dialog and restored the newsletter button. Closing the new tab preserved the original reader and focused newsletter link. Escape returned to the recipe shelf with its close button focused, then another Escape closed the shelf.
- The development-environment standalone article independently retained its hydrated newsletter form and Escape/focus recovery.
- Letter desk at 1280×800, 390×844, and 320×568. Visible message label, matching computed colors, no horizontal overflow in paper or dialog, field focus, vertical scrolling to lower controls, and Escape. At 320px the development toolbar intercepted the dock pointer target; the test used native focus and Enter for that station entry. This toolbar is a dev-only overlay.

Screenshots were visually inspected for newsletter form, desktop paper, and mobile upper/lower paper. The new label fits above the ruled textarea. Mobile paper remains vertically scrollable. These checks do not establish full WCAG conformance, screen-reader behavior, or physical-device keyboard behavior.

```sh
DATABASE_URL=https://ci-build.invalid DATABASE_AUTH_TOKEN=ci-placeholder PUBLIC_VIEW_COUNTER_API=http://127.0.0.1:4321/__fixtures/views bun run --cwd apps/timsexperiments test
DATABASE_URL=https://ci-build.invalid DATABASE_AUTH_TOKEN=ci-placeholder PUBLIC_VIEW_COUNTER_API=http://127.0.0.1:4321/__fixtures/views bun run --cwd apps/timsexperiments build
```

- 199 tests passed, zero failed, 477 assertions across 52 files. Includes existing campus and letter behavior tests. Newsletter integration assertions ran against the actual browser and production HTML because the existing Subscribe tests only check file existence.
- Final app build passed, including Astro check with zero errors, zero warnings, and 32 existing hints. Existing chunk-size and Browserslist advisories remain.
- `git diff --check` passed.

Evidence: `/tmp/final-fixes-tests.log`, `/tmp/final-fixes-build.log`, `/tmp/final-fixes-browser.log`, and reproducible browser script `/tmp/campus-pw-test/final-fixes.cjs`. Screenshots `/tmp/final-fixes-newsletter-pointer.png`, `/tmp/final-fixes-newsletter-keyboard.png`, `/tmp/final-fixes-letter-1280.png`, `/tmp/final-fixes-letter-390.png`, `/tmp/final-fixes-letter-390-lower.png`, `/tmp/final-fixes-letter-320.png`, `/tmp/final-fixes-letter-320-lower.png`. Temporary fallback browser closes in a finally block. The preexisting local server remains running.

## Capacity

Applied the ai-usage skill for the requested fallback report. Codex OAuth measurement at 2026-10-21 09:22:23 UTC reported 27% weekly usage, **73% remaining**, reset **2026-10-27 06:31:57 UTC**, and 61,901.245 credits available. Primary-window usage was unavailable. The live T3 catalog lists `codex` / `gpt-5.6-sol` as available for child work without constraints. Usage is account-wide, not a separate guarantee of 5.6 capacity. No model fallback or delegation was needed.
