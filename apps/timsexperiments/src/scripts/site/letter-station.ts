import { z } from 'zod';
const form = document.querySelector<HTMLFormElement>('#letter-form');
const send = document.querySelector<HTMLButtonElement>('#letter-send');
const status = document.querySelector<HTMLElement>('#letter-status');
const note = document.querySelector<HTMLElement>('#delivery-note');
const capability = z.object({ available: z.boolean() });
const receipt = z.object({ accepted: z.literal(true) });
const failure = z.object({ message: z.string() });
let sending = false;
let requestId = crypto.randomUUID();
let previousDraft = '';
function setStatus(text: string) { if (status) status.textContent = text; }
fetch('/api/contact', { headers: { Accept: 'application/json' } }).then(async response => {
  const raw: unknown = await response.json();
  const result = capability.safeParse(raw);
  if (note && response.ok && result.success && !result.data.available) {
    note.textContent = 'Sending is temporarily unavailable. Your draft stays here so you can try again.';
  }
}).catch(() => { /* The submission can still succeed if this check fails. */ });
function draftText(data: FormData) { return `${String(data.get('message') ?? '')}\n\nFrom: ${String(data.get('name') ?? '')}\nReply to: ${String(data.get('email') ?? '')}`; }
form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending || !form.reportValidity()) return;
  const data = new FormData(form);
  const body = { name: String(data.get('name') ?? ''), email: String(data.get('email') ?? ''), message: String(data.get('message') ?? ''), website: String(data.get('website') ?? ''), requestId };
  const snapshot = JSON.stringify({ name: body.name, email: body.email, message: body.message });
  if (snapshot !== previousDraft) { requestId = crypto.randomUUID(); body.requestId = requestId; previousDraft = snapshot; }
  sending = true;
  if (send) { send.disabled = true; send.textContent = 'Sending…'; }
  form.classList.add('sending');
  setStatus('Posting your letter…');
  try {
    const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(16000) });
    const raw: unknown = await response.json();
    if (response.ok && receipt.safeParse(raw).success) {
      if (note) note.textContent = 'Your letter goes straight to Tim. Your email is used only so he can reply.';
      form.classList.add('accepted');
      setStatus('Your letter was accepted for delivery. Thanks for reaching out.');
      const current = new FormData(form);
      if (snapshot === JSON.stringify({ name: String(current.get('name') ?? ''), email: String(current.get('email') ?? ''), message: String(current.get('message') ?? '') })) {
        form.reset(); requestId = crypto.randomUUID(); previousDraft = '';
      } else {
        setStatus('Your submitted letter was accepted for delivery. Your newer edits are still here.');
      }
    } else {
      const message = failure.safeParse(raw);
      setStatus(message.success ? message.data.message : 'Delivery could not be confirmed. Your draft is still here. Press Send to retry.');
    }
  } catch { setStatus('Delivery could not be confirmed. Your draft is still here. Press Send to retry. Retrying without edits within 24 hours avoids sending the same letter twice.'); }
  finally { sending = false; if (send) { send.disabled = false; send.textContent = 'Send ↗'; } form.classList.remove('sending'); setTimeout(() => form.classList.remove('accepted'), 1000); }
});
document.querySelector('#letter-copy')?.addEventListener('click', async () => {
  if (!form) return;
  try { await navigator.clipboard.writeText(draftText(new FormData(form))); setStatus('Letter copied. You can paste it into an email to hello@timsexperiments.foo.'); }
  catch { setStatus('Copy is unavailable here. You can select the message and copy it manually.'); }
});
