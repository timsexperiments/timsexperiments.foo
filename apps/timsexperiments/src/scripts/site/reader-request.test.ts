import { afterAll, describe, expect, test } from 'bun:test';
import { fetchReaderFragment } from './reader-request';

const html =
  '<template data-reader-fragment="example"><article class="campus-article">Recipe text</article></template>';
const foreign = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch: () => new Response(html, { headers: { 'Content-Type': 'text/html' } }),
});
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname === '/article-fragments/example.html')
      return Response.redirect(
        new URL('/article-fragments/example', request.url),
        308
      );
    if (pathname === '/article-fragments/wrong-path.html')
      return Response.redirect(
        new URL('/article-fragments/example', request.url),
        308
      );
    if (pathname === '/article-fragments/foreign.html')
      return Response.redirect(
        new URL('/article-fragments/foreign', foreign.url),
        302
      );
    if (pathname === '/article-fragments/missing.html')
      return new Response('Not found', { status: 404 });
    if (pathname === '/article-fragments/not-html.html')
      return new Response('{}', {
        headers: { 'Content-Type': 'application/json' },
      });
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
});
afterAll(() => {
  server.stop(true);
  foreign.stop(true);
});
const load = (path: string) =>
  fetchReaderFragment(new URL(path, server.url), new AbortController().signal);

describe('recipe requests on static hosting', () => {
  test('loads direct HTML and the Pages .html-to-extensionless redirect', async () => {
    expect(await load('/article-fragments/example.html')).toBe(html);
    expect(await load('/article-fragments/example')).toBe(html);
  });
  for (const path of ['wrong-path', 'foreign', 'missing', 'not-html'])
    test(`rejects ${path} responses`, async () => {
      await expect(load(`/article-fragments/${path}.html`)).rejects.toThrow();
    });
  test('honors cancellation', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      fetchReaderFragment(
        new URL('/article-fragments/example.html', server.url),
        controller.signal
      )
    ).rejects.toThrow();
  });
});
