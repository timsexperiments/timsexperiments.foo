# Independent active chat frontend review

Verdict: NEEDS_FIXES.

Reviewed the working files on 2026-10-22 against the final contract in the review brief and `chat-storage-fixes.md`. The brief identifies branch `feat/3d-site-transformation` and base `1967edd`; I did not run git commands to verify either. The six findings in the earlier server resume/delete review are superseded. Two frontend lifecycle findings remain below.

## Findings

### 1. P2: Another tab's receipt can resurrect a cleared chat and overwrite the newer active chat

Sources: `apps/timsexperiments/src/scripts/robot/history.ts:63-77`, `:150-159`, `:203-215`, `:229-238`. The browser-wide removal promise appears in `RobotConversation.astro:18` and `RobotHost.astro:27-29`.

Each controller reads the shared localStorage key once and thereafter owns an independent in-memory session and epoch. Clear invalidates only its own controller. A different controller's successful PUT receipt calls `persist()` unconditionally, so it can recreate the removed key with the discarded UUID. It can also overwrite an entirely newer chat created after Clear. The next refresh then restores the old questions instead of the latest active chat.

Reproduced with two actual `createSavedChat` controllers sharing the test environment's storage and memory HTTP boundary. No browser or live HTTP service was used:

1. Controller A saves one completed turn and receives revision 1. Advance the bounded clock by two seconds.
2. Controller B initializes from that local envelope. Defer B's PUT for a second completed turn.
3. A clears. Assert that `lab-chat-active-v1` is absent.
4. A saves a new chat. Assert that its UUID differs from the cleared UUID.
5. Release B's deferred PUT. The shared key now contains B's old UUID, revision 2, and both old questions. A's newer chat has disappeared from refresh storage.

Executed trace: three PUTs, no GET or DELETE. Assertions verified removal, fresh UUID creation, and replacement of that new UUID by the old receipt. A simpler variant without step 4 also recreated the key after Clear without further visitor action.

The handoff's final paragraph acknowledges last-write behavior across tabs. That does not preserve the final latest-active-chat and Clear contract, and the visible disclosure does not explain this exception. This requires invalidating stale controllers or otherwise preventing their saves and receipts from writing after the shared chat is cleared or replaced. Full cross-tab transcript synchronization is unnecessary. Add regression coverage for both resurrection and replacement of a newer UUID, including delayed receipts and BFcache return.

### 2. P2: A late 429 can install a cooldown after Clear and throttle the new session

Sources: `apps/timsexperiments/src/scripts/robot/history.ts:130-145`, `:168-174`, `:203-215`.

The epoch check precedes `await response.body?.cancel()`. The 429 branch does not check the epoch again after that await. If Clear runs while cancellation is pending, the old request can subsequently modify `retryAttempt`, `retryAt`, `failures`, `manualRetry`, and `message`, then schedule a timer in the new session. The guarded `finally` does not undo those changes.

Reproduced using the actual history module and a native `Response` backed by a `ReadableStream` whose `cancel()` returns a controlled promise:

1. Save the old chat. Return HTTP 429 with `Retry-After: 60`, then hold its body-cancellation promise unresolved.
2. Clear and save a new chat. Return a successful revision receipt for the new PUT. There are two fetch calls and zero outstanding timers.
3. Resolve the old cancellation promise. There is now one timer from the cleared session.
4. Save another completed snapshot in the new chat. It persists locally, but no third PUT starts for 59,999 simulated milliseconds. At 60,000 milliseconds the third PUT starts.

This is an asynchronous response-body boundary test, not a claim about observed browser networking. It demonstrates that a cleared session can reinstate a timer and impose its cooldown on an unrelated UUID. Recheck the epoch, disposed state, and suspended state after body cancellation before processing the response. Add a delayed error-body cancellation case crossing Clear, close, and suspension.

## Verified behavior

The remaining reviewed paths match the final contract in source and local tests:

- Initial setup synchronously validates and restores only the local envelope. There is no transcript GET or database read in the frontend path. Archive fetches use PUT only, with strict receipt parsing.
- Completed prepared replies and accepted local-model paragraphs persist before archive acknowledgement. Saved strings render through `textContent`; unknown reference IDs do not create links or executable markup. Topic reconstruction replays questions without replacing saved paragraphs.
- Within one controller, Clear and observed dialog closure cancel retrieval, terminate the worker, reset pending model state, remove the local identity, reset controls and topic, abort the PUT, and discard queued snapshots and retry timers. Successful late receipts are guarded. A new question receives a fresh UUID. No remote DELETE occurs.
- Additional snapshots coalesce behind an in-flight PUT. Retry-After seconds, dates, fallback delays, the three-429 limit, manual cooldown, and exact ambiguous-request retry are covered. Refresh intentionally loses an in-memory retry queue; this documented best-effort archive limitation does not trigger a remote read or silently replace the UUID.
- Local parsing enforces schema, count, character, and actual UTF-8 byte bounds. Storage failures preserve answering and report that refresh can lose replies or show older storage.
- Synthetic pagehide/pageshow tests preserve completed local turns, cancel work, suspend retries for BFcache, and resume controller listeners. Non-persisted pagehide disposes work without removing completed local turns.
- The visible copy discloses automatic archival for Tim, archive retention after Clear/close, browser inference, and best-effort delivery. Its browser-copy removal claim needs the cross-tab correction in finding 1.

