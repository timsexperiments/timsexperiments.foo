import {
  archiveReceiptSchema,
  type ConversationTurn,
} from '../../lib/conversations/protocol';
import { activeChatKey, parseActiveChat, type ActiveChat } from './active-chat';

// Storage events reach other documents only. This bus covers controllers in
// this document without copying transcripts between them.
const activeChatChanges = new EventTarget();
const maxAutomaticRetries = 3;
const maxRetryDelay = 2147483647;
function retryDelay(value: string | null) {
  const seconds = value === null || value.trim() === '' ? NaN : Number(value);
  const delay = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(value ?? '') - Date.now();
  return Number.isFinite(delay)
    ? Math.max(1000, Math.min(delay, maxRetryDelay))
    : 2000;
}

/** Local refresh persistence and best-effort, write-only archiving for Tim. */
export function createSavedChat(
  root: HTMLElement,
  options: {
    restore: (turns: ConversationTurn[]) => void;
    changed: () => void;
  }
) {
  const status = root.querySelector<HTMLElement>('[data-history-status]');
  const retry = root.querySelector<HTMLButtonElement>('[data-history-retry]');
  const events = new AbortController();
  let current: ActiveChat | undefined;
  let sessionId: string | undefined;
  let localId: string | undefined;
  let invalidated = false;
  let epoch = 0;
  let disposed = false;
  let suspended = false;
  let dirty = false;
  let manualRetry = false;
  let localAvailable = true;
  let failures = 0;
  let retryAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let retryAttempt: ActiveChat | undefined;
  let flight:
    | {
        controller: AbortController;
        payload: ActiveChat;
        timeout: ReturnType<typeof setTimeout>;
      }
    | undefined;
  let message = 'No replies yet.';

  function sync() {
    if (status)
      status.textContent = localAvailable
        ? message
        : `${message} Browser storage is unavailable; refresh may lose replies or show an older chat.`;
    if (retry) {
      retry.hidden = !manualRetry;
      retry.disabled = suspended || Date.now() < retryAt;
      retry.textContent = 'Retry archive';
    }
    options.changed();
  }
  function persist() {
    if (!current || !ownsLocal()) return false;
    try {
      localStorage.setItem(activeChatKey, JSON.stringify(current));
      localId = current.id;
      localAvailable = true;
      activeChatChanges.dispatchEvent(new Event('change'));
    } catch {
      localAvailable = false;
    }
    return true;
  }
  function removeLocal() {
    try {
      localStorage.removeItem(activeChatKey);
    } catch {
      localAvailable = false;
    }
    activeChatChanges.dispatchEvent(new Event('remove'));
  }
  function cancelTimer() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  }
  function stopFlight() {
    if (!flight) return;
    clearTimeout(flight.timeout);
    flight.controller.abort();
    flight = undefined;
  }
  function reset() {
    ++epoch;
    cancelTimer();
    stopFlight();
    current = undefined;
    sessionId = undefined;
    localId = undefined;
    retryAttempt = undefined;
    dirty = false;
    manualRetry = false;
    failures = 0;
    retryAt = 0;
  }
  function invalidate() {
    if (disposed || invalidated || !sessionId) return;
    reset();
    invalidated = true;
    message =
      'This chat was cleared or replaced in this browser. Your next question starts a new chat; archived replies remain with Tim.';
    sync();
  }
  function readLocalId() {
    const stored = localStorage.getItem(activeChatKey);
    return stored === null ? undefined : parseActiveChat(stored)?.id;
  }
  function ownsLocal() {
    if (invalidated || disposed) return false;
    if (sessionId) {
      try {
        if (readLocalId() !== localId) invalidate();
      } catch {
        // Storage denial must not prevent local answers or best-effort PUTs.
        localAvailable = false;
      }
    }
    return !invalidated;
  }
  function isCurrent(token: number) {
    return token === epoch && !disposed && !suspended && ownsLocal();
  }
  function schedule() {
    if (timer !== undefined || disposed || suspended || !ownsLocal()) return;
    timer = setTimeout(
      () => {
        timer = undefined;
        sync();
        flush();
      },
      Math.max(0, retryAt - Date.now())
    );
  }
  function flush() {
    if (
      disposed ||
      suspended ||
      !ownsLocal() ||
      flight ||
      !current ||
      !dirty ||
      manualRetry
    )
      return;
    if (Date.now() < retryAt) {
      schedule();
      return;
    }
    const token = epoch;
    const payload = structuredClone(retryAttempt ?? current);
    const controller = new AbortController();
    const attempt = {
      controller,
      payload,
      timeout: setTimeout(() => controller.abort(), 12000),
    };
    flight = attempt;
    message = 'Archiving…';
    sync();
    void (async () => {
      try {
        const response = await fetch('/api/conversations', {
          method: 'PUT',
          credentials: 'same-origin',
          mode: 'same-origin',
          redirect: 'error',
          cache: 'no-store',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!isCurrent(token)) {
          await response.body?.cancel();
          return;
        }
        if (!response.ok) {
          await response.body?.cancel();
          if (!isCurrent(token)) return;
          if (response.status === 429) {
            retryAttempt = undefined;
            retryAt =
              Date.now() + retryDelay(response.headers.get('Retry-After'));
            failures += 1;
            manualRetry = failures >= maxAutomaticRetries;
            message = manualRetry
              ? 'Archiving is busy. This chat is still here; you can retry later.'
              : 'Archiving is busy. This chat is still here; retrying shortly.';
            schedule(); // Enable manual retry only after Retry-After.
            return;
          }
          throw new Error('Archive unavailable');
        }
        const receipt = archiveReceiptSchema.parse(await response.json());
        if (!isCurrent(token) || !current) return;
        if (receipt.revision < payload.revision)
          throw new Error('Invalid archive revision');
        current.revision = receipt.revision;
        retryAttempt = undefined;
        failures = 0;
        retryAt = 0;
        dirty = JSON.stringify(current.turns) !== JSON.stringify(payload.turns);
        if (!persist()) return;
        message = '✓ Archived';
      } catch {
        if (!isCurrent(token)) return;
        // A lost response may follow a committed write. Retry that exact request
        // before sending newer text, so the backend can acknowledge it idempotently.
        retryAttempt = payload;
        manualRetry = true;
        message = 'Archiving is unavailable. This chat is still here.';
      } finally {
        clearTimeout(attempt.timeout);
        if (flight === attempt) flight = undefined;
        if (isCurrent(token)) {
          sync();
          flush();
        }
      }
    })();
  }
  function ensureSession() {
    if (!sessionId) {
      try {
        localId = readLocalId();
      } catch {
        localAvailable = false;
      }
      sessionId = crypto.randomUUID();
    }
    return sessionId;
  }
  function start(resetHost?: () => void) {
    if (disposed || suspended) return;
    ownsLocal();
    // Only an explicit question may replace an invalidated session. save() and
    // archive callbacks cannot silently reclaim its old UUID.
    if (invalidated) resetHost?.();
    invalidated = false;
    return ensureSession();
  }
  function save(turns: ConversationTurn[]) {
    if (disposed || suspended || !ownsLocal()) return;
    const serialized = JSON.stringify({
      id: ensureSession(),
      revision: current?.revision ?? 0,
      turns,
    });
    const parsed = parseActiveChat(serialized);
    if (!parsed) {
      message =
        'This reply could not be stored. The conversation is still here.';
      sync();
      return;
    }
    current = parsed;
    // Refresh recovery never waits for the archive service.
    if (!persist()) return;
    dirty = true;
    sync();
    flush();
  }
  function clear() {
    if (disposed) return;
    reset();
    invalidated = false;
    removeLocal();
    message = 'Archive kept.';
    sync();
  }
  activeChatChanges.addEventListener('change', ownsLocal, {
    signal: events.signal,
  });
  activeChatChanges.addEventListener('remove', invalidate, {
    signal: events.signal,
  });
  window.addEventListener(
    'storage',
    (event) => {
      if (event.storageArea !== null && event.storageArea !== localStorage)
        return;
      if (event.key !== null && event.key !== activeChatKey) return;
      // Events can be queued across a fresh explicit question. Compare the
      // live identity so an older event cannot invalidate that newer session.
      ownsLocal();
    },
    { signal: events.signal }
  );
  retry?.addEventListener(
    'click',
    () => {
      if (disposed || suspended || !ownsLocal() || Date.now() < retryAt) return;
      manualRetry = false;
      failures = 0;
      flush();
    },
    { signal: events.signal }
  );

  try {
    const stored = localStorage.getItem(activeChatKey);
    if (stored !== null) {
      current = parseActiveChat(stored);
      if (current) {
        sessionId = current.id;
        localId = current.id;
        options.restore(structuredClone(current.turns));
        message = 'Restored locally.';
      } else removeLocal();
    }
  } catch {
    localAvailable = false;
  }
  sync();
  return {
    start,
    save,
    clear,
    get invalidated() {
      return invalidated;
    },
    needsReset() {
      ownsLocal();
      return invalidated;
    },
    suspend() {
      if (disposed || suspended) return;
      suspended = true;
      ++epoch;
      cancelTimer();
      if (flight) retryAttempt = flight.payload;
      stopFlight();
    },
    resume() {
      if (disposed || !suspended) return;
      suspended = false;
      if (!ownsLocal()) return;
      sync();
      if (Date.now() < retryAt) schedule();
      flush();
    },
    destroy() {
      disposed = true;
      ++epoch;
      cancelTimer();
      stopFlight();
      events.abort();
    },
  };
}
