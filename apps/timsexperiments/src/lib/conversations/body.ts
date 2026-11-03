import { conversationLimits } from './protocol';

export class ConversationBodyTooLarge extends Error {}

export async function readConversationJson(request: Pick<Request, 'body'>, limit = conversationLimits.bodyBytes): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        // Cancellation must not delay the error response on a hostile stream.
        void reader.cancel().catch(() => {});
        throw new ConversationBodyTooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}
