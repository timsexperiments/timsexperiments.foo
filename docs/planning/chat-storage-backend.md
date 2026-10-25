# Chat archive backend

This replaces the earlier per-owner resume/delete design and its review assumptions. Turso is an archive for Tim to inspect. The visitor app never reads, lists, restores, or deletes archived transcripts. No accounts are required. Closing the robot dialog or choosing Clear removes the local transcript and local session identity, then the next opening creates a fresh UUID. Remote archives remain.

The frontend owns automatic archiving after completed turns, the opening disclosure, localStorage refresh persistence, local inference, and safe text rendering. Suggested disclosure: "Completed questions and answers are automatically archived for Tim to review. Refresh keeps this chat on this device. Closing or clearing starts a new chat and does not delete Tim's archive." These are integration requirements, not functionality implemented in this backend directory.

## Browser contract

`src/lib/conversations/protocol.ts` imports only Zod. It exports `conversationTurnSchema`, `ConversationTurn`, `conversationLimits`, `archivePutSchema`, `ArchivePut`, `archiveReceiptSchema`, `ArchiveReceipt`, and `conversationErrorSchema`. The previous resume envelopes and delete request types have been removed.

```ts
type ConversationTurn = {
  question: string;
  paragraphs: string[];
  experienceIds: string[];
};
type ArchivePut = {
  id: string;          // Random client-generated UUID per new chat
  revision: number;   // 0 to create, then the acknowledged server revision
  turns: ConversationTurn[];
};
type ArchiveReceipt = { revision: number }; // Positive safe integer
```

Only `PUT /api/conversations` is supported. A successful request returns HTTP 200 with exactly `{revision}`. Responses never include a transcript, archive ID, or timestamps. GET, DELETE, POST, HEAD, OPTIONS, and other methods return 405 with `Allow: PUT`, without opening the database. Query parameters cannot select an archive. There is no public read or list endpoint.

For each new chat, create a random UUID with `crypto.randomUUID()` and use revision 0 for the first completed snapshot. Keep that UUID, acknowledged revision, and active transcript in localStorage for refresh. After each successful PUT, use the returned revision for the next full snapshot. Send only completed question/answer turns. Clear or close must discard the local transcript, UUID, revision and queued work for that session, without sending DELETE or reusing the UUID on next opening. The protected owner cookie may continue authorizing writes to future UUIDs; it is not the local chat identity.

Unknown fields are rejected. UUID spelling is normalized to lowercase. Input revision is a nonnegative safe integer no larger than `Number.MAX_SAFE_INTEGER - 1`, leaving room for a server increment. Each question must be nonblank and at most 600 UTF-16 code units. Each answer requires 1 to 8 nonblank paragraphs of up to 2,000 code units each. Each turn has at most 12 experience IDs, which may be empty; IDs are at most 100 code units and match `[a-zA-Z0-9][a-zA-Z0-9._:-]*`. Strings, including qualification language and paragraph breaks, are preserved without trimming or HTML interpretation. The frontend must render them as text.

A snapshot contains 1 to 12 turns. This bounds growth of each archive and matches the existing host limit. A thirteenth turn or empty overwrite returns 400 and leaves the archive intact. The byte reader independently enforces 256 KiB of actual streamed data, regardless of Content-Length, and cancels oversized streams. Missing bodies, invalid UTF-8 and invalid JSON are rejected. Structural and byte limits both apply.

## Ownership, revisions and retries

The first successful PUT sets a random 256-bit owner token in a protected cookie. The database stores only its SHA-256 hash. Every existing-archive lookup and CAS update requires both the client UUID and that hash. An occupied UUID belonging to another owner returns generic 409, including an identical revision-zero request. The insert uses the UUID primary key with conflict-do-nothing, so it cannot replace another owner's row or return their transcript. Each owner can create multiple independent archives, all starting at revision 1.

Writes use compare-and-swap revisions. A changed snapshot with the current revision increments it once. An identical snapshot with either the current revision or its immediate predecessor returns the current `{revision}` without modifying content, timestamps or throttle state. Older revisions conflict even when the content matches. This covers acknowledged retries and a response lost after the browser has received the owner cookie. JSON property order does not change snapshot equality.

An initial PUT may commit while its response, including Set-Cookie, is lost. A cookie-free retry then generates a different owner and conflicts with the occupied UUID. This is intentionally safe: the server neither takes over the original archive nor reveals its contents. There is no public recovery/read path. Keep local chat available and report archive unavailability; do not attempt remote restore or silently assign another UUID to retry the same chat. Losing or expiring the owner cookie has the same ownership consequence. Old archives remain for Tim.

Changed writes to the same archive must be at least two seconds apart. The persisted `next_write_at` enforces this across request-scoped clients. Other archive UUIDs have independent throttle state. Conflict and identical retry checks precede throttling. On 429, wait the integer seconds in `Retry-After`, then retry using the last acknowledged revision and the latest completed snapshot for the same session. This per-archive limit does not impose a global quota on creation of new UUIDs.

