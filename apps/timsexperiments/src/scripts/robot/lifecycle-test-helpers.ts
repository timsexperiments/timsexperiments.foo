import { spyOn } from 'bun:test';
import { archivePutSchema } from '../../lib/conversations/protocol';
import type { ActiveChat } from './active-chat';

/** Bounded browser-boundary substitutes. Production host/history modules run unchanged. */
export async function settle() {
  for (let i = 0; i < 40; i += 1) await Promise.resolve();
}

class TestElement extends EventTarget {
  readonly children: TestElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly observers = new Set<() => void>();
  parentElement: TestElement | null = null;
  hidden = false;
  disabled = false;
  checked = false;
  readOnly = false;
  value: string | number = '';
  className = '';
  scrollTop = 0;
  scrollHeight = 500;
  clientHeight = 400;
  offsetTop = 0;
  private text = '';
  private isOpen = false;
  constructor(readonly tagName = 'div') {
    super();
  }
  get firstElementChild() {
    return this.children[0] ?? null;
  }
  cloneNode(deep = false): TestElement {
    const copy = new TestElement(this.tagName);
    copy.className = this.className;
    copy.text = this.text;
    this.attributes.forEach((value, key) => copy.attributes.set(key, value));
    if (deep)
      copy.append(...this.children.map((child) => child.cloneNode(true)));
    return copy;
  }
  get open() {
    return this.isOpen;
  }
  set open(value: boolean) {
    this.isOpen = value;
    this.observers.forEach((callback) => queueMicrotask(callback));
  }
  get textContent(): string {
    return (
      this.text + this.children.map((child) => child.textContent).join(' ')
    );
  }
  set textContent(value: string) {
    this.replaceChildren();
    this.text = value;
  }
  append(...children: TestElement[]) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
  }
  prepend(...children: TestElement[]) {
    for (const child of children) child.parentElement = this;
    this.children.unshift(...children);
  }
  replaceChildren(...children: TestElement[]) {
    this.children.forEach((child) => {
      child.parentElement = null;
    });
    this.children.splice(0);
    this.text = '';
    this.append(...children);
  }
  setAttribute(key: string, value: string) {
    this.attributes.set(key, value);
  }
  matches(selector: string) {
    return selector.startsWith('[')
      ? this.attributes.has(selector.slice(1, -1))
      : selector.startsWith('.')
        ? this.className.split(' ').includes(selector.slice(1))
        : this.tagName === selector;
  }
  querySelector(selector: string): TestElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  querySelectorAll(selector: string): TestElement[] {
    return this.children.flatMap((child) => [
      ...(child.matches(selector) ? [child] : []),
      ...child.querySelectorAll(selector),
    ]);
  }
  closest(selector: string): TestElement | null {
    return this.matches(selector)
      ? this
      : (this.parentElement?.closest(selector) ?? null);
  }
  focus() {}
  requestSubmit() {
    this.dispatchEvent(new Event('submit', { cancelable: true }));
  }
}
class TestForm extends TestElement {
  constructor() {
    super('form');
  }
}
class TestInput extends TestElement {
  constructor() {
    super('input');
  }
}
class TestTextArea extends TestElement {
  constructor() {
    super('textarea');
  }
}
class TestButton extends TestElement {
  constructor() {
    super('button');
  }
}
class TestProgress extends TestElement {
  constructor() {
    super('progress');
  }
}
class TestDetails extends TestElement {
  constructor() {
    super('details');
  }
}
class TestObserver {
  private target: TestElement | undefined;
  constructor(private readonly callback: () => void) {}
  observe(target: TestElement) {
    this.target = target;
    target.observers.add(this.callback);
  }
  disconnect() {
    this.target?.observers.delete(this.callback);
  }
}

export class TestWorker {
  static instances: TestWorker[] = [];
  readonly messages: unknown[] = [];
  onmessage: ((event: { data: unknown }) => void) | undefined;
  onerror: ((event: { message: string }) => void) | undefined;
  terminated = false;
  constructor() {
    TestWorker.instances.push(this);
  }
  postMessage(message: unknown) {
    this.messages.push(message);
  }
  reply(data: unknown) {
    if (!this.terminated) this.onmessage?.({ data });
  }
  terminate() {
    this.terminated = true;
  }
}

