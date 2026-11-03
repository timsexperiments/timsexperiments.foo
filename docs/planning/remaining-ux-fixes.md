# Remaining UX fixes after the browser audit

Source: game-ux-audit.md, 2026-10-21. Do not duplicate active owners.

- After Antigravity night-scene task finishes, delegate a focused scene-controls pass: visible touch walking, keyboard-only look, release movement on cancel/blur/modal/visibility change. Preserve station shortcuts and first-person view.
- After readable-game-shell task finishes, verify raycast-opened dialogs restore canvas focus instead of the recipe dock; reader-to-workbench transitions need a visible return target. Check sticky reader exit after long scroll.
- Robot redesign is active separately. Validate question field appears before secondary model details at320x568 and390x844.
- Final integrated browser pass: all four physical scene targets, wheel/keyboard no document scroll, internal panel scroll, readable intro contrast, reduced motion, 200% zoom. Real touch/virtual keyboard still unverified.
- Stamp uses original favicon flask and was visually verified desktop/mobile. Parent corrected missing space in mobile letter heading after audit.
- Local model runs on GPU, but both sampled answers were withheld by grounding checks. Improve answer quality separately; do not weaken grounding to hide this finding.
