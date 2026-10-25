export type LabRoute =
  | { kind: 'home' }
  | { kind: 'room' }
  | { kind: 'station'; station: 'recipes' | 'workbench' | 'robot' | 'contact' }
  | { kind: 'article'; slug: string };

export function parseLabRoute(
  hash: string,
  publishedSlugs: ReadonlySet<string>
): LabRoute | null {
  if (!hash) return { kind: 'home' };
  switch (hash) {
    case '#lab/room':
      return { kind: 'room' };
    case '#lab/recipes':
      return { kind: 'station', station: 'recipes' };
    case '#lab/workbench':
      return { kind: 'station', station: 'workbench' };
    case '#lab/chat':
      return { kind: 'station', station: 'robot' };
    case '#lab/contact':
      return { kind: 'station', station: 'contact' };
  }
  if (hash.startsWith('#lab/article/')) {
    try {
      const slug = decodeURIComponent(hash.slice('#lab/article/'.length));
      if (publishedSlugs.has(slug)) return { kind: 'article', slug };
    } catch {
      /* Leave malformed or unknown routes alone. */
    }
  }
  return null;
}

export function labRouteHash(route: LabRoute): string {
  switch (route.kind) {
    case 'home':
      return '';
    case 'room':
      return '#lab/room';
    case 'station':
      return `#lab/${route.station === 'robot' ? 'chat' : route.station}`;
    case 'article':
      return `#lab/article/${encodeURIComponent(route.slug)}`;
  }
}

/** URL state owns panel destinations, never form fields or conversation contents. */
export function createLabRouter(options: {
  publishedSlugs: ReadonlySet<string>;
  apply: (route: LabRoute) => void;
}) {
  let restoring = false;
  let appliedUrl = '';
  const restore = () => {
    if (appliedUrl === location.href) return;
    appliedUrl = location.href;
    const route = parseLabRoute(location.hash, options.publishedSlugs);
    if (!route) return;
    restoring = true;
    try {
      options.apply(route);
    } finally {
      restoring = false;
    }
  };
  return {
    start() {
      window.addEventListener('popstate', restore);
      window.addEventListener('hashchange', restore);
      restore();
    },
    sync(route: LabRoute) {
      if (restoring || labRouteHash(route) === location.hash) return;
      const url = new URL(location.href);
      url.hash = labRouteHash(route);
      history.pushState(null, '', url);
      appliedUrl = location.href;
    },
    destroy() {
      window.removeEventListener('popstate', restore);
      window.removeEventListener('hashchange', restore);
    },
  };
}