export function browserEnvironment() {
  let now = Date.parse('2026-10-22T12:00:00.000Z');
  let nextId = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const globals = new Map<string, PropertyDescriptor | undefined>();
  const install = (key: string, value: unknown) => {
    if (!globals.has(key))
      globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  };
  const date = spyOn(Date, 'now').mockImplementation(() => now);
  const win = Object.assign(new EventTarget(), { isSecureContext: true });
  const doc = Object.assign(new EventTarget(), {
    activeElement: null,
    querySelectorAll: () => [],
    createElement(tag: string) {
      switch (tag) {
        case 'form':
          return new TestForm();
        case 'input':
          return new TestInput();
        case 'textarea':
          return new TestTextArea();
        case 'button':
          return new TestButton();
        case 'progress':
          return new TestProgress();
        case 'details':
          return new TestDetails();
        default:
          return new TestElement(tag);
      }
    },
  });
  const storage = new Map<string, string>();
  install('window', win);
  install('document', doc);
  install('HTMLElement', TestElement);
  install('HTMLFormElement', TestForm);
  install('HTMLInputElement', TestInput);
  install('HTMLTextAreaElement', TestTextArea);
  install('HTMLButtonElement', TestButton);
  install('HTMLProgressElement', TestProgress);
  install('HTMLDetailsElement', TestDetails);
  install('MutationObserver', TestObserver);
  install('Worker', TestWorker);
  TestWorker.instances = [];
  install('navigator', {
    gpu: {
      requestAdapter: async () => ({
        limits: { maxStorageBufferBindingSize: 256 * 1024 * 1024 },
        features: new Set(['shader-f16']),
      }),
    },
  });
  install('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    removeItem: (key: string) => {
      storage.delete(key);
    },
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  });
  install('setTimeout', (callback: () => void, ms = 0) => {
    const id = ++nextId;
    timers.set(id, { at: now + ms, callback });
    return id;
  });
  install('clearTimeout', (id: number) => {
    timers.delete(id);
  });
  install('requestAnimationFrame', (callback: () => void) =>
    setTimeout(callback, 16)
  );
  install('cancelAnimationFrame', (id: ReturnType<typeof setTimeout>) =>
    clearTimeout(id)
  );
  return {
    install,
    storage,
    storageEvent(key: string | null, newValue: string | null) {
      const event = new Event('storage');
      Object.defineProperties(event, {
        key: { value: key },
        newValue: { value: newValue },
        storageArea: { value: localStorage },
      });
      win.dispatchEvent(event);
    },
    now: () => now,
    timerCount: () => timers.size,
    async advance(ms: number) {
      const end = now + ms;
      for (let count = 0; count < 100; count += 1) {
        const next = [...timers.entries()]
          .filter(([, timer]) => timer.at <= end)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) {
          now = end;
          await settle();
          return;
        }
        now = next[1].at;
        timers.delete(next[0]);
        next[1].callback();
        await settle();
      }
      throw new Error('Timer loop exceeded the test bound');
    },
    page(type: 'pagehide' | 'pageshow', persisted: boolean) {
      const event = new Event(type);
      Object.defineProperty(event, 'persisted', { value: persisted });
      win.dispatchEvent(event);
    },
    cleanup() {
      doc.dispatchEvent(new Event('astro:before-swap'));
      TestWorker.instances.forEach((worker) => worker.terminate());
      date.mockRestore();
      globals.forEach((descriptor, key) => {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      });
    },
  };
}

export function robotDom() {
  const dialog = document.createElement('dialog');
  dialog.open = true;
  const root = document.createElement('section');
  dialog.append(root);
  root.setAttribute('data-chat-view', '');
  const add = <T extends keyof HTMLElementTagNameMap>(
    tag: T,
    attribute?: string
  ) => {
    const element = document.createElement(tag);
    if (attribute) element.setAttribute(attribute, '');
    root.append(element);
    return element;
  };
  const transcript = add('div', 'data-transcript');
  const greeting = document.createElement('article');
  greeting.textContent =
    "Hi, I'm the lab robot. AI answers can be wrong. Chats are saved for Tim.";
  transcript.append(greeting);
  const panel = add('section');
  panel.className = 'chat-options';
  panel.hidden = true;
  return {
    root,
    panel,
    options: add('button', 'data-chat-options'),
    back: add('button', 'data-chat-back'),
    newest: add('button', 'data-chat-new'),
    dialog,
    form: add('form'),
    input: add('textarea'),
    send: add('button', 'data-send'),
    enable: add('button', 'data-enable'),
    stop: add('button', 'data-stop'),
    clear: add('button', 'data-clear'),
    status: add('div', 'data-status'),
    aiStatus: add('div', 'data-ai-status'),
    progress: add('progress'),
    transcript,
    historyStatus: add('div', 'data-history-status'),
    retry: add('button', 'data-history-retry'),
  };
}
export function click(element: HTMLElement) {
  element.dispatchEvent(new Event('click'));
}
export function submit(dom: ReturnType<typeof robotDom>, question: string) {
  dom.input.value = question;
  dom.form.dispatchEvent(new Event('submit', { cancelable: true }));
}

