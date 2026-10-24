import { afterEach, beforeEach, expect, test } from 'bun:test';
import {
  browserEnvironment,
  click,
  memoryServer,
  robotDom,
  settle,
  submit,
  TestWorker,
} from './lifecycle-test-helpers';
import { activeChatKey } from './active-chat';

let env: ReturnType<typeof browserEnvironment>;
let server: ReturnType<typeof memoryServer>;
let dom: ReturnType<typeof robotDom>;
let hud: HTMLElement;
let hudText: HTMLElement;
let hudCancel: HTMLButtonElement;
let hudReturn: HTMLButtonElement;
let hudDismiss: HTMLButtonElement;
let station: HTMLDialogElement;
let canvas: HTMLCanvasElement;

beforeEach(async () => {
  env = browserEnvironment();
  server = memoryServer(env);
  dom = robotDom();
  hud = document.createElement('aside');
  hudText = document.createElement('span');
  hudText.setAttribute('data-firmware-status', '');
  hudReturn = document.createElement('button');
  hudReturn.setAttribute('data-open-station', 'robot');
  hudCancel = document.createElement('button');
  hudCancel.setAttribute('data-firmware-cancel', '');
  hudDismiss = document.createElement('button');
  hudDismiss.setAttribute('data-firmware-dismiss', '');
  hud.append(
    hudText,
    document.createElement('progress'),
    hudReturn,
    hudCancel,
    hudDismiss
  );
  station = document.createElement('dialog');
  canvas = document.createElement('canvas');
  canvas.inert = false;
  Reflect.set(document, 'querySelectorAll', (selector: string) => {
    switch (selector) {
      case '[data-robot-firmware]':
        return [hud];
      case '.lab-dialog':
        return [dom.dialog, station];
      case '#campus-canvas':
        return [canvas];
      default:
        return [];
    }
  });
  const { setupRobotHost } = await import('./host');
  setupRobotHost(dom.root);
});
afterEach(() => {
  env.cleanup();
  expect(env.timerCount()).toBe(0);
});
async function loading() {
  click(dom.enable);
  await settle();
  const worker = TestWorker.instances.at(-1);
  if (!worker) throw new Error('No fixture worker');
  return worker;
}
async function close() {
  dom.dialog.dispatchEvent(new Event('lab:before-close'));
  dom.dialog.open = false;
  dom.dialog.dispatchEvent(new Event('close'));
  await settle();
}

test('background progress and ready never create a chat, archive, modal, focus change or speech; reopen reuses worker', async () => {
  let spoken = 0;
  Reflect.set(
    window,
    'speechSynthesis',
    Object.assign(new EventTarget(), {
      getVoices: () => [],
      speak: () => {
        spoken += 1;
      },
      cancel: () => {},
    })
  );
  const worker = await loading();
  await close();
  canvas.focus();
  worker.reply({ kind: 'progress', progress: 0.37, text: 'download' });
  expect(hud.hidden).toBe(false);
  expect(hudText.textContent).toBe('Robot updating · 37%');
  worker.reply({ kind: 'ready' });
  expect(hudText.textContent).toBe('Robot ready');
  expect(hudDismiss.hidden).toBe(false);
  expect(document.activeElement).toBe(canvas);
  expect(dom.dialog.open).toBe(false);
  expect(worker.terminated).toBe(false);
  expect(server.calls).toHaveLength(0);
  expect(env.storage.size).toBe(0);
  expect(spoken).toBe(0);
  dom.dialog.open = true;
  await settle();
  expect(hud.hidden).toBe(true);
  expect(dom.send.disabled).toBe(false);
  click(dom.enable);
  expect(TestWorker.instances).toHaveLength(1);
  expect(worker.messages).toHaveLength(1);
  submit(dom, 'Hello');
  await env.advance(0);
  worker.reply({ kind: 'answer', text: 'Hello from the lab.' });
  await settle();
  expect(server.calls).toHaveLength(1);
  await close();
  expect(env.storage.has(activeChatKey)).toBe(false);
  expect(worker.terminated).toBe(false);
  dom.dialog.open = true;
  await settle();
  expect(dom.send.disabled).toBe(false);
  expect(dom.transcript.textContent).not.toContain('Hello from the lab.');
  submit(dom, 'Fresh question');
  await env.advance(0);
  expect(JSON.stringify(worker.messages.at(-1))).not.toContain(
    'Hello from the lab.'
  );
});

