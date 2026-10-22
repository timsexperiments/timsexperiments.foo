// Cookie lifetime only. Archives have no expiry or automatic deletion.
export const ownerCookieMaxAgeSeconds = 30 * 24 * 60 * 60;
const tokenPattern = /^[a-f0-9]{64}$/;

function cookieName(url: URL) {
  return url.protocol === 'https:' ? '__Host-conversation_owner' : 'conversation_owner_dev';
}

export function readOwnerToken(request: Request): string | null {
  const name = cookieName(new URL(request.url));
  const matches = (request.headers.get('cookie') ?? '').split(';')
    .map(part => part.trim()).filter(part => part.startsWith(`${name}=`));
  // Ambiguous cookies fail closed, including a duplicate from an unexpected path.
  if (matches.length !== 1) return null;
  const token = matches[0]?.slice(name.length + 1);
  return token && tokenPattern.test(token) ? token : null;
}

export function newOwnerToken(): string {
  return [...crypto.getRandomValues(new Uint8Array(32))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashOwnerToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function ownerCookie(request: Request, token: string): string {
  const url = new URL(request.url);
  return `${cookieName(url)}=${token}; Path=/; Max-Age=${ownerCookieMaxAgeSeconds}; HttpOnly; SameSite=Strict${url.protocol === 'https:' ? '; Secure' : ''}`;
}