/** HTTP boundary only. Backend transaction tests own SQL semantics. */
export function memoryServer(env: ReturnType<typeof browserEnvironment>) {
  const calls: {
    method: string;
    payload: unknown;
    at: number;
    signal: AbortSignal | null | undefined;
    credentials: RequestCredentials | undefined;
  }[] = [];
  const archives = new Map<string, ActiveChat>();
  const lastWrites = new Map<string, number>();
  let failure: { status: number; retryAfter: string } | undefined;
  let invalidReceipt: unknown;
  let errorBody:
    | { status: number; promise: Promise<void>; started: () => void }
    | undefined;
  let deferred: { promise: Promise<void>; ignoreAbort: boolean } | undefined;
  env.install('fetch', async (_url: unknown, init: RequestInit) => {
    const method = init.method ?? 'GET';
    const payload: unknown =
      typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({
      method,
      payload,
      at: env.now(),
      signal: init.signal,
      credentials: init.credentials,
    });
    if (deferred) {
      const gate = deferred;
      deferred = undefined;
      await new Promise<void>((resolve, reject) => {
        const abort = () => reject(new DOMException('Aborted', 'AbortError'));
        if (!gate.ignoreAbort)
          init.signal?.addEventListener('abort', abort, { once: true });
        void gate.promise.then(() => {
          init.signal?.removeEventListener('abort', abort);
          resolve();
        });
      });
    }
    if (errorBody) {
      const body = errorBody;
      errorBody = undefined;
      return new Response(
        new ReadableStream({
          cancel() {
            body.started();
            return body.promise;
          },
        }),
        {
          status: body.status,
          headers: { 'Retry-After': '60' },
        }
      );
    }
    if (failure) {
      const result = failure;
      failure = undefined;
      return new Response(null, {
        status: result.status,
        headers: { 'Retry-After': result.retryAfter },
      });
    }
    if (method !== 'PUT') return new Response(null, { status: 405 });
    const body = archivePutSchema.parse(payload);
    const prior = archives.get(body.id);
    const same = JSON.stringify(prior?.turns) === JSON.stringify(body.turns);
    if (
      same &&
      prior &&
      (body.revision === prior.revision || body.revision === prior.revision - 1)
    )
      return Response.json({ revision: prior.revision });
    if (body.revision !== (prior?.revision ?? 0))
      return new Response(null, { status: 409 });
    if (env.now() - (lastWrites.get(body.id) ?? -Infinity) < 2000)
      return new Response(null, {
        status: 429,
        headers: { 'Retry-After': '2' },
      });
    const archive = { ...body, revision: body.revision + 1 };
    archives.set(body.id, archive);
    lastWrites.set(body.id, env.now());
    if (invalidReceipt !== undefined) {
      const result = invalidReceipt;
      invalidReceipt = undefined;
      return Response.json(result);
    }
    return Response.json({ revision: archive.revision });
  });
  return {
    calls,
    archives,
    fail(status: number, retryAfter = '2') {
      failure = { status, retryAfter };
    },
    delayErrorCancellation(status = 429) {
      let release = () => {};
      let started = false;
      const promise = new Promise<void>((resolve) => {
        release = resolve;
      });
      errorBody = {
        status,
        promise,
        started: () => {
          started = true;
        },
      };
      return { release, started: () => started };
    },
    receipt(value: unknown) {
      invalidReceipt = value;
    },
    defer(ignoreAbort = false) {
      let release = () => {};
      const promise = new Promise<void>((resolve) => {
        release = resolve;
      });
      deferred = { promise, ignoreAbort };
      return release;
    },
    methods: () => calls.map((call) => call.method),
  };
}
