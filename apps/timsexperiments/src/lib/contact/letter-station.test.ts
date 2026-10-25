import { expect, test } from 'bun:test';
import { runInNewContext } from 'node:vm';
import { z } from 'zod';

// Execute the real client at its DOM/network boundary. Every request stays mocked.
const source = await Bun.file(
  new URL('../../scripts/site/letter-station.ts', import.meta.url)
).text();
const script = new Bun.Transpiler({ loader: 'ts' }).transformSync(
  source.replace("import { z } from 'zod';", '')
);
const settle = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};
function setup({
  available = true,
  reducedMotion = true,
  check = async () => Response.json({ available }),
} = {}) {
  const handlers = new Map<
    string,
    (event: { preventDefault: () => void }) => Promise<void> | void
  >();
  const classes = new Set<string>();
  const values = {
    name: 'Ada',
    email: 'ada@example.com',
    message: 'Hello from this test.',
    website: '',
  };
  const document: {
    activeElement: unknown;
    querySelector: (selector: string) => unknown;
  } = { activeElement: null, querySelector: () => null };
  const element = (id: string, hidden = false) => {
    const attributes = new Map<string, string>();
    return {
      id,
      textContent: '',
      disabled: false,
      hidden,
      dataset: { tone: '' },
      attributes,
      setAttribute: (key: string, value: string) => attributes.set(key, value),
      focus() {
        document.activeElement = this;
      },
      addEventListener: (
        event: string,
        handler: (event: { preventDefault: () => void }) => Promise<void> | void
      ) => handlers.set(`${id}:${event}`, handler),
    };
  };
  const button = element('letter-send');
  const status = element('letter-status');
  const note = element('delivery-note');
  const success = element('letter-success', true);
  const another = element('letter-another');
  const inputs = {
    message: element('letter-message'),
    name: element('letter-name'),
    email: element('letter-email'),
  };
  const errors = {
    message: element('letter-message-error', true),
    name: element('letter-name-error', true),
    email: element('letter-email-error', true),
  };
  const draft = {
    ...element('letter-draft'),
    contains: (candidate: unknown) =>
      candidate === button ||
      Object.values(inputs).some((input) => input === candidate),
  };
  const form = {
    ...element('letter-form'),
    classList: {
      add: (name: string) => classes.add(name),
      remove: (name: string) => classes.delete(name),
    },
    reset: () => {
      values.message = '';
      values.name = '';
      values.email = '';
      values.website = '';
    },
  };
  const elements = [
    form,
    button,
    status,
    note,
    draft,
    success,
    another,
    element('letter-copy'),
    element('letter-copy-address'),
    ...Object.values(inputs),
    ...Object.values(errors),
  ];
  document.querySelector = (selector) =>
    elements.find((element) => `#${element.id}` === selector);
  const calls: RequestInit[] = [];
  const timers: Array<() => void> = [];
  let respond: () => Promise<Response> = async () =>
    Response.json({ accepted: true });
  let copied = '';
  let now = 1000;
  const location = { href: '' };
  runInNewContext(script, {
    z,
    crypto,
    AbortSignal,
    Date: { now: () => now },
    setTimeout: (callback: () => void) => {
      timers.push(callback);
      return 0;
    },
    document,
    FormData: class {
      get(key: string) {
        return (
          Object.entries(values).find(([name]) => name === key)?.[1] ?? null
        );
      }
    },
    window: { location, matchMedia: () => ({ matches: reducedMotion }) },
    navigator: {
      clipboard: {
        writeText: async (text: string) => {
          copied = text;
        },
      },
    },
    fetch: async (_url: string, init: RequestInit) => {
      if (init.method !== 'POST') return check();
      calls.push(init);
      return respond();
    },
  });
  const trigger = async (id: string, event = 'click') => {
    await handlers.get(`${id}:${event}`)?.({ preventDefault() {} });
  };
  return {
    values,
    button,
    status,
    note,
    calls,
    location,
    document,
    inputs,
    errors,
    classes,
    success,
    draft,
    another,
    timers,
    copied: () => copied,
    advance: (ms: number) => {
      now += ms;
    },
    respond: (fn: () => Promise<Response>) => {
      respond = fn;
    },
    submit: () => trigger('letter-form', 'submit'),
    copy: () => trigger('letter-copy'),
    copyAddress: () => trigger('letter-copy-address'),
    writeAnother: () => trigger('letter-another'),
  };
}
function body(ui: ReturnType<typeof setup>, index: number) {
  return JSON.parse(String(ui.calls[index]?.body));
}

