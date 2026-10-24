# Conversation presentation handoff

2026-10-21. Implemented in isolation. Production is deliberately still using RobotHost.astro. No edits to that file or scripts/robot/. No model, protocol, network, consent, or grounding changes.

## Direction and files

Keep the existing compact green panel. Read the greeting and conversation first, then compact suggestions and the bottom composer. Speaker labels and asymmetric bubbles distinguish visitor and robot without relying on color. Options temporarily replaces the conversation area with one scrollable settings view; progress and Stop remain outside it. No portrait or download card.

- `apps/timsexperiments/src/components/campus/RobotConversation.astro`: replacement markup and namespaced styles, including every host-required selector. No behavior imports or automatic initialization.
- `apps/timsexperiments/src/scripts/chat-view/presentation.ts`: scroll and Options behavior only. Host still builds all turns through textContent. Observer follows content changes only while near bottom; otherwise offers New reply. Transcript is a named region, not a live log, so status updates do not announce the whole history.

## Apply only after reliability owner finishes

Keep RobotHost.astro as the authoritative wrapper. Do not import RobotConversation directly in CampusHome: its consent slot must contain the host's current data-enable control.

1. Add to RobotHost.astro frontmatter:

```astro
---
import RobotConversation from './RobotConversation.astro';
---
```

2. Replace its outer `<div class="robot-host" data-robot-host>…</div>` with:

```astro
<RobotConversation>
  <Fragment slot="consent">
    <!-- MOVE the current complete <details data-ai-consent> here unchanged. -->
  </Fragment>
  <Fragment slot="about">
    <!-- MOVE the current complete <details class="robot-about"> here unchanged. -->
  </Fragment>
</RobotConversation>
```

These comments are instructions, not final markup. Move the actual current disclosures, including the enable button, links, model metadata, and consent copy. Keep the existing host script import. Remove the old RobotHost global style block because RobotConversation owns presentation. Do not retain the old form, transcript, feedback, or duplicate controls. No shell change is necessary to select the component; the wrapper keeps CampusHome's import intact.

3. In scripts/robot/host.ts add:

```ts
import { createConversationView } from '../chat-view/presentation';
```

After obtaining the host controls and transcript, initialize:

```ts
const conversation = root.matches('[data-chat-view]')
  ? createConversationView(root)
  : undefined;
```

4. Immediately BEFORE `transcript.append(turn)` insert `conversation?.beforeTurn()`. Replace BOTH existing `transcript.scrollTop = turn.offsetTop` writes with legacy-only branches:

```ts
if (!conversation) transcript.scrollTop = turn.offsetTop;
// In finally retain the run-token condition:
if (token === run && !conversation) transcript.scrollTop = turn.offsetTop;
```

Do not add another scroll after retrieval or generation. Keep the current article, speaker headings, question, and result construction. The visitor bubble is appended synchronously before pending retrieval. Keep safe textContent rendering, record disclosures, answer rejection, state sync, and cancellation unchanged.

5. In the clear handler replace `transcript.replaceChildren()` with:

```ts
if (conversation) conversation.clear();
else transcript.replaceChildren();
```

Keep cancellation, session counters, input clearing, status, sync, and final input.focus(). The helper restores the greeting. In the existing astro:before-swap cleanup call `conversation?.destroy()`. Do not destroy on dialog close because reopening reuses the same host. Closing still cancels through the existing host.

6. Recheck after integration in the actual dialog: reliable retrieval, failure/retry, clear, close/reopen, download cancel, model generation/withholding, keyboard and source expansion. Confirm the shell's available height. The component uses a dynamic viewport height minus 156px, or 132px at 320px; adjust that reservation only if the final shell needs more room. At small virtual-keyboard heights the outer dialog must remain scrollable so the 260px minimum panel and composer are reachable. Do not add a second bounded transcript wrapper.

## Evidence and limits

Reviewed the supplied screenshot. Tested a standalone HTML fixture extracted from the new component markup/styles with the bundled real presentation helper. The fixture replaces slots with explicitly test-only copy and uses test-only replies, with no service or model calls. It is not an Astro SSR or production integration test. Astro check compiled the actual component and TypeScript with 0 errors, 0 warnings, 32 existing hints.

Temporary fixture: `/tmp/conversation-fixture.html`. Builder: `/tmp/build-conversation-fixture.py`; bundle: `/tmp/conversation-presentation.js`. During testing it was served at `http://127.0.0.1:4321/__conversation-fixture.html`; the public copy was removed afterward to avoid shipping a test route. To repeat locally, rebuild the helper with installed Bun, run the builder with python3, then delete the generated public HTML before any build/deploy. No dependencies installed.

T3 owned preview tab tested 320×568, 390×844, 1280×800. One initial snapshot timed out; subsequent preview calls worked. Send bottom measured 476px at 320 and 660px at 390 and desktop. No horizontal page overflow at those sizes. Expanded long source stayed within the transcript scroll area. Options hid transcript, focused Back, and returned focus to Options. Clear restored greeting and input focus. A pending reply followed its user message immediately. HTML-like input created no image nodes. At scrollTop 0, a new reply preserved scrollTop 0 and revealed New reply. The transcript has no aria-live attribute; the separate status does.

Native controls, visible label, 16px textarea text, 44px controls, focus ring, source details and pre-wrap answers remain. Source colors reuse the reviewed palette. No motion added. Actual screen-reader output, physical mobile keyboard, 200% text enlargement, and final dialog sizing remain integration checks, not claimed results. Suggestions retain the existing static platform/mentoring prompts rather than inventing ungrounded contextual topics.

Reviewed screenshots:

- [320px reply and composer](/Users/tim/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-mvhvkhdi-c3e41241.png)
- [390px conversation and literal HTML-like input](/Users/tim/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-mvhvihoa-ab7b36f3.png)
- [Desktop greeting after clear](/Users/tim/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-mvhvjcdy-9268aac8.png)
