import { z } from 'zod';

const singleLine = (value: string) => !/[\u0000-\u001f\u007f]/.test(value);
export const letterSchema = z.object({
  name: z.string().trim().min(1).max(100).refine(singleLine),
  email: z.string().trim().email().max(254).refine(singleLine),
  message: z.string().trim().min(10).max(6000),
  website: z.string().max(200).default(''),
  requestId: z.string().uuid(),
}).strict();
const senderSchema = z.string().trim().min(3).max(254).refine(singleLine).refine(value => {
  const mailbox = value.match(/^[^<>]+<([^<>]+)>$/)?.[1] ?? value;
  return z.string().email().safeParse(mailbox).success;
});
export const deliveryConfigSchema = z.object({
  apiKey: z.string().trim().min(1).refine(singleLine),
  from: senderSchema,
});
export type DeliveryConfig = z.infer<typeof deliveryConfigSchema>;
export type SendRequest = (url: string, init: RequestInit) => Promise<Response>;
type DeliveryResult = { kind: 'accepted'; id: string } | { kind: 'failed' };
const receiptSchema = z.object({ id: z.string().trim().min(1).max(256) });

export async function deliverLetter(input: z.infer<typeof letterSchema>, config: DeliveryConfig, send: SendRequest = fetch): Promise<DeliveryResult> {
  try {
    const response = await send('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `lab-letter/${input.requestId}` },
      body: JSON.stringify({ from: config.from, to: ['hello@timsexperiments.foo'], reply_to: input.email,
        subject: `A letter from ${input.name}`, text: `${input.message}\n\nFrom: ${input.name}\nReply to: ${input.email}\n\nSent from the Tim's Experiments letter desk.` }),
      signal: AbortSignal.timeout(12000),
      redirect: 'error',
    });
    if (!response.ok) {
      await response.body?.cancel();
      return { kind: 'failed' };
    }
    const receipt = receiptSchema.safeParse(await readBoundedJson(response, 4096));
    return receipt.success ? { kind: 'accepted', id: receipt.data.id } : { kind: 'failed' };
  } catch {
    // A timeout can follow acceptance. Preserve the request id when retrying.
    return { kind: 'failed' };
  }
}

export async function readBoundedJson(request: Pick<Request, 'body'>, limit = 24 * 1024): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing letter.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); throw new Error('Letter too long.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}
