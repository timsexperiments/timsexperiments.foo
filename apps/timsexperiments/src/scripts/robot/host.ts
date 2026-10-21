import { createConversationView } from '../chat-view/presentation';
import { getEvidence } from './mcp';
import { selectGpuModel } from './gpu';
import {
  checkGeneratedAnswer,
  groundedContext,
  safeSourceLink,
  type Brief,
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
  let state: LocalState = 'off';
  let worker: Worker | undefined;
  let request: AbortController | undefined;
  let retrievalTarget: HTMLElement | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let run = 0;
  let turns = 0;
  let previousQuestion = '';
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
    message = 'Local AI is off. Published evidence is still available.'
  ) {
    worker?.terminate();
    worker = undefined;
    if (deadline) clearTimeout(deadline);
    deadline = undefined;
    finishPending('AI answer stopped. The published evidence remains below.');
    state = 'off';
    aiStatus.textContent = message;
    status.textContent =
      'Local AI is off. You can search the published records.';
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
        'Evidence search stopped. Submit the question again to retry.';
    retrievalTarget = undefined;
    release();
    status.textContent = 'Stopped. You can ask another question.';
    sync();
  }
  function node(tag: string, text: string, className?: string) {
    const value = document.createElement(tag);
    value.textContent = text;
    if (className) value.className = className;
    return value;
  }
  function recordCard(record: EvidenceRecord) {
    const disclosure = document.createElement('details');
    disclosure.className = 'robot-source';
    const summary = document.createElement('summary');
    summary.append(
      node('span', record.title),
      node('small', `${record.company} · ${record.dates}`)
    );
    disclosure.append(summary, node('p', record.summary));
    const details = document.createElement('ul');
    record.details.forEach((detail) => details.append(node('li', detail)));
    disclosure.append(details, node('h5', 'Qualifications'));
    if (record.qualifications.length) {
      const qualifications = document.createElement('ul');
      record.qualifications.forEach((item) =>
        qualifications.append(node('li', item))
      );
      disclosure.append(qualifications);
    } else
      disclosure.append(
        node('p', 'No additional qualifications are listed in this record.')
      );
    disclosure.append(
      node('p', `Source: ${record.source}`, 'robot-source-note'),
      node('code', record.url)
    );
    record.links.forEach((link) => {
      const href = safeSourceLink(link);
      if (!href) return;
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.textContent = href;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      disclosure.append(anchor);
    });
    return disclosure;
  }
  function renderBrief(container: HTMLElement, brief: Brief) {
    container.append(
      node('h4', 'Published evidence'),
      node('p', brief.opening, 'robot-opening')
    );
    if (brief.status === 'evidence_found') {
      container.append(
        node(
          'p',
          "Search matches may not confirm your question's premise. Open each source for full details, dates, and qualifications.",
          'robot-source-note'
        )
      );
      brief.evidence.forEach((record) => container.append(recordCard(record)));
    } else
      container.append(
        node(
          'p',
          'I could not establish that detail from the published records. Ask about a specific project, or confirm the detail with Tim.'
        )
      );
    container.append(
      node(
        'p',
        `Retrieved ${new Date().toLocaleString()}. Source dates and qualifications apply.`,
        'robot-source-note'
      )
    );
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
                answer ??
                'The local AI could not support its answer with these sources. Read the published evidence below.';
              pending = undefined;
            }
            state = 'ready';
            status.textContent = accepted
              ? 'Answer complete. Check the source qualifications below.'
              : 'AI answer withheld. The published evidence is available below.';
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
    result.textContent = 'Reading published evidence…';
    retrievalTarget = result;
    turn.append(result);
    conversation?.beforeTurn();
    transcript.append(turn);
    if (!conversation) transcript.scrollTop = turn.offsetTop;
    turns += 1;
    const controller = new AbortController();
    request = controller;
    const token = ++run;
    const timeout = setTimeout(() => controller.abort(), 20000);
    status.textContent = 'Reading the published experience records…';
    sync();
    // Carry only the last visitor question for explicit short follow-ups, never model output.
    const followup =
      /^(and\b|what about\b|how about\b|tell me more\b|why\??$|what else\??$)/i.test(
        trimmed
      );
    const retrievalQuestion =
      followup && previousQuestion
        ? `${trimmed}\nPrevious topic: ${previousQuestion.slice(0, 300)}`
        : trimmed;
    try {
      const brief = await getEvidence(retrievalQuestion, controller.signal);
      if (token !== run) return;
      if (!followup) previousQuestion = trimmed;
      retrievalTarget = undefined;
      result.replaceChildren();
      const evidence = document.createElement('section');
      evidence.className = 'robot-evidence';
      renderBrief(evidence, brief);
      result.append(evidence);
      status.textContent = 'Published evidence is ready.';
      const context = groundedContext(brief);
      if (state === 'ready' && worker && context) {
        const ai = document.createElement('section');
        ai.className = 'robot-ai-answer';
        const answer = node('p', 'Preparing a short answer on your device…');
        ai.append(
          node('h4', 'AI answer · generated on this device'),
          answer,
          node(
            'small',
            'Experimental. A source ID does not prove a claim. Check the complete records below.'
          )
        );
        result.prepend(ai);
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
          question: retrievalQuestion,
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
            "These records exceed the local model's context budget. The full evidence is available below; try a narrower project question.",
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
          'I could not retrieve the published evidence. Check your connection and submit this question again.'
        )
      );
      status.textContent = 'Evidence unavailable. Retry your question.';
    } finally {
      clearTimeout(timeout);
      if (request === controller) request = undefined;
      if (token === run && !conversation) transcript.scrollTop = turn.offsetTop;
      sync();
    }
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void ask(input.value);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  chips.forEach((chip) =>
    chip.addEventListener('click', () => {
      input.value = chip.dataset.prompt ?? chip.textContent?.trim() ?? '';
      void ask(input.value);
    })
  );
  enable.addEventListener('click', () => {
    void load();
  });
  stop.addEventListener('click', cancel);
  clear.addEventListener('click', () => {
    cancel();
    if (conversation) conversation.clear();
    else transcript.replaceChildren();
    turns = 0;
    previousQuestion = '';
    input.value = '';
    status.textContent =
      "Conversation cleared. Ask me about Tim's engineering work.";
    sync();
    input.focus();
  });
  dialog?.addEventListener('close', cancel);
  window.addEventListener('pagehide', cancel);
  document.addEventListener(
    'astro:before-swap',
    () => {
      cancel();
      conversation?.destroy();
      window.removeEventListener('pagehide', cancel);
    },
    { once: true }
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
