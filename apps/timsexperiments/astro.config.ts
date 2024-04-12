import cloudflare from '@astrojs/cloudflare';
import db from '@astrojs/db';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import { default as theme } from '@timsexperiments/theme/tim-s-experiments-dark-color-theme.json';
import { defineConfig } from 'astro/config';
import { default as copyCodePlugin } from './src/plugins/rehype/code-copy';
import { default as targetBlank } from './src/plugins/rehype/target-blank';

// https://astro.build/config
export default defineConfig({
  site: 'https://example.com',
  markdown: {
    rehypePlugins: [copyCodePlugin, [targetBlank, { allBlank: true }]],

    shikiConfig: {
      // @ts-expect-error
      theme,
    },
  },
  integrations: [
    mdx(),
    sitemap(),
    react(),
    // @ts-ignore
    tailwind({
      applyBaseStyles: false,
    }),
    db(),
  ],
  output: 'hybrid',
  adapter: cloudflare({
    imageService: 'passthrough',
  }),
});
