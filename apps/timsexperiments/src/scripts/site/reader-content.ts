const allowedTags = new Set(
  'article header footer section div span p h1 h2 h3 h4 h5 h6 a button pre code blockquote ul ol li dl dt dd table caption thead tbody tfoot tr th td figure figcaption picture source img video audio track strong em b i u s del mark small sub sup br hr details summary kbd samp var time abbr'.split(
    ' '
  )
);
const droppedTags = new Set([
  'script',
  'style',
  'link',
  'iframe',
  'object',
  'embed',
  'base',
  'meta',
  'template',
  'form',
  'input',
  'textarea',
  'select',
]);
const attributes = new Set([
  'id',
  'class',
  'title',
  'alt',
  'width',
  'height',
  'colspan',
  'rowspan',
  'scope',
  'datetime',
  'open',
  'start',
  'reversed',
  'type',
  'controls',
  'loop',
  'muted',
  'kind',
  'srclang',
  'label',
  'media',
  'sizes',
  'aria-label',
  'aria-hidden',
  'tabindex',
  'data-code-block',
  'data-copy-code-button',
  'data-heading-link',
  'data-reader-workbench',
]);

function safeUrl(value: string, base: URL, image: boolean) {
  const url = new URL(value, base);
  if (
    ['http:', 'https:'].includes(url.protocol) ||
    (!image && ['mailto:', 'tel:'].includes(url.protocol))
  )
    return url.href;
  return null;
}

/** Accept only the published fragment envelope; rebuild inert HTML, never insert fetched scripts/islands. */
export function parseReaderContent(
  html: string,
  slug: string,
  base: URL
): HTMLElement {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const template = parsed.querySelector('template[data-reader-fragment]');
  if (
    !(template instanceof HTMLTemplateElement) ||
    template.dataset.readerFragment !== slug
  )
    throw new Error('Invalid recipe fragment');
  const article = template.content.querySelector('article.campus-article');
  if (!article) throw new Error('Missing recipe article');

  function clean(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE)
      return document.createTextNode(node.textContent ?? '');
    if (!(node instanceof Element) || droppedTags.has(node.localName))
      return null;
    // Unknown custom widgets retain their server-rendered text; their runtime never hydrates.
    const element = document.createElement(
      allowedTags.has(node.localName) ? node.localName : 'span'
    );
    if (allowedTags.has(node.localName)) {
      for (const attribute of node.attributes) {
        const { name, value } = attribute;
        if (attributes.has(name)) element.setAttribute(name, value);
        if (['href', 'src', 'poster'].includes(name)) {
          const url = safeUrl(value, base, name !== 'href');
          if (url)
            element.setAttribute(name, value.startsWith('#') ? value : url);
        }
        // Shiki's token colors are the only inline CSS accepted from article HTML.
        if (
          name === 'style' &&
          node.localName === 'span' &&
          /^color:\s*#[\da-f]{3,8};?$/i.test(value.trim())
        )
          element.setAttribute('style', value);
      }
    }
    if (
      element instanceof HTMLAnchorElement &&
      element.hasAttribute('href') &&
      !element.getAttribute('href')?.startsWith('#')
    ) {
      element.target = '_blank';
      element.rel = 'noopener noreferrer';
    }
    if (element instanceof HTMLImageElement) {
      element.loading = 'lazy';
      element.decoding = 'async';
    }
    if (element instanceof HTMLButtonElement) element.type = 'button';
    for (const child of node.childNodes) {
      const safe = clean(child);
      if (safe) element.append(safe);
    }
    return element;
  }

  const result = clean(article);
  if (!(result instanceof HTMLElement)) throw new Error('Invalid article');
  return result;
}

export function wireReaderCopy(
  root: HTMLElement,
  status: HTMLElement,
  standalone: URL
) {
  root.addEventListener('click', async (event) => {
    if (!(event.target instanceof Element)) return;
    const copy = event.target.closest('[data-copy-code-button]');
    const heading = event.target.closest('[data-heading-link]');
    const code = copy?.closest('[data-code-block]')?.querySelector('pre');
    const headingId = heading?.parentElement?.id;
    if (!code && !headingId) return;
    try {
      const url = new URL(standalone);
      if (headingId) url.hash = headingId;
      await navigator.clipboard.writeText(code?.textContent ?? url.href);
      status.textContent = code
        ? 'Copied code to clipboard.'
        : 'Copied standalone section link.';
    } catch {
      status.textContent =
        'Could not copy. Select the text and copy it manually.';
    }
  });
}