test('unavailable capability is quiet, keeps direct retry and never opens mail', async () => {
  const ui = setup({ available: false });
  ui.respond(async () =>
    Response.json(
      { message: 'Sending is temporarily unavailable.' },
      { status: 503 }
    )
  );
  await settle();
  expect(ui.note.textContent).toContain('temporarily unavailable');
  await ui.submit();
  expect(ui.values.message).toBe('Hello from this test.');
  expect(ui.status.dataset.tone).toBe('error');
  expect(ui.button.textContent).toBe('Send');
  ui.respond(async () => Response.json({ accepted: true }));
  await ui.submit();
  expect(ui.calls).toHaveLength(2);
  expect(body(ui, 1)).toEqual(body(ui, 0));
  expect(ui.location.href).toBe('');
  expect(ui.success.hidden).toBe(false);
});

test('uncertain retries preserve every value, UUID and payload within 24 hours', async () => {
  const ui = setup();
  ui.respond(async () => {
    throw new Error('timeout');
  });
  await ui.submit();
  expect(ui.values).toEqual({
    name: 'Ada',
    email: 'ada@example.com',
    message: 'Hello from this test.',
    website: '',
  });
  expect(ui.status.textContent).toContain('within 24 hours');
  ui.advance(23 * 60 * 60 * 1000);
  await ui.submit();
  expect(ui.calls[1]?.body).toBe(ui.calls[0]?.body);
  expect(z.string().uuid().safeParse(body(ui, 0).requestId).success).toBe(true);
  expect(ui.classes.size).toBe(0);
});

test('editing a failed draft or retrying after 24 hours gets a fresh UUID', async () => {
  const ui = setup();
  ui.respond(async () => {
    throw new Error('network');
  });
  await ui.submit();
  ui.values.message = 'A changed draft message.';
  await ui.submit();
  expect(body(ui, 1).requestId).not.toBe(body(ui, 0).requestId);
  ui.advance(24 * 60 * 60 * 1000);
  await ui.submit();
  expect(body(ui, 2).requestId).not.toBe(body(ui, 1).requestId);
});

test('only parsed accepted true on OK can animate or clear the draft', async () => {
  const ui = setup({ reducedMotion: false });
  for (const response of [
    () => Response.json({}),
    () => Response.json({ accepted: 'true' }),
    () => Response.json({ accepted: false }),
    () => Response.json({ accepted: true }, { status: 502 }),
    () => new Response('invalid'),
  ]) {
    ui.respond(async () => response());
    await ui.submit();
    expect(ui.values.message).toBe('Hello from this test.');
    expect(ui.status.textContent).toContain('could not be confirmed');
    expect(ui.success.hidden).toBe(true);
    expect(ui.timers).toHaveLength(0);
    expect(ui.classes.size).toBe(0);
    expect(ui.button.attributes.get('aria-disabled')).toBe('false');
  }
});

test('pending send keeps keyboard focus, stays still and blocks duplicate activation', async () => {
  const ui = setup();
  let resolveResponse: (response: Response) => void = () => {
    throw new Error('not started');
  };
  ui.respond(
    () =>
      new Promise((resolve) => {
        resolveResponse = resolve;
      })
  );
  ui.button.focus();
  const pending = ui.submit();
  expect(ui.button.disabled).toBe(false);
  expect(ui.button.attributes.get('aria-disabled')).toBe('true');
  expect(ui.button.textContent).toBe('Sending…');
  expect(ui.document.activeElement).toBe(ui.button);
  expect(ui.status.textContent).toBe('Sending to Tim…');
  expect(ui.classes.size).toBe(0);
  await ui.submit();
  expect(ui.calls).toHaveLength(1);
  resolveResponse(Response.json({ accepted: true }));
  await pending;
  expect(ui.document.activeElement).toBe(ui.another);
});

test('acceptance preserves edits made during the network request', async () => {
  const ui = setup();
  let resolveResponse: (response: Response) => void = () => {};
  ui.respond(
    () =>
      new Promise((resolve) => {
        resolveResponse = resolve;
      })
  );
  const pending = ui.submit();
  ui.values.message = 'New edits while sending.';
  ui.values.email = 'new@example.com';
  ui.inputs.message.focus();
  resolveResponse(Response.json({ accepted: true }));
  await pending;
  expect(ui.values.message).toBe('New edits while sending.');
  expect(ui.values.email).toBe('new@example.com');
  expect(ui.status.textContent).toContain('newer edits are still here');
  expect(ui.draft.hidden).toBe(false);
  expect(ui.success.hidden).toBe(true);
  expect(ui.document.activeElement).toBe(ui.inputs.message);
});

test('accepted animation precedes success, retains focus and rechecks edits before clearing', async () => {
  const ui = setup({ reducedMotion: false });
  ui.button.focus();
  const pending = ui.submit();
  await settle();
  expect(ui.classes.has('accepted')).toBe(true);
  expect(ui.success.hidden).toBe(true);
  expect(ui.values.message).toBe('Hello from this test.');
  expect(ui.document.activeElement).toBe(ui.button);
  expect(ui.button.attributes.get('aria-disabled')).toBe('true');
  ui.values.name = 'New name during animation';
  ui.timers.shift()?.();
  await pending;
  expect(ui.classes.size).toBe(0);
  expect(ui.values.name).toBe('New name during animation');
  expect(ui.draft.hidden).toBe(false);
  expect(ui.status.textContent).toContain('newer edits');
});

