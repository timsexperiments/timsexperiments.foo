# Campus shell integration review

**Date:** 2026-10-21  
**Branch:** `feat/3d-site-transformation`  
**Scope:** `CampusHome.astro`, `campus.css`, `campus-fonts.css`, `campus-home.ts`, `lab/[...slug].astro`  
**Preview:** `http://127.0.0.1:4321/` (local dev server)

## Summary

The campus landing shell, in-dialog article reader, and standalone lab article route were exercised for responsive layout, keyboard/dialog behavior, copy-to-clipboard in the reader, and workbench attachment on the Protobuf article. Automated checks passed at **390×844** and **1280×800**. T3 preview snapshot/resize timed out once; verification used Playwright (Chrome, headless, temp install under `/tmp`).

## Visual / layout

| Viewport | Horizontal overflow (landing) | Horizontal overflow (exploring) | Station dock vs footer overlap |
| --- | --- | --- | --- |
| 390×844 | No | No | No (dock bottom ~810px, footer top ~834px) |
| 1280×800 | No | No | No (dock bottom ~772px, footer top ~788px) |

CSS updates: moonlit scene background/vignette, safe-area padding on fixed explore dock/footer, narrow-header contact button wrapping, article code-block copy control styling, `sr-only` utility on campus pages.

## Interaction flows

| Flow | Result | Notes |
| --- | --- | --- |
| Enter lab → canvas focus | Pass | `aria-hidden` goes from `true` → `false`; focus moves to `#campus-canvas` |
| Open recipe shelf dialog | Pass | Canvas `aria-hidden="true"` while modal open |
| Reader → Copy on first code block | Pass | `#reader-copy-status` announces “Copied code to clipboard” |
| Reader → Escape | Pass | Returns to recipe shelf (not bare close) |
| Dialog close → focus restore | Pass | Implemented via `lastTrigger` / first station button |
| Pause scene toggle | Pass | `aria-pressed` updates on `#toggle-scene` |
| Tab from canvas (exploring) | Pass (code) | Moves focus to pause control / directory; not re-run in Playwright this pass |
| `/lab/json-vs-protobuf` workbench | Pass | `#article-serialization` present once |

## Accessibility

- Skip link, scene instructions (`#scene-controls`), and dialog close/back controls retained.
- Canvas hidden from assistive tech until “Step inside” and while any station dialog is open.
- Reduced motion: scene auto-pauses when `prefers-reduced-motion: reduce` (existing behavior in `campus-home.ts`).
- Copy feedback uses live region `#reader-copy-status` (no toast dependency on campus).

## Copy / positioning

Welcome and header copy now state **freelance and fractional software engineering** without changing recipe article MDX. Original SVG logos and local Inter/Urbanist (`public/fonts/campus`) unchanged.

## Not tested / limitations

- No screen reader (VoiceOver/NVDA) session.
- No real pointer-drag camera walkthrough in 3D (owned by `src/scripts/campus/`).
- Letter desk submit/copy not exercised (no email or API sends by design).
- Contrast ratios not numerically measured; moonlit palette is visual-only in owned CSS.
- T3 `preview_resize` / first `preview_open` attempts hit 15s timeouts; later `preview_open` succeeded.

## Files touched (this pass)

- `apps/timsexperiments/src/components/campus/CampusHome.astro`
- `apps/timsexperiments/src/scripts/site/campus-home.ts`
- `apps/timsexperiments/src/styles/campus.css`
- `docs/planning/integration-review.md`

`campus-fonts.css` and `lab/[...slug].astro` reviewed; no content changes required for this pass.
