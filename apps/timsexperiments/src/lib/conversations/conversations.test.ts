import { afterEach, describe, expect, test } from 'bun:test';
import { createClient, type Client } from '@libsql/client';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { ConversationBodyTooLarge, readConversationJson } from './body';
import { conversationConfig, conversationConfigSchema } from './config';
import { handleConversations } from './handler';
import { hashOwnerToken, newOwnerToken, ownerCookie, ownerCookieMaxAgeSeconds, readOwnerToken } from './owner';
import { archivePutSchema, archiveReceiptSchema, conversationErrorSchema, conversationLimits, conversationTurnSchema } from './protocol';
import { ConversationStore, conversationWriteIntervalMs } from './store';

const config = { enabled: 'true', url: 'libsql://example.turso.io', authToken: 'test-only-never-sent' };
const id = 'af0c5420-3fb7-41d0-945e-4affaa154738';
const otherId = '632a28d6-8273-43f9-ae20-a83483ec8297';
const turn = { question: 'What did Tim build?', paragraphs: ['Tim built a parser.'], experienceIds: ['parser'] };
const changedTurn = { ...turn, question: 'What else did Tim build?' };
const initial = { id, revision: 0, turns: [turn] };
const migration = await Bun.file(new URL('../../../drizzle/migrations/0002_anonymous_conversations.sql', import.meta.url)).text();
const fixtures: Array<() => void> = [];
afterEach(() => { for (const close of fixtures.splice(0)) close(); });

async function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'conversation-archive-sql-'));
  const url = `file:${join(dir, 'test.db')}`;
  const client = createClient({ url });
  const opened: Client[] = [];
  fixtures.push(() => { client.close(); for (const requestClient of opened) requestClient.close(); rmSync(dir, { recursive: true, force: true }); });
  // Only local SQL files. This additive migration also works without 0001.
  await client.executeMultiple(await Bun.file(new URL('../../../drizzle/migrations/0000_cuddly_bushwacker.sql', import.meta.url)).text());
  await client.executeMultiple(migration);
  let time = Date.UTC(2026, 9, 22, 12);
  const dependencies = {
    openClient() { const requestClient = createClient({ url }); opened.push(requestClient); return requestClient; },
    now: () => time,
  };
  return {
    client,
    advance: (delta = conversationWriteIntervalMs) => { time += delta; },
    time: () => time,
    opened,
    rows: async () => (await client.execute('SELECT * FROM anonymous_conversations ORDER BY id')).rows,
    handle: (request: Request, settings: unknown = config) => handleConversations(request, settings, dependencies),
  };
}

