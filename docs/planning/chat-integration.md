# Robot conversation integration

2026-10-21, `feat/3d-site-transformation`. Integrated into the live local site at `http://127.0.0.1:4321/`. No deployment or commit.

## Changes

- `RobotHost.astro` now wraps `RobotConversation`, moving the authoritative consent and about disclosures unchanged into their named slots. The existing host script import remains. The old duplicate markup and presentation styles are removed.
- `scripts/robot/host.ts` initializes `createConversationView`, calls `beforeTurn` immediately before appending a turn, restores the greeting through `clear`, and destroys the view on Astro navigation. Both old host scroll writes now apply only to the legacy view. Closing cancels requests and unloads inference without destroying the reusable view.
- `RobotConversation.astro` owns final dialog sizing. Its narrowly scoped robot-dialog rules keep the accessible heading while hiding the duplicate visible title and compact the mobile station spacing. The panel reserves 204px above/below on desktop and 132px on mobile, retaining the 260px minimum and outer dialog scrolling at short heights. No shared shell stylesheet changed. The supplied presentation helper needed no changes.
- Transcript rendering still uses DOM construction and `textContent`. Worker, model choice, protocol, evidence parsing, generation gate, retrieval behavior, and session limits are unchanged. The separate model evaluation work was not touched.

## Real browser validation

T3 opened an owned tab, but two consecutive snapshots failed with `Preview automation snapshot timed out after 15000ms.` Continued in owned Chrome tabs. Some Chrome commands also timed out; fresh state inspection and a fresh owned tab recovered testing. No user tabs were operated. No fixture reply was used as an actual result.

Tested the actual Astro station at 320×568, 390×844, and 1280×800. Reviewed screenshots at all three sizes. Final measurements showed no horizontal overflow and no outer dialog overflow at these sizes. Send bottom was about 499px, 775px, and 713px respectively. At 320×360, focusing the input scrolled the outer dialog, keeping both the input and Send visible with bottom at 298px. This is a reduced-height viewport test, not a physical mobile keyboard test.

- Architecture returned five real MCP records and the curated platform summary. Expanded the shared practitioner source and verified full details, dates, source identifier, and the qualification distinguishing five service lines from tens of processes.
- Mentoring returned five real records and the curated engineering-judgment summary. `Tell me more` after mentoring returned a mentoring-related summary and records. This is the existing bounded previous-visitor-question retrieval hint, not general conversational memory or model-answer history.
- Scrolled to older content, then submitted mentoring. The view stayed on older content and displayed New reply. Activating it scrolled to the latest content and focused the transcript.
- Options hid the transcript and focused Back to conversation. Back returned focus to Options. Clear restored the greeting, removed turns, emptied the conversation input, and focused it. Expanded the actual privacy/model disclosure and checked the preserved text and links.
- Submitted literal `<img src=x onerror=alert(1)>` text. The visitor message contained escaped text and created zero transcript image nodes. Adding that markup to a question changed retrieval matching, so that query is evidence of safe rendering only. A separate clean COBOL question returned that the records do not establish the experience.
- Optional AI stayed off until explicit enable. Cached SmolLM2 360M f16 reached ready. One architecture generation timed out, left evidence visible, and restored evidence-only use. Two later real mentoring generations completed but the unchanged gate withheld their answers. The UI said `AI answer withheld. The published evidence is available below.` No rejected model prose was displayed.
- Closing after model use preserved the transcript and reopened with local inference off. A fresh mentoring retrieval worked without enabling AI.

For reproducible network failure and in-flight checks, a temporary loopback proxy at port 44321 served the actual app from 4321. It first returned a deliberate 503 for MCP, then forwarded the real MCP requests with 2.5s latency. It never substituted evidence or model answers. A 5s delay to delivery of the real inference worker made loading cancellation repeatable. The proxy and its tabs were stopped after testing.

- The induced 503 showed the retrieval error and kept the question available. Send retried successfully against the real upstream MCP, yielding five architecture sources.
- With latency, the visitor bubble appeared synchronously before `Reading published evidence…`.
- Closing during delayed mentoring retrieval marked it stopped. After reopening and waiting beyond the delayed response, no late evidence replaced it. Resubmitting returned real evidence.
- Cancel download during delayed worker delivery returned AI to off, enabled Send, and did not restart later. A subsequent clean unknown query completed using evidence only.

## Checks and artifacts

- `bun test apps/timsexperiments/src/scripts/robot`: 14 passed, 0 failed, 60 assertions.
- `bun run --cwd apps/timsexperiments check`: 0 errors, 0 warnings, 32 existing hints.
- `bun run --cwd apps/timsexperiments build`: passed, including a final run after the last sizing change. Existing large-bundle notice remains. Log: `/tmp/chat-integration-build-final.log`.
- Screenshots: [320px cleared greeting](/tmp/chat-integration-evidence/320-cleared.jpg), [390px mentoring transcript](/tmp/chat-integration-evidence/390-mentoring.jpg), [desktop greeting](/tmp/chat-integration-evidence/desktop-greeting.jpg), [390px withheld model answer](/tmp/chat-integration-evidence/390-withheld.jpg).

The model still fails representative answer quality and remains constrained by the unchanged gate. Curated retrieval is the dependable answer path. Physical mobile keyboard behavior, screen-reader announcements, and 200% text enlargement were not tested. No dependency installation, production model change, shell stylesheet edit, deployment, commit, email, or external message.
