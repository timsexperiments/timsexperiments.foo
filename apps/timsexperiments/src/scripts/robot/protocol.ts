import { z } from 'zod';
export const workerRequest = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('load'),
    model: z.enum([
      'SmolLM2-360M-Instruct-q4f16_1-MLC',
      'SmolLM2-360M-Instruct-q4f32_1-MLC',
    ]),
  }),
  z.object({
    kind: z.literal('generate'),
    question: z.string().max(1000),
    context: z.string().max(6500),
    allowedIds: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1).max(2),
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
