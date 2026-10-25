import { deliverLetter, deliveryConfigSchema, letterSchema, readBoundedJson, type SendRequest } from './delivery';

export function contactJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

export async function handleContact(request: Request, settings: unknown, send: SendRequest = fetch) {
  // These checks stop browser cross-site submissions, not scripted clients.
  // No process-local rate limit: isolates cannot enforce a shared quota.
  if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') return contactJson({ message: 'Please send your letter from the lab.' }, 403);
  if (request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') return contactJson({ message: 'Please use the letter form.' }, 415);
  let raw: unknown;
  try { raw = await readBoundedJson(request); } catch { return contactJson({ message: 'The letter could not be read. Please shorten it and try again.' }, 400); }
  const parsed = letterSchema.safeParse(raw);
  if (!parsed.success) return contactJson({ message: 'Please check your name, reply email, and message. Messages need at least 10 characters.' }, 400);
  if (parsed.data.website) return contactJson({ message: 'The letter could not be accepted.' }, 400);
  const config = deliveryConfigSchema.safeParse(settings);
  if (!config.success) return contactJson({ message: 'Sending is temporarily unavailable. Your letter has not been sent. Your draft is still here. Press Send to try again.' }, 503);
  const result = await deliverLetter(parsed.data, config.data, send);
  if (result.kind === 'accepted') return contactJson({ accepted: true });
  return contactJson({ message: 'Delivery could not be confirmed. Your draft is still here. Press Send to retry. Retrying without edits within 24 hours avoids sending the same letter twice.' }, 502);
}