test('another station stays open through background ready and the ready hint is contextual and dismissible', async () => {
  const worker = await loading();
  await close();
  station.open = true;
  await settle();
  expect(hud.hidden).toBe(true);
  worker.reply({ kind: 'ready' });
  expect(station.open).toBe(true);
  expect(hud.hidden).toBe(true);
  station.open = false;
  await settle();
  expect(hud.hidden).toBe(false);
  hudDismiss.focus();
  click(hudDismiss);
  expect(hud.hidden).toBe(true);
  expect(document.activeElement).toBe(canvas);
  expect(worker.terminated).toBe(false);
});

for (const timing of ['before close', 'after close', 'close then reopen']) {
  test(`load ready ${timing} retains the model and clears the old session`, async () => {
    const worker = await loading();
    if (timing === 'before close') worker.reply({ kind: 'ready' });
    // Deliberately no microtask gap between close, ready, and reopen.
    dom.dialog.dispatchEvent(new Event('lab:before-close'));
    dom.dialog.open = false;
    if (timing === 'after close') {
      worker.reply({ kind: 'ready' });
      await settle();
      expect(dom.dialog.open).toBe(false);
    }
    dom.dialog.open = true;
    if (timing === 'close then reopen') worker.reply({ kind: 'ready' });
    dom.dialog.dispatchEvent(new Event('close'));
    await settle();
    expect(dom.root.dataset.modelState).toBe('ready');
    expect(dom.send.disabled).toBe(false);
    expect(worker.terminated).toBe(false);
    expect(TestWorker.instances).toHaveLength(1);
    expect(server.calls).toHaveLength(0);
  });
}

test('cancel while closed rejects late progress/ready/error, and reopen/retry gets one new worker', async () => {
  const worker = await loading();
  await close();
  const stale = worker.onmessage;
  hudCancel.focus();
  click(hudCancel);
  expect(document.activeElement).toBe(canvas);
  expect(worker.terminated).toBe(true);
  expect(hud.hidden).toBe(true);
  stale?.({ data: { kind: 'ready' } });
  stale?.({ data: { kind: 'progress', progress: 1, text: 'late' } });
  stale?.({ data: { kind: 'error', stage: 'load', message: 'late' } });
  expect(dom.root.dataset.modelState).toBe('off');
  expect(hud.hidden).toBe(true);
  dom.dialog.open = true;
  const retry = await loading();
  stale?.({ data: { kind: 'ready' } });
  expect(dom.root.dataset.modelState).toBe('loading');
  retry.reply({ kind: 'ready' });
  expect(dom.send.disabled).toBe(false);
  expect(TestWorker.instances).toHaveLength(2);
  click(dom.unload);
  expect(retry.terminated).toBe(true);
});

test('cancel during GPU preflight prevents a worker appearing after a retry', async () => {
  let resolve: (value: unknown) => void = () => {};
  const adapter = new Promise<unknown>((done) => {
    resolve = done;
  });
  env.install('navigator', { gpu: { requestAdapter: () => adapter } });
  click(dom.enable);
  await close();
  click(hudCancel);
  dom.dialog.open = true;
  click(dom.enable);
  resolve({
    limits: { maxStorageBufferBindingSize: 256 * 1024 * 1024 },
    features: new Set(['shader-f16']),
  });
  await settle();
  expect(TestWorker.instances).toHaveLength(1);
  TestWorker.instances[0]?.reply({ kind: 'ready' });
  expect(dom.send.disabled).toBe(false);
});

for (const persisted of [false, true]) {
  test(`pagehide cleans up background load and suppresses stale callbacks, persisted ${persisted}`, async () => {
    const worker = await loading();
    await close();
    const stale = worker.onmessage;
    env.page('pagehide', persisted);
    stale?.({ data: { kind: 'ready' } });
    expect(worker.terminated).toBe(true);
    expect(hud.hidden).toBe(true);
    expect(env.timerCount()).toBe(0);
    expect(server.calls).toHaveLength(0);
    if (persisted) {
      env.page('pageshow', true);
      dom.dialog.open = true;
      const retry = await loading();
      retry.reply({ kind: 'ready' });
      expect(dom.send.disabled).toBe(false);
    }
  });
}

test('cross-tab clear during a resumed chat load clears speech/context without cancelling page-owned loading', async () => {
  const first = await loading();
  first.reply({ kind: 'ready' });
  submit(dom, 'Old question');
  await env.advance(0);
  first.reply({ kind: 'answer', text: 'Old accepted reply.' });
  click(dom.unload);
  const worker = await loading();
  env.storage.delete(activeChatKey);
  env.storageEvent(activeChatKey, null);
  expect(worker.terminated).toBe(false);
  await close();
  worker.reply({ kind: 'ready' });
  dom.dialog.open = true;
  await settle();
  submit(dom, 'New question');
  await env.advance(0);
  expect(JSON.stringify(worker.messages.at(-1))).not.toContain(
    'Old accepted reply.'
  );
  worker.reply({ kind: 'answer', text: 'New accepted reply.' });
  expect(dom.transcript.textContent).toContain('New accepted reply.');
});

