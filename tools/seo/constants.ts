/** Slugs with card/preview WebP assets under public/images (same paths as /lab index). */
export const ARTICLE_PREVIEW_IMAGE_SLUGS = [
  'json-vs-protobuf',
  'hello-world',
] as const;

export const DEFAULT_SHARE_IMAGE = '/timothy_altemus_headshot.jpeg';

export const SITE_ORIGIN = 'https://timsexperiments.foo';

export const SITEMAP_EXCLUDED_PATHS = [
  '/campus',
  '/classic',
  '/unsubscribe',
  '/parser',
] as const;

export function articleShareImagePath(slug: string): string {
  return (ARTICLE_PREVIEW_IMAGE_SLUGS as readonly string[]).includes(slug)
    ? `/images/${slug}.webp`
    : DEFAULT_SHARE_IMAGE;
}

export function normalizeCanonicalPath(pathOrUrl: string): string {
  let pathname: string;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    pathname = new URL(pathOrUrl).pathname;
  } else {
    pathname = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  }
  if (pathname === '/' || pathname === '') return '/';
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

export function canonicalHref(pathOrUrl: string): string {
  return new URL(normalizeCanonicalPath(pathOrUrl), SITE_ORIGIN).href;
}
