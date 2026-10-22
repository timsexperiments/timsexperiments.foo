import { z } from 'zod';
import {
  archivePutSchema,
  conversationLimits,
} from '../../lib/conversations/protocol';

export const activeChatKey = 'lab-chat-active-v1';
// Completed turns only, with the same bounds as an archive write.
export const activeChatSchema = archivePutSchema;
export type ActiveChat = z.infer<typeof activeChatSchema>;
export function parseActiveChat(value: string): ActiveChat | undefined {
  if (
    value.length > conversationLimits.bodyBytes ||
    new TextEncoder().encode(value).byteLength > conversationLimits.bodyBytes
  )
    return;
  try {
    const result = activeChatSchema.safeParse(JSON.parse(value));
    return result.success ? result.data : undefined;
  } catch {
    return;
  }
}
