import { describe, expect, it } from 'bun:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  ARTICLE_PREVIEW_IMAGE_SLUGS,
  SITEMAP_EXCLUDED_PATHS,
  SITE_ORIGIN,
  canonicalHref,
} from './constants';
import {
  countCanonicalLinks,
  parseSitemapLocs,
  readCanonicalHref,
  readJsonLdBlocks,
  readMetaContent,
  readTitle,
} from './html';

const appRoot = join(import.meta.dir, '../../apps/timsexperiments');
const distRoot = join(appRoot, 'dist');

function distPath(...parts: string[]) {
  return join(distRoot, ...parts);
}

function readDist(...parts: string[]) {
  return readFileSync(distPath(...parts), 'utf8');
}

describe('built site SEO (requires apps/timsexperiments/dist from astro build)', () => {
  it('has a dist output directory', () => {
    expect(existsSync(distRoot)).toBe(true);
  });

  it('homepage uses exact title and a single canonical to /', () => {
    const html = readDist('index.html');
    expect(readTitle(html)).toBe('TimsExperiments');
    expect(countCanonicalLinks(html)).toBe(1);
    expect(readCanonicalHref(html)).toBe(`${SITE_ORIGIN}/`);
    expect(readMetaContent(html, 'property', 'og:url')).toBe(`${SITE_ORIGIN}/`);
  });

  it('homepage exposes WebSite JSON-LD and not full lab article bodies', () => {
    const html = readDist('index.html');
    const jsonLd = readJsonLdBlocks(html);
    expect(jsonLd.some((block) => (block as { '@type'?: string })['@type'] === 'WebSite')).toBe(
      true
    );
    expect(html).not.toContain('data-reader-fragment=');
    expect(html).not.toContain('Approximately 2.5 million terabytes of data');
  });

  it('lab article has BlogPosting JSON-LD aligned with canonical and share image', () => {
    const html = readDist('lab', 'json-vs-protobuf', 'index.html');
    expect(countCanonicalLinks(html)).toBe(1);
    const canonical = readCanonicalHref(html)!;
    expect(canonical).toBe(canonicalHref('/lab/json-vs-protobuf/'));
    expect(readTitle(html)).toBe('Protobuf: The Rosetta Stone of Data | TimsExperiments');

    const jsonLd = readJsonLdBlocks(html);
    const posting = jsonLd.find(
      (block) => (block as { '@type'?: string })['@type'] === 'BlogPosting'
    ) as {
      headline?: string;
      mainEntityOfPage?: string;
      image?: string;
      author?: { url?: string };
    };
    expect(posting?.headline).toBe('Protobuf: The Rosetta Stone of Data');
    expect(posting?.mainEntityOfPage).toBe(canonical);
    expect(posting?.image).toBe(`${SITE_ORIGIN}/images/json-vs-protobuf.webp`);
    expect(posting?.author?.url).toBe(`${SITE_ORIGIN}/resume/mcp/`);

    expect(readMetaContent(html, 'property', 'og:image')).toBe(
      `${SITE_ORIGIN}/images/json-vs-protobuf.webp`
    );
  });

  it('resume guide canonical matches sitemap trailing slash', () => {
    const html = readDist('resume', 'mcp', 'index.html');
    expect(readCanonicalHref(html)).toBe(`${SITE_ORIGIN}/resume/mcp/`);
    const sitemap = readDist('sitemap-0.xml');
    expect(parseSitemapLocs(sitemap)).toContain(`${SITE_ORIGIN}/resume/mcp/`);
  });

  it('sitemap lists published lab routes and excludes utility duplicates', () => {
    const locs = parseSitemapLocs(readDist('sitemap-0.xml'));
    expect(locs).toContain(`${SITE_ORIGIN}/lab/json-vs-protobuf/`);
    expect(locs).toContain(`${SITE_ORIGIN}/lab/hello-world/`);
    expect(locs).toContain(`${SITE_ORIGIN}/lab/the-ultimate-dev-environment/`);

    for (const excluded of SITEMAP_EXCLUDED_PATHS) {
      const withSlash = `${SITE_ORIGIN}${excluded}/`;
      const bare = `${SITE_ORIGIN}${excluded}`;
      expect(locs).not.toContain(withSlash);
      expect(locs).not.toContain(bare);
    }

    expect(locs.some((loc) => loc.includes('/article-fragments/'))).toBe(false);
  });

  it('article-fragments are noindex and omitted from sitemap', () => {
    const fragmentDir = distPath('article-fragments');
    expect(existsSync(fragmentDir)).toBe(true);
    const files = readdirSync(fragmentDir).filter((name) => name.endsWith('.html'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const html = readFileSync(join(fragmentDir, file), 'utf8');
      expect(html.startsWith('<meta name="robots" content="noindex">')).toBe(true);

      // A crawler must fetch the fragment before it can discover its noindex.
      const path = `/article-fragments/${file}`;
      const disallows = [...readDist('robots.txt').matchAll(/^[\t ]*Disallow:[\t ]*([^#\r\n]*)/gim)]
        .map((match) => match[1]!.trim())
        .filter(Boolean);
      const blockingRules = disallows.filter((rule) => {
        const anchored = rule.endsWith('$');
        const prefix = anchored ? rule.slice(0, -1) : rule;
        const pattern = prefix
          .split('*')
          .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
          .join('.*');
        return new RegExp(`^${pattern}${anchored ? '$' : ''}`).test(path);
      });
      expect(blockingRules).toEqual([]);
    }
  });

  it('RSS includes descriptions for published items only', () => {
    const rss = readDist('rss.xml');
    expect(rss).toContain('<description>Discover why Protobuf is replacing JSON');
    expect(rss).toContain('<link>https://timsexperiments.foo/lab/json-vs-protobuf/</link>');
    expect(rss).not.toContain('draft');
    expect((rss.match(/<item>/g) ?? []).length).toBe(3);
  });

  it('/campus is not prerendered as duplicate campus HTML', () => {
    expect(existsSync(distPath('campus', 'index.html'))).toBe(false);
    expect(readDist('_redirects')).toMatch(/^\/campus\s+\/\s+301\s*$/m);
    const routes = JSON.parse(readDist('_routes.json'));
    expect(routes.exclude).toContain('/campus');
    expect(routes.exclude).toContain('/article-fragments/*');
  });

  it('preview image assets exist for mapped article slugs', () => {
    for (const slug of ARTICLE_PREVIEW_IMAGE_SLUGS) {
      expect(existsSync(distPath('images', `${slug}.webp`))).toBe(true);
    }
  });

  it('astro.config declares a 301 /campus → / redirect', async () => {
    const configUrl = new URL('../../apps/timsexperiments/astro.config.ts', import.meta.url);
    const source = readFileSync(configUrl, 'utf8');
    expect(source).toContain("'/campus'");
    expect(source).toContain('status: 301');
    expect(source).toContain("destination: '/'");
  });
});
