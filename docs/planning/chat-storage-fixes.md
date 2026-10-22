# Chat archive frontend handoff

This replaces this file's earlier server resume/delete implementation notes. The earlier storage design and independent review describe superseded requirements. Do not deploy that design. The current visitor app restores only its local active chat. Turso holds a write-only archive for Tim to inspect.

## Implemented behavior

`active-chat.ts` validates the localStorage entry `lab-chat-active-v1` with the backend's strict `archivePutSchema`. The envelope is `{id, revision, turns}` and contains completed turns only. The shared schemas enforce UUID, revision, question, paragraph, reference and turn bounds. Parsing also bounds actual UTF-8 bytes to `conversationLimits.bodyBytes` before JSON parsing. Malformed or oversized entries are discarded. Stored text and qualification whitespace remain unchanged.

`history.ts` restores this local envelope synchronously during host setup. Setup makes no network request and never obtains a transcript from the API. A UUID is generated lazily when the visitor starts a question. Opening an empty panel alone creates neither an archive nor a localStorage entry. Completing a prepared reply saves its full snapshot to localStorage synchronously before starting PUT. An accepted WebLLM passage updates localStorage immediately in the same way. Successful archive receipts update the acknowledged revision while retaining any newer local turns.

Archive requests use only PUT with `{id, revision, turns}` and validate `archiveReceiptSchema`. `credentials: 'same-origin'` lets the browser manage the backend's protected HttpOnly owner cookie. Frontend code never reads, exposes, stores or resets that credential. The owner cookie is distinct from the discarded local chat UUID. No GET, DELETE, resume controls, delete controls, saving preference or server reconciliation remains. The previous `lab-chat-saving` preference is ignored because the new requirement authorizes automatic archiving.

Only one PUT runs per active session. Additional completed snapshots coalesce into the latest pending snapshot. A 429 retains that latest snapshot and waits for Retry-After, accepting integer seconds or an HTTP date with a two-second fallback. Three consecutive 429 responses stop automatic retries and reveal a manual retry control, disabled until the cooldown expires. Network, invalid receipt, conflict and other API failures leave local answering usable and require manual retry. Ambiguous failures retain the exact submitted snapshot for an idempotent retry before sending newer text. No failure silently assigns a replacement UUID or attempts remote recovery.

Clear and explicit dialog closure cancel retrieval and model work, terminate the worker, discard pending archive snapshots and retry timers, abort the current fetch, remove the local envelope and identity, and reset the greeting, topic, turn count, draft, options, progress and AI controls. Clear keeps the panel open. The next question receives a different UUID at revision zero. Archives remain untouched. An already transmitted PUT may still commit, but its late response cannot recreate the local envelope, change a newer session's revision, or restart discarded writes. A new session can archive while the old aborted request is still returning.

The actual dialog shell in `src/scripts/site/dialog-shell.ts` calls native `dialog.close()` for button dismissal, Escape, backdrop dismissal and station switching. The host handles native close plus observed open-attribute removal. Initial hidden setup does not clear a restored local chat. Pagehide is navigation, not explicit closure: it cancels local work and suspends or disposes network handling without clearing completed local turns. Persisted pageshow resumes the retained controller and its listeners with no server read or transcript replacement. Throttle cooldowns and pending exact-request retries survive BFcache suspension in memory. Astro teardown disconnects host observers and listeners.

The opening disclosure says AI answers can be wrong, completed questions and replies are saved for Tim to read, and refresh retains this browser's active chat until close or Clear. Options and About explain automatic archival, no account, the retained archive, local inference and best-effort delivery. Obsolete optional-save, 30-day resume and remote-delete claims are removed. Existing WebLLM selection and model details, exact qualifications, source reference IDs and text-only answer rendering remain intact.

## Files owned by this task

- `apps/timsexperiments/src/scripts/robot/active-chat.ts`, new
- `apps/timsexperiments/src/scripts/robot/history.ts`
- `apps/timsexperiments/src/scripts/robot/host.ts`
- `apps/timsexperiments/src/scripts/robot/history.lifecycle.test.ts`
- `apps/timsexperiments/src/scripts/robot/lifecycle-test-helpers.ts`
- `apps/timsexperiments/src/components/campus/RobotConversation.astro`
- `apps/timsexperiments/src/components/campus/RobotHost.astro`
- `docs/planning/chat-storage-fixes.md`

The existing `history.test.ts` scenario checks are retained. Backend, DB, shell and presentation modules were read but not edited. No git commands, live database access, credential inspection, deployment, external browser submissions or subagents were used.

## Verification

From `apps/timsexperiments`:

```sh
bun test src/scripts/robot/history.test.ts src/scripts/robot/history.lifecycle.test.ts src/scripts/chat-view/evidence.test.ts src/scripts/robot/evidence.test.ts
```

Result: 97 passed, 0 failed, 320 expectations across four files. The new lifecycle suite has 41 cases. It imports the actual host, history, local schema, presentation, rendering, retrieval and evidence modules. Substitutes cover browser boundaries only: DOM, worker, fetch, localStorage and a bounded clock. Each case tears down its listeners and controller and checks that no timers remain. Tests cover strict schema and UTF-8 bounds; refresh and safe rendering; pending questions; full Clear/close reset and new UUIDs; queued PUT coalescing; late receipts crossing session boundaries; throttle delays and bounded retries; ambiguous receipt retries; storage/API failure isolation; exact accepted WebLLM paragraphs; topic reset; BFcache suspension, retained cooldowns, resumed listeners and no server reads. The retained 43 scenario tests preserve complete reply payloads.

