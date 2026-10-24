import type { DialogShell } from './dialog-shell';
import { parseReaderContent, wireReaderCopy } from './reader-content';
import { fetchReaderFragment } from './reader-request';

type Recipe = { slug: string; title: string };
type Session =
  | { kind: 'idle' }
  | { kind: 'reading'; recipe: Recipe; request: AbortController }
  | { kind: 'returning' };

export function createTabletReader(options: {
  root: HTMLDialogElement;
  shelf: HTMLDialogElement;
  shell: DialogShell;
  onWorkbench: () => void;
}) {
  const { root, shelf, shell } = options;
  function element<T extends Element>(selector: string) {
    const found = root.querySelector<T>(selector);
    if (!found) throw new Error(`Missing tablet control: ${selector}`);
    return found;
  }
  const content = element<HTMLElement>('#reader-content');
  const viewport = element<HTMLElement>('#reader-viewport');
  const status = element<HTMLElement>('#reader-status');
  const error = element<HTMLElement>('#reader-error');
  const contents = element<HTMLSelectElement>('#reader-contents');
  const standalone = element<HTMLAnchorElement>('#reader-standalone');
  const previous = element<HTMLButtonElement>('#reader-previous');
  const next = element<HTMLButtonElement>('#reader-next');
  const position = element<HTMLElement>('#reader-position');

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let session: Session = { kind: 'idle' };
  let animation: Animation | undefined;
  let headings: HTMLElement[] = [];
  let section = 0;
  let selectedBook: HTMLAnchorElement | undefined;
  let scrollFrame = 0;

  function stop() {
    if (session.kind === 'reading') session.request.abort();
    session = { kind: 'idle' };
    animation?.cancel();
    cancelAnimationFrame(scrollFrame);
    root.removeAttribute('data-returning');
  }

  function moveTablet(returning: boolean) {
    animation?.cancel();
    if (reducedMotion.matches) return Promise.resolve();
    const held = {
      transform:
        'perspective(1100px) translateY(0) rotateX(0) rotateZ(0) scale(1)',
    };
    const lifted = {
      transform:
        'perspective(1100px) translateY(18vh) rotateX(14deg) rotateZ(-2deg) scale(.92)',
    };
    animation = root.animate(returning ? [held, lifted] : [lifted, held], {
      duration: returning ? 180 : 320,
      easing: returning ? 'ease-in' : 'cubic-bezier(.16,1,.3,1)',
      fill: 'both',
    });
    return animation.finished.catch(() => undefined);
  }

  function updateNavigation() {
    previous.disabled = section <= 0;
    next.disabled = section >= headings.length - 1 || !headings.length;
    contents.value = String(section);
    position.textContent = headings.length
      ? `${section + 1} / ${headings.length}`
      : 'Article start';
  }

  function jump(index: number) {
    const heading = headings[index];
    if (!heading) return;
    viewport.scrollTo({
      top: Math.max(
        0,
        viewport.scrollTop +
          heading.getBoundingClientRect().top -
          viewport.getBoundingClientRect().top -
          24
      ),
      behavior: 'instant',
    });
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    section = index;
    updateNavigation();
  }

  async function load(recipe: Recipe) {
    stop();
    const active: Session = {
      kind: 'reading',
      recipe,
      request: new AbortController(),
    };
    session = active;
    headings = [];
    section = 0;
    contents.replaceChildren(new Option('Article start', '0'));
    contents.disabled = true;
    updateNavigation();
    content.replaceChildren();
    content.setAttribute('aria-busy', 'true');
    viewport.scrollTop = 0;
    error.hidden = true;
    status.textContent = `Loading ${recipe.title}…`;
    standalone.href = new URL(`/lab/${recipe.slug}/`, location.origin).href;
    root.setAttribute('aria-label', `Recipe tablet: ${recipe.title}`);
    const timeout = setTimeout(() => active.request.abort(), 15000);
    try {
      const url = new URL(
        `/article-fragments/${recipe.slug}.html`,
        location.origin
      );
      const html = await fetchReaderFragment(url, active.request.signal);
      if (session !== active) return;
      const article = parseReaderContent(
        html,
        recipe.slug,
        new URL(standalone.href)
      );
      wireReaderCopy(article, status, new URL(standalone.href));
      content.replaceChildren(article);
      headings = [
        ...article.querySelectorAll<HTMLElement>(
          '.reader-article-heading h2, .article-body h2, .article-body h3'
        ),
      ];
      contents.replaceChildren(
        ...headings.map(
          (heading, index) =>
            new Option(
              index
                ? heading.textContent?.trim() || 'Section'
                : 'Article start',
              String(index)
            )
        )
      );
      contents.disabled = !headings.length;
      updateNavigation();
      status.textContent = '';
      article
        .querySelector('[data-reader-workbench]')
        ?.addEventListener('click', options.onWorkbench);
      article.addEventListener('click', (event) => {
        const link =
          event.target instanceof Element
            ? event.target.closest('a[href^="#"]')
            : null;
        if (!(link instanceof HTMLAnchorElement)) return;
        event.preventDefault();
        const id = decodeURIComponent(link.hash.slice(1));
        const target = [...article.querySelectorAll<HTMLElement>('[id]')].find(
          (element) => element.id === id
        );
        if (!target) return;
        viewport.scrollTop +=
          target.getBoundingClientRect().top -
          viewport.getBoundingClientRect().top -
          24;
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      });
    } catch {
      if (session !== active) return;
      error.hidden = false;
      status.textContent =
        'Recipe unavailable. Try again or open the standalone article.';
    } finally {
      clearTimeout(timeout);
      if (session === active) content.setAttribute('aria-busy', 'false');
    }
  }

  async function putDown(destination: 'shelf' | 'room') {
    if (session.kind === 'returning') return;
    stop();
    const returning: Session = { kind: 'returning' };
    session = returning;
    root.dataset.returning = '';
    await moveTablet(true);
    if (session !== returning) return;
    stop();
    if (destination === 'shelf') shell.show(shelf, undefined, selectedBook);
    else shell.dismiss(root);
    content.replaceChildren();
  }

  const books = [
    ...shelf.querySelectorAll<HTMLAnchorElement>('a[data-recipe]'),
  ];
  function open(slug: string) {
    const trigger = books.find((book) => book.dataset.recipe === slug);
    const title = trigger?.querySelector('h3')?.textContent?.trim();
    if (!trigger || !title) return false;
    selectedBook = trigger;
    root.dataset.recipeSlug = slug;
    shell.show(
      root,
      undefined,
      root.querySelector<HTMLElement>('#reader-back')
    );
    void load({ slug, title });
    void moveTablet(false);
    return true;
  }

  for (const trigger of shelf.querySelectorAll<HTMLAnchorElement>(
    'a[data-recipe]'
  )) {
    trigger.addEventListener('click', (event) => {
      // Native standalone links still support new tabs, copy link, and no JavaScript.
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const slug = trigger.dataset.recipe;
      const title = trigger.querySelector('h3')?.textContent?.trim();
      if (!slug || !title) return;
      event.preventDefault();
      open(slug);
    });
  }

  root
    .querySelector('#reader-back')
    ?.addEventListener('click', () => void putDown('shelf'));
  root.querySelector('#reader-retry')?.addEventListener('click', () => {
    if (session.kind === 'reading') void load(session.recipe);
  });
  previous.addEventListener('click', () => jump(section - 1));
  next.addEventListener('click', () => jump(section + 1));
  contents.addEventListener('change', () => jump(Number(contents.value)));
  viewport.addEventListener(
    'scroll',
    () => {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => {
        const top = viewport.getBoundingClientRect().top + 40;
        section = Math.max(
          0,
          headings.findLastIndex(
            (heading) => heading.getBoundingClientRect().top <= top
          )
        );
        updateNavigation();
      });
    },
    { passive: true }
  );
  reducedMotion.addEventListener('change', () => animation?.cancel());

  return {
    open,
    dismiss: (reason: 'close' | 'escape') =>
      void putDown(reason === 'escape' ? 'shelf' : 'room'),
    sync: () => {
      if (!root.open) stop();
    },
    dispose: stop,
  };
}
