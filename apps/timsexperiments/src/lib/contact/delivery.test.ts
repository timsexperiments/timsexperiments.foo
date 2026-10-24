import { describe, expect, test } from 'bun:test';
import { deliverLetter, deliveryConfigSchema, letterSchema, readBoundedJson, type SendRequest } from './delivery';
import { handleContact } from './handler';

const letter = { name: 'Ada', email: 'ada@example.com', message: 'Hello from the letter desk.', website: '', requestId: '12345678-1234-4234-8234-123456789012' };
const config = { apiKey: 'test-key-never-sent', from: 'Lab <lab@example.com>' };
const accepted: SendRequest = async () => Response.json({ id: 'receipt-123' });
const request = (body: unknown = letter, headers: Record<string, string> = {}) => new Request('https://example.com/api/contact', {
  method: 'POST', headers: { origin: 'https://example.com', 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
});

describe('letter boundary', () => {
  test('normalizes valid fields and rejects invalid or unknown fields', () => {
    expect(letterSchema.parse({ ...letter, name: ' Ada ', email: ' ada@example.com ', message: ' Hello there! ' }).name).toBe('Ada');
    for (const change of [{ name: '' }, { name: 'a\nb' }, { name: 'a\0b' }, { email: 'bad' }, { message: 'short' }, { message: 'x'.repeat(6001) }, { name: 'x'.repeat(101) }, { requestId: 'not-a-uuid' }, { extra: true }]) {
      expect(letterSchema.safeParse({ ...letter, ...change }).success).toBe(false);
    }
  });
  test('requires both nonblank credentials and a valid single-line sender', () => {
    expect(deliveryConfigSchema.safeParse(config).success).toBe(true);
    expect(deliveryConfigSchema.safeParse({ ...config, from: 'lab@example.com' }).success).toBe(true);
    for (const change of [{ apiKey: '' }, { apiKey: '   ' }, { apiKey: 'a\nb' }, { from: '' }, { from: 'not an email' }, { from: 'Lab\r\nBcc: x <lab@example.com>' }]) {
      expect(deliveryConfigSchema.safeParse({ ...config, ...change }).success).toBe(false);
    }
  });
  test('accepts exact byte limit, rejects malformed, absent and invalid UTF-8 bodies', async () => {
    expect(await readBoundedJson(new Response('"é"'), 4)).toBe('é');
    await expect(readBoundedJson(new Response('"é"'), 3)).rejects.toThrow();
    await expect(readBoundedJson(new Response('{'))).rejects.toThrow();
    await expect(readBoundedJson(new Response(null))).rejects.toThrow();
    await expect(readBoundedJson(new Response(new Uint8Array([34, 255, 34])))).rejects.toThrow();
  });
  test('counts streamed bytes without trusting content-length and cancels overflow', async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array<ArrayBuffer>>({
      start(controller) { controller.enqueue(new TextEncoder().encode('"abc')); controller.enqueue(new TextEncoder().encode('def"')); },
      cancel() { cancelled = true; },
    });
    await expect(readBoundedJson({ body }, 5)).rejects.toThrow('Letter too long');
    expect(cancelled).toBe(true);
    expect(body.locked).toBe(false);
  });
});

describe('provider boundary, all transports mocked', () => {
  test('sends fixed recipient, reply-to, plain text, timeout and a stable provider idempotency key', async () => {
    const calls: RequestInit[] = [];
    const transport: SendRequest = async (url, init) => { expect(url).toBe('https://api.resend.com/emails'); calls.push(init); return accepted(url, init); };
    expect(await deliverLetter(letter, config, transport)).toEqual({ kind: 'accepted', id: 'receipt-123' });
    await deliverLetter(letter, config, transport);
    await deliverLetter({ ...letter, requestId: '22345678-1234-4234-8234-123456789012' }, config, transport);
    expect(calls).toHaveLength(3);
    const first = calls[0]!;
    expect(first.method).toBe('POST');
    expect(first.redirect).toBe('error');
    expect(first.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(first.headers).get('Idempotency-Key')).toBe(`lab-letter/${letter.requestId}`);
    expect(new Headers(calls[1]!.headers).get('Idempotency-Key')).toBe(new Headers(first.headers).get('Idempotency-Key'));
    expect(new Headers(calls[2]!.headers).get('Idempotency-Key')).not.toBe(new Headers(first.headers).get('Idempotency-Key'));
    expect(calls[1]!.body).toBe(first.body);
    expect(JSON.parse(String(first.body))).toMatchObject({ to: ['hello@timsexperiments.foo'], reply_to: letter.email, from: config.from, subject: 'A letter from Ada' });
    expect(JSON.parse(String(first.body)).html).toBeUndefined();
  });
  test('never accepts rejection, conflict, malformed or missing receipt, oversized body or network failure', async () => {
    const transports: SendRequest[] = [
      ...[400, 401, 409, 429, 500].map(status => async () => Response.json({ id: 'fake' }, { status })),
      async () => new Response(null, { status: 204 }),
      async () => new Response('not json'),
      ...[{}, { id: '' }, { id: '  ' }, { id: 12 }, { accepted: true }].map(body => async () => Response.json(body)),
      async () => Response.json({ id: 'x'.repeat(5000) }),
      async () => { throw new Error('network or timeout'); },
    ];
    for (const transport of transports) expect(await deliverLetter(letter, config, transport)).toEqual({ kind: 'failed' });
  });
});

describe('HTTP handler', () => {
  test('rejects invalid origin, cross-site, content type, body, and honeypot before outbound work', async () => {
    let calls = 0;
    const transport: SendRequest = async () => { calls++; throw new Error('unexpected outbound'); };
    const cases = [
      { req: request(letter, { origin: 'https://evil.example' }), status: 403 },
      { req: request(letter, { origin: '' }), status: 403 },
      { req: request(letter, { 'sec-fetch-site': 'cross-site' }), status: 403 },
      { req: request(letter, { 'content-type': 'application/jsonp' }), status: 415 },
      { req: request({ ...letter, website: 'bot.example' }), status: 400 },
      { req: request({ ...letter, email: 'bad' }), status: 400 },
      { req: request({ ...letter, message: 'x'.repeat(25000) }, { 'content-length': '1' }), status: 400 },
    ];
    for (const item of cases) expect((await handleContact(item.req, config, transport)).status).toBe(item.status);
    expect(calls).toBe(0);
  });
  test('missing configuration returns honest fallback without outbound calls', async () => {
    for (const settings of [{}, { apiKey: config.apiKey }, { from: config.from }, { ...config, apiKey: ' ' }]) {
      const response = await handleContact(request(), settings, async () => { throw new Error('must not send'); });
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ fallback: 'email-app' });
    }
  });
  test('only provider acceptance returns success; all uncertainty preserves draft and avoids success', async () => {
    const response = await handleContact(request(letter, { 'content-type': 'Application/JSON; charset=utf-8' }), config, accepted);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ accepted: true });
    for (const transport of [async () => Response.json({ error: 'oops' }), async () => Response.json({ id: 'fake' }, { status: 409 }), async () => { throw new Error('timeout'); }]) {
      const failed = await handleContact(request(), config, transport);
      expect(failed.status).toBe(502);
      const body = await failed.json();
      expect(body.accepted).toBeUndefined();
      expect(body.message).toContain('could not be confirmed');
      expect(body.message).toContain('duplicate');
    }
  });
});
