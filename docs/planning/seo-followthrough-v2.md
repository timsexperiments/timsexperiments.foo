# SEO follow-through v2

**Date:** 2026-10-21
**Branch:** `feat/3d-site-transformation`
**Owner scope:** metadata head components, `BlogPost.astro`, `astro.config.ts`, `pages/campus.astro`, `pages/rss.xml.js`, `public/robots.txt`, `tools/seo/*`
**Out of scope:** campus shell/reader, scene, robot, serialization bench, article-fragment route implementation (verified only).

## Context

The professional review flagged duplicate homepage article HTML (B1) and `/campus` without redirect (B2). The tablet reader work already removed full MDX from `/` and serves `noindex` static fragments — B1 is addressed outside this SEO scope. Parent treats `/campus` canonical → `/` as sufficient for consolidation; this pass adds an explicit **301** and stops shipping a byte-identical campus HTML document.

## Changes

| Area | Action |
| --- | --- |
| Canonical paths | `SeoHead.astro` normalizes non-root paths to trailing slashes so resume guide, lab posts, and sitemap agree. |
| Article social | `BlogPost.astro` sets `og:image` / Twitter image and JSON-LD `image` from existing `/images/{slug}.webp` when present (`json-vs-protobuf`, `hello-world`); otherwise headshot. |
| RSS | `rss.xml.js` emits `description` from each post `tldr`, sorted newest-first, lab links with trailing slash. |
| `/campus` | `astro.config.ts` 301 to `/`; `campus.astro` returns `Astro.redirect('/', 301)` instead of rendering `CampusHome`. Build no longer emits `dist/campus/index.html`. No in-repo links pointed at `/campus`. |
| Sitemap filter | Excludes `/article-fragments/*` explicitly (fragments were already absent; filter documents intent). |
| Crawl hints | Parent review removed the fragment Disallow rule so crawlers can read fragment noindex. Fragments remain excluded from the sitemap. |
| Verification | `tools/seo/validate-dist.test.ts` — canonical/title/social/JSON-LD, sitemap exclusions, fragment `noindex`, RSS descriptions, homepage duplicate guard, campus non-duplicate, config redirect assertion. |

## Not changed

- Homepage title remains exactly **TimsExperiments**; logo alt in campus shell unchanged (**Tim's Experiments**).
- `/classic` remains a distinct experience; still canonicalized to `/` via `BaseHead.astro` and excluded from sitemap.
- No Search Console or indexing submissions.
- Recipe shelf card visuals (still CSS covers) — OG/lab archive images use proven WebP assets only.

## Verify locally

Other agents may be running `astro dev` or `build` concurrently; re-run build before dist tests if dist may be stale.

```sh
DATABASE_URL=https://ci-build.invalid \
DATABASE_AUTH_TOKEN=ci-placeholder \
PUBLIC_VIEW_COUNTER_API=http://127.0.0.1:4321/__fixtures/views \
bun run --cwd apps/timsexperiments build

DATABASE_URL=https://ci-build.invalid \
DATABASE_AUTH_TOKEN=ci-placeholder \
PUBLIC_VIEW_COUNTER_API=http://127.0.0.1:4321/__fixtures/views \
bun test tools/seo/validate-dist.test.ts
```

Optional: confirm `/campus` returns 301 to `/` on preview (`astro preview`) — Cloudflare production should honor the same redirect entry from `@astrojs/cloudflare` static adapter.

## Parent integration

1. Reconcile scene texture budget test failure before calling branch green (scene owner).
2. Run full `bun test` in `apps/timsexperiments` after integration; SEO dist tests are additive under `tools/seo/`.
3. On deploy, spot-check `/campus` → `/` and one lab article Rich Results / social debugger if desired (not done here).

## Limits

- Trailing-slash behavior for prerendered URLs still depends on host/CDN; canonicals and sitemap are aligned to trailing-slash form per current Astro sitemap output.
- `the-ultimate-dev-environment` has no WebP under `public/images/`; share image falls back to headshot until an asset is added.
- Dist tests require a fresh build; they do not replace live CrUX or crawl monitoring.
