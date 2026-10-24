import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createSavedChat } from './history';
import { activeChatKey, parseActiveChat, type ActiveChat } from './active-chat';
import type { ConversationTurn } from '../../lib/conversations/protocol';
import {
  browserEnvironment,
  click,
  memoryServer,
  robotDom,
  settle,
  submit,
  TestWorker,
} from './lifecycle-test-helpers';

const qualified: ConversationTurn = {
  question: 'A question',
  paragraphs: [
    'Exact qualification.  Whitespace stays.\nNext line.',
    '<script>literal text</script>',
  ],
  experienceIds: ['unknown-source-id'],
};
const another: ConversationTurn = {
  question: 'Another question',
  paragraphs: ['A qualified answer.'],
  experienceIds: [],
};
const id = 'b9a69c7d-56f4-4d3e-8cb0-34674cfc265a';
const envelope = (turns = [qualified], revision = 0): ActiveChat => ({
  id,
  revision,
  turns: structuredClone(turns),
});
let env: ReturnType<typeof browserEnvironment>;
let server: ReturnType<typeof memoryServer>;
let dom: ReturnType<typeof robotDom>;
let history: ReturnType<typeof createSavedChat> | undefined;
const controllers: ReturnType<typeof createSavedChat>[] = [];
beforeEach(() => {
  env = browserEnvironment();
  server = memoryServer(env);
  dom = robotDom();
});
afterEach(async () => {
  try {
    document.dispatchEvent(new Event('astro:before-swap'));
    controllers.splice(0).forEach((controller) => controller.destroy());
    history = undefined;
    await settle();
    expect(env.timerCount()).toBe(0);
  } finally {
    env.cleanup();
  }
});
function local() {
  const value = env.storage.get(activeChatKey);
  return value ? parseActiveChat(value) : undefined;
}
function startHistory(target = dom) {
  const restores: ConversationTurn[][] = [];
  history = createSavedChat(target.root, {
    restore: (turns) => restores.push(turns),
    changed: () => {},
  });
  controllers.push(history);
  return { controller: history, restores };
}
async function startHost() {
  const { setupRobotHost } = await import('./host');
  setupRobotHost(dom.root);
  await settle();
  return setupRobotHost;
}
function closeNative() {
  dom.dialog.open = false;
  dom.dialog.dispatchEvent(new Event('close'));
}