test('background failure and timeout release the worker; retry stays explicit', async () => {
  const first = await loading();
  await close();
  first.reply({ kind: 'error', stage: 'load', message: 'Device lost' });
  expect(first.terminated).toBe(true);
  expect(hud.hidden).toBe(true);
  dom.dialog.open = true;
  const retry = await loading();
  await close();
  await env.advance(10 * 60 * 1000);
  expect(retry.terminated).toBe(true);
  expect(hud.hidden).toBe(true);
  expect(dom.aiStatus.textContent).toContain('timed out');
  expect(server.calls).toHaveLength(0);
});

test('ready replaces focused Explore with the question input and keeps the courteous status brief', async () => {
  const worker = await loading();
  expect(document.activeElement).toBe(dom.explore);
  expect(dom.status.textContent).toBe(
    'Do have a look around while I get ready.'
  );
  worker.reply({ kind: 'ready' });
  expect(dom.explore.hidden).toBe(true);
  expect(document.activeElement).toBe(dom.input);
  expect(dom.status.textContent).toBe(
    'All in order. What would you like to know?'
  );
});

test('background ready replaces focused HUD Cancel with visible Return to robot', async () => {
  const worker = await loading();
  await close();
  hudCancel.focus();
  worker.reply({ kind: 'ready' });
  expect(hudCancel.hidden).toBe(true);
  expect(hud.hidden).toBe(false);
  expect(document.activeElement).toBe(hudReturn);
  expect(dom.dialog.open).toBe(false);
});

for (const failure of ['GPU rejection', 'worker error', 'timeout']) {
  test(`${failure} returns focused Explore to visible Start`, async () => {
    if (failure === 'GPU rejection') {
      env.install('navigator', {
        gpu: {
          requestAdapter: async () => {
            throw new Error('GPU unavailable');
          },
        },
      });
      click(dom.enable);
      expect(document.activeElement).toBe(dom.explore);
      await settle();
    } else {
      const worker = await loading();
      expect(document.activeElement).toBe(dom.explore);
      if (failure === 'timeout') await env.advance(10 * 60 * 1000);
      else
        worker.reply({ kind: 'error', stage: 'load', message: 'Device lost' });
    }
    expect(dom.root.dataset.modelState).toBe('off');
    expect(dom.explore.hidden).toBe(true);
    expect(dom.enable.disabled).toBe(false);
    expect(document.activeElement).toBe(dom.enable);
  });
}

for (const outcome of ['ready', 'worker error', 'timeout']) {
  test(`background ${outcome} preserves another station's focused input`, async () => {
    const worker = await loading();
    await close();
    const otherInput = document.createElement('textarea');
    station.append(otherInput);
    station.open = true;
    await settle();
    otherInput.focus();
    if (outcome === 'timeout') await env.advance(10 * 60 * 1000);
    else if (outcome === 'ready') worker.reply({ kind: 'ready' });
    else worker.reply({ kind: 'error', stage: 'load', message: 'Device lost' });
    expect(document.activeElement).toBe(otherInput);
    expect(station.open).toBe(true);
    expect(hud.hidden).toBe(true);
  });
}

for (const outcome of ['ready', 'worker error', 'timeout']) {
  test(`${outcome} preserves focus and draft in the robot input`, async () => {
    const worker = await loading();
    dom.input.value = 'My next question';
    dom.input.focus();
    if (outcome === 'timeout') await env.advance(10 * 60 * 1000);
    else if (outcome === 'ready') worker.reply({ kind: 'ready' });
    else worker.reply({ kind: 'error', stage: 'load', message: 'Device lost' });
    expect(document.activeElement).toBe(dom.input);
    expect(dom.input.value).toBe('My next question');
  });
}

for (const outcome of ['worker error', 'timeout']) {
  test(`background ${outcome} returns focused HUD Cancel to the room`, async () => {
    const worker = await loading();
    await close();
    hudCancel.focus();
    if (outcome === 'timeout') await env.advance(10 * 60 * 1000);
    else worker.reply({ kind: 'error', stage: 'load', message: 'Device lost' });
    expect(hud.hidden).toBe(true);
    expect(document.activeElement).toBe(canvas);
    expect(dom.dialog.open).toBe(false);
  });
}
