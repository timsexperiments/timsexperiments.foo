# Robot station UX review

2026-10-21. Scope: RobotHost.astro and scripts/robot/host.ts only. Shared shell, scene, global CSS, and letter station remain under their existing owners. Applied local-ui, its accessibility reference, and unslop to new copy. No dependencies, deployment, commits, or messages sent.

## Findings and changes

- High: the supplied screenshot places the question field below the oversized greeting, portrait, local AI explanation, and suggested questions. RobotHost.astro now starts with one greeting line and the labeled composer. Removed the portrait and introductory paragraphs. The existing shell title supplies context.
- High: download information competed with asking a question. The local AI disclosure now contains the download size, GPU requirement, data flow, cache notice, and explicit download action. Nothing downloads on opening the station. Progress, cancel, and model status are outside that disclosure, directly after the composer, so collapsing consent cannot hide pending feedback.
- Medium: suggestions occupied multiple rows before the task. Two short choices now sit behind “Try a question”; data-prompt preserves their complete original questions.
- Medium: nested transcript scrolling initially landed partway through a response. Restored its positioning context. Each response now starts with the visitor question and evidence opening. The transcript is the main bounded scroll area; the composer precedes it and remains reachable without scrolling through results.
- Medium: retrieved metadata included writing instructions intended for an assistant. The UI now gives one visitor-facing warning about search matches, dates, and qualifications. Full records, qualifications, source identifiers, and links remain available. Server/client schemas, model instructions, context selection, validation, and grounding gates are unchanged.
- Medium: disabling the textarea during requests dropped keyboard focus. It now becomes read-only while pending. Download starts focus Cancel; a model startup failure restores the question field if Cancel held focus. Error copy names the actual retry disclosure.

## Browser evidence

Before: user-supplied screenshot at `/Users/tim/.t3/userdata/attachments/4404c79e-f084-4b46-a56b-0bfda7e611f4-59687f71-1b38-4f7e-a910-1b9edeb313e6.png`, visually reviewed.

After, visually reviewed using an owned Chrome tab against http://127.0.0.1:4321:

- [320×568 ready](../../output/robot-ux/ready-320.jpg). Question field and Send visible without intro scrolling. Field measured at y=266–318 in the final small-screen pass; dialog had no horizontal overflow.
- [390×844 ready](../../output/robot-ux/ready-390.jpg) and [real mentoring evidence](../../output/robot-ux/evidence-390.jpg).
- [1280×800 ready](../../output/robot-ux/ready-1280.jpg). Real architecture evidence also returned during desktop testing.
- [Local AI startup error at 390](../../output/robot-ux/ai-error-390.jpg), captured before the final relocation of model feedback above the transcript. This is an error screenshot, not proof of successful model loading.

T3 preview opened a dedicated tab but snapshot failed twice with “Preview automation snapshot timed out after 15000ms.” Switched to an owned Chrome tab. Concurrent shell edits caused hot reloads during testing; refreshed and repeated affected checks. A temporary shell syntax error cleared without edits outside this scope.

Verified ready, real same-origin retrieval and evidence results, keyboard Enter submission, clear, Escape close, focus return to station trigger, and reopen. Tab from Close reaches the labeled question field. Latest desktop keyboard submission preserved textarea focus. Loading was observed in the accessibility tree with a named progress element and Cancel download, followed by a real startup error. This Chrome session could not start the local model, so sustained download cancellation, model-ready, generation, and withheld-answer rendering were not reverified here. Prior successful f16 loading/inference/cancel/reopen/retry evidence remains prior-run evidence, not a claim from this pass. No grounding was weakened to force a visible answer. Retrieval-error recovery was source-reviewed, not forced in the browser.

## Accessibility review

Native form label, required field, 600-character limit, disclosure semantics, named scroll region, status live regions, and progress name remain intact. Text renders through textContent; no generated HTML. Main buttons have 44px minimum height; disclosures have 44px minimum height. Controls do not require hover or gestures. No new motion. Page title, dialog name, initial Close focus, modal containment, and Escape are supplied by the existing shell. Keyboard focus rings were visually reviewed.

Computed from opaque source colors: body text/background 16.40:1; muted text/background 10.31:1; placeholder/input 9.26:1; Send text/fill 14.07:1; textarea border/input 4.41:1; mint focus/background 14.07:1. These calculations cover robot-owned colors, not every inherited shell state. Narrow reflow was tested at 320 CSS px. Screen-reader announcements, 200% text enlargement, mobile virtual keyboard behavior, every hover/disabled color, and full WCAG conformance remain unverified.

## Checks

`bun test apps/timsexperiments/src/scripts/robot`: 11 pass, 0 fail, 51 assertions. Existing transport, evidence boundary, full qualifications, grounding rejection, cancellation-before-network, response size, and GPU-selection tests retained.

`bun run check`: passed with 0 errors, 0 warnings, 32 hints. No new dependencies or network services. Model download remains opt-in, and all inference stays on the visitor device.