Concurrent writes serialize in the installed libsql driver's write transaction, `BEGIN IMMEDIATE`. The transaction includes ownership lookup, revision and retry checks, throttle checks, and the insert or CAS update. SQL update predicates include UUID, owner hash and revision. No expiry logic, owner-level replacement, tombstones, cleanup or runtime DDL remains.

## HTTP and configuration

All responses use JSON, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, and `Vary: Cookie`. No CORS headers are added. PUT requires `application/json` and exact Origin equality with the request URL's origin. When Sec-Fetch-Site is supplied, only `same-origin` and `none` are accepted; sibling origins are rejected.

Errors have the generic shape `{error,message}` and never echo text, credentials, database errors or another archive's state.

- 400 `invalid_request`: malformed body or schema violation.
- 403 `forbidden`: missing or wrong Origin, or rejected Fetch Metadata.
- 405 `method_not_allowed`: use PUT only.
- 409 `conflict`: ownership or revision cannot authorize this update; there is no remote reload path.
- 413 `body_too_large`: actual body exceeds 256 KiB.
- 415 `unsupported_media_type`: PUT requires application/json.
- 429 `rate_limited`: wait Retry-After before retrying.
- 503 `unavailable`: disabled or invalid configuration, missing migration, corrupt stored data, or database failure. Local chat can continue.

Successful PUT sets or refreshes `__Host-conversation_owner=<64 lowercase hex characters>; Path=/; Max-Age=2592000; HttpOnly; SameSite=Strict; Secure` on HTTPS, with no Domain attribute. HTTP development uses `conversation_owner_dev` without Secure. HTTPS ignores the development cookie. Invalid or duplicate owner cookies confer no ownership. Failed requests and unsupported methods never set cookies. The 30-day cookie lifetime governs write authorization only. It does not expire archives.

Archiving is disabled unless `CONVERSATIONS_ENABLED` is exactly the string `true` and the existing `DATABASE_URL` and `DATABASE_AUTH_TOKEN` credentials validate. URLs must use HTTPS or libsql and cannot include embedded credentials. The route resolves runtime bindings per request, with its existing server-only import.meta.env fallback for absent fields. Explicit empty or disabled runtime values win. Each accepted request opens and closes its own `@libsql/client/web` client and uses `drizzle-orm/libsql/web`; it does not use the existing module-global database client. Exceptions are not logged because transport errors may include submitted text or credentials.

## Migration and retention

The unapplied `0002_anonymous_conversations.sql` was rewritten locally and `meta/0002_snapshot.json` regenerated from the schema with Drizzle's local API, without loading drizzle.config.ts or .env files. The existing journal tag and position remain correct. Migration 0001 is unchanged. Review the pending migration chain before applying it through the normal deployment process. No migration was applied to a live database by this work.

The additive migration creates `anonymous_conversations` with:

- `id`: non-null UUID primary key, validated at the HTTP boundary, plus a database length check.
- `owner_hash`: non-null, 64-character hash with an index for operator inspection.
- `revision`: positive safe integer.
- `turns_json`: non-null completed snapshot.
- `created_at` and `updated_at`: epoch milliseconds, with creation preserved on updates.
- `next_write_at`: durable per-archive throttle deadline.

Timestamp checks require update time to be at least creation time and the write deadline to be at least update time. Archives have no expiry and are never automatically deleted. Any future retention/deletion policy requires explicit agreement; cookie expiry, Clear, dialog close and archiving disablement do not remove stored rows. Tim inspects archives through his database tooling, outside the visitor API.

## Verification

From `apps/timsexperiments`, without loading environment files:

```sh
bun --no-env-file test src/lib/conversations
bun --no-env-file x tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022,DOM,DOM.Iterable --types bun,astro/client src/lib/conversations/*.ts src/pages/api/conversations/index.ts src/db/schema.ts
```

The 14 tests use real temporary SQLite databases through libsql and real Drizzle transactions. They cover multiple archives per owner, owner isolation and known-UUID takeover denial, first-cookie loss, CAS, identical retries, durable throttling, canonical UUIDs, no expiry, timestamps, a twelve-turn bound, exact qualification/paragraph preservation, SQL rollback, migration order, old GET/DELETE denial, malformed and oversized bodies, CSRF, disabled/configuration failures, corrupt data, and client closure. Both direct compatibility after 0000 and the full 0000 → 0001 → 0002 chain pass locally. Strict TypeScript checking passes for the assigned backend files.

No live database, credentials, deployment, git operations, or frontend files were touched. Frontend integration must provide the disclosure and local lifecycle above and preserve local inference and safe rendering. Local tests do not simulate deployed network failures or establish a global abuse quota.