function request(method: string, body?: unknown, cookie?: string, headers: Record<string, string> = {}, url = 'https://example.com/api/conversations') {
  return new Request(url, {
    method,
    headers: { origin: new URL(url).origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
function cookie(response: Response): string {
  const value = response.headers.get('set-cookie')?.split(';', 1)[0];
  if (!value) throw new Error('Expected owner cookie');
  return value;
}
async function receipt(response: Response) {
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('access-control-allow-origin')).toBeNull();
  return archiveReceiptSchema.parse(await response.json());
}
async function assertFailure(response: Response, status: number, error: z.infer<typeof conversationErrorSchema>['error']) {
  expect(response.status).toBe(status);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  expect(response.headers.get('access-control-allow-origin')).toBeNull();
  expect(response.headers.get('set-cookie')).toBeNull();
  expect(conversationErrorSchema.parse(await response.json()).error).toBe(error);
}

describe('browser archive protocol and bounded stream boundary', () => {
  test('exports only a bounded completed snapshot and revision receipt', () => {
    expect(conversationTurnSchema.parse(turn)).toEqual(turn);
    expect(archivePutSchema.parse(initial)).toEqual(initial);
    expect(archivePutSchema.parse({ ...initial, id: id.toUpperCase() }).id).toBe(id);
    expect(archiveReceiptSchema.parse({ revision: 1 })).toEqual({ revision: 1 });
    expect(archiveReceiptSchema.safeParse({ revision: 1, turns: [turn] }).success).toBe(false);
    for (const turns of [[], [null], [{ ...turn, paragraphs: [] }], [{ ...turn, paragraphs: [' '] }], [{ ...turn, question: '' }], [{ ...turn, question: 'x'.repeat(601) }], [{ ...turn, pending: true }], [{ ...turn, paragraphs: ['x'.repeat(2001)] }], [{ ...turn, paragraphs: Array(9).fill('answer') }], [{ ...turn, experienceIds: Array(13).fill('id') }], [{ ...turn, experienceIds: ['../private'] }], [{ ...turn, experienceIds: ['x'.repeat(101)] }], Array(13).fill(turn)]) {
      expect(archivePutSchema.safeParse({ ...initial, turns }).success).toBe(false);
    }
    for (const revision of [-1, 0.1, '0', null, Infinity, Number.MAX_SAFE_INTEGER]) {
      expect(archivePutSchema.safeParse({ ...initial, revision }).success).toBe(false);
    }
    for (const bad of [{ revision: 0, turns: [turn] }, { ...initial, id: 'chosen' }, { ...initial, ownerHash: 'chosen' }]) {
      expect(archivePutSchema.safeParse(bad).success).toBe(false);
    }
    expect(conversationTurnSchema.safeParse({ ...turn, question: 'x'.repeat(600), paragraphs: Array(8).fill('x'.repeat(2000)), experienceIds: Array(12).fill('x'.repeat(100)) }).success).toBe(true);
    expect(archiveReceiptSchema.safeParse({ revision: 0 }).success).toBe(false);
  });

  test('bounds actual bytes, releases locks, cancels overflow and rejects invalid JSON/UTF-8', async () => {
    expect(await readConversationJson(new Response('"é"'), 4)).toBe('é');
    await expect(readConversationJson(new Response('"é"'), 3)).rejects.toBeInstanceOf(ConversationBodyTooLarge);
    for (const response of [new Response(null), new Response('{'), new Response(new Uint8Array([34, 255, 34]))]) {
      await expect(readConversationJson(response)).rejects.toThrow();
    }
    let cancelled = false;
    const body = new ReadableStream<Uint8Array<ArrayBuffer>>({
      start(controller) { controller.enqueue(new TextEncoder().encode('"abc')); controller.enqueue(new TextEncoder().encode('def"')); },
      cancel() { cancelled = true; },
    });
    await expect(readConversationJson({ body }, 5)).rejects.toBeInstanceOf(ConversationBodyTooLarge);
    expect(cancelled).toBe(true);
    expect(body.locked).toBe(false);
  });
});

describe('configuration and ownership', () => {
  test('requires explicit enablement and credentials, gives runtime values priority', () => {
    expect(conversationConfigSchema.safeParse(config).success).toBe(true);
    for (const change of [{ enabled: undefined }, { enabled: 'false' }, { enabled: true }, { url: '' }, { url: 'file:prod.db' }, { url: 'http://insecure.example' }, { url: 'https://user:secret@example.com' }, { authToken: '' }, { authToken: ' token ' }, { authToken: 'x\ny' }]) {
      expect(conversationConfigSchema.safeParse({ ...config, ...change }).success).toBe(false);
    }
    const build = { CONVERSATIONS_ENABLED: 'true', DATABASE_URL: config.url, DATABASE_AUTH_TOKEN: config.authToken };
    expect(conversationConfig({}, build)).toEqual(config);
    expect(conversationConfig({ runtime: { env: { CONVERSATIONS_ENABLED: 'false', DATABASE_URL: 'https://runtime.example', DATABASE_AUTH_TOKEN: '' } } }, build))
      .toEqual({ enabled: 'false', url: 'https://runtime.example', authToken: '' });
    expect(conversationConfig({ runtime: { env: { CONVERSATIONS_ENABLED: null } } }, build)).toMatchObject({ enabled: null });
  });

  test('uses random 256-bit tokens, stores only SHA-256, and uses host-only protected cookies', async () => {
    const token = newOwnerToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(newOwnerToken()).not.toBe(token);
    const hash = await hashOwnerToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe(token);
    expect(await hashOwnerToken(token)).toBe(hash);
    const value = ownerCookie(request('PUT'), token);
    expect(value).toBe(`__Host-conversation_owner=${token}; Path=/; Max-Age=${ownerCookieMaxAgeSeconds}; HttpOnly; SameSite=Strict; Secure`);
    expect(value).not.toContain('Domain=');
    expect(readOwnerToken(request('PUT', undefined, value))).toBe(token);
    expect(readOwnerToken(request('PUT', undefined, `__Host-conversation_owner=${token}; __Host-conversation_owner=${token}`))).toBeNull();
    expect(readOwnerToken(request('PUT', undefined, '__Host-conversation_owner=invalid'))).toBeNull();
    expect(readOwnerToken(request('PUT', undefined, `conversation_owner_dev=${token}`))).toBeNull();
    const dev = request('PUT', undefined, undefined, {}, 'http://localhost:4321/api/conversations');
    expect(ownerCookie(dev, token)).toBe(`conversation_owner_dev=${token}; Path=/; Max-Age=${ownerCookieMaxAgeSeconds}; HttpOnly; SameSite=Strict`);
  });
});

describe('real SQLite archive writes through the HTTP handler', () => {
  test('denies old GET/resume, DELETE, list and all other methods without SQL, even when disabled', async () => {
    const f = await fixture();
    const created = await f.handle(request('PUT', initial));
    const owner = cookie(created);
    await receipt(created);
    const before = await f.rows();
    const opened = f.opened.length;
    for (const method of ['GET', 'DELETE', 'POST', 'OPTIONS', 'HEAD', 'PATCH']) {
      for (const token of [undefined, owner]) {
        for (const settings of [config, {}]) {
          const denied = await f.handle(request(method, method === 'DELETE' ? { revision: 1 } : undefined, token, {}, `https://example.com/api/conversations?id=${id}`), settings);
          expect(denied.headers.get('allow')).toBe('PUT');
          await assertFailure(denied, 405, 'method_not_allowed');
        }
      }
    }
    expect(f.opened.length).toBe(opened);
    expect(await f.rows()).toEqual(before);
  });

  test('one cookie owns multiple independent UUID archives; different owners cannot replace known UUIDs', async () => {
    const f = await fixture();
    const created = await f.handle(request('PUT', initial));
    const a = cookie(created);
    expect(await receipt(created)).toEqual({ revision: 1 });
    expect(await receipt(await f.handle(request('PUT', { ...initial, id: otherId, turns: [changedTurn] }, a)))).toEqual({ revision: 1 });
    const b = `__Host-conversation_owner=${newOwnerToken()}`;
    for (const owner of [b, undefined]) {
      for (const revision of [0, 1]) {
        await assertFailure(await f.handle(request('PUT', { ...initial, revision }, owner)), 409, 'conflict');
      }
    }
    const rows = await f.rows();
    expect(rows).toHaveLength(2);
    expect(rows.map(row => row.id)).toEqual([otherId, id]);
    expect(rows[0]?.owner_hash).toBe(rows[1]?.owner_hash);
    expect(rows[0]?.owner_hash).toBe(await hashOwnerToken(a.split('=')[1] ?? ''));
    expect(JSON.stringify(rows)).not.toContain(a.split('=')[1] ?? 'missing-token');
    expect(rows.find(row => row.id === id)?.turns_json).toBe(JSON.stringify([turn]));
    expect(f.opened.every(client => client.closed)).toBe(true);
  });

  test('identical retries preserve timestamps/revision, CAS precedes the two-second per-archive throttle', async () => {
    const f = await fixture();
    const created = await f.handle(request('PUT', initial));
    const owner = cookie(created);
    await receipt(created);
    const before = await f.rows();
    for (const revision of [0, 1]) {
      expect(await receipt(await f.handle(request('PUT', { ...initial, revision }, owner)))).toEqual({ revision: 1 });
    }
    expect(await f.rows()).toEqual(before);
    await assertFailure(await f.handle(request('PUT', { ...initial, turns: [changedTurn] }, owner)), 409, 'conflict');
    const changed = { ...initial, revision: 1, turns: [turn, changedTurn] };
    const throttled = await f.handle(request('PUT', changed, owner));
    expect(throttled.headers.get('retry-after')).toBe('2');
    await assertFailure(throttled, 429, 'rate_limited');
    f.advance(1001);
    const later = await f.handle(request('PUT', changed, owner));
    expect(later.headers.get('retry-after')).toBe('1');
    await assertFailure(later, 429, 'rate_limited');
    f.advance(999);
    expect(await receipt(await f.handle(request('PUT', changed, owner)))).toEqual({ revision: 2 });
    const after = await f.rows();
    expect(after[0]).toMatchObject({ id, revision: 2, created_at: before[0]?.created_at, updated_at: f.time() });
    expect(await receipt(await f.handle(request('PUT', changed, owner)))).toEqual({ revision: 2 });
    expect(await f.rows()).toEqual(after);
    await assertFailure(await f.handle(request('PUT', { ...initial, revision: 1 }, owner)), 409, 'conflict');
    await assertFailure(await f.handle(request('PUT', { ...changed, revision: 0 }, owner)), 409, 'conflict');
  });

  test('UUID case and JSON key order cannot create duplicate archives or false conflicts', async () => {
    const f = await fixture();
    const created = await f.handle(request('PUT', initial));
    const owner = cookie(created);
    await receipt(created);
    expect(await receipt(await f.handle(request('PUT', {
      id: id.toUpperCase(), revision: 0,
      turns: [{ experienceIds: turn.experienceIds, paragraphs: turn.paragraphs, question: turn.question }],
    }, owner)))).toEqual({ revision: 1 });
    expect(await f.rows()).toHaveLength(1);
  });

  test('archives survive elapsed cookie lifetime and new chats, without expiry or cleanup', async () => {
    const f = await fixture();
    const created = await f.handle(request('PUT', initial));
    const owner = cookie(created);
    await receipt(created);
    const before = await f.rows();
    f.advance(366 * 24 * 60 * 60 * 1000);
    expect(await receipt(await f.handle(request('PUT', { ...initial, id: otherId })))).toEqual({ revision: 1 });
    expect((await f.rows()).find(row => row.id === id)).toEqual(before[0]);
    await assertFailure(await f.handle(request('PUT', initial)), 409, 'conflict');
    expect(await receipt(await f.handle(request('PUT', { ...initial, revision: 1, turns: [turn, changedTurn] }, owner)))).toEqual({ revision: 2 });
    const columns = (await f.client.execute('PRAGMA table_info(anonymous_conversations)')).rows.map(row => row.name);
    expect(columns).not.toContain('expires_at');
    expect(columns).toContain('created_at');
    expect(await f.rows()).toHaveLength(2);
  });

  test('caps archive growth at twelve completed turns, preserves qualified paragraph text exactly', async () => {
    const f = await fixture();
    const qualified = { question: '  What is known?  ', paragraphs: ['The record does not establish an outcome.', '<script>text only</script> & "quoted"'], experienceIds: [] };
    const turns = [qualified, ...Array.from({ length: 11 }, () => turn)];
    const created = await f.handle(request('PUT', { ...initial, turns }));
    const owner = cookie(created);
    expect(await receipt(created)).toEqual({ revision: 1 });
    const before = await f.rows();
    expect(before[0]?.turns_json).toBe(JSON.stringify(turns));
    f.advance();
    await assertFailure(await f.handle(request('PUT', { ...initial, revision: 1, turns: [...turns, changedTurn] }, owner)), 400, 'invalid_request');
    await assertFailure(await f.handle(request('PUT', { ...initial, revision: 1, turns: [] }, owner)), 400, 'invalid_request');
    expect(await f.rows()).toEqual(before);
  });

  test('missing-row stale writes conflict, and SQL update failures roll back', async () => {
    const f = await fixture();
    const created = await f.handle(request('PUT', initial));
    const owner = cookie(created);
    await receipt(created);
    const before = await f.rows();
    f.advance();
    await f.client.executeMultiple("CREATE TRIGGER reject_update BEFORE UPDATE ON anonymous_conversations BEGIN SELECT RAISE(ABORT, 'local test rejection'); END;");
    await assertFailure(await f.handle(request('PUT', { ...initial, revision: 1, turns: [changedTurn] }, owner)), 503, 'unavailable');
    expect(await f.rows()).toEqual(before);
    await f.client.execute('DELETE FROM anonymous_conversations');
    await assertFailure(await f.handle(request('PUT', { ...initial, revision: 1 }, owner)), 409, 'conflict');
    expect(await f.rows()).toHaveLength(0);
  });

  test('migration works directly after subscriptions and through the unchanged journal chain', async () => {
    const f = await fixture();
    expect((await f.client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")).rows.map(row => row.name)).toEqual(['anonymous_conversations', 'subscriptions']);
    const dir = mkdtempSync(join(tmpdir(), 'conversation-archive-migrations-'));
    const client = createClient({ url: `file:${join(dir, 'migration.db')}` });
    fixtures.push(() => { client.close(); rmSync(dir, { recursive: true, force: true }); });
    const journal = z.object({ entries: z.array(z.object({ idx: z.number(), tag: z.string() })) })
      .parse(await Bun.file(new URL('../../../drizzle/migrations/meta/_journal.json', import.meta.url)).json());
    expect(journal.entries.map(entry => entry.idx)).toEqual([0, 1, 2]);
    for (const entry of journal.entries) {
      await client.executeMultiple(await Bun.file(new URL(`../../../drizzle/migrations/${entry.tag}.sql`, import.meta.url)).text());
    }
    expect((await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")).rows.map(row => row.name))
      .toEqual(['anonymous_conversations', 'experience_passages', 'experience_stories', 'subscriptions']);
    const store = new ConversationStore(client, f.time);
    expect(await store.put(await hashOwnerToken(newOwnerToken()), initial)).toEqual({ kind: 'saved', receipt: { revision: 1 } });
  });
});

describe('HTTP rejection and unavailability', () => {
  test('rejects CSRF, malformed bodies, old contract and invalid types before opening SQL', async () => {
    const f = await fixture();
    const cases = [
      { req: request('PUT', initial, undefined, { origin: 'https://evil.example' }), status: 403, error: 'forbidden' },
      { req: request('PUT', initial, undefined, { origin: '' }), status: 403, error: 'forbidden' },
      { req: request('PUT', initial, undefined, { origin: 'null' }), status: 403, error: 'forbidden' },
      ...['cross-site', 'same-site'].map(site => ({ req: request('PUT', initial, undefined, { 'sec-fetch-site': site }), status: 403, error: 'forbidden' })),
      { req: request('PUT', initial, undefined, { 'content-type': 'text/plain' }), status: 415, error: 'unsupported_media_type' },
      { req: request('PUT'), status: 400, error: 'invalid_request' },
      { req: request('PUT', { revision: 0, turns: [turn] }), status: 400, error: 'invalid_request' },
      { req: request('PUT', { ...initial, turns: [] }), status: 400, error: 'invalid_request' },
      { req: request('PUT', 'x'.repeat(conversationLimits.bodyBytes), undefined, { 'content-length': '1' }), status: 413, error: 'body_too_large' },
    ];
    for (const item of cases) {
      await assertFailure(await f.handle(item.req), item.status, conversationErrorSchema.shape.error.parse(item.error));
    }
    const headers = { origin: 'https://example.com', 'content-type': 'application/json' };
    for (const body of ['{', new Uint8Array([255])]) {
      await assertFailure(await f.handle(new Request('https://example.com/api/conversations', { method: 'PUT', headers, body })), 400, 'invalid_request');
    }
    expect(f.opened).toHaveLength(0);
  });

  test('disabled/config/SQL failures and corrupt stored data return generic 503 without cookies', async () => {
    const f = await fixture();
    for (const settings of [{}, { ...config, enabled: 'false' }, { ...config, authToken: '' }]) {
      await assertFailure(await f.handle(request('PUT', initial), settings), 503, 'unavailable');
    }
    expect(f.opened).toHaveLength(0);
    const failed = await handleConversations(request('PUT', initial), config, { openClient() { throw new Error('DATABASE_URL=secret; chat=private'); } });
    const text = await failed.clone().text();
    expect(text).not.toContain('secret');
    expect(text).not.toContain('private');
    await assertFailure(failed, 503, 'unavailable');
    const created = await f.handle(request('PUT', initial));
    const owner = cookie(created);
    await receipt(created);
    await f.client.execute("UPDATE anonymous_conversations SET turns_json='not JSON'");
    await assertFailure(await f.handle(request('PUT', { ...initial, revision: 1 }, owner)), 503, 'unavailable');
    await f.client.execute('DROP TABLE anonymous_conversations');
    await assertFailure(await f.handle(request('PUT', initial)), 503, 'unavailable');
    expect(f.opened.every(client => client.closed)).toBe(true);
  });
});
