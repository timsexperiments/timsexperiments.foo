# Chat archive backend review

PASS. No backend blocker found against the final archive-only contract.

Reviewed independently on 2026-10-22 in the shared `/Users/tim/Projects/timsexperiments` checkout. The supplied branch/base context is `feat/3d-site-transformation` over `1967edd`. This review covers the working files identified by SHA-256 below. No Git commands were run, so branch identity and the baseline diff were not independently verified. Backend hashes were checked twice and remained unchanged during review.

The controlling requirement is that Turso holds archives for the operator. The visitor API must not read, list, restore, or delete them. Refresh restoration belongs to localStorage, and closing or clearing removes local state while retaining the archive. The frontend is still being updated and is excluded from this verdict. The earlier preference design and the six frontend findings in `chat-storage-independent-review.md` are superseded and are not backend failures.

Only this review document was written. Source files were read but not changed. Git state, credentials, live databases, and deployments were not accessed or changed through this review. Tests used temporary local SQLite files and dummy configuration. No browser verification or subagents were used.

## Contract checks

- **Write-only public API.** `src/lib/conversations/handler.ts:27` rejects every method except PUT before body reading, configuration validation, owner hashing, or client creation. `src/pages/api/conversations/index.ts:13` exports PUT and the same handler as ALL, so GET, DELETE, HEAD, OPTIONS, POST, and PATCH reach that rejection. The supplied tests exercise method rejection with and without cookies, while enabled and disabled, including query-selected IDs. No additional conversation route exists in the current API tree. The response is 405 with `Allow: PUT`; no database client opens and existing rows remain intact.
- **Receipt contains no transcript.** `protocol.ts:23` defines the strict `{revision}` receipt. `store.ts:34`, `store.ts:52`, and `store.ts:66` return receipts only; `handler.ts:65` serializes that result. Errors use fixed `{error,message}` bodies. Tests reject extra receipt fields and check generic failures. The store reads an owned row internally to compare snapshots, but never exposes that row through the visitor API.
- **Ownership prevents known-UUID takeover.** `owner.ts:19` generates 32 cryptographically random bytes; `owner.ts:23` hashes them with SHA-256. `store.ts:25` selects by both UUID and owner hash. Updates also require UUID, owner hash, and revision at `store.ts:47`. The primary-key conflict-do-nothing insert at `store.ts:65` cannot replace another owner's archive. A different owner or a missing cookie receives generic 409 for an occupied UUID, including an identical revision-zero snapshot. Multiple UUIDs for one owner remain separate rows.
- **Protected cookies fail closed.** `owner.ts:9` rejects duplicate or malformed owner tokens. HTTPS recognizes only `__Host-conversation_owner`; the development cookie confers no HTTPS ownership. `owner.ts:28` supplies Path=/, HttpOnly, SameSite=Strict, Secure on HTTPS, and no Domain attribute. Failed requests never set a cookie. A successful write refreshes the authorization cookie, whose 30-day lifetime does not delete an archive.
- **CAS, retries, and throttling agree.** `store.ts:23` wraps lookup and mutation in a write transaction. Identical content at the current revision or its immediate predecessor returns the existing revision without changing timestamps or the throttle deadline. Other stale revisions conflict before throttling. Changed content requires the current revision and an elapsed two-second deadline, then increments once. The SQL predicate repeats the CAS and owner checks. UUID case is normalized and schema parsing gives snapshot keys a stable order. Independent competing requests returned 200 and 409 with exactly one revision increment.
- **First-cookie loss is safe and deliberately unrecoverable.** Reproduce by committing a revision-zero PUT, discarding its Set-Cookie response, then repeating the same PUT without a cookie. It returns 409 and leaves the original row unchanged. Repeating with the received cookie returns `{revision:1}` without a write. A fresh token cannot take over an occupied UUID. This matches the documented behavior; no public recovery/read path is required. The frontend must keep the local chat usable when archiving fails.
- **Input is bounded and text is preserved.** `protocol.ts:14` checks nonblank strings without trimming their returned values. Its strict schemas enforce 1–12 turns, 600-character questions, 1–8 paragraphs of at most 2,000 characters, bounded experience IDs, UUIDs, and bounded integer revisions. `body.ts:12` counts actual streamed bytes, independently of Content-Length, and cancels overflow above 256 KiB. Fatal UTF-8 decoding and JSON parsing reject malformed input. Exact text, whitespace, paragraph order, qualification language, and literal markup survive storage. An empty overwrite or thirteenth turn returns 400 without changing the archive.
- **CSRF and response handling meet the contract.** `handler.ts:30` requires exact Origin equality with the request URL origin and accepts only `same-origin` or `none` when Sec-Fetch-Site is present. Missing/wrong origins and sibling-site metadata fail before SQL. PUT requires application/json. `handler.ts:13` sets JSON content type, no-store, nosniff, and Vary: Cookie. No CORS headers are added. These checks protect browser-origin requests; they do not authenticate arbitrary non-browser callers.
- **Configuration and failures stay closed.** `config.ts:3` requires exact string enablement, nonempty credentials without whitespace/control characters, and HTTPS/libsql URLs without embedded credentials. Runtime empty, null, or disabled field values override build fallbacks. `handler.ts:51` validates configuration before opening a client. Missing tables, invalid stored JSON, SQL update failures, and client-open errors return generic 503 without submitted text or credential details. The forced update failure rolls back without changing the row. Exceptions are not logged. `handler.ts:56` creates each request's client and `handler.ts:78` closes it in finally. The route does not import the existing global database client, and the request path contains no runtime DDL, cleanup, or delete operation.

