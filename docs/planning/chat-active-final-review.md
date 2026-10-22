# Final independent active chat review

Verdict: PASS.

Reviewed on 2026-10-22 against the final contract: refresh restores only the latest local active chat; explicit dialog close or Clear removes its local identity and transcript; Tim retains the write-only archive; the visitor frontend never reads or deletes that archive through the API. This review covers the uncommitted working files over `1967edd3391fd7772b8bb7be46740e25c4cb2744` on `feat/3d-site-transformation`.

Both P2 findings from `chat-active-independent-review.md` are fixed in the reviewed snapshot. I found no new proven issue within the requested scope. The separate backend review remains responsible for backend correctness.

## Original repros

1. Another controller's delayed PUT receipt no longer resurrects a cleared local key or overwrites a newer UUID. I independently reran both variants with two actual history controllers, shared synthetic storage, and a deferred HTTP boundary that permits the transmitted write to commit after abort. After releasing the old receipt, the key remained absent or retained the exact newer envelope. The old controller was invalidated, no timer remained, and calls were PUT-only. The existing regression suite also passes both variants with suspension and return.

   `history.ts:68-78` checks shared identity before persistence. `:98-136` invalidates the controller, increments its epoch, aborts its request, and discards queued state. The same-document bus at `:285-290`, storage listener at `:291-302`, and resume check at `:349-355` cover immediate notification and return without a delivered event. Checks before processing responses and after decoding prevent delayed receipts from writing stale state.

2. A delayed old 429 body cancellation no longer installs a cooldown after Clear. I independently returned a native `Response` with a controlled `ReadableStream.cancel()` promise, cleared the chat while cancellation was pending, and archived a fresh UUID. Releasing the old cancellation left zero timers. Another completed snapshot started the third PUT after the ordinary two-second interval, without the old sixty-second delay.

   `history.ts:191-204` now checks `isCurrent(token)` after awaited cancellation. The same epoch, disposed, suspended, and shared-identity guard also protects receipt processing, catch, and finally at `:208-231`. Passing regression cases cross Clear, destroy, suspend, suspend followed by resume, and actual-host Clear and close, with delayed 429 and 503 bodies.

## Invalidation and regression checks

The passing suite exercises shared-key removal, UUID replacement, storage clear events, receipt arrival before storage-event delivery, and BFcache return without event delivery. Queued old events compare the live key and leave a newer explicit session intact. Ordinary updates within the same UUID and unrelated storage keys do not invalidate a controller.

Invalidation preserves displayed answers and prevents completed old work from persisting. A valid next question resets the actual host's saved turns, topic, transcript, turn limit, and local model work before starting a fresh UUID. `host.ts:289-296` checks ownership before the busy and turn-limit gates and checks again through `start()`; `:435-454` performs the reset. Tests cover ownership changing during question start and save, an invalidated twelve-turn host, and an older pending answer. Whitespace-only input does not discard the displayed chat.

Additional independent stdin probes delayed successful receipt decoding across Clear, external UUID replacement without event delivery, and suspend/resume. Resolving the obsolete decode with revision 9 left the latest local envelope unchanged in every case and leaked no timers.

I imported the actual `dialog-shell.ts` and actual host with synthetic DOM boundaries. Button dismissal, Escape, outside-bounds backdrop click, and station switching each removed the seeded local envelope and restored the greeting with zero fetches. The shell calls `dialog.close()` at `dialog-shell.ts:38` and `:61`; the host handles close events and open-attribute removal at `host.ts:463-478`. Hidden initial setup retained and rendered its seeded envelope without fetching. These are local module integration probes, not native browser observations.

I also invoked a captured worker callback directly after Clear, bypassing the helper's suppression of replies from terminated workers. The actual host rejected that already-queued callback through its worker-identity check at `host.ts:179`; the greeting and absent local key stayed unchanged.

Local parsing still enforces schema and actual UTF-8 byte bounds. Refresh renders the saved paragraphs through `textContent`, preserves qualifications, and builds reference labels only from known experience IDs. Automatic archival remains PUT-only. Clear and close retain the archive, discard pending frontend work, and use a fresh UUID for the next question. Storage failures retain their explicit refresh-loss disclosure. The component copy remains consistent with these behaviors and best-effort delivery.