I also imported the actual `dialog-shell.ts` with the actual host and synthetic DOM boundaries. Button dismissal, Escape, an outside-bounds backdrop click, and station switching each removed the local envelope and restored the greeting without network calls. Hidden initial setup retained a seeded envelope. A separate actual-host probe asked an Included Health question, then an unknown question, refreshed the host, and asked "Tell me more". The answer retained Included Health topic references.

## Test evidence and limits

Executed from `apps/timsexperiments`:

```sh
bun test src/scripts/robot/history.test.ts src/scripts/robot/history.lifecycle.test.ts src/scripts/chat-view/evidence.test.ts src/scripts/robot/evidence.test.ts
```

Result: 97 passed, zero failed, 320 expectations across four files. The lifecycle suite contains 41 cases. I inspected its helpers and assertions. It substitutes DOM, worker, fetch, localStorage, and time. Its native-close helper directly dispatches a synthetic close event; it does not import the actual shell. Its worker helper suppresses replies after termination, so that test alone does not establish delivery handling for an already queued worker event. Production host code separately guards worker identity.

The focused strict TypeScript command recorded in `chat-storage-fixes.md` also passed with exit code 0 and no diagnostics. It uses `--noEmit` and includes the protocol, API types, frontend modules, and lifecycle tests.

Additional `bun run -` scripts imported actual frontend modules and the existing lifecycle helpers. They wrote no test files and made no live requests. They exercised the two findings, the four actual-shell paths, hidden initialization, and topic restoration. Existing tests passing does not cover the two reproduced failures: the suite has one controller per case, and its HTTP failures have immediately cancellable bodies.

Only this review document was written. No source edits, git commands, credential inspection, live database access, browser operation, full build, deployment, or subagents were used. Backend correctness is owned by the separate backend review. Native browser event ordering, BFcache eligibility, visual behavior, actual model downloads, and GPU inference remain with the parent browser fixture and build work.

## Reviewed source hashes

SHA-256 of the working files inspected, with paths relative to the repository root:

```text
f0360790a7a4f6c00f1ee4cca148479b2ea33298fa1d60241132e080c12b11a4  apps/timsexperiments/src/scripts/robot/active-chat.ts
b31f46264e63f0323c20a31a0f041085bc8789c29f04ac01334c059497786e61  apps/timsexperiments/src/scripts/robot/history.ts
9449e03efe451a7058d1db4c423d622e22dc241d31f7710bbf13a4cba2352cfc  apps/timsexperiments/src/scripts/robot/host.ts
6f881399a6dca1923efc6a203ca1d77266f5ac0928b1b144e9fe1672fc583f4e  apps/timsexperiments/src/scripts/robot/history.lifecycle.test.ts
de1806101facd0c47a023b5a48857d88676a12fae6f4374a430388b4406e81aa  apps/timsexperiments/src/scripts/robot/lifecycle-test-helpers.ts
8f75625e24a87f1e3018b45826c0bbde623a0eab78ef0bf74df4dc2ccf1282c2  apps/timsexperiments/src/scripts/robot/evidence.ts
7b30f3b702cefb6e4ad863090f0c675457b8dd43ec1dbaca8b911570c75cfc7c  apps/timsexperiments/src/scripts/chat-view/evidence.ts
14f06dd98ad21a901c3aee462b38009e2c8108f70c83cad2330a52577b6645d7  apps/timsexperiments/src/scripts/site/dialog-shell.ts
6aec8afea40463ad59ad0cfa3b893f227e7338dc13c741649d74464964d03ed8  apps/timsexperiments/src/components/campus/RobotConversation.astro
7dc4cf7d9af96aef840dc9497afd8ef2ec4768856e0597635b23d177ea0b6903  apps/timsexperiments/src/components/campus/RobotHost.astro
30d63e6b37a8a54e45eb1689c781fe3e94ff802b237684a8c3e9326721403f0b  docs/planning/chat-storage-fixes.md
```

Final verdict: NEEDS_FIXES for findings 1 and 2.
