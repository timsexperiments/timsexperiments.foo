import { z } from 'zod';
const form = document.querySelector<HTMLFormElement>('#letter-form');
const send = document.querySelector<HTMLButtonElement>('#letter-send');
const status = document.querySelector<HTMLElement>('#letter-status');
const note = document.querySelector<HTMLElement>('#delivery-note');
const capability = z.object({ available: z.boolean() });
const receipt = z.object({ accepted: z.literal(true) });
const failure = z.object({ message: z.string(), fallback: z.literal('email-app').optional() });
let directDelivery = false;
let sending = false;
let requestId = crypto.randomUUID();
let previousDraft = '';
function setStatus(text: string) { if (status) status.textContent = text; }
fetch('/api/contact', { headers: { Accept: 'application/json' } }).then(async response => {
  const raw: unknown = await response.json();
  const result = capability.safeParse(raw);
  directDelivery = response.ok && result.success && result.data.available;
}).catch(() => { directDelivery = false; }).finally(() => {
  if (send) send.textContent = directDelivery ? 'Send letter ↗' : 'Open in email app ↗';
  if (note) note.textContent = directDelivery ? 'Your letter goes straight to Tim. Your email is used only so he can reply.' : 'Direct delivery is not connected yet. Your letter can open as a draft in your email app.';
});
function draftText(data: FormData) { return `${String(data.get('message') ?? '')}\n\nFrom: ${String(data.get('name') ?? '')}\nReply to: ${String(data.get('email') ?? '')}`; }
form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending || !form.reportValidity()) return;
  const data = new FormData(form);
  const body = { name: String(data.get('name') ?? ''), email: String(data.get('email') ?? ''), message: String(data.get('message') ?? ''), website: String(data.get('website') ?? ''), requestId };
  if (!directDelivery) {
    const href = `mailto:hello@timsexperiments.foo?subject=${encodeURIComponent(`A letter from ${body.name}`)}&body=${encodeURIComponent(draftText(data))}`;
    window.location.href = href;
    setStatus('Your email app will open with the draft. It has not been sent yet. Send it there when you are ready.');
    return;
  }
  const snapshot = JSON.stringify({ name: body.name, email: body.email, message: body.message });
  if (snapshot !== previousDraft) { requestId = crypto.randomUUID(); body.requestId = requestId; previousDraft = snapshot; }
  sending = true;
  if (send) send.disabled = true;
  form.classList.add('sending');
  setStatus('Posting your letter…');
  try {
    const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(16000) });
    const raw: unknown = await response.json();
    if (response.ok && receipt.safeParse(raw).success) {
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
      if (message.success && message.data.fallback === 'email-app') {
        directDelivery = false;
        if (send) send.textContent = 'Open in email app ↗';
        if (note) note.textContent = 'Direct delivery is unavailable. Open your draft in your email app or copy it.';
      }
      setStatus(message.success ? message.data.message : 'Delivery could not be confirmed. Your draft is still here.');
    }
  } catch { setStatus('Delivery could not be confirmed. Your draft is still here. Retry without editing within 24 hours to reuse the same delivery request. Switching to your email app may create a duplicate.'); }
  finally { sending = false; if (send) send.disabled = false; form.classList.remove('sending'); setTimeout(() => form.classList.remove('accepted'), 1000); }
});
document.querySelector('#letter-copy')?.addEventListener('click', async () => {
  if (!form) return;
  try { await navigator.clipboard.writeText(draftText(new FormData(form))); setStatus('Letter copied. You can paste it into an email to hello@timsexperiments.foo.'); }
  catch { setStatus('Copy is unavailable here. You can select the message and copy it manually.'); }
});