describe('local active chat and write-only archive', () => {
  test('initialization neither creates an identity nor reads the server', async () => {
    startHistory();
    await settle();
    expect(server.calls).toHaveLength(0);
    expect(local()).toBeUndefined();
  });
  test('stores the completed reply synchronously before a deferred PUT', async () => {
    const { controller } = startHistory();
    const release = server.defer();
    controller.save([qualified]);
    expect(local()?.turns).toEqual([qualified]);
    expect(local()?.revision).toBe(0);
    expect(server.methods()).toEqual(['PUT']);
    expect(server.calls[0]?.credentials).toBe('same-origin');
    release();
    await settle();
    expect(local()?.revision).toBe(1);
    expect(server.archives.get(local()?.id ?? '')?.turns).toEqual([qualified]);
  });
  test('restores only the validated local envelope with its identity and revision', () => {
    env.storage.set(activeChatKey, JSON.stringify(envelope([qualified], 7)));
    const { restores } = startHistory();
    expect(restores).toEqual([[qualified]]);
    expect(local()?.revision).toBe(7);
    expect(server.calls).toHaveLength(0);
  });
  for (const [name, invalid] of [
    ['JSON', '{'],
    ['UUID', JSON.stringify({ ...envelope(), id: 'bad' })],
    ['negative revision', JSON.stringify({ ...envelope(), revision: -1 })],
    ['fractional revision', JSON.stringify({ ...envelope(), revision: 1.5 })],
    ['empty turns', JSON.stringify({ ...envelope(), turns: [] })],
    [
      'turn limit',
      JSON.stringify({ ...envelope(), turns: Array(13).fill(qualified) }),
    ],
    ['unknown properties', JSON.stringify({ ...envelope(), extra: true })],
    [
      'paragraph limit',
      JSON.stringify({
        ...envelope(),
        turns: [{ ...qualified, paragraphs: ['x'.repeat(2001)] }],
      }),
    ],
    ['byte bound', ' '.repeat(262145)],
  ])
    test(`rejects invalid local data: ${name}`, () => {
      if (invalid === undefined) throw new Error('Missing fixture');
      env.storage.set(activeChatKey, invalid);
      const { restores } = startHistory();
      expect(restores).toHaveLength(0);
      expect(env.storage.has(activeChatKey)).toBe(false);
      expect(server.calls).toHaveLength(0);
    });
  test('bounds UTF-8 bytes independently of character counts', () => {
    const turns = Array.from({ length: 12 }, () => ({
      ...qualified,
      paragraphs: Array(8).fill('語'.repeat(1900)),
    }));
    const serialized = JSON.stringify(envelope(turns));
    expect(serialized.length).toBeLessThan(262144);
    expect(new TextEncoder().encode(serialized).byteLength).toBeGreaterThan(
      262144
    );
    expect(parseActiveChat(serialized)).toBeUndefined();
  });
  test('new session can archive before an old aborted request returns', async () => {
    const { controller } = startHistory();
    const release = server.defer(true);
    controller.save([qualified]);
    const oldId = local()?.id;
    controller.clear();
    controller.save([another]);
    await settle();
    const latest = local();
    expect(latest?.id).not.toBe(oldId);
    expect(latest?.revision).toBe(1);
    release();
    await settle();
    expect(local()).toEqual(latest);
    expect(server.archives.size).toBe(2);
    expect(server.calls).toHaveLength(2);
  });
  for (const suspended of [false, true])
    for (const newChat of [false, true])
      test(`same-page Clear invalidates another controller's delayed receipt, new chat: ${newChat}, suspended: ${suspended}`, async () => {
        const { controller: first } = startHistory();
        first.save([qualified]);
        await settle();
        const oldId = local()?.id;
        await env.advance(2000);
        const otherDom = robotDom();
        const { controller: second } = startHistory(otherDom);
        const release = server.defer(true);
        second.save([qualified, another]);
        if (suspended) second.suspend();
        first.clear();
        expect(second.invalidated).toBe(true);
        expect(local()).toBeUndefined();
        expect(server.calls[1]?.signal?.aborted).toBe(true);
        if (newChat) {
          first.save([another]);
          await settle();
          expect(local()?.id).not.toBe(oldId);
        }
        const latest = local();
        release();
        await settle();
        if (suspended) second.resume();
        second.save([qualified, another]);
        click(otherDom.retry);
        await env.advance(60000);
        expect(local()).toEqual(latest);
        expect(server.archives.get(oldId ?? '')?.turns).toEqual([
          qualified,
          another,
        ]);
        expect(server.methods()).toEqual(
          newChat ? ['PUT', 'PUT', 'PUT'] : ['PUT', 'PUT']
        );
        expect(env.timerCount()).toBe(0);
        expect(otherDom.historyStatus.textContent).toContain(
          'next question starts a new chat'
        );
        second.start(); // A new explicit question, never an archive receipt.
        second.save([qualified]);
        await settle();
        expect(local()?.id).not.toBe(oldId);
        expect(local()?.id).not.toBe(latest?.id);
        expect(local()?.turns).toEqual([qualified]);
      });
  for (const change of ['remove', 'replace', 'clear-all'] satisfies (
    | 'remove'
    | 'replace'
    | 'clear-all'
  )[])
    test(`storage event invalidates a shared session after ${change}`, async () => {
      const { controller: first } = startHistory();
      first.save([qualified]);
      await settle();
      const { controller: second } = startHistory(robotDom());
      if (change === 'replace') {
        env.storage.set(
          activeChatKey,
          JSON.stringify({ ...envelope([another]), id: crypto.randomUUID() })
        );
      } else env.storage.delete(activeChatKey);
      env.storageEvent(
        change === 'clear-all' ? null : activeChatKey,
        env.storage.get(activeChatKey) ?? null
      );
      expect(first.invalidated).toBe(true);
      expect(second.invalidated).toBe(true);
      const latest = local();
      second.save([qualified, another]);
      await env.advance(60000);
      expect(local()).toEqual(latest);
      expect(server.methods()).toEqual(['PUT']);
      expect(env.timerCount()).toBe(0);
    });
  for (const replace of [false, true])
    test(`receipt checks shared identity before a storage event arrives, replacement: ${replace}`, async () => {
      const { controller } = startHistory();
      const release = server.defer(true);
      controller.save([qualified]);
      const oldId = local()?.id;
      env.storage.delete(activeChatKey);
      if (replace)
        env.storage.set(
          activeChatKey,
          JSON.stringify({ ...envelope([another]), id: crypto.randomUUID() })
        );
      const latest = local();
      release();
      await settle();
      expect(controller.invalidated).toBe(true);
      expect(local()).toEqual(latest);
      expect(server.archives.has(oldId ?? '')).toBe(true);
      expect(env.timerCount()).toBe(0);
    });
  for (const replace of [false, true])
    test(`BFcache return checks shared identity with no delivered event, replacement: ${replace}`, async () => {
      const { controller } = startHistory();
      const release = server.defer(true);
      controller.save([qualified]);
      controller.suspend();
      env.storage.delete(activeChatKey);
      if (replace)
        env.storage.set(
          activeChatKey,
          JSON.stringify({ ...envelope([another]), id: crypto.randomUUID() })
        );
      const latest = local();
      release();
      await settle();
      controller.resume();
      expect(controller.invalidated).toBe(true);
      controller.save([qualified, another]);
      await env.advance(60000);
      expect(local()).toEqual(latest);
      expect(server.methods()).toEqual(['PUT']);
      expect(env.timerCount()).toBe(0);
    });
  test('a shared identity change during save cannot silently start a new UUID', async () => {
    const { controller } = startHistory();
    controller.save([qualified]);
    await settle();
    const replacement = { ...envelope([another]), id: crypto.randomUUID() };
    let reads = 0;
    env.install('localStorage', {
      getItem(key: string) {
        reads += 1;
        if (reads === 2)
          env.storage.set(activeChatKey, JSON.stringify(replacement));
        return env.storage.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        env.storage.set(key, value);
      },
      removeItem(key: string) {
        env.storage.delete(key);
      },
    });
    controller.save([qualified, another]);
    await settle();
    expect(controller.invalidated).toBe(true);
    expect(local()).toEqual(replacement);
    expect(dom.historyStatus.textContent).toContain(
      'next question starts a new chat'
    );
    expect(server.methods()).toEqual(['PUT']);
    expect(env.timerCount()).toBe(0);
  });
  test('a delayed storage event cannot invalidate a newer explicit session', async () => {
    const { controller } = startHistory();
    controller.save([qualified]);
    await settle();
    const oldValue = env.storage.get(activeChatKey) ?? null;
    env.storage.delete(activeChatKey);
    expect(controller.needsReset()).toBe(true);
    controller.start();
    controller.save([another]);
    await settle();
    const latest = local();
    env.storageEvent(activeChatKey, null);
    env.storageEvent(activeChatKey, oldValue);
    expect(controller.invalidated).toBe(false);
    expect(local()).toEqual(latest);
    expect(env.timerCount()).toBe(0);
  });
  test('ordinary same-UUID storage events and unrelated keys do not invalidate', async () => {
    const { controller } = startHistory();
    controller.save([qualified]);
    await settle();
    env.storageEvent('unrelated', null);
    env.storageEvent(activeChatKey, env.storage.get(activeChatKey) ?? null);
    expect(controller.invalidated).toBe(false);
    controller.save([qualified, another]);
    await settle();
    await env.advance(2000);
    expect(local()?.turns).toEqual([qualified, another]);
  });
  for (const action of ['clear', 'destroy', 'suspend'] satisfies (
    | 'clear'
    | 'destroy'
    | 'suspend'
  )[])
    for (const status of [429, 503])
      test(`delayed native error body cancellation cannot change state after ${action}, status ${status}`, async () => {
        const { controller } = startHistory();
        const body = server.delayErrorCancellation(status);
        controller.save([qualified]);
        await settle();
        expect(body.started()).toBe(true);
        controller[action]();
        const message = dom.historyStatus.textContent;
        expect(env.timerCount()).toBe(0);
        body.release();
        await settle();
        expect(dom.historyStatus.textContent).toBe(message);
        expect(dom.retry.hidden).toBe(true);
        expect(env.timerCount()).toBe(0);
        await env.advance(60000);
        expect(server.methods()).toEqual(['PUT']);
        if (action === 'suspend') {
          controller.resume();
          await settle();
          expect(server.methods()).toEqual(['PUT', 'PUT']);
          expect(dom.retry.hidden).toBe(true);
          expect(env.timerCount()).toBe(0);
        }
      });
  test('delayed 429 cancellation cannot install cooldown after suspend and resume', async () => {
    const { controller } = startHistory();
    const body = server.delayErrorCancellation();
    controller.save([qualified]);
    await settle();
    expect(body.started()).toBe(true);
    controller.suspend();
    controller.resume();
    await settle();
    expect(server.calls).toHaveLength(2);
    expect(env.timerCount()).toBe(0);
    body.release();
    await settle();
    expect(env.timerCount()).toBe(0);
    expect(dom.historyStatus.textContent).toBe(
      'Completed replies archived for Tim.'
    );
    await env.advance(2000);
    controller.save([qualified, another]);
    await settle();
    expect(server.calls).toHaveLength(3);
    expect(env.timerCount()).toBe(0);
  });
  test('delayed old 429 cancellation cannot throttle a new UUID after Clear', async () => {
    const { controller } = startHistory();
    const body = server.delayErrorCancellation();
    controller.save([qualified]);
    const oldId = local()?.id;
    await settle();
    expect(body.started()).toBe(true);
    controller.clear();
    controller.save([another]);
    await settle();
    const newId = local()?.id;
    expect(newId).not.toBe(oldId);
    expect(server.calls).toHaveLength(2);
    expect(env.timerCount()).toBe(0);
    await env.advance(2000); // Normal server per-UUID rate limit, not the old 60s cooldown.
    body.release();
    await settle();
    expect(env.timerCount()).toBe(0);
    expect(dom.historyStatus.textContent).toBe(
      'Completed replies archived for Tim.'
    );
    controller.save([another, qualified]);
    await settle();
    expect(server.calls).toHaveLength(3);
    expect(local()?.id).toBe(newId);
    expect(server.archives.get(newId ?? '')?.turns).toEqual([
      another,
      qualified,
    ]);
    expect(env.timerCount()).toBe(0);
  });
  test('BFcache retries an ambiguous transmitted snapshot before the latest one', async () => {
    const { controller } = startHistory();
    const release = server.defer(true);
    controller.save([qualified]);
    controller.save([qualified, another]);
    controller.suspend();
    release();
    await settle();
    expect(local()?.revision).toBe(0);
    controller.resume();
    await settle();
    expect(server.calls[1]?.payload).toEqual(server.calls[0]?.payload);
    await env.advance(2000);
    expect(server.archives.get(local()?.id ?? '')?.turns).toEqual([
      qualified,
      another,
    ]);
  });
  test('BFcache re-enables manual retry after its remaining throttle delay', async () => {
    const { controller } = startHistory();
    server.fail(429);
    controller.save([qualified]);
    await settle();
    for (let i = 0; i < 2; i += 1) {
      server.fail(429);
      await env.advance(2000);
    }
    controller.suspend();
    await env.advance(500);
    controller.resume();
    expect(dom.retry.disabled).toBe(true);
    await env.advance(1500);
    expect(dom.retry.disabled).toBe(false);
    expect(server.calls).toHaveLength(3);
    click(dom.retry);
    await settle();
    expect(server.calls).toHaveLength(4);
  });
  test('coalesces newer snapshots behind an in-flight write, including local-model paragraphs', async () => {
    const { controller } = startHistory();
    const release = server.defer();
    controller.save([qualified]);
    controller.save([qualified, another]);
    const latest = [
      qualified,
      {
        ...another,
        paragraphs: [...another.paragraphs, 'Exact accepted passage.'],
      },
    ];
    controller.save(latest);
    expect(local()?.turns).toEqual(latest);
    expect(server.calls).toHaveLength(1);
    release();
    await settle();
    expect(server.calls).toHaveLength(2);
    await env.advance(2000);
    expect(server.calls).toHaveLength(3);
    expect(server.archives.get(local()?.id ?? '')?.turns).toEqual(latest);
    expect(local()?.revision).toBe(2);
  });
  for (const header of ['3', 'Thu, 22 Oct 2026 12:00:03 GMT', 'bad'])
    test(`honors Retry-After ${header} and coalesces during cooldown`, async () => {
      const { controller } = startHistory();
      server.fail(429, header);
      controller.save([qualified]);
      await settle();
      controller.save([qualified, another]);
      click(dom.retry);
      await settle();
      expect(server.calls).toHaveLength(1);
      const delay = header === 'bad' ? 2000 : 3000;
      await env.advance(delay - 1);
      expect(server.calls).toHaveLength(1);
      await env.advance(1);
      expect(server.calls).toHaveLength(2);
      expect(server.archives.get(local()?.id ?? '')?.turns).toEqual([
        qualified,
        another,
      ]);
    });
  test('bounds automatic throttled retries and respects cooldown for manual retry', async () => {
    const { controller } = startHistory();
    server.fail(429);
    controller.save([qualified]);
    await settle();
    for (let i = 0; i < 2; i += 1) {
      server.fail(429);
      await env.advance(2000);
    }
    expect(server.calls).toHaveLength(3);
    expect(dom.retry.hidden).toBe(false);
    expect(dom.retry.disabled).toBe(true);
    click(dom.retry);
    expect(server.calls).toHaveLength(3);
    await env.advance(2000);
    expect(dom.retry.disabled).toBe(false);
    await env.advance(60000);
    expect(server.calls).toHaveLength(3);
    click(dom.retry);
    await settle();
    expect(server.calls).toHaveLength(4);
  });
  test('clear cancels queued writes while an already transmitted PUT may still commit', async () => {
    const { controller } = startHistory();
    const release = server.defer(true);
    controller.save([qualified]);
    const oldId = local()?.id;
    controller.save([qualified, another]);
    controller.clear();
    expect(local()).toBeUndefined();
    expect(server.calls[0]?.signal?.aborted).toBe(true);
    release();
    await settle();
    await env.advance(10000);
    expect(server.archives.get(oldId ?? '')?.turns).toEqual([qualified]);
    expect(server.calls).toHaveLength(1);
    expect(local()).toBeUndefined();
    expect(dom.historyStatus.textContent).toContain('Previously archived');
    controller.save([another]);
    await settle();
    expect(local()?.id).not.toBe(oldId);
    expect(server.archives.size).toBe(2);
  });
  for (const action of ['clear', 'destroy'] satisfies ('clear' | 'destroy')[])
    test(`${action} cancels a throttle timer`, async () => {
      const { controller } = startHistory();
      server.fail(429);
      controller.save([qualified]);
      await settle();
      controller[action]();
      await env.advance(5000);
      expect(server.calls).toHaveLength(1);
    });
  test('invalid receipt keeps local text and retries the identical ambiguous request before newer text', async () => {
    const { controller } = startHistory();
    server.receipt({ revision: 0, turns: [another] });
    controller.save([qualified]);
    await settle();
    expect(local()?.revision).toBe(0);
    expect(local()?.turns).toEqual([qualified]);
    expect(dom.retry.hidden).toBe(false);
    controller.save([qualified, another]);
    expect(server.calls).toHaveLength(1);
    click(dom.retry);
    await settle();
    expect(server.calls[1]?.payload).toEqual(server.calls[0]?.payload);
    await env.advance(2000);
    expect(server.archives.get(local()?.id ?? '')?.turns).toEqual([
      qualified,
      another,
    ]);
  });
  test('storage failure does not block archive or throw', async () => {
    env.install('localStorage', {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('quota');
      },
      removeItem() {
        throw new Error('blocked');
      },
    });
    const { controller } = startHistory();
    controller.save([qualified]);
    await settle();
    expect(server.archives.size).toBe(1);
    expect(dom.historyStatus.textContent).toContain(
      'Browser storage is unavailable'
    );
    controller.clear();
  });
  test('suspension retains the local snapshot and resumes without a server read', async () => {
    const { controller } = startHistory();
    server.fail(429);
    controller.save([qualified]);
    await settle();
    controller.suspend();
    await env.advance(5000);
    expect(server.calls).toHaveLength(1);
    expect(local()?.turns).toEqual([qualified]);
    controller.resume();
    await settle();
    expect(server.methods()).toEqual(['PUT', 'PUT']);
  });
});