## Executed checks and limits

From `apps/timsexperiments`:

```sh
bun test src/scripts/robot/history.test.ts src/scripts/robot/history.lifecycle.test.ts src/scripts/chat-view/evidence.test.ts src/scripts/robot/evidence.test.ts
```

124 passed, zero failed, 533 expectations across four files. I inspected the lifecycle tests and helpers. The lifecycle suite contains 68 cases and runs the actual frontend modules with substituted DOM, worker, fetch, storage, and time. Teardown asserts zero outstanding timers.

```sh
bunx --no-install tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022,DOM,DOM.Iterable --types bun,astro/client src/lib/conversations/*.ts src/pages/api/conversations/index.ts src/db/schema.ts src/scripts/robot/active-chat.ts src/scripts/robot/history.ts src/scripts/robot/history.test.ts src/scripts/robot/history.lifecycle.test.ts src/scripts/robot/lifecycle-test-helpers.ts src/scripts/robot/host.ts src/scripts/chat-view/evidence.ts
```

Strict TypeScript exited 0 without diagnostics. Two additional `bun run -` invocations exercised the twelve independent scenarios described above, using assertions and the existing boundary helpers without writing test files or making live requests.

I did not rerun Astro check, a production build, or the parent's earlier browser fixture. The handoff records its own Astro result; this review does not recast it as independently executed evidence. Native browser event ordering, actual BFcache eligibility, visual behavior, model downloads, and GPU inference were not verified here. No live database, credentials, deployment, or subagents were used. Concurrent snapshots within one UUID remain unsynchronized, and archive delivery remains best effort without an unload guarantee. Those accepted limits do not change this verdict.

Only this review document was written. Scope deviation: I mistakenly ran read-only `git status --short`, `git rev-parse HEAD`, and `git branch --show-current` at the beginning despite the no-git instruction. No git mutations or further git commands occurred.

## Reviewed working-file hashes

SHA-256, paths relative to the repository root:

```text
f0360790a7a4f6c00f1ee4cca148479b2ea33298fa1d60241132e080c12b11a4  apps/timsexperiments/src/scripts/robot/active-chat.ts
e0ae5d95690887912896568ec87ff356032e58adf55edbdf252318129271c9cc  apps/timsexperiments/src/scripts/robot/history.ts
28d7fd2bbfc358b3c6170bc7d5372c784adc1ae7e08db0d11c655814460fe940  apps/timsexperiments/src/scripts/robot/host.ts
d01847fd840b357ff81d73b6576c1f53996f0c5adcac8285e1e4c73dcef4b711  apps/timsexperiments/src/scripts/robot/history.test.ts
eba3058e1592838bf19b49f33229e4d13af5d28723c7343ade62bf420f3d6af2  apps/timsexperiments/src/scripts/robot/history.lifecycle.test.ts
3adf691eb0a71054d8f807ee5f9f162642c65fe8539b0e2013ab388c682c1c50  apps/timsexperiments/src/scripts/robot/lifecycle-test-helpers.ts
8f75625e24a87f1e3018b45826c0bbde623a0eab78ef0bf74df4dc2ccf1282c2  apps/timsexperiments/src/scripts/robot/evidence.ts
7b30f3b702cefb6e4ad863090f0c675457b8dd43ec1dbaca8b911570c75cfc7c  apps/timsexperiments/src/scripts/chat-view/evidence.ts
14f06dd98ad21a901c3aee462b38009e2c8108f70c83cad2330a52577b6645d7  apps/timsexperiments/src/scripts/site/dialog-shell.ts
6aec8afea40463ad59ad0cfa3b893f227e7338dc13c741649d74464964d03ed8  apps/timsexperiments/src/components/campus/RobotConversation.astro
7dc4cf7d9af96aef840dc9497afd8ef2ec4768856e0597635b23d177ea0b6903  apps/timsexperiments/src/components/campus/RobotHost.astro
b3a6829be9fef2308882c263c18d0d07e2f6a4643e7862693e0196ea7fac885d  apps/timsexperiments/src/lib/conversations/protocol.ts
0502322e7574e88efb9a33457e5644bc6ac9860fce80a0665969480f2e88f6c2  docs/planning/chat-storage-fixes.md
```

Final verdict: PASS.