File references above are relative to `apps/timsexperiments/src/lib/conversations` unless another path is given.

## Migration checks

`drizzle/migrations/0002_anonymous_conversations.sql:1` adds one table and its owner index. It does not alter or delete subscriptions, experience stories, or passages. Its seven columns, primary key, nullability, index, revision bound, and checks agree with `src/db/schema.ts:68` and `meta/0002_snapshot.json:5`. There is no expiry column or automatic retention operation.

The journal at `meta/_journal.json:19` records idx 2 with tag `0002_anonymous_conversations`, following idx 0 and 1 with increasing migration timestamps. The snapshot's prevId matches the 0001 snapshot ID. Every preexisting table definition in 0001 is identical in 0002. Local Drizzle schema generation produces the same JSON table/view definitions and an empty migration diff against 0002. The comparison serializes the generated object first because the API includes undefined properties that JSON files omit. An initial direct in-memory comparison stopped on those omitted properties; that was a probe mismatch, not schema drift.

The supplied SQLite test passes both 0000 → 0002 and the complete 0000 → 0001 → 0002 SQL chain. An independent check also ran Drizzle's actual local migrator on a fresh temporary SQLite file. It applied three journal entries, created the expected tables, and a second migration run left the migration count at three. Subsequent handler writes succeeded on that migrated database. This verifies local chain compatibility, not the state of any live database. The user-supplied premise that 0002 is unapplied is required before rewriting a pending migration is deployed; this review did not inspect live migration history.

## Test evidence and reproduction

From `apps/timsexperiments`, with environment-file loading disabled:

```sh
bun --no-env-file test src/lib/conversations
bun --no-env-file x tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022,DOM,DOM.Iterable --types bun,astro/client src/lib/conversations/*.ts src/pages/api/conversations/index.ts src/db/schema.ts
```

Observed Bun 1.4.2. The suite completed with **14 pass, 0 fail, 513 assertions**. The scoped strict TypeScript command exited 0 with no diagnostics. These commands were run independently, rather than relying on the producer's reported result.

Eight additional checks ran through `bun --no-env-file -` using stdin, real `@libsql/client` SQLite clients, the production handler, and a fresh temporary directory removed in finally. All eight completed successfully. No permanent test or source file was added. To reproduce the checks, inject `openClient: () => createClient({url: localFileUrl})` and a controlled millisecond `now` into the handler, using dummy valid settings and same-origin application/json PUT requests:

1. Run `migrate(drizzle({client}), {migrationsFolder:'./drizzle/migrations'})` twice on a fresh file. Assert `__drizzle_migrations` has three rows after each run.
2. Generate a snapshot with `generateSQLiteDrizzleJson(schema, previous.id)`, JSON-round-trip it, compare its tables/views with 0002, and assert `generateSQLiteMigration(snapshot, generated)` returns `[]`.
3. Create a snapshot whose question is `"  \tQualified?\r\n "` and whose paragraphs include `"  Unknown outcome.\n\nNo claim.  "`, composed/decomposed Unicode, CRLF, an emoji, NUL, literal HTML, quotes, and U+2028/U+2029. Assert deep equality between the original turns and parsed stored turns_json. The response is exactly `{revision:1}`.
4. Discard the creation cookie and repeat the identical revision-zero request. Assert 409 and an unchanged row. Repeat with the original cookie and assert 200, revision 1, and unchanged row/timestamps.
5. Repeat against the occupied UUID with duplicate owner cookies, an invalid token, and only the development cookie over HTTPS. Each returns 409 without Set-Cookie and leaves the row unchanged.
6. Advance the clock by 2,000 ms and submit two different snapshots concurrently at revision 1 through separate request clients. Observed statuses were **200,409**, the successful receipt was exactly `{revision:2}`, and the database contained one row at revision 2. All request clients closed. This is one local contention check, not a distributed-load or deployed-network test.
7. Submit wrong-port Origin, empty Origin, and `same-site` Fetch Metadata requests. Assert 403 without opening a client. Supply runtime overrides with enabled null/false, URL null, or token empty against otherwise valid build fallbacks. Assert 503 without opening a client. All errors have only error/message fields and no transcript text or Set-Cookie.
8. Check the installed driver's `transactionModeToBegin('write')` equals `BEGIN IMMEDIATE`. Installed `drizzle-orm/libsql/session.js:60` calls `client.transaction()` without a mode override; installed `@libsql/client/lib-esm/http.js:153` defaults to write. This supports the transaction claim for the shipped web client without contacting Turso. The SQLite checks use the local driver because the web-only driver does not open file databases.