test('completed animation swaps to success and Write another focuses the empty message', async () => {
  const ui = setup({ reducedMotion: false });
  ui.button.focus();
  const pending = ui.submit();
  await settle();
  ui.timers.shift()?.();
  await pending;
  expect(ui.success.hidden).toBe(false);
  expect(ui.draft.hidden).toBe(true);
  expect(ui.values.message).toBe('');
  expect(ui.status.textContent).toBe('Accepted for delivery.');
  expect(ui.document.activeElement).toBe(ui.another);
  await ui.writeAnother();
  expect(ui.success.hidden).toBe(true);
  expect(ui.draft.hidden).toBe(false);
  expect(ui.document.activeElement).toBe(ui.inputs.message);
  expect(ui.status.textContent).toBe('');
});

test('reduced motion skips animation delay and does not steal outside focus', async () => {
  const ui = setup();
  ui.document.activeElement = ui.note;
  await ui.submit();
  expect(ui.timers).toHaveLength(0);
  expect(ui.classes.size).toBe(0);
  expect(ui.success.hidden).toBe(false);
  expect(ui.document.activeElement).toBe(ui.note);
});

test('empty submission shows inline errors, keeps values, focuses message and makes no POST', async () => {
  const ui = setup();
  ui.values.message = '';
  ui.values.name = '';
  ui.values.email = 'bad';
  await ui.submit();
  expect(ui.calls).toHaveLength(0);
  expect(ui.document.activeElement).toBe(ui.inputs.message);
  for (const name of ['message', 'name', 'email'] as const) {
    expect(ui.inputs[name].attributes.get('aria-invalid')).toBe('true');
    expect(ui.errors[name].hidden).toBe(false);
    expect(ui.errors[name].textContent.length).toBeGreaterThan(0);
  }
  expect(ui.values.email).toBe('bad');
});

test('validation follows field order and clears old errors after correction', async () => {
  const ui = setup();
  ui.values.name = ' ';
  ui.values.email = 'bad';
  await ui.submit();
  expect(ui.document.activeElement).toBe(ui.inputs.name);
  ui.values.name = 'Ada';
  await ui.submit();
  expect(ui.document.activeElement).toBe(ui.inputs.email);
  expect(ui.errors.name.hidden).toBe(true);
  expect(ui.inputs.name.attributes.get('aria-invalid')).toBe('false');
  ui.values.email = 'ada@example.com';
  await ui.submit();
  expect(ui.calls).toHaveLength(1);
});

test('validation preserves server limits, schema and honeypot', async () => {
  for (const invalid of [
    { message: ' '.repeat(10) },
    { message: 'x'.repeat(6001) },
    { name: 'x'.repeat(101) },
    { name: 'Ada\nTest' },
    { email: 'x'.repeat(255) },
  ]) {
    const ui = setup();
    Object.assign(ui.values, invalid);
    await ui.submit();
    expect(ui.calls).toHaveLength(0);
  }
  const ui = setup();
  ui.values.name = 'x'.repeat(100);
  ui.values.message = 'x'.repeat(6000);
  ui.values.website = 'honeypot-preserved';
  await ui.submit();
  expect(body(ui, 0).website).toBe('honeypot-preserved');
  expect(Object.keys(body(ui, 0)).sort()).toEqual([
    'email',
    'message',
    'name',
    'requestId',
    'website',
  ]);
});

test('pending, failed and rejected capability checks never block sending', async () => {
  for (const check of [
    () => new Promise<Response>(() => {}),
    async () => {
      throw new Error('network failure');
    },
    async () => Response.json({ available: false }, { status: 503 }),
  ]) {
    const ui = setup({ check });
    await settle();
    await ui.submit();
    expect(ui.calls).toHaveLength(1);
    expect(ui.location.href).toBe('');
    expect(ui.success.hidden).toBe(false);
  }
});

test('copy actions copy local text and plain address without mail navigation', async () => {
  const ui = setup({ available: false });
  await ui.copy();
  expect(ui.copied()).toBe(
    'Hello from this test.\n\nFrom: Ada\nReply to: ada@example.com'
  );
  await ui.copyAddress();
  expect(ui.copied()).toBe('hello@timsexperiments.foo');
  expect(ui.location.href).toBe('');
});

test('server error keeps original draft and Send focus for retry', async () => {
  const ui = setup();
  ui.button.focus();
  ui.respond(async () =>
    Response.json({ message: 'Please try again later.' }, { status: 429 })
  );
  await ui.submit();
  expect(ui.status.textContent).toBe('Please try again later.');
  expect(ui.status.dataset.tone).toBe('error');
  expect(ui.values.message).toBe('Hello from this test.');
  expect(ui.document.activeElement).toBe(ui.button);
  expect(ui.button.attributes.get('aria-disabled')).toBe('false');
});
