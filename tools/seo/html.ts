export function readCanonicalHref(html: string): string | null {
  const match = html.match(/<link rel="canonical" href="([^"]+)"/);
  return match?.[1] ?? null;
}

export function readTitle(html: string): string | null {
  const match = html.match(/<title>([^<]*)<\/title>/);
  return match?.[1]?.replace(/&#39;/g, "'") ?? null;
}

export function countCanonicalLinks(html: string): number {
  return (html.match(/rel="canonical"/g) ?? []).length;
}

export function readMetaContent(html: string, selector: 'name' | 'property', key: string): string | null {
  const pattern =
    selector === 'name'
      ? new RegExp(`<meta name="${key}" content="([^"]*)"`)
      : new RegExp(`<meta property="${key}" content="([^"]*)"`);
  const match = html.match(pattern);
  if (!match?.[1]) return null;
  return match[1]
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

export function readJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  for (const match of html.matchAll(re)) {
    blocks.push(JSON.parse(match[1]!));
  }
  return blocks;
}

export function parseSitemapLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
}