## Known residual risks and scope limits

There is no global, owner-level, or IP-level creation quota. The per-archive two-second limit at `store.ts:38` does not limit revision-zero inserts for fresh UUIDs at `store.ts:57`. Reproduce by repeatedly submitting valid new UUIDs, with or without reusing a cookie; each can create another retained row. A non-browser client can supply the expected Origin header, so CSRF checks do not prevent this abuse. An attacker can consume storage and write capacity, increase costs, or reduce archive availability. Per-request size and turn limits bound each submission, not aggregate database growth. This is a real operational risk, not evidence that an existing archive can be read or taken over. No global quota requirement was supplied, so it is recorded as a residual rather than a newly invented release blocker.

Archives intentionally have no expiry. Cookie loss can permanently prevent further app updates to an existing archive, while the operator retains it. Both behaviors follow the final requirement. No expiry or deletion policy is requested by this review.

The verdict does not establish localStorage refresh restoration, close/clear cancellation of queued writes, disclosure text, local inference, frontend text rendering, deployment bindings, live schema state, or remote transport behavior. Those require their own integration/deployment verification. Full-snapshot PUT is the documented mutable archive contract; this review does not impose an append-only event-log requirement.

## Reviewed source hashes

SHA-256 paths below are relative to `apps/timsexperiments`, except the final documentation path, which is relative to the repository root.

```text
584d4a0397330f09671ae5bb02d8b3efef76068292d4b4de424a5f01faf21402  src/lib/conversations/body.ts
8e5f944a0259514f1976b539bcd7fb263928363364bb537b2890ee5a9c6d1938  src/lib/conversations/config.ts
50bd01732ddfe271fe40f7a1caddbdc5221ec9e52f37149004d8c9fa63262536  src/lib/conversations/conversations.test.ts
9e9568edfcb814bb3f6c00495a652a6f35ccd1359b5ad8a512e0f89556092a25  src/lib/conversations/handler.ts
de5adb23a39986c63cd026d427f8b9aae27f753ca569767c99c971875b56720c  src/lib/conversations/owner.ts
b3a6829be9fef2308882c263c18d0d07e2f6a4643e7862693e0196ea7fac885d  src/lib/conversations/protocol.ts
3ba5a9722eab17fb6e6ba928c17aa867b6c29d12e43078a73aeb35acf5cb80eb  src/lib/conversations/store.ts
2e06557b6e80a0e1956980370fdf5702124f5c34e1c086bf072c4cadbe07808e  src/db/schema.ts
b6221930effe1906b498e507568daa8239d0c692a824a6df04828cf3546e5eb3  src/pages/api/conversations/index.ts
ceb352ef4b2dc61708c10970fcf18267965a9db23bc6b95310d6f8e3316ec32d  drizzle/migrations/0000_cuddly_bushwacker.sql
419ced4aced1ea3ca98411b0dede8aaba529ab1aa8d34e0d91812e3865f3fb9b  drizzle/migrations/0001_left_fallen_one.sql
e3db9db0b06adcadd6cf2c716fa0be00eabcbbf1fa1e2166e7bdcc23bd135c4f  drizzle/migrations/0002_anonymous_conversations.sql
7126b0618405956b93123822f08e7e4fa794265065eea65fe925513fc9ca2899  drizzle/migrations/meta/0000_snapshot.json
e321a5f6dcd07497b4481dcf578435d20e3068522ce51ec810138c92ba4b3e7b  drizzle/migrations/meta/0001_snapshot.json
e711137112ad3dc7a6de8d42ba2431ac5be9b894ec1fdbfd60721d8dca2bf8b5  drizzle/migrations/meta/0002_snapshot.json
d16199a7dd471bdb866bd71f11b61b33e60b8d5ba13a416cf5e5343798f99549  drizzle/migrations/meta/_journal.json
0f8e1e3c96f10da082202d16eee2ac07ef4283d25180b617c84f9b5f46b67b40  docs/planning/chat-storage-backend.md
```

PASS.
