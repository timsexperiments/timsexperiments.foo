import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createSavedChat } from './history';
import { activeChatKey, parseActiveChat, type ActiveChat } from './active-chat';
import type { ConversationTurn } from '../../lib/conversations/protocol';
import { answerInBrowser } from '../../lib/resume/browser-answer';
import { conversationalParagraphs } from '../chat-view/evidence';
import { groundedContext } from './evidence';
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

describe('actual host refresh, close, Clear, and local inference', () => {
  for (const action of ['clear', 'close'] satisfies ('clear' | 'close')[])
    test(`actual host ${action} isolates a delayed 429 body from its next session`, async () => {
      await startHost();
      const body = server.delayErrorCancellation();
      submit(dom, 'Hello');
      await env.advance(0);
      const oldId = local()?.id;
      expect(body.started()).toBe(true);
      if (action === 'clear') click(dom.clear);
      else closeNative();
      await settle();
      expect(local()).toBeUndefined();
      dom.dialog.open = true;
      submit(dom, 'Thanks');
      await env.advance(0);
      const newId = local()?.id;
      expect(newId).not.toBe(oldId);
      expect(env.timerCount()).toBe(0);
      body.release();
      await settle();
      expect(env.timerCount()).toBe(0);
      expect(dom.historyStatus.textContent).toBe(
        'Completed replies archived for Tim.'
      );
      await env.advance(2000);
      submit(dom, 'Hello again');
      await env.advance(0);
      expect(server.calls).toHaveLength(3);
      expect(local()?.id).toBe(newId);
      expect(local()?.turns.map((turn) => turn.question)).toEqual([
        'Thanks',
        'Hello again',
      ]);
    });
  test('an invalidated host keeps answers visible and resets topic and turn limit on its next explicit question', async () => {
    const question = 'What did Tim build at Included Health?';
    const answer = answerInBrowser(question);
    const turn = {
      question,
      paragraphs: conversationalParagraphs(answer),
      experienceIds: answer.brief.evidence.map((record) => record.id),
    };
    env.storage.set(
      activeChatKey,
      JSON.stringify(envelope(Array(12).fill(turn)))
    );
    await startHost();
    const firstDom = dom;
    const { controller: other } = startHistory(robotDom());
    other.clear();
    expect(firstDom.transcript.textContent).toContain(question);
    expect(firstDom.input.disabled).toBe(false);
    submit(firstDom, '   ');
    await env.advance(0);
    expect(firstDom.transcript.textContent).toContain(question);
    expect(local()).toBeUndefined();
    other.save([another]);
    await settle();
    const otherId = local()?.id;
    submit(firstDom, 'Tell me more');
    await env.advance(0);
    expect(local()?.id).not.toBe(id);
    expect(local()?.id).not.toBe(otherId);
    expect(local()?.turns.map((turn) => turn.question)).toEqual([
      'Tell me more',
    ]);
    expect(local()?.turns[0]?.paragraphs).toEqual(
      conversationalParagraphs(answerInBrowser('Tell me more'))
    );
    expect(firstDom.transcript.textContent).not.toContain(question);
    expect(server.methods()).toEqual(['PUT', 'PUT']);
  });
  test('a shared identity change while starting a question still resets the actual host safely', async () => {
    env.storage.set(activeChatKey, JSON.stringify(envelope()));
    await startHost();
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
    submit(dom, 'Hello');
    await env.advance(0);
    expect(local()?.id).not.toBe(id);
    expect(local()?.id).not.toBe(replacement.id);
    expect(local()?.turns.map((turn) => turn.question)).toEqual(['Hello']);
    expect(dom.transcript.textContent).not.toContain(qualified.question);
    expect(server.methods()).toEqual(['PUT']);
  });
  test('a pending local answer cannot reclaim a UUID cleared by another controller', async () => {
    await startHost();
    submit(dom, 'Hello');
    const { controller: other } = startHistory(robotDom());
    other.clear();
    await env.advance(0);
    expect(dom.transcript.textContent).toContain('Hello');
    expect(local()).toBeUndefined();
    expect(server.calls).toHaveLength(0);
    submit(dom, 'Thanks');
    await env.advance(0);
    expect(local()?.turns.map((turn) => turn.question)).toEqual(['Thanks']);
    expect(dom.transcript.textContent).not.toContain('Hello');
    expect(server.methods()).toEqual(['PUT']);
  });
  test('refresh restores exact paragraphs safely and never reads the remote archive', async () => {
    env.storage.set(activeChatKey, JSON.stringify(envelope()));
    server.archives.set(id, envelope([another], 10));
    await startHost();
    for (const paragraph of qualified.paragraphs)
      expect(dom.transcript.textContent).toContain(paragraph);
    expect(dom.transcript.querySelector('script')).toBeNull();
    expect(dom.transcript.querySelector('a')).toBeNull();
    expect(dom.transcript.textContent).not.toContain(another.question);
    expect(server.calls).toHaveLength(0);
    submit(dom, 'Hello');
    await env.advance(0);
    expect(local()?.turns[0]).toEqual(qualified);
    expect(dom.transcript.textContent).toContain('Hello');
  });
  test('completed replies survive failed archiving and a refresh with the same local identity', async () => {
    await startHost();
    server.fail(503);
    submit(dom, 'What platform architecture has Tim led?');
    await env.advance(0);
    const stored = local();
    expect(stored?.turns).toHaveLength(1);
    const displayed = dom.transcript.textContent;
    env.page('pagehide', false);
    dom = robotDom();
    await startHost();
    expect(dom.transcript.textContent).toBe(displayed);
    expect(local()?.id).toBe(stored?.id);
    expect(server.methods()).toEqual(['PUT']);
  });
  for (const action of ['native close', 'attribute close', 'clear'])
    test(`${action} resets greeting, controls, local identity, and twelve-turn limit`, async () => {
      env.storage.set(
        activeChatKey,
        JSON.stringify(envelope(Array(12).fill(qualified)))
      );
      await startHost();
      expect(dom.input.disabled).toBe(true);
      click(dom.options);
      expect(dom.panel.hidden).toBe(false);
      if (action === 'clear') click(dom.clear);
      else if (action === 'native close') closeNative();
      else dom.dialog.open = false;
      await settle();
      expect(local()).toBeUndefined();
      expect(dom.transcript.textContent).toContain("Hi, I'm the lab robot.");
      expect(dom.transcript.textContent).not.toContain(qualified.question);
      expect(dom.panel.hidden).toBe(true);
      expect(dom.input.disabled).toBe(false);
      expect(dom.clear.hidden).toBe(true);
      if (action === 'clear') expect(dom.dialog.open).toBe(true);
      dom.dialog.open = true;
      await settle();
      expect(local()).toBeUndefined();
      submit(dom, 'Hello');
      await env.advance(0);
      expect(local()?.id).not.toBe(id);
      expect(local()?.turns.map((turn) => turn.question)).toEqual(['Hello']);
    });
  for (const action of ['close', 'clear'])
    test(`${action} cancels a pending question without writing it`, async () => {
      await startHost();
      submit(dom, 'Pending question');
      expect(dom.transcript.textContent).toContain('Pending question');
      expect(local()).toBeUndefined();
      if (action === 'close') closeNative();
      else click(dom.clear);
      await env.advance(0);
      expect(dom.transcript.textContent).not.toContain('Pending question');
      expect(server.calls).toHaveLength(0);
      expect(local()).toBeUndefined();
    });
  test('close stops the worker and ignores later answers and archive receipt', async () => {
    await startHost();
    click(dom.enable);
    await settle();
    const worker = TestWorker.instances[0];
    worker?.reply({ kind: 'ready' });
    const release = server.defer(true);
    submit(dom, 'What did Tim build at Included Health?');
    await env.advance(0);
    closeNative();
    release();
    await settle();
    worker?.reply({ kind: 'answer', text: 'Late answer' });
    expect(worker?.terminated).toBe(true);
    expect(dom.aiStatus.hidden).toBe(true);
    expect(dom.enable.disabled).toBe(false);
    expect(dom.transcript.textContent).not.toContain('Included Health');
    expect(local()).toBeUndefined();
    expect(server.calls).toHaveLength(1);
  });
  test('Clear resets topic context so a follow-up cannot borrow the previous project', async () => {
    await startHost();
    submit(dom, 'What did Tim build at Included Health?');
    await env.advance(0);
    click(dom.clear);
    submit(dom, 'Tell me more');
    await env.advance(0);
    expect(local()?.turns).toEqual([
      {
        question: 'Tell me more',
        paragraphs: conversationalParagraphs(answerInBrowser('Tell me more')),
        experienceIds: answerInBrowser('Tell me more').brief.evidence.map(
          (record) => record.id
        ),
      },
    ]);
  });
  test('BFcache cancels pending work, preserves completed replies, and accepts a new question', async () => {
    await startHost();
    submit(dom, 'Hello');
    await env.advance(0);
    const before = local();
    submit(dom, 'Still pending');
    env.page('pagehide', true);
    await env.advance(0);
    env.page('pageshow', true);
    expect(local()).toEqual(before);
    expect(dom.input.readOnly).toBe(false);
    submit(dom, 'Thanks');
    await env.advance(0);
    await env.advance(2000);
    expect(local()?.turns.map((turn) => turn.question)).toEqual([
      'Hello',
      'Thanks',
    ]);
  });
  test('archive conflicts leave new local questions usable without reading the archive', async () => {
    await startHost();
    server.fail(409);
    submit(dom, 'Hello');
    await env.advance(0);
    submit(dom, 'Thanks');
    await env.advance(0);
    expect(local()?.turns.map((turn) => turn.question)).toEqual([
      'Hello',
      'Thanks',
    ]);
    expect(server.methods()).toEqual(['PUT']);
    expect(dom.input.readOnly).toBe(false);
    click(dom.clear);
    expect(local()).toBeUndefined();
  });
  test('accepted WebLLM passage persists exactly before automatic archive retry', async () => {
    await startHost();
    click(dom.enable);
    await settle();
    const worker = TestWorker.instances[0];
    worker?.reply({ kind: 'ready' });
    const question = 'What did Tim build at Included Health?';
    submit(dom, question);
    await env.advance(0);
    const answer = answerInBrowser(question);
    const context = groundedContext(answer.brief);
    const record = answer.brief.evidence.find((record) =>
      context?.ids.includes(record.id)
    );
    if (!record) throw new Error('Question must select an extractable source');
    await env.advance(500);
    worker?.reply({
      kind: 'answer',
      text: `${record.strength} [${record.id}]`,
    });
    const passage = `Here's a detail from that experience: ${record.strength}`;
    const expected = [...conversationalParagraphs(answer), passage];
    expect(local()?.turns[0]?.paragraphs).toEqual(expected);
    expect(dom.transcript.textContent).toContain(passage);
    await settle();
    await env.advance(2000);
    expect(
      server.archives.get(local()?.id ?? '')?.turns[0]?.paragraphs
    ).toEqual(expected);
    expect(local()?.turns[0]?.experienceIds).toEqual(
      answer.brief.evidence.map((record) => record.id)
    );
  });
  test('BFcache retains active chat, suspends retries, and keeps listeners usable', async () => {
    const setup = await startHost();
    submit(dom, 'Hello');
    await env.advance(0);
    submit(dom, 'Thanks');
    await env.advance(0);
    const before = local();
    const text = dom.transcript.textContent;
    env.page('pagehide', true);
    await env.advance(3000);
    expect(local()).toEqual(before);
    expect(dom.transcript.textContent).toBe(text);
    expect(server.calls).toHaveLength(2);
    env.page('pageshow', true);
    setup(dom.root);
    await settle();
    expect(server.methods()).toEqual(['PUT', 'PUT', 'PUT']);
    expect(local()?.id).toBe(before?.id);
    submit(dom, 'Hello again');
    await env.advance(0);
    await env.advance(2000);
    expect(local()?.turns.map((turn) => turn.question)).toEqual([
      'Hello',
      'Thanks',
      'Hello again',
    ]);
    click(dom.clear);
    expect(local()).toBeUndefined();
  });
  test('pagehide disposal keeps completed local turns and cancels a queued retry', async () => {
    await startHost();
    server.fail(429);
    submit(dom, 'Hello');
    await env.advance(0);
    const before = local();
    env.page('pagehide', false);
    await env.advance(5000);
    expect(local()).toEqual(before);
    expect(server.calls).toHaveLength(1);
  });
});
