import { expect, test } from 'bun:test';
import { runInNewContext } from 'node:vm';
import { z } from 'zod';

// Run the actual browser script against a small DOM boundary. No network or mailto navigation escapes.
const source = await Bun.file(new URL('../../scripts/site/letter-station.ts', import.meta.url)).text();
const script = new Bun.Transpiler({ loader: 'ts' }).transformSync(source.replace("import { z } from 'zod';", ''));
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function setup(capability = true, capabilityStatus = 200, check = async () => Response.json({ available: capability }, { status: capabilityStatus })) {
  const handlers = new Map<string, () => Promise<void>>();
  const classes = new Set<string>();
  const values = { name: 'Ada', email: 'ada@example.com', message: 'Hello from this test.', website: '' };
  const form = { reportValidity: () => true, classList: { add: (name: string) => classes.add(name), remove: (name: string) => classes.delete(name) }, reset: () => { values.message = ''; }, addEventListener: (_: string, handler: (event: { preventDefault: () => void }) => Promise<void>) => handlers.set('submit', () => handler({ preventDefault() {} })) };
  const button = { textContent: '', disabled: false };
  const status = { textContent: '' };
  const note = { textContent: '' };
  const copy = { addEventListener: (_: string, handler: () => Promise<void>) => handlers.set('copy', handler) };
  const elements = new Map<string, unknown>([['#letter-form', form], ['#letter-send', button], ['#letter-status', status], ['#delivery-note', note], ['#letter-copy', copy]]);
  const calls: RequestInit[] = [];
  let respond: () => Promise<Response> = async () => Response.json({ accepted: true });
  const location = { href: '' };
  let copied = '';
  runInNewContext(script, {
    z, crypto, AbortSignal, setTimeout: () => 0,
    document: { querySelector: (selector: string) => elements.get(selector) },
    FormData: class { get(key: string) { return Object.entries(values).find(([name]) => name === key)?.[1] ?? null; } },
    window: { location }, navigator: { clipboard: { writeText: async (text: string) => { copied = text; } } },
    fetch: async (_url: string, init: RequestInit) => {
      if (init.method !== 'POST') return check();
      calls.push(init);
      return respond();
    },
  });
  return { values, button, status, note, calls, location, copied: () => copied,
    respond: (fn: () => Promise<Response>) => { respond = fn; },
    submit: () => handlers.get('submit')!(), copy: () => handlers.get('copy')!(),
  };
}

test('unavailable or unsuccessful capability checks still submit directly and preserve failed drafts', async () => {
  for (const [available, status] of [[false, 200], [true, 503]] as const) {
    const ui = setup(available, status);
    ui.respond(async () => Response.json({ message: 'Sending is temporarily unavailable. Your draft is still here. Press Send to try again.' }, { status: 503 }));
    await settle();
    await ui.submit();
    expect(ui.calls).toHaveLength(1);
    expect(ui.location.href).toBe('');
    expect(ui.status.textContent).toContain('Press Send');
    expect(ui.values.message).toBe('Hello from this test.');
    expect(ui.button.textContent).toBe('Send ↗');
    await ui.copy();
    expect(ui.copied()).toContain(ui.values.message);
    expect(ui.status.textContent).toContain('Letter copied');
  }
});

test('uncertain retries keep key and payload, edits get a fresh key, and only acceptance clears draft', async () => {
  const ui = setup();
  await settle();
  ui.respond(async () => { throw new Error('timeout'); });
  await ui.submit();
  expect(ui.values.message).toBe('Hello from this test.');
  expect(ui.status.textContent).toContain('could not be confirmed');
  await ui.submit();
  expect(ui.calls[1]!.body).toBe(ui.calls[0]!.body);
  ui.values.message = 'A changed draft message.';
  await ui.submit();
  expect(JSON.parse(String(ui.calls[2]!.body)).requestId).not.toBe(JSON.parse(String(ui.calls[0]!.body)).requestId);
  ui.respond(async () => Response.json({ accepted: true }));
  await ui.submit();
  expect(ui.calls[3]!.body).toBe(ui.calls[2]!.body);
  expect(ui.values.message).toBe('');
  expect(ui.status.textContent).toContain('accepted for delivery');
});

test('malformed success and HTTP failure never clear draft or claim acceptance', async () => {
  const ui = setup();
  await settle();
  for (const response of [() => Response.json({}), () => Response.json({ accepted: true }, { status: 502 }), () => new Response('invalid')]) {
    ui.respond(async () => response());
    await ui.submit();
    expect(ui.values.message).toBe('Hello from this test.');
    expect(ui.status.textContent).toContain('could not be confirmed');
    expect(ui.button.disabled).toBe(false);
  }
});

test('in-flight duplicate submit is blocked and acceptance preserves newer edits', async () => {
  const ui = setup();
  await settle();
  let resolveResponse: (response: Response) => void = () => { throw new Error('not started'); };
  ui.respond(() => new Promise(resolve => { resolveResponse = resolve; }));
  const pending = ui.submit();
  expect(ui.button.disabled).toBe(true);
  await ui.submit();
  expect(ui.calls).toHaveLength(1);
  ui.values.message = 'New edits while sending.';
  resolveResponse(Response.json({ accepted: true }));
  await pending;
  expect(ui.values.message).toBe('New edits while sending.');
  expect(ui.status.textContent).toContain('newer edits are still here');
});

test('server configuration loss keeps Send retrying directly and succeeds after configuration recovers', async () => {
  const ui = setup();
  await settle();
  ui.respond(async () => Response.json({ message: 'Sending is temporarily unavailable. Your draft is still here.' }, { status: 503 }));
  await ui.submit();
  expect(ui.button.textContent).toBe('Send ↗');
  expect(ui.values.message).toBe('Hello from this test.');
  ui.respond(async () => Response.json({ accepted: true }));
  await ui.submit();
  expect(ui.calls).toHaveLength(2);
  expect(ui.calls[1]!.body).toBe(ui.calls[0]!.body);
  expect(ui.location.href).toBe('');
  expect(ui.status.textContent).toContain('accepted for delivery');
  expect(ui.values.message).toBe('');
});

test('a pending or rejected capability check never blocks direct sending', async () => {
  for (const check of [() => new Promise<Response>(() => {}), async () => { throw new Error('network failure'); }]) {
    const ui = setup(true, 200, check);
    await settle();
    await ui.submit();
    expect(ui.calls).toHaveLength(1);
    expect(ui.location.href).toBe('');
    expect(ui.status.textContent).toContain('accepted for delivery');
  }
});