describe('actual generated conversation lifecycle', () => {
  async function ready() {
    click(dom.enable);
    await settle();
    const worker = TestWorker.instances.at(-1);
    if (!worker) throw new Error('Expected an inference worker');
    worker.reply({ kind: 'ready' });
    return worker;
  }
  async function complete(
    question = 'Hello',
    text = 'Hi. What are you hoping to build?'
  ) {
    submit(dom, question);
    await env.advance(0);
    TestWorker.instances.at(-1)?.reply({ kind: 'answer', text });
    await settle();
  }
  test('unsupported f16 GPU never creates a worker or starts an f32 download', async () => {
    env.install('navigator', {
      gpu: {
        requestAdapter: async () => ({
          limits: { maxStorageBufferBindingSize: 256 * 1024 * 1024 },
          features: new Set(),
        }),
      },
    });
    await startHost();
    click(dom.enable);
    await settle();
    expect(TestWorker.instances).toHaveLength(0);
    expect(dom.aiStatus.textContent).toContain('f32 model is unverified');
    expect(dom.aiStatus.textContent).toContain(
      'Read Tim’s work or contact him below.'
    );
    expect(dom.root.dataset.modelState).toBe('off');
  });
  test('requires an explicit model start and never archives prepared or pending replies', async () => {
    await startHost();
    expect(dom.send.disabled).toBe(true);
    submit(dom, 'Hello');
    await env.advance(0);
    expect(server.calls).toHaveLength(0);
    expect(TestWorker.instances).toHaveLength(0);
    const worker = await ready();
    submit(dom, 'I need to hire my boy Tim. Do you think that is a good idea?');
    await env.advance(0);
    expect(local()).toBeUndefined();
    expect(server.calls).toHaveLength(0);
    expect(JSON.stringify(worker.messages)).toContain(
      'Agent Dispatch platform'
    );
    worker.reply({
      kind: 'answer',
      text: 'His platform work looks relevant. What does your team need?',
    });
    expect(local()?.turns[0]?.paragraphs).toEqual([
      'His platform work looks relevant. What does your team need?',
    ]);
    await settle();
    expect(server.methods()).toEqual(['PUT']);
  });
  test('refresh restores generated text exactly and only completed turns enter follow-up context', async () => {
    await startHost();
    await ready();
    await complete(
      'Can he mentor engineers?',
      'He coached an intern through implementation at Included Health.'
    );
    const before = local();
    env.page('pagehide', false);
    dom = robotDom();
    await startHost();
    expect(dom.transcript.textContent).toContain(
      before?.turns[0]?.paragraphs[0] ?? 'missing'
    );
    expect(server.methods()).toEqual(['PUT']);
    const worker = await ready();
    submit(dom, 'How did that work?');
    await env.advance(0);
    expect(JSON.stringify(worker.messages)).toContain('He coached an intern');
    expect(local()?.turns).toHaveLength(1);
    worker.reply({
      kind: 'answer',
      text: 'He helped the intern break work into small slices.',
    });
    expect(local()?.turns).toHaveLength(2);
  });
  for (const action of ['native close', 'attribute close', 'clear'])
    test(`${action} clears local identity and rejects late generations`, async () => {
      await startHost();
      const worker = await ready();
      await complete();
      const id = local()?.id;
      submit(dom, 'Pending reply');
      await env.advance(0);
      const staleCallback = worker.onmessage;
      if (action === 'clear') click(dom.clear);
      else if (action === 'native close') closeNative();
      else dom.dialog.open = false;
      await settle();
      staleCallback?.({ data: { kind: 'answer', text: 'Stale reply' } });
      expect(local()).toBeUndefined();
      expect(worker.terminated).toBe(true);
      expect(dom.transcript.textContent).not.toContain('Stale reply');
      expect(dom.transcript.textContent).toContain("Hi, I'm the lab robot.");
      dom.dialog.open = true;
      await ready();
      await complete('New question');
      expect(local()?.id).not.toBe(id);
      expect(local()?.turns.map((turn) => turn.question)).toEqual([
        'New question',
      ]);
    });
  test('cancel download and failed generation keep the typed question and permit retry', async () => {
    await startHost();
    click(dom.enable);
    await settle();
    const worker = TestWorker.instances.at(-1);
    click(dom.stop);
    worker?.onmessage?.({ data: { kind: 'ready' } });
    expect(dom.send.disabled).toBe(true);
    expect(worker?.terminated).toBe(true);
    const retry = await ready();
    submit(dom, 'Keep this question');
    await env.advance(0);
    retry.reply({ kind: 'error', stage: 'generate', message: 'Device lost' });
    expect(dom.input.value).toBe('Keep this question');
    expect(local()).toBeUndefined();
    expect(server.calls).toHaveLength(0);
    await ready();
    await complete('Keep this question');
    expect(local()?.turns).toHaveLength(1);
  });
  test('BFcache preserves completed turns and cancels pending inference without archiving it', async () => {
    await startHost();
    const worker = await ready();
    await complete();
    const before = local();
    submit(dom, 'Pending');
    await env.advance(0);
    env.page('pagehide', true);
    worker.onmessage?.({ data: { kind: 'answer', text: 'Late answer' } });
    env.page('pageshow', true);
    expect(local()).toEqual(before);
    expect(worker.terminated).toBe(true);
    await ready();
    await complete('Thanks');
    expect(local()?.turns.map((turn) => turn.question)).toEqual([
      'Hello',
      'Thanks',
    ]);
  });
  test('shared Clear invalidates a pending answer and the next question has fresh context', async () => {
    await startHost();
    const worker = await ready();
    await complete('Mentoring', 'He coached engineers at Included Health.');
    submit(dom, 'How did that work?');
    await env.advance(0);
    const { controller: other } = startHistory(robotDom());
    other.clear();
    worker.reply({
      kind: 'answer',
      text: 'This must not reclaim the old identity.',
    });
    expect(local()).toBeUndefined();
    expect(worker.terminated).toBe(true);
    expect(dom.transcript.textContent).not.toContain('This must not reclaim');
    const restarted = await ready();
    await complete('Hello again');
    expect(local()?.turns.map((turn) => turn.question)).toEqual([
      'Hello again',
    ]);
    expect(JSON.stringify(restarted.messages.at(-1))).not.toContain(
      'He coached engineers'
    );
  });
  for (const action of [
    'shared Clear',
    'cross-tab Clear',
    'replacement',
    'undelivered replacement',
  ])
    for (const pending of [false, true])
      test(`${action} cancels host speech and rejects late display, pending: ${pending}`, async () => {
        class Utterance {
          voice: SpeechSynthesisVoice | null = null;
          lang = '';
          rate = 1;
          onend: (() => void) | null = null;
          onerror: (() => void) | null = null;
          constructor(readonly text: string) {}
        }
        const spoken: Utterance[] = [];
        let cancels = 0;
        const synth = Object.assign(new EventTarget(), {
          getVoices: () => [
            {
              voiceURI: 'test',
              name: 'Local',
              lang: 'en-US',
              localService: true,
              default: false,
            },
          ],
          speak: (utterance: Utterance) => spoken.push(utterance),
          cancel: () => {
            cancels += 1;
          },
        });
        Reflect.set(window, 'speechSynthesis', synth);
        env.install('SpeechSynthesisUtterance', Utterance);
        await startHost();
        const worker = await ready();
        click(dom.voiceToggle);
        await complete(
          'Mentoring',
          'First accepted sentence. Second accepted sentence.'
        );
        expect(spoken).toHaveLength(1);
        const oldSpeech = spoken[0]?.onend;
        if (pending) {
          submit(dom, 'How did that work?');
          await env.advance(0);
        }
        const oldMessage = worker.onmessage;
        const beforeCancel = cancels;
        if (action === 'shared Clear')
          startHistory(robotDom()).controller.clear();
        else {
          env.storage.delete(activeChatKey);
          if (action.includes('replacement'))
            env.storage.set(
              activeChatKey,
              JSON.stringify({
                ...envelope([another]),
                id: crypto.randomUUID(),
              })
            );
          if (action !== 'undelivered replacement')
            env.storageEvent(
              activeChatKey,
              env.storage.get(activeChatKey) ?? null
            );
        }
        // Invalidation itself must stop playback/inference before a worker can
        // deliver anything else. The acceptance guard is a separate defense.
        if (action !== 'undelivered replacement') {
          expect(worker.terminated).toBe(true);
          expect(dom.voiceReplay.disabled).toBe(true);
          expect(dom.root.dataset.modelState).toBe('off');
          if (!pending) expect(cancels).toBeGreaterThan(beforeCancel);
        }
        const retained = env.storage.get(activeChatKey);
        oldMessage?.({
          data: { kind: 'answer', text: 'STALE generated reply.' },
        });
        oldSpeech?.();
        click(dom.voiceReplay);
        expect(worker.terminated).toBe(true);
        if (!pending) expect(cancels).toBeGreaterThan(beforeCancel);
        else expect(cancels).toBeGreaterThan(0);
        expect(dom.transcript.textContent).not.toContain(
          'STALE generated reply.'
        );
        expect(spoken).toHaveLength(1);
        expect(env.storage.get(activeChatKey)).toBe(retained);
        expect(server.calls).toHaveLength(1);
        await ready();
        await complete('Fresh question', 'Fresh answer.');
        expect(local()?.turns.map((turn) => turn.question)).toEqual([
          'Fresh question',
        ]);
      });

  test('Clear and unload return focus to visible Start and close Settings', async () => {
    await startHost();
    await ready();
    await complete();
    click(dom.options);
    dom.unload.focus();
    click(dom.unload);
    expect(document.activeElement).toBe(dom.enable);
    expect(dom.panel.hidden).toBe(true);
    await ready();
    click(dom.options);
    dom.clear.focus();
    click(dom.clear);
    expect(document.activeElement).toBe(dom.enable);
    expect(dom.panel.hidden).toBe(true);
    expect(dom.root.dataset.modelState).toBe('off');
  });
  test('identity replacement discovered at submission requires a fresh model and context', async () => {
    await startHost();
    const worker = await ready();
    await complete('Mentoring', 'Old session content.');
    env.storage.set(
      activeChatKey,
      JSON.stringify({ ...envelope([another]), id: crypto.randomUUID() })
    );
    submit(dom, 'New question');
    await env.advance(0);
    expect(worker.terminated).toBe(true);
    expect(
      worker.messages.filter((message) =>
        JSON.stringify(message).includes('New question')
      )
    ).toHaveLength(0);
    const restarted = await ready();
    await complete('New question');
    expect(JSON.stringify(restarted.messages)).not.toContain(
      'Old session content'
    );
  });
  test('restored content uses literal text and never reads the archive', async () => {
    env.storage.set(activeChatKey, JSON.stringify(envelope([qualified])));
    await startHost();
    expect(dom.transcript.textContent).toContain(
      '<script>literal text</script>'
    );
    expect(dom.transcript.querySelector('script')).toBeNull();
    expect(server.calls).toHaveLength(0);
  });
  test('delayed archive receipt cannot reclaim cleared host dialogue or its new session', async () => {
    await startHost();
    await ready();
    const release = server.defer(true);
    await complete('Old question', 'Old reply.');
    click(dom.clear);
    await ready();
    await complete('New question', 'New reply.');
    const latest = local();
    release();
    await settle();
    expect(local()).toEqual(latest);
    expect(dom.transcript.textContent).toContain('New reply.');
    expect(dom.transcript.textContent).not.toContain('Old reply.');
  });
  test('teardown cancels archive retry and pending worker, reinitialization has one handler', async () => {
    await startHost();
    const worker = await ready();
    server.fail(429);
    await complete();
    submit(dom, 'Pending');
    await env.advance(0);
    const callback = worker.onmessage;
    document.dispatchEvent(new Event('astro:before-swap'));
    callback?.({ data: { kind: 'answer', text: 'Stale after teardown.' } });
    expect(dom.transcript.textContent).not.toContain('Stale after teardown.');
    expect(env.timerCount()).toBe(0);
    await startHost();
    await ready();
    const before = server.calls.length;
    click(dom.retry);
    await env.advance(2000);
    expect(server.calls.length - before).toBeLessThanOrEqual(1);
  });
  test('archive retry preserves the exact generated answer with no remote reads', async () => {
    await startHost();
    await ready();
    server.fail(503);
    await complete(
      'What about platform work?',
      'A useful summary in new words.'
    );
    expect(local()?.turns[0]?.paragraphs).toEqual([
      'A useful summary in new words.',
    ]);
    click(dom.retry);
    await settle();
    expect(
      server.archives.get(local()?.id ?? '')?.turns[0]?.paragraphs
    ).toEqual(['A useful summary in new words.']);
    expect(server.methods()).toEqual(['PUT', 'PUT']);
  });
  test('the completed-turn limit resets on Clear', async () => {
    env.storage.set(
      activeChatKey,
      JSON.stringify(envelope(Array(12).fill(qualified)))
    );
    await startHost();
    expect(dom.input.disabled).toBe(true);
    click(dom.clear);
    expect(dom.input.disabled).toBe(false);
    await ready();
    await complete();
    expect(local()?.turns).toHaveLength(1);
  });
});
