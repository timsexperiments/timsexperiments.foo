/** Pages canonicalizes .html assets. Follow that redirect within the same origin only. */
export async function fetchReaderFragment(
  url: URL,
  signal: AbortSignal
): Promise<string> {
  const response = await fetch(url, {
    signal,
    credentials: 'same-origin',
    mode: 'same-origin',
    redirect: 'follow',
  });
  const destination = new URL(response.url);
  const canonicalPath = (path: string) =>
    path.replace(/\.html$/, '').replace(/\/$/, '');
  if (
    !response.ok ||
    destination.origin !== url.origin ||
    canonicalPath(destination.pathname) !== canonicalPath(url.pathname) ||
    response.headers
      .get('Content-Type')
      ?.split(';')[0]
      ?.trim()
      .toLowerCase() !== 'text/html'
  )
    throw new Error('Recipe unavailable');
  return response.text();
}
