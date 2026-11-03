import { localModel } from './model';
import { z } from 'zod';
import { conversationTurnSchema } from '../../lib/conversations/protocol';
export const workerRequest = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('load'),
    model: z.literal(localModel.id),
  }),
  z.object({
    kind: z.literal('generate'),
    question: z.string().max(1000),
    context: z.string().max(18000),
    turns: z.array(conversationTurnSchema).max(3),
  }),
]);
export const workerReply = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('progress'),
    progress: z.number(),
    text: z.string(),
  }),
  z.object({ kind: z.literal('ready') }),
  z.object({ kind: z.literal('answer'), text: z.string() }),
  z.object({
    kind: z.literal('error'),
    stage: z.enum(['request', 'load', 'generate']),
    message: z.string().max(500),
  }),
]);
export type WorkerReply = z.infer<typeof workerReply>;
