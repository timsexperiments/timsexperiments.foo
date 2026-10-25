import { localModel } from './model';
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
  const chips = root.querySelectorAll<HTMLButtonElement>('[data-question]');
  const dialog = root.closest('dialog');
  const firmware = document.querySelectorAll<HTMLElement>(
    '[data-robot-firmware]'
  )[0];
  const firmwareText = firmware?.querySelector('[data-firmware-status]');
  const firmwareProgress = firmware?.querySelector('progress');
  const firmwareReturn = firmware?.querySelector('[data-open-station]');
  const firmwareCancel = firmware?.querySelector('[data-firmware-cancel]');
  const firmwareDismiss = firmware?.querySelector('[data-firmware-dismiss]');
  const explore = root.querySelector('[data-robot-explore]');
  const labDialogs = [
    ...document.querySelectorAll<HTMLDialogElement>('.lab-dialog'),
  ];
  const voice = createRobotVoice(root);
  const lifecycle = new AbortController();
  const listenerOptions = { signal: lifecycle.signal };
  let state: LocalState = 'off';
  let worker: Worker | undefined;
  let request: AbortController | undefined;
  let retrievalTarget: HTMLElement | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let run = 0;
  // Loading belongs to the page, independently of dialogue/session invalidation.
  let loadRun = 0;
  let readyDismissed = false;
  let away = false;
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
    root.dataset.limit = String(atLimit);
    // Keep keyboard focus in the composer before Send is disabled.
    const limitClear = root.querySelector<HTMLElement>('[data-limit-clear]');
    if (
      atLimit &&
      (document.activeElement === send || document.activeElement === input)
    )
      (limitClear ?? clear).focus({ preventScroll: true });
    else if (busy && document.activeElement === send)
      input.focus({ preventScroll: true });
    enable.removeAttribute('data-initial-focus');
    input.removeAttribute('data-initial-focus');
    if (explore instanceof HTMLElement)
      explore.removeAttribute('data-initial-focus');
    limitClear?.removeAttribute('data-initial-focus');
    const initial = atLimit
      ? (limitClear ?? clear)
      : state === 'ready' || state === 'generating'
        ? input
        : state === 'loading' && explore instanceof HTMLElement
          ? explore
          : enable;
    initial.setAttribute('data-initial-focus', '');
    if (root.dataset.error === 'true') {
      enable.removeAttribute('data-initial-focus');
      root
        .querySelector('[data-open-station]')
        ?.setAttribute('data-initial-focus', '');
    } else
      root
        .querySelector('[data-open-station]')
        ?.removeAttribute('data-initial-focus');
    const hostLine = root.querySelector('[data-host-line]');
    const nextHostLine =
      root.dataset.error === 'true'
        ? "Oh dear. My language module couldn't start. Tim's articles and contact desk are still open."
        : state === 'loading'
          ? 'Installing firmware. Do have a look around the lab while I finish.'
          : state === 'ready' || state === 'generating'
            ? 'All in order. What would you like to know about Tim?'
            : "Good evening. I can tell you about Tim's work once my language module is ready.";
    if (hostLine && hostLine.textContent !== nextHostLine)
      hostLine.textContent = nextHostLine;
    const restoreNotice = root.querySelector<HTMLElement>(
      '[data-restore-notice]'
    );
    if (restoreNotice) restoreNotice.hidden = state !== 'off' || turns === 0;
    const percentage = root.querySelector('[data-progress-label]');
    if (percentage)
      percentage.textContent = `${Math.round(progress.value * 100)}%`;
    send.disabled = state !== 'ready' || busy || atLimit;
    input.disabled = atLimit;
    input.readOnly = busy;
    chips.forEach((chip) => {
      chip.disabled = busy || atLimit;
    });
    enable.disabled = state !== 'off' || busy || atLimit;
    enable.textContent =
      state === 'off'
        ? 'Start chat'
        : state === 'loading'
          ? 'Installing firmware…'
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
    if (explore instanceof HTMLElement) explore.hidden = state !== 'loading';
    syncFirmware();
    // Technical failures belong to Details. This is never a second live region.
    aiStatus.hidden = root.dataset.error !== 'true';
    const retryModel = root.querySelector<HTMLElement>('[data-model-retry]');
    if (retryModel) retryModel.hidden = root.dataset.error !== 'true';
    clear.hidden = turns === 0 && !pending && !request;
    clear.disabled = false;
    transcript.setAttribute(
      'aria-busy',
      String(Boolean(request) || state === 'generating')
    );
    if (!busy && atLimit)
      status.textContent =
        "That's twelve questions. Shall we start a fresh chat?";
  }
  function syncFirmware() {
    if (!firmware) return;
    firmware.hidden =
      away ||
      labDialogs.some((panel) => panel.open) ||
      (state !== 'loading' && (state !== 'ready' || readyDismissed));
    if (firmwareText)
      firmwareText.textContent =
        state === 'loading'
          ? `Host firmware · ${Math.round(progress.value * 100)}%`
          : 'Host ready · Talk';
    if (firmwareProgress instanceof HTMLProgressElement) {
      firmwareProgress.hidden = state !== 'loading';
      firmwareProgress.value = progress.value;
    }
    if (firmwareCancel instanceof HTMLElement)
      firmwareCancel.hidden = state !== 'loading';
    if (firmwareDismiss instanceof HTMLElement)
      firmwareDismiss.hidden = state !== 'ready';
  }
  function finishPending(message: string) {
    if (pending) {
      pending.target.textContent = message;
      pending = undefined;
    }
  }
  function release(message?: string) {
    root.dataset.error = String(message !== undefined);
    ++loadRun;
    worker?.terminate();
    worker = undefined;
    if (deadline) clearTimeout(deadline);
    deadline = undefined;
    finishPending(
      'Stopped. Your question was not saved. Start the model and send it again to retry.'
    );
    state = 'off';
    aiStatus.textContent = message ?? '';
    if (message)
      status.textContent =
        "My language module couldn't start. Read articles or contact Tim. Technical details are in Settings.";
    if (!message) status.textContent = 'Start chat when you are ready.';
    const restoreFocus =
      document.activeElement === stop ||
      document.activeElement === unload ||
      document.activeElement === explore ||
      (message !== undefined && document.activeElement === input);
    const restoreLabFocus =
      document.activeElement === firmwareCancel ||
      document.activeElement === firmwareReturn ||
      document.activeElement === firmwareDismiss;
    sync();
    if (
      restoreFocus &&
      dialog?.open &&
      message &&
      root.dataset.settings === 'true'
    ) {
      root
        .querySelector<HTMLElement>('[data-chat-options]')
        ?.focus({ preventScroll: true });
    } else if (restoreFocus && dialog?.open) {
      conversation?.beforeTurn();
      const recovery = root.querySelector<HTMLElement>('[data-open-station]');
      (message && recovery ? recovery : enable).focus({ preventScroll: true });
    } else if (restoreLabFocus) focusLab();
  }
  function cancel() {
    const fromFirmware = document.activeElement === firmwareCancel;
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
    if (fromFirmware) focusLab();
  }
  function focusLab() {
    const canvas = document.querySelectorAll<HTMLElement>('#campus-canvas')[0];
    const station = document.querySelectorAll<HTMLElement>(
      '.station-button[data-open-station="robot"]'
    )[0];
    (canvas && !canvas.inert ? canvas : station)?.focus();
  }
  async function load() {
    if (state !== 'off') return;
    state = 'loading';
    root.dataset.error = 'false';
    readyDismissed = false;
    aiStatus.dataset.touched = 'true';
    const consent = root.querySelector('[data-ai-consent]');
    if (consent instanceof HTMLDetailsElement) consent.open = false;
    aiStatus.textContent = 'Installing firmware · 0%';
    status.textContent = 'Do have a look around while I get ready.';
    progress.value = 0;
    sync();
    if (explore instanceof HTMLElement) explore.focus();
    else stop.focus();
    const token = ++loadRun;
    try {
      if (!window.isSecureContext || !('gpu' in navigator) || !navigator.gpu)
        throw new Error(
          'WebGPU needs a supported browser and a secure connection.'
        );
      const model = await selectGpuModel(navigator.gpu);
      if (token !== loadRun) return;
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
            if (state !== 'loading') return;
            progress.value = Math.min(1, Math.max(0, message.progress));
            aiStatus.textContent = `Installing firmware · ${Math.round(progress.value * 100)}%`;
            sync();
            break;
          case 'ready': {
            if (state !== 'loading') return;
            // Capture before sync hides controls and the browser can blur them.
            const restoreInputFocus =
              dialog?.open &&
              (document.activeElement === stop ||
                document.activeElement === explore);
            const restoreFirmwareFocus =
              document.activeElement === firmwareCancel;
            if (deadline) clearTimeout(deadline);
            deadline = undefined;
            state = 'ready';
            readyDismissed = Boolean(dialog?.open);
            status.textContent = 'All in order. What would you like to know?';
            aiStatus.textContent = `Local AI ready · ${localModel.name} · f16. Ask a question to use it.`;
            sync();
            if (restoreInputFocus) {
              if (
                root.dataset.settings === 'true' &&
                unload instanceof HTMLElement
              )
                unload.focus({ preventScroll: true });
              else input.focus({ preventScroll: true });
            } else if (
              restoreFirmwareFocus &&
              firmware &&
              !firmware.hidden &&
              firmwareReturn instanceof HTMLElement
            )
              firmwareReturn.focus();
            break;
          }
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
              ? ''
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
      aiStatus.textContent = 'Installing firmware · 0%';
      current.postMessage({ kind: 'load', model });
      deadline = setTimeout(
        () =>
          release(
            'Model loading timed out. Use Start to retry on a faster connection.'
          ),
        10 * 60 * 1000
      );
    } catch (error) {
      if (token !== loadRun) return;
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
      node('h3', 'Host', 'robot-speaker')
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
    status.textContent = 'Welcome back. Shall I start my module again?';
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
    result.textContent = "Let me consult Tim's records…";
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
      result.textContent = "Let me consult Tim's records…";
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
  root.querySelector('[data-model-retry]')?.addEventListener(
    'click',
    () => {
      conversation?.beforeTurn();
      void load();
    },
    listenerOptions
  );
  stop.addEventListener('click', cancel, listenerOptions);
  firmwareCancel?.addEventListener('click', cancel, listenerOptions);
  firmwareDismiss?.addEventListener(
    'click',
    () => {
      readyDismissed = true;
      // The dismiss control is about to disappear. Restore a visible lab target.
      focusLab();
      syncFirmware();
    },
    listenerOptions
  );
  unload?.addEventListener('click', cancel, listenerOptions);
  function invalidatePresentation() {
    if (presentationInvalidated) return;
    presentationInvalidated = true;
    activeSessionId = undefined;
    if (state === 'loading') ++run;
    else cancel();
    voice.clear();
    savedTurns.splice(0);
    turns = 0;
    status.textContent = 'Chat cleared or replaced. Start chat again.';
    sync();
  }
  function resetConversation(clearSaved = true, preserveModel = false) {
    const keepModel =
      preserveModel && (state === 'ready' || state === 'loading') && !request;
    if (!keepModel) cancel();
    else ++run;
    voice.clear();
    activeSessionId = undefined;
    presentationInvalidated = false;
    root.dataset.error = 'false';
    if (clearSaved) savedChat?.clear();
    if (conversation) conversation.clear();
    else {
      transcript.replaceChildren();
      if (greeting) transcript.append(greeting.cloneNode(true));
    }
    turns = 0;
    savedTurns.splice(0);
    input.value = '';
    if (!keepModel) {
      delete aiStatus.dataset.touched;
      aiStatus.textContent = '';
      progress.value = 0;
    }
    const consent = root.querySelector('[data-ai-consent]');
    if (consent instanceof HTMLDetailsElement) consent.open = false;
    status.textContent = "Ask me about Tim's engineering work.";
    sync();
  }
  root.querySelector('[data-limit-clear]')?.addEventListener(
    'click',
    () => {
      resetConversation();
      enable.focus();
    },
    listenerOptions
  );
  clear.addEventListener(
    'click',
    () => {
      resetConversation();
      enable.focus();
    },
    listenerOptions
  );
  let wasOpen = dialog?.open ?? false;
  // The shell calls native close() for button, Escape, backdrop and station
  // switches. Observe removal too, since changing `open` alone emits no close.
  const observeDialog = () => {
    if (!dialog) return;
    if (wasOpen && !dialog.open && !away) resetConversation(true, true);
    wasOpen = dialog.open;
    if (wasOpen) readyDismissed = true;
    syncFirmware();
  };
  // Native close events are queued. The shell provides a synchronous boundary
  // so a close/reopen in the same task still clears the old conversation once.
  dialog?.addEventListener(
    'lab:before-close',
    () => {
      if (!away) resetConversation(true, true);
      wasOpen = false;
    },
    listenerOptions
  );
  dialog?.addEventListener('close', observeDialog, listenerOptions);
  const dialogObserver = new MutationObserver(observeDialog);
  if (dialog)
    dialogObserver.observe(dialog, {
      attributes: true,
      attributeFilter: ['open'],
    });
  const firmwareObserver = new MutationObserver(syncFirmware);
  labDialogs.forEach((panel) =>
    firmwareObserver.observe(panel, {
      attributes: true,
      attributeFilter: ['open'],
    })
  );
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
        sync();
      }
    },
    listenerOptions
  );
  function dispose() {
    cancel();
    dialogObserver.disconnect();
    firmwareObserver.disconnect();
    conversation?.destroy();
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
