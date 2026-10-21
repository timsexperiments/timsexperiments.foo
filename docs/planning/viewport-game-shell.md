# Viewport homepage handoff

Scope: `CampusHome.astro`, `campus.css`, `campus-home.ts`, and this note. Shared checkout, branch `feat/3d-site-transformation`. No dependency changes, commits, deployment, or contact submissions.

## Changes

The homepage uses a safe-area-aware viewport grid. Header, directory, and footer remain reachable without document scrolling. The entrance can scroll internally if enlarged text or a smaller viewport needs it. Dialogs retain their own scrolling and contain overscroll. Mobile station labels use a compact two-column layout; short desktops use a shorter introduction.

The intro now says exactly "I'm Tim, a software engineer available for freelance and fractional work." A 97% dark panel backs bright text while the room remains visible elsewhere. Worst-case paragraph contrast is approximately 16.9:1, computed from source colors against white scenery. Other new shell copy uses direct descriptions. Published article content is unchanged.

Canvas is inert and its tabindex is -1 whenever aria-hidden is true, including before exploration and during station dialogs. Exploration restores tabindex 0. Canvas Tab exit, reader copy buttons, Escape back to shelf, focus restoration, pause, and reduced-motion initialization remain intact. Shell keyboard handling prevents page scroll while leaving dialog and native control behavior available.

## Verification

Separate local Playwright Chrome browser, not the parent's browser/tab. T3 opened a dedicated tab but snapshot failed twice with `Preview automation snapshot timed out after 15000ms.` Used already installed `/tmp/campus-pw-test/node_modules/playwright-core`, without adding dependencies. Software WebGL flags enabled the actual room in the final visual pass. Final repeat used reduced motion to avoid continuous software rendering. Earlier repeats encountered shared dev-server reloads; the final run completed successfully at every size.

Responsive sizes: 320x568, 390x844, 1280x800, and short desktop 1280x480. Checked document scroll height equals viewport height and width, wheel/Space/ArrowDown do not move the document, and essential action bounds remain inside the viewport. All station dialogs open and close; article panels scroll internally. Reader code copy announces success, Escape returns to shelf, close restores directory focus, canvas Tab moves to pause, and pause/reduced-motion states update.

Automated suite: 193 pass, 0 fail. Astro check and production build passed with zero errors. Existing hints and Browserslist data-age advisory remain.

Browser evidence and temporary checks are in `/tmp/viewport-320x568.png`, `/tmp/viewport-390x844.png`, `/tmp/viewport-1280x800.png`, `/tmp/viewport-1280x480.png`, `/tmp/viewport-results-final.log`, and `/tmp/campus-pw-test/viewport.cjs`.

No screen reader or physical mobile device session. No email or API submissions. Room visuals, robot internals, and LetterStation are owned by other agents and were not edited.

Final screenshot review covered all four sizes with the room rendered, including the short desktop. Intro text remains readable over the room, directory labels fit, and essential controls remain visible.
