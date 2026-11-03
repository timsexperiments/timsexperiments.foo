import { z } from 'zod';

const credential = z.string().min(1).refine(value => value.trim() === value && !/[\u0000-\u0020\u007f]/.test(value));
export const conversationConfigSchema = z.object({
  enabled: z.literal('true'),
  url: credential.pipe(z.string().url().refine(value => {
    const url = new URL(value);
    return ['https:', 'libsql:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password;
  })),
  authToken: credential,
});
export type ConversationConfig = z.infer<typeof conversationConfigSchema>;
const environmentSchema = z.object({
  CONVERSATIONS_ENABLED: z.unknown().optional(),
  DATABASE_URL: z.unknown().optional(),
  DATABASE_AUTH_TOKEN: z.unknown().optional(),
}).passthrough();
const localsSchema = z.object({ runtime: z.object({ env: environmentSchema }).passthrough() }).passthrough();

// Runtime values win, including explicit empty/disabled values. The fallback is
// supplied by the route so this module never reads process.env or a .env file.
export function conversationConfig(locals: unknown, buildFallback: unknown): unknown {
  const runtime = localsSchema.safeParse(locals);
  const build = environmentSchema.safeParse(buildFallback);
  const env = runtime.success ? runtime.data.runtime.env : undefined;
  const fallback = build.success ? build.data : undefined;
  const value = (key: keyof z.infer<typeof environmentSchema>) => env?.[key] !== undefined ? env[key] : fallback?.[key];
  return {
    enabled: value('CONVERSATIONS_ENABLED'),
    url: value('DATABASE_URL'),
    authToken: value('DATABASE_AUTH_TOKEN'),
  };
}
