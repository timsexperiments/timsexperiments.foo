import { localModel } from './model';
import { createExperienceExplorer } from './explorer';
import { createSavedChat } from './history';
import type { ConversationTurn } from '../../lib/conversations/protocol';
import { createDialogueView } from './dialogue-view';
import { renderSavedAnswer, textNode as node } from '../chat-view/evidence';
import { selectGpuModel } from './gpu';
import { conversationContext, conversationalReply } from './conversation';
import { createRobotVoice } from './voice';
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
  const unload = root.querySelector('[data-model-off]');
  const clear = element('[data-clear]', HTMLButtonElement);
  const status = element('[data-status]', HTMLElement);
  const aiStatus = element('[data-ai-status]', HTMLElement);
  const progress = element('progress', HTMLProgressElement);
  const transcript = element('[data-transcript]', HTMLElement);
  const greeting = transcript.firstElementChild?.cloneNode(true);
  const conversation = root.matches('[data-chat-view]')
    ? createDialogueView(root)
    : undefined;
  const explorer = createExperienceExplorer(root, () => {
    cancel();
    conversation?.beforeTurn();
  });
  const chips = root.querySelectorAll<HTMLButtonElement>('[data-question]');
  const dialog = root.closest('dialog');
  const voice = createRobotVoice(root);
  const lifecycle = new AbortController();
  const listenerOptions = { signal: lifecycle.signal };
  let state: LocalState = 'off';
  let worker: Worker | undefined;
  let request: AbortController | undefined;
  let retrievalTarget: HTMLElement | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let run = 0;
  let turns = 0;
  let activeSessionId: string | undefined;
  let presentationInvalidated = false;
  const savedTurns: ConversationTurn[] = [];
  let savedChat: ReturnType<typeof createSavedChat> | undefined;
  let pending:
    | {
        target: HTMLElement;
        savedTurn: ConversationTurn;
        sessionId: string;
      }
    | undefined;

  function sync() {
    root.dataset.modelState = state;
    const modelBusy =
      Boolean(request) || state === 'generating' || state === 'loading';
    const busy = modelBusy;
    const atLimit = turns >= 12 && !savedChat?.invalidated;
    send.disabled = state !== 'ready' || busy || atLimit;
    input.disabled = atLimit;
    input.readOnly = busy;
    chips.forEach((chip) => {
      chip.disabled = busy || atLimit;
    });
    enable.disabled = state !== 'off' || busy || atLimit;
    enable.textContent =
      state === 'off'
        ? `Download and start chat · ${localModel.download}`
        : state === 'loading'
          ? 'Loading local AI…'
          : 'Local AI enabled';
    stop.hidden = !modelBusy;
    stop.textContent =
      state === 'loading'
        ? 'Cancel download'
        : state === 'generating'
          ? 'Stop answer'
          : request
            ? 'Cancel search'
            : 'Turn off local AI';
    progress.hidden = state !== 'loading';
    aiStatus.hidden =
      state === 'ready' ||
      state === 'generating' ||
      (state === 'off' && !aiStatus.dataset.touched);
    clear.hidden = turns === 0 && !pending && !request;
    clear.disabled = false;
    transcript.setAttribute(
      'aria-busy',
      String(Boolean(request) || state === 'generating')
    );
    if (!busy && atLimit)
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
    message = 'Start the local model to talk. You can also read Tim’s work or contact him below.'
  ) {
    worker?.terminate();
    worker = undefined;
    if (deadline) clearTimeout(deadline);
    deadline = undefined;
    finishPending(
      'Stopped. Your question was not saved. Start the model and send it again to retry.'
    );
    state = 'off';
    aiStatus.textContent = message;
    status.textContent = 'Start the local model to talk.';
    const restoreFocus =
      document.activeElement === stop || document.activeElement === unload;
    sync();
    if (restoreFocus && dialog?.open) {
      conversation?.beforeTurn();
      enable.focus();
    }
  }
  function cancel() {
    voice.cancel();
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
    explorer?.hide();
    state = 'loading';
    aiStatus.dataset.touched = 'true';
    const consent = root.querySelector('[data-ai-consent]');
    if (consent instanceof HTMLDetailsElement) consent.open = false;
    aiStatus.textContent = "Checking this browser's GPU…";
    status.textContent = 'Preparing local AI. You can cancel the download.';
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
            `Local AI could not start: ${event.message.slice(0, 500) || 'Worker script or one of its imports failed to load.'} Use Start to retry, or read Tim’s work below.`
          );
      };
      current.onmessage = (event: MessageEvent<unknown>) => {
        if (worker !== current) return;
        const result = workerReply.safeParse(event.data);
        if (!result.success) {
          release('Local AI returned an invalid response. Use Start to retry.');
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
            aiStatus.textContent = `Local AI ready · ${localModel.name} · f16. Ask a question to use it.`;
            sync();
            if (document.activeElement === stop) input.focus();
            break;
          case 'answer': {
            // Read live storage too: cross-tab storage events may arrive late.
            if (
              !pending ||
              savedChat?.needsReset() ||
              pending.sessionId !== activeSessionId
            ) {
              invalidatePresentation();
              return;
            }
            if (deadline) clearTimeout(deadline);
            let accepted = false;
            if (pending) {
              const answer = conversationalReply(message.text);
              accepted = answer !== undefined;
              const completed = pending;
              pending = undefined;
              completed.target.replaceChildren();
              if (answer) {
                completed.savedTurn.paragraphs = [answer];
                const updated = [...savedTurns, completed.savedTurn];
                savedChat?.save(updated);
                if (
                  savedChat?.invalidated ||
                  completed.sessionId !== activeSessionId
                ) {
                  invalidatePresentation();
                  return;
                }
                renderReply(completed.target, completed.savedTurn);
                savedTurns.push(completed.savedTurn);
                turns += 1;
                voice.accept(answer);
                input.value = '';
              } else {
                completed.target.textContent =
                  'The model could not finish a usable reply. Please try again or contact Tim below.';
              }
            }
            state = 'ready';
            status.textContent = accepted
              ? 'AI reply · confirm important details with Tim.'
              : 'Reply unavailable. Your question was not saved. Try again.';
            sync();
            break;
          }
          case 'error':
            release(
              `Local AI ${message.stage} failed: ${message.message} Use Start to retry, or contact Tim below.`
            );
            break;
        }
      };
      aiStatus.textContent = `Downloading and preparing ${localModel.name} f16 on this device…`;
      current.postMessage({ kind: 'load', model });
      deadline = setTimeout(
        () =>
          release(
            'Model loading timed out. Use Start to retry on a faster connection.'
          ),
        10 * 60 * 1000
      );
    } catch (error) {
      if (token !== run) return;
      release(
        error instanceof Error
          ? error.message
          : 'Local AI is unavailable. Read Tim’s work or contact him below.'
      );
    }
  }
  function appendTurn(question: string) {
    const turn = document.createElement('article');
    turn.className = 'robot-turn';
    turn.append(
      node('h3', 'You', 'robot-speaker'),
      node('p', question, 'robot-question'),
      node('h3', 'Lab robot', 'robot-speaker')
    );
    const result = document.createElement('div');
    turn.append(result);
    conversation?.beforeTurn();
    transcript.append(turn);
    if (!conversation) transcript.scrollTop = turn.offsetTop;
    return { turn, result };
  }

  function renderReply(container: HTMLElement, turn: ConversationTurn) {
    renderSavedAnswer(container, turn);
    const references = container.querySelector('.robot-evidence');
    if (!(references instanceof HTMLElement)) return;
    const children = [...container.children].filter(
      (child) => child !== references
    );
    container.replaceChildren(...children);
    const details = document.createElement('details');
    details.className = 'robot-reference-list';
    details.append(node('summary', 'Experiences referenced'), references);
    container.append(details);
  }

  function restoreSaved(restored: ConversationTurn[]) {
    cancel();
    if (conversation) conversation.clear();
    else transcript.replaceChildren();
    savedTurns.splice(0, savedTurns.length, ...structuredClone(restored));
    turns = 0;
    voice.clear();
    for (const saved of restored) {
      const { result } = appendTurn(saved.question);
      renderReply(result, saved);
      turns += 1;
    }
    const latest = restored.at(-1);
    if (latest) voice.accept(latest.paragraphs.join('\n\n'), false);
    status.textContent = 'Continued your active chat from this browser.';
    sync();
  }

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || trimmed.length > 600) {
      status.textContent = 'Enter a question up to 600 characters.';
      return;
    }
    if (savedChat?.needsReset()) resetConversation(false, true);
    if (request || state === 'generating' || turns >= 12) return;
    if (state === 'off') {
      status.textContent = 'Download and start the local model to talk.';
      return;
    }
    if (state === 'loading') {
      status.textContent =
        'Wait for the model or cancel its download, then ask your question.';
      return;
    }
    activeSessionId = savedChat?.start(() => resetConversation(false, true));
    if (!activeSessionId || state !== 'ready') return;
    voice.clear();
    const { turn, result } = appendTurn(trimmed);
    result.textContent = "Let me check Tim's experience…";
    retrievalTarget = result;
    const controller = new AbortController();
    request = controller;
    const token = ++run;
    status.textContent = 'Finding an answer on this device…';
    sync();
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      controller.signal.throwIfAborted();
      if (token !== run || state !== 'ready' || !worker) return;
      const selected = conversationContext(trimmed, savedTurns);
      retrievalTarget = undefined;
      result.textContent = 'Thinking on your device…';
      pending = {
        target: result,
        sessionId: activeSessionId,
        savedTurn: {
          question: trimmed,
          paragraphs: [],
          experienceIds: selected.ids,
        },
      };
      state = 'generating';
      worker.postMessage({
        kind: 'generate',
        question: trimmed,
        context: selected.context,
        turns: savedTurns.slice(-3),
      });
      deadline = setTimeout(
        () =>
          release(
            'The reply took too long. Use Start to retry, or contact Tim below.'
          ),
        120000
      );
      status.textContent = 'Thinking on your device. Stop is available.';
    } catch {
      if (token !== run) return;
      retrievalTarget = undefined;
      result.replaceChildren();
      result.append(
        node(
          'p',
          'I could not prepare a local reply. Please retry or contact Tim below.'
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
  unload?.addEventListener('click', cancel, listenerOptions);
  function invalidatePresentation() {
    if (presentationInvalidated) return;
    presentationInvalidated = true;
    activeSessionId = undefined;
    cancel();
    voice.clear();
    savedTurns.splice(0);
    turns = 0;
    status.textContent =
      'Chat cleared or replaced. Start chat again or explore experience.';
    sync();
  }
  function resetConversation(clearSaved = true, keepReady = false) {
    explorer?.hide();
    if (!keepReady || state !== 'ready') cancel();
    voice.clear();
    activeSessionId = undefined;
    presentationInvalidated = false;
    if (clearSaved) savedChat?.clear();
    if (conversation) conversation.clear();
    else {
      transcript.replaceChildren();
      if (greeting) transcript.append(greeting.cloneNode(true));
    }
    turns = 0;
    savedTurns.splice(0);
    input.value = '';
    delete aiStatus.dataset.touched;
    aiStatus.textContent = '';
    progress.value = 0;
    const consent = root.querySelector('[data-ai-consent]');
    if (consent instanceof HTMLDetailsElement) consent.open = false;
    status.textContent = "Ask me about Tim's engineering work.";
    sync();
  }
  clear.addEventListener(
    'click',
    () => {
      resetConversation();
      enable.focus();
    },
    listenerOptions
  );
  let away = false;
  let wasOpen = dialog?.open ?? false;
  // The shell calls native close() for button, Escape, backdrop and station
  // switches. Observe removal too, since changing `open` alone emits no close.
  const observeDialog = () => {
    if (!dialog) return;
    if (wasOpen && !dialog.open && !away) resetConversation();
    wasOpen = dialog.open;
  };
  dialog?.addEventListener('close', observeDialog, listenerOptions);
  const dialogObserver = new MutationObserver(observeDialog);
  if (dialog)
    dialogObserver.observe(dialog, {
      attributes: true,
      attributeFilter: ['open'],
    });
  window.addEventListener(
    'pagehide',
    (event) => {
      away = true;
      cancel();
      if (event.persisted) savedChat?.suspend();
      else dispose();
    },
    listenerOptions
  );
  window.addEventListener(
    'pageshow',
    (event) => {
      if (event.persisted) {
        away = false;
        wasOpen = dialog?.open ?? false;
        savedChat?.resume();
      }
    },
    listenerOptions
  );
  function dispose() {
    cancel();
    dialogObserver.disconnect();
    conversation?.destroy();
    explorer?.destroy();
    voice.destroy();
    savedChat?.destroy();
    lifecycle.abort();
    instances.delete(root);
  }
  document.addEventListener('astro:before-swap', dispose, {
    once: true,
    signal: lifecycle.signal,
  });
  savedChat = createSavedChat(root, {
    restore: restoreSaved,
    changed: () => {
      if (savedChat?.invalidated) invalidatePresentation();
      sync();
    },
  });
  sync();
}

function initialize() {
  document
    .querySelectorAll<HTMLElement>('[data-robot-host]')
    .forEach(setupRobotHost);
}
initialize();
document.addEventListener('astro:page-load', initialize);
