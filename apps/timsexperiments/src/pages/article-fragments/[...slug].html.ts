import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import mdxRenderer from '@astrojs/mdx/server.js';
import ReaderArticle from '../../components/campus/ReaderArticle.astro';

export const prerender = true;

export const getStaticPaths = (async () => {
  const posts = await getCollection(
    'blog',
    ({ data }) => data.status === 'published' && data.pubDate <= new Date()
  );
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}) satisfies GetStaticPaths;

type Props = { post: CollectionEntry<'blog'> };

// A static endpoint, not another indexable article page. No client scripts or site chrome.
export const GET: APIRoute<Props> = async ({ props }) => {
  const container = await AstroContainer.create();
  container.addServerRenderer({ name: '@astrojs/mdx', renderer: mdxRenderer });
  const html = await container.renderToString(ReaderArticle, {
    props,
    locals: { campusNewsletter: true },
  });
  return new Response(`<meta name="robots" content="noindex">${html}`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
