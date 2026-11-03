import { createClient, type Client } from '@libsql/client/web';
import { ConversationBodyTooLarge, readConversationJson } from './body';
import { conversationConfigSchema, type ConversationConfig } from './config';
import { hashOwnerToken, newOwnerToken, ownerCookie, readOwnerToken } from './owner';
import { conversationErrorSchema, archivePutSchema } from './protocol';
import { ConversationStore } from './store';

export type ConversationDependencies = {
  openClient?: (config: ConversationConfig) => Client;
  now?: () => number;
};

export function conversationJson(body: unknown, status = 200, headers: HeadersInit = {}) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8');
  responseHeaders.set('Cache-Control', 'no-store');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  responseHeaders.set('Vary', 'Cookie');
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

function failure(error: typeof conversationErrorSchema._type.error, status: number, message: string, headers: HeadersInit = {}) {
  return conversationJson({ error, message }, status, headers);
}

export async function handleConversations(request: Request, settings: unknown, dependencies: ConversationDependencies = {}): Promise<Response> {
  if (request.method !== 'PUT') {
    return failure('method_not_allowed', 405, 'Use PUT.', { Allow: 'PUT' });
  }
  const site = request.headers.get('sec-fetch-site');
  if (request.headers.get('origin') !== new URL(request.url).origin || (site !== null && site !== 'same-origin' && site !== 'none')) {
    return failure('forbidden', 403, 'Archiving requires a same-origin request.');
  }
  if (request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') {
    return failure('unsupported_media_type', 415, 'Send application/json.');
  }
  let raw: unknown;
  try {
    raw = await readConversationJson(request);
  } catch (error) {
    return error instanceof ConversationBodyTooLarge
      ? failure('body_too_large', 413, 'The archive is too large.')
      : failure('invalid_request', 400, 'The request could not be read.');
  }
  const parsed = archivePutSchema.safeParse(raw);
  if (!parsed.success) return failure('invalid_request', 400, 'Send a UUID, revision and one to twelve completed turns within the limits.');
  const existingToken = readOwnerToken(request);
  if (!existingToken && parsed.data.revision !== 0) {
    return failure('conflict', 409, 'The archive could not be updated.');
  }
  const parsedConfig = conversationConfigSchema.safeParse(settings);
  if (!parsedConfig.success) return failure('unavailable', 503, 'Conversation archiving is unavailable. Your local chat can continue.');

  let client: Client | undefined;
  try {
    client = dependencies.openClient
      ? dependencies.openClient(parsedConfig.data)
      : createClient({ url: parsedConfig.data.url, authToken: parsedConfig.data.authToken });
    const store = new ConversationStore(client, dependencies.now);
    const token = existingToken ?? newOwnerToken();
    const ownerHash = await hashOwnerToken(token);
    const result = await store.put(ownerHash, parsed.data);
    switch (result.kind) {
      case 'saved':
        return conversationJson(result.receipt, 200, { 'Set-Cookie': ownerCookie(request, token) });
      case 'conflict':
        return failure('conflict', 409, 'The archive could not be updated.');
      case 'rate_limited':
        return failure('rate_limited', 429, 'Please wait before updating the archive again.', { 'Retry-After': String(result.retryAfter) });
      default: {
        const exhaustive: never = result;
        return exhaustive;
      }
    }
  } catch {
    // Do not log exceptions: SQL/transport errors can include credentials or chat.
    return failure('unavailable', 503, 'Conversation archiving is unavailable. Your local chat can continue.');
  } finally {
    client?.close();
  }
}
