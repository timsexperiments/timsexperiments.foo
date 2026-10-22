import { createConversationView } from '../chat-view/presentation';
import {
  retrieveInBrowser,
  type BrowserTopic,
} from '../../lib/resume/browser-answer';
import { renderAnswer, textNode as node } from '../chat-view/evidence';
import { selectGpuModel } from './gpu';
import {
  checkGeneratedAnswer,
  groundedContext,
  type EvidenceRecord,
} from './evidence';
import { workerReply } from './protocol';

type LocalState = 'off' | 'loading' | 'ready' | 'generating';
const instances = new WeakSet<HTMLElement>();
export function setupRobotHost(root: HTMLElement) {
  if (instances.has(root)) return;
  instances.add(root);
  function element<T extends typeof HTMLElement>(
    selector: string,
    type: T
  ): InstanceType<T> {
    const found = root.querySelector(selector);
    if (!(found instanceof type))
      throw new Error(`Missing robot control: ${selector}`);
    // instanceof validates the constructor before this generic boundary assertion.
    return found as InstanceType<T>;
  }
  const form = element('form', HTMLFormElement);
  const input = element('textarea', HTMLTextAreaElement);
  const send = element('[data-send]', HTMLButtonElement);
  const enable = element('[data-enable]', HTMLButtonElement);
  const stop = element('[data-stop]', HTMLButtonElement);
  const clear = element('[data-clear]', HTMLButtonElement);
  const status = element('[data-status]', HTMLElement);
  const aiStatus = element('[data-ai-status]', HTMLElement);
  const progress = element('progress', HTMLProgressElement);
  const transcript = element('[data-transcript]', HTMLElement);
  const conversation = root.matches('[data-chat-view]')
    ? createConversationView(root)
    : undefined;
  const chips = root.querySelectorAll<HTMLButtonElement>('[data-question]');
  const dialog = root.closest('dialog');
  const lifecycle = new AbortController();
  const listenerOptions = { signal: lifecycle.signal };
  let state: LocalState = 'off';
  let worker: Worker | undefined;
  let request: AbortController | undefined;
  let retrievalTarget: HTMLElement | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let run = 0;
  let turns = 0;
  let topic: BrowserTopic | undefined;
  let pending:
    | { target: HTMLElement; brief: { evidence: EvidenceRecord[] } }
    | undefined;

  function sync() {
    const busy =
      Boolean(request) || state === 'generating' || state === 'loading';
    send.disabled = busy || turns >= 12;
    input.disabled = turns >= 12;
    input.readOnly = busy;
    chips.forEach((chip) => {
      chip.disabled = busy || turns >= 12;
    });
    enable.disabled = state !== 'off' || busy || turns >= 12;
    enable.textContent =
      state === 'off'
        ? 'Download and enable AI'
        : state === 'loading'
          ? 'Loading local AI…'
          : 'Local AI enabled';
    stop.hidden = !busy && state !== 'loading' && state !== 'ready';
    stop.textContent =
      state === 'loading'
        ? 'Cancel download'
        : state === 'generating'
          ? 'Stop answer'
          : request
            ? 'Cancel search'
            : 'Turn off local AI';
    progress.hidden = state !== 'loading';
    aiStatus.hidden = state === 'off' && !aiStatus.dataset.touched;
    clear.hidden = turns === 0;
    transcript.setAttribute(
      'aria-busy',
      String(Boolean(request) || state === 'generating')
    );
    if (!busy && turns >= 12)
      status.textContent =
        'Session limit reached. Clear conversation to ask more questions.';
  }
  function finishPending(message: string) {
    if (pending) {
      pending.target.textContent = message;
      pending = undefined;
    }
  }
  function release(
    message = 'Local AI is off. Answers still work on this device.'
  ) {
    worker?.terminate();
    worker = undefined;
    if (deadline) clearTimeout(deadline);
    deadline = undefined;
    finishPending(
      'I stopped the local model. My answer and references are still here.'
    );
    state = 'off';
    aiStatus.textContent = message;
    status.textContent = 'Questions stay on this device.';
    const restoreFocus = document.activeElement === stop;
    sync();
    if (restoreFocus && dialog?.open) input.focus();
  }
  function cancel() {
    run += 1;
    request?.abort();
    request = undefined;
    if (retrievalTarget)
      retrievalTarget.textContent =
        'Stopped. Send the question again to retry.';
    retrievalTarget = undefined;
    release();
    status.textContent = 'Stopped. You can ask another question.';
    sync();
  }
  async function load() {
    if (state !== 'off') return;
    state = 'loading';
    aiStatus.dataset.touched = 'true';
    const consent = root.querySelector('[data-ai-consent]');
    if (consent instanceof HTMLDetailsElement) consent.open = false;
    aiStatus.textContent = "Checking this browser's GPU…";
    status.textContent = 'Preparing local AI. Cancel to search without it.';
    progress.value = 0;
    sync();
    stop.focus();
    const token = ++run;
    try {
      if (!window.isSecureContext || !('gpu' in navigator) || !navigator.gpu)
        throw new Error(
          'WebGPU needs a supported browser and a secure connection.'
        );
      const model = await selectGpuModel(navigator.gpu);
      if (token !== run) return;
      const current = new Worker(
        new URL('./inference.worker.ts', import.meta.url),
        { type: 'module' }
      );
      worker = current;
      current.onerror = (event) => {
        if (worker === current)
          release(
            `Local AI could not start: ${event.message.slice(0, 500) || 'Worker script or one of its imports failed to load.'} Open Optional local AI to retry, or keep using published evidence.`
          );
      };
      current.onmessage = (event: MessageEvent<unknown>) => {
        if (worker !== current) return;
        const result = workerReply.safeParse(event.data);
        if (!result.success) {
          release(
            'Local AI returned an invalid response. Retry or use published evidence.'
          );
          return;
        }
        const message = result.data;
        switch (message.kind) {
          case 'progress':
            progress.value = Math.min(1, Math.max(0, message.progress));
            aiStatus.textContent = `Loading local model · ${Math.round(progress.value * 100)}%. Cancel download stops this.`;
            break;
          case 'ready':
            if (deadline) clearTimeout(deadline);
            state = 'ready';
            status.textContent = 'Local AI is ready. Ask a question.';
            aiStatus.textContent = `Local AI ready · SmolLM2 360M · ${model.includes('f16') ? 'f16' : 'f32'}. Ask a question to use it.`;
            sync();
            break;
          case 'answer': {
            if (deadline) clearTimeout(deadline);
            let accepted = false;
            if (pending) {
              const answer = checkGeneratedAnswer(message.text, pending.brief);
              accepted = answer !== undefined;
              pending.target.textContent =
                (answer
                  ? `Here's a detail from that experience: ${answer.replace(/\s*\[[a-z0-9-]+\]\s*$/, '')}`
                  : undefined) ??
                "I couldn't find a useful passage with the local model. You can still use my answer above.";
              pending = undefined;
            }
            state = 'ready';
            status.textContent = accepted
              ? 'Done. Please confirm important details with Tim.'
              : "The model couldn't find a useful passage. My answer is above.";
            sync();
            break;
          }
          case 'error':
            release(
              `Local AI ${message.stage} failed: ${message.message} Open Optional local AI to retry, or use the published evidence.`
            );
            break;
        }
      };
      aiStatus.textContent = `Downloading and preparing SmolLM2 360M ${model.includes('f16') ? 'f16' : 'f32'} on this device…`;
      current.postMessage({ kind: 'load', model });
      deadline = setTimeout(
        () =>
          release(
            'Model loading timed out. Retry on a faster connection, or use evidence.'
          ),
        10 * 60 * 1000
      );
    } catch (error) {
      if (token !== run) return;
      release(
        error instanceof Error
          ? error.message
          : 'Local AI is unavailable. Published evidence still works.'
      );
    }
  }
  async function ask(question: string) {
    if (request || state === 'generating' || turns >= 12) return;
    const trimmed = question.trim();
    if (!trimmed || trimmed.length > 600) {
      status.textContent = 'Enter a question up to 600 characters.';
      return;
    }
    if (state === 'loading') {
      status.textContent =
        'Wait for the model or cancel its download, then ask your question.';
      return;
    }
    const turn = document.createElement('article');
    turn.className = 'robot-turn';
    turn.append(
      node('h3', 'You', 'robot-speaker'),
      node('p', trimmed, 'robot-question'),
      node('h3', 'Lab robot', 'robot-speaker')
    );
    const result = document.createElement('div');
    result.textContent = "Let me check Tim's experience…";
    retrievalTarget = result;
    turn.append(result);
    conversation?.beforeTurn();
    transcript.append(turn);
    if (!conversation) transcript.scrollTop = turn.offsetTop;
    turns += 1;
    const controller = new AbortController();
    request = controller;
    const token = ++run;
    status.textContent = 'Finding an answer on this device…';
    sync();
    try {
      const answer = await retrieveInBrowser({
        question: trimmed,
        previous: topic,
        signal: controller.signal,
      });
      if (token !== run) return;
      // Unknown questions do not erase the last supported topic.
      if (answer.topic) topic = answer.topic;
      retrievalTarget = undefined;
      result.replaceChildren();
      renderAnswer(result, answer);
      const brief = answer.brief;
      input.value = '';
      status.textContent = 'Questions stay on this device.';
      const context = groundedContext(brief);
      if (state === 'ready' && worker && context) {
        const ai = document.createElement('section');
        ai.className = 'robot-ai-answer';
        const answer = node('p', 'Preparing a short answer on your device…');
        ai.append(
          node('h4', 'Another detail'),
          answer,
          node(
            'small',
            'A passage from the referenced experience. Confirm important details with Tim.'
          )
        );
        const selection = document.createElement('details');
        selection.className = 'robot-model-selection';
        selection.append(
          node('summary', 'Another detail from the local model'),
          ai
        );
        result.append(selection);
        pending = {
          target: answer,
          brief: {
            evidence: brief.evidence.filter((record) =>
              context.ids.includes(record.id)
            ),
          },
        };
        state = 'generating';
        worker.postMessage({
          kind: 'generate',
          question: trimmed,
          context: context.text,
          allowedIds: context.ids,
        });
        deadline = setTimeout(
          () =>
            release(
              'Generation timed out. Evidence remains available. Open Optional local AI to retry.'
            ),
          30000
        );
        status.textContent = 'Writing a local AI answer. Stop is available.';
      } else if (state === 'ready' && brief.status === 'evidence_found') {
        result.prepend(
          node(
            'p',
            'I have too much context for this small model. Try asking about one project; my answer above still works.',
            'robot-source-note'
          )
        );
      }
    } catch {
      if (token !== run) return;
      retrievalTarget = undefined;
      result.replaceChildren();
      result.append(
        node(
          'p',
          'I could not select an answer from the local records. Try a more specific project question.'
        )
      );
      status.textContent = 'Local answer unavailable. Try another question.';
    } finally {
      if (request === controller) request = undefined;
      if (token === run && !conversation) transcript.scrollTop = turn.offsetTop;
      sync();
    }
  }
  form.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      void ask(input.value);
    },
    listenerOptions
  );
  input.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        form.requestSubmit();
      }
    },
    listenerOptions
  );
  chips.forEach((chip) =>
    chip.addEventListener(
      'click',
      () => {
        input.value = chip.dataset.prompt ?? chip.textContent?.trim() ?? '';
        void ask(input.value);
        input.focus();
      },
      listenerOptions
    )
  );
  enable.addEventListener(
    'click',
    () => {
      void load();
    },
    listenerOptions
  );
  stop.addEventListener('click', cancel, listenerOptions);
  clear.addEventListener(
    'click',
    () => {
      cancel();
      if (conversation) conversation.clear();
      else transcript.replaceChildren();
      turns = 0;
      topic = undefined;
      input.value = '';
      status.textContent =
        "Conversation cleared. Ask me about Tim's engineering work.";
      sync();
      input.focus();
    },
    listenerOptions
  );
  dialog?.addEventListener('close', cancel, listenerOptions);
  window.addEventListener('pagehide', cancel, listenerOptions);
  document.addEventListener(
    'astro:before-swap',
    () => {
      cancel();
      conversation?.destroy();
      lifecycle.abort();
      instances.delete(root);
    },
    { once: true, signal: lifecycle.signal }
  );
  sync();
}

function initialize() {
  document
    .querySelectorAll<HTMLElement>('[data-robot-host]')
    .forEach(setupRobotHost);
}
initialize();
document.addEventListener('astro:page-load', initialize);