```sh
bunx --no-install tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022,DOM,DOM.Iterable --types bun,astro/client src/lib/conversations/*.ts src/pages/api/conversations/index.ts src/db/schema.ts src/scripts/robot/active-chat.ts src/scripts/robot/history.ts src/scripts/robot/history.test.ts src/scripts/robot/history.lifecycle.test.ts src/scripts/robot/lifecycle-test-helpers.ts src/scripts/robot/host.ts src/scripts/chat-view/evidence.ts
bun run check
```

Strict TypeScript passes without diagnostics. Astro check passes with 189 files, zero errors, zero warnings and 40 existing hints.

## Limits and parent follow-up

The parent owns the local browser fixture, browser integration, fresh independent review and deployment. These tests use synthetic browser lifecycle events and controlled worker replies. They do not verify actual browser BFcache eligibility, native event ordering, visual layout, model downloads or GPU inference. No production build or live service verification was performed here.

Archiving is best effort. Unload does not flush or guarantee delivery. A lost first response can lose the ownership cookie and leave the UUID safely conflicting with the committed archive, as documented by the backend. There is no read/recovery path. Refresh recovers the latest completed local snapshot and acknowledged revision, not an in-flight request or retry queue. If a previously committed write had an unacknowledged older snapshot, later archival may conflict; local chat continues and no remote transcript is loaded. Storage denial or quota failure also leaves the visible local chat usable, with a status explaining that refresh can lose replies or show older stored data. Shared localStorage follows the browser's last write across tabs; there is no cross-tab transcript synchronization.

## Follow-up fixes for the independent active-chat review

On 2026-10-22, fixed the two P2 findings in `chat-active-independent-review.md`. This section supersedes the earlier last-write limitation concerning cleared or replaced UUIDs. The independent review document and its verdict are unchanged. These are implementation and regression-test results, not a new independent review verdict.

For finding 1, every persistence attempt checks the current shared local identity. Archive callbacks, retries and completed-answer saves cannot reclaim an invalidated session. Removal or UUID replacement invalidates the controller, increments its epoch, aborts its PUT and discards its retry snapshot, timer and cooldown. Native storage events cover other documents; an in-memory notification covers controllers in the same document. BFcache return checks localStorage again before resuming writes, even when no storage event arrived. Event handling reads the live shared identity, so queued events from an older session cannot invalidate a newer explicit session. No extra localStorage keys or transcript synchronization were added.

Invalidation preserves already displayed answers and reports that the next question starts a new chat. A valid explicit question resets the host's transcript, topic, saved turns, turn limit and local model work before receiving a fresh UUID. It does not adopt the replacement UUID or append old turns to the new chat. The host also resets if ownership changes during question start. A completed answer cannot invoke that explicit restart path. Clear and explicit close still remove the shared browser copy; previously transmitted archive writes may commit and the archive remains with Tim. Refresh still restores only the latest local envelope. The API path remains PUT-only, with no remote transcript read or delete.

For finding 2, asynchronous archive handling uses one epoch, disposed, suspended and ownership check after fetch, after receipt decoding, and after awaited error-body cancellation. A late 429 or other error cannot alter the newer session's message, retry snapshot, retry count, cooldown or timers. Returning from a suspended page before the old cancellation resolves also leaves the resumed session unaffected.

Changed only `history.ts`, `host.ts`, `history.lifecycle.test.ts`, `lifecycle-test-helpers.ts`, and this appended handoff section. `active-chat.ts` needed no change. Test helpers now provide controlled native `ReadableStream.cancel()` promises and storage-event delivery, track every history controller for teardown, and restore the original global descriptor even when a browser boundary is installed more than once.

Reran the focused test command and the exact strict TypeScript command recorded above, plus `bun run check`, from `apps/timsexperiments`:

- 124 tests passed, zero failed, 533 expectations across the same four files. All previous 97 cases remain; 27 regression cases bring the actual-module lifecycle suite to 68 cases.
- Strict TypeScript exited 0 without diagnostics.
- Astro check exited 0 across 189 files, with zero errors, zero warnings and the same 40 existing hints.

Both review repros are prevented. Two actual controllers sharing storage exercise Clear with an old delayed PUT receipt, with and without a newer UUID, including suspension and return. Tests also cover storage removal, replacement and clear events, receipts before event delivery, BFcache return without event delivery, delayed obsolete events, and identity changes during save and question start. Actual-host cases preserve visible answers after invalidation, reset topic and the twelve-turn limit on the next explicit question, and reject persistence from an older pending answer. Native delayed 429 and 503 cancellation crosses Clear, disposal and suspension; actual-host Clear and close cases start a fresh UUID before releasing the old 429. Assertions check zero leaked timers, unchanged new-session status, immediate eligibility for the next PUT after the normal per-UUID server limit, retained archives and no GET or DELETE.

Limits remain browser-boundary substitutes and controlled HTTP responses. This pass did not rerun a native browser, establish BFcache eligibility or event ordering, download a model, run GPU inference, access a live database, inspect credentials, build production output, deploy, or use subagents. Existing parent browser results and the separate backend review remain prior evidence. Concurrent snapshots within one UUID are not synchronized between controllers; local answers and archival retain the existing best-effort behavior. Storage denial or quota failure retains the existing refresh-loss disclosure.

Scope deviation: one initial read-only `git status --short` ran despite the no-git instruction. No further git commands or git mutations occurred.
