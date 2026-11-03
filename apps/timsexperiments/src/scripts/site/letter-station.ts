import { z } from 'zod';

const form = document.querySelector<HTMLFormElement>('#letter-form');
const send = document.querySelector<HTMLButtonElement>('#letter-send');
const status = document.querySelector<HTMLElement>('#letter-status');
const note = document.querySelector<HTMLElement>('#delivery-note');
const draft = document.querySelector<HTMLElement>('#letter-draft');
const success = document.querySelector<HTMLElement>('#letter-success');
const another = document.querySelector<HTMLButtonElement>('#letter-another');
const capability = z.object({ available: z.boolean() });
const receipt = z.object({ accepted: z.literal(true) });
const failure = z.object({ message: z.string().trim().min(1) });
const singleLine = (value: string) => !/[\u0000-\u001f\u007f]/.test(value);
const fields = [
  {
    name: 'message',
    schema: z.string().trim().min(10).max(6000),
    error: 'Write a message between 10 and 6,000 characters.',
  },
  {
    name: 'name',
    schema: z.string().trim().min(1).max(100).refine(singleLine),
    error: 'Enter your name, up to 100 characters on one line.',
  },
  {
    name: 'email',
    schema: z.string().trim().email().max(254).refine(singleLine),
    error: 'Enter a valid reply email, up to 254 characters.',
  },
];
const invalidFieldsStatus =
  'Check the highlighted fields. Your draft is still here.';
const unknownOutcome =
  'Delivery could not be confirmed. Your draft is still here. Press Send to retry. Retrying without edits within 24 hours avoids sending the same letter twice.';
let sending = false;
let requestId = crypto.randomUUID();
let previousDraft = '';
let requestedAt = 0;
const invalidFields = new Set<string>();

function setStatus(text: string, tone = 'info') {
  if (status) {
    status.textContent = text;
    status.dataset.tone = tone;
  }
}
function readDraft(data: FormData) {
  return {
    name: String(data.get('name') ?? ''),
    email: String(data.get('email') ?? ''),
    message: String(data.get('message') ?? ''),
  };
}
function draftText(data: FormData) {
  const value = readDraft(data);
  return `${value.message}\n\nFrom: ${value.name}\nReply to: ${value.email}`;
}
function fieldInput(field: (typeof fields)[number]) {
  return document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    `#letter-${field.name}`
  );
}
function markField(field: (typeof fields)[number], data: FormData) {
  const error = document.querySelector<HTMLElement>(
    `#letter-${field.name}-error`
  );
  const valid = field.schema.safeParse(
    String(data.get(field.name) ?? '')
  ).success;
  fieldInput(field)?.setAttribute('aria-invalid', String(!valid));
  if (error) {
    error.textContent = valid ? '' : field.error;
    error.hidden = valid;
  }
  if (valid) invalidFields.delete(field.name);
  else invalidFields.add(field.name);
  return valid;
}
function validate(data: FormData) {
  let firstInvalid: HTMLInputElement | HTMLTextAreaElement | null = null;
  for (const field of fields) {
    const valid = markField(field, data);
    if (!valid && !firstInvalid) firstInvalid = fieldInput(field);
  }
  firstInvalid?.focus();
  return !firstInvalid;
}
fetch('/api/contact', { headers: { Accept: 'application/json' } })
  .then(async (response) => {
    const raw: unknown = await response.json();
    const result = capability.safeParse(raw);
    if (note && response.ok && result.success && !result.data.available) {
      note.textContent =
        'Sending is temporarily unavailable. Keep your draft here and try again later, or copy the address.';
    }
  })
  .catch(() => {
    /* An advisory check must not prevent a direct retry. */
  });

// Typing stays quiet until a submit marks a field. Then the mark clears on the fix.
for (const field of fields) {
  fieldInput(field)?.addEventListener('input', () => {
    if (!form || !invalidFields.has(field.name)) return;
    markField(field, new FormData(form));
    if (!invalidFields.size && status?.textContent === invalidFieldsStatus)
      setStatus('');
  });
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (sending || (success && !success.hidden)) return;
  const data = new FormData(form);
  if (!validate(data)) {
    setStatus(invalidFieldsStatus, 'error');
    return;
  }
  const value = readDraft(data);
  const snapshot = JSON.stringify(value);
  if (
    snapshot !== previousDraft ||
    Date.now() - requestedAt >= 24 * 60 * 60 * 1000
  ) {
    requestId = crypto.randomUUID();
    previousDraft = snapshot;
    requestedAt = Date.now();
  }
  const body = {
    ...value,
    website: String(data.get('website') ?? ''),
    requestId,
  };
  sending = true;
  send?.setAttribute('aria-disabled', 'true');
  if (send) send.textContent = 'Sending…';
  setStatus('Sending to Tim…');
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(16000),
    });
    const raw: unknown = await response.json();
    if (response.ok && receipt.safeParse(raw).success) {
      if (note) note.textContent = 'Your email is used so Tim can reply.';
      // Editing remains available during the request and the accepted animation.
      const unchanged = () =>
        snapshot === JSON.stringify(readDraft(new FormData(form)));
      if (unchanged()) {
        setStatus('Accepted for delivery.');
        form.classList.add('accepted');
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
          await new Promise<void>((resolve) => setTimeout(resolve, 800));
        form.classList.remove('accepted');
      }
      previousDraft = '';
      requestId = crypto.randomUUID();
      if (unchanged()) {
        // The shorter card keeps the sheet's height so the centred panel holds still.
        form.style.minHeight = `${form.offsetHeight}px`;
        form.reset();
        if (draft) draft.hidden = true;
        if (success) success.hidden = false;
        setStatus('Accepted for delivery.');
        // Only move focus if it is about to be hidden with the submitted draft.
        if (draft?.contains(document.activeElement)) {
          // A visitor who scrolled down to Send still needs to see the result.
          success?.scrollIntoView({ block: 'nearest' });
          another?.focus();
        }
      } else {
        setStatus(
          'Your submitted letter was accepted for delivery. Your newer edits are still here.'
        );
      }
    } else {
      const message = failure.safeParse(raw);
      setStatus(
        message.success ? message.data.message : unknownOutcome,
        'error'
      );
    }
  } catch {
    setStatus(unknownOutcome, 'error');
  } finally {
    sending = false;
    send?.setAttribute('aria-disabled', 'false');
    if (send) send.textContent = 'Send';
    form.classList.remove('accepted');
  }
});
another?.addEventListener('click', () => {
  if (form) form.style.minHeight = '';
  if (success) success.hidden = true;
  if (draft) draft.hidden = false;
  setStatus('');
  document.querySelector<HTMLTextAreaElement>('#letter-message')?.focus();
});
document.querySelector('#letter-copy')?.addEventListener('click', async () => {
  if (!form) return;
  try {
    await navigator.clipboard.writeText(draftText(new FormData(form)));
    setStatus('Letter copied.');
  } catch {
    setStatus(
      'Copy is unavailable here. Select the message and copy it manually.',
      'error'
    );
  }
});
document
  .querySelector('#letter-copy-address')
  ?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('hello@timsexperiments.foo');
      setStatus('Address copied.');
    } catch {
      setStatus(
        'Copy is unavailable here. Select hello@timsexperiments.foo and copy it manually.',
        'error'
      );
    }
  });
