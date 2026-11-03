# Scene and dialog focus regression

Scope is `apps/timsexperiments/src/scripts/site/campus-home.ts` and this note on `feat/3d-site-transformation`. No shell, CSS, component, room, or robot edits.

## Behavior

Dialog origins distinguish scene interactions from visible controls. Closing a scene-opened station restores the canvas while exploring. A dock or header opener restores that exact control. Opening an article retains the shelf's original return target. Reader Escape and Back return to the shelf. The reader's Workbench CTA uses the visible Workbench dock as its eventual return target, never the hidden reader CTA.

A destination modal opens before the previous modal closes. Managed closes consume their queued native close events, so a dialog switch cannot restore background focus or call the scene's pause update between panels. Escape, Close, and backdrop dismissal finish accessibility, pause, and focus updates synchronously. A delayed native close event cannot steal focus after the user has moved on. Actual dismissal still cancels pending station opens.

## Verification

Used a separate local Chrome browser against `http://127.0.0.1:4321/`, with the already installed `/tmp/campus-pw-test/node_modules/playwright-core`. No dependencies were added. T3 opened a dedicated tab, but both snapshots failed with `Preview automation snapshot timed out after 15000ms.`, so testing used the documented fallback. Browser HMR was disabled only in the test tab after shared-tree reloads interrupted earlier attempts. Software WebGL rendered the actual room; reader checks used reduced motion.

The actual workbench monitor at desktop scene coordinates 555,385 opened the workbench through its raycast. Escape restored the canvas, removed inert, restored tabindex 0 and aria-hidden false. W then advanced the viewpoint without a refocus click. Before/after screenshots were visually inspected. Tab left the canvas for Pause. Every station dock and the header contact control restored its own opener.

Final browser runs passed on the synchronous-dismissal implementation. Reader checks covered 1280x800, 390x844, 320x568, and 1280x480. Actual wheel input scrolled the reader by 5,000 px at each size. Close remained at viewport top 29 px and bottom 67.5 px, stayed clickable, and restored the Recipe dock. Reader Escape and Back returned to the shelf. Shelf close restored its original Recipe dock. Reader Workbench CTA opened the workbench, whose Escape restored the visible Workbench dock. Focus-event logs showed no background focus during shelf-to-reader or reader-to-workbench switches. Canvas remained inert during the modal. Document height equaled viewport height, with scrollY zero at all four sizes. The narrow reader screenshot was visually inspected.

Final existing suite passed with 196 tests and zero failures. Final Astro check passed with zero errors, zero warnings, and 32 existing hints. An earlier production build passed. The final production build failed in the concurrently edited, separately owned robot worker: `[vite:worker] Invalid value "iife" for option "worker.format" - UMD and IIFE output formats are not supported for code-splitting builds.`, at `src/scripts/robot/inference.worker.ts?worker`. This task did not edit that worker or build configuration.

Temporary scripts and evidence live under `/tmp/campus-pw-test/focus*.cjs`, `/tmp/focus-*.log`, and `/tmp/focus-*.png`. No screen reader or physical mobile-device session. No contact submission, dependency change, commit, or deployment.
