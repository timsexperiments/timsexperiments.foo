import type { StationId } from '../campus';
import { createDialogShell, type DialogOrigin } from './dialog-shell';
import { createTabletReader } from './tablet-reader';
import { setupRecipeSearch } from './recipe-search';
import { createLabRouter, parseLabRoute } from './lab-route';

const canvas = document.querySelector<HTMLCanvasElement>('#campus-canvas');
const status = document.querySelector<HTMLElement>('#scene-status');
const pauseButton = document.querySelector<HTMLButtonElement>('#toggle-scene');
const locationLabel = document.querySelector<HTMLElement>('#location-label');
const labels = {
  arrival: 'Arrival',
  recipes: 'The recipe shelf',
  workbench: 'The workbench',
  robot: 'Your lab host',
  contact: 'The letter desk',
} satisfies Record<StationId, string>;
let controller:
  | Awaited<ReturnType<(typeof import('../campus'))['createCampus']>>
  | undefined;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let userPaused = reducedMotion.matches;
let disposed = false;
let pendingOpen = 0;
let router: ReturnType<typeof createLabRouter> | undefined;
let reader: ReturnType<typeof createTabletReader>;
const shell = createDialogShell({
  dialogs: [...document.querySelectorAll<HTMLDialogElement>('.lab-dialog')],
  fallbackFocus: () =>
    document.body.classList.contains('is-exploring')
      ? canvas
      : document.querySelector<HTMLElement>('.station-button'),
  onChange: () => {
    ++pendingOpen;
    reader?.sync();
    syncSceneAccessibility();
    updatePause();
    syncRoute();
  },
  onDismiss: (dialog, reason) => {
    if (dialog.id !== 'reader-dialog' || !reader) return false;
    reader.dismiss(reason);
    return true;
  },
});

function isStation(value: string | undefined): value is StationId {
  return (
    value === 'arrival' ||
    value === 'recipes' ||
    value === 'workbench' ||
    value === 'robot' ||
    value === 'contact'
  );
}

function syncSceneAccessibility() {
  const hideScene =
    !document.body.classList.contains('is-exploring') || shell.anyOpen();
  if (canvas) {
    canvas.setAttribute('aria-hidden', String(hideScene));
    canvas.tabIndex = hideScene ? -1 : 0;
    canvas.inert = hideScene;
  }
}

function updatePause() {
  controller?.setPaused(userPaused || document.hidden || shell.anyOpen());
  pauseButton?.setAttribute('aria-pressed', String(userPaused));
  const pauseLabel = pauseButton?.querySelector('span') ?? pauseButton;
  if (pauseLabel)
    pauseLabel.textContent = userPaused ? 'Resume scene' : 'Pause scene';
}

function enterLab() {
  ++pendingOpen;
  document.body.classList.add('is-exploring');
  const note = document.querySelector<HTMLElement>('#explore-note');
  if (note) note.hidden = false;
  controller?.navigate('arrival');
  if (locationLabel) locationLabel.textContent = labels.arrival;
  syncSceneAccessibility();
  canvas?.focus({ preventScroll: true });
  syncRoute();
}

async function openStation(
  station: StationId,
  origin: DialogOrigin,
  immediate = false
) {
  if (station === 'arrival') {
    shell.closeAll();
    enterLab();
    return;
  }
  const request = ++pendingOpen;
  controller?.navigate(station);
  if (locationLabel) locationLabel.textContent = labels[station];
  if (
    !immediate &&
    controller &&
    !shell.anyOpen() &&
    !userPaused &&
    !reducedMotion.matches
  ) {
    await new Promise((resolve) => setTimeout(resolve, 450));
  }
  if (request !== pendingOpen || disposed) return;
  const dialog = document.getElementById(`${station}-dialog`);
  if (dialog instanceof HTMLDialogElement) shell.show(dialog, origin);
}

for (const button of document.querySelectorAll<HTMLButtonElement>(
  '[data-open-station]'
)) {
  button.addEventListener('click', () => {
    const station = button.dataset.openStation;
    if (isStation(station))
      void openStation(station, { kind: 'control', element: button });
  });
}

const readerDialog =
  document.querySelector<HTMLDialogElement>('#reader-dialog');
const shelf = document.querySelector<HTMLDialogElement>('#recipes-dialog');
const shelfSearch = shelf ? setupRecipeSearch(shelf) : undefined;
if (readerDialog && shelf)
  reader = createTabletReader({
    root: readerDialog,
    shelf,
    shell,
    onWorkbench: () => {
      const route = document.querySelector<HTMLElement>(
        '.station-button[data-open-station="workbench"]'
      );
      void openStation(
        'workbench',
        route ? { kind: 'control', element: route } : { kind: 'scene' }
      );
    },
  });

const publishedSlugs = new Set(
  [...document.querySelectorAll<HTMLElement>('[data-recipe]')].flatMap(
    (book) => (book.dataset.recipe ? [book.dataset.recipe] : [])
  )
);

function syncRoute() {
  if (!router) return;
  if (readerDialog?.open && readerDialog.dataset.recipeSlug) {
    router.sync({ kind: 'article', slug: readerDialog.dataset.recipeSlug });
    return;
  }
  for (const station of ['recipes', 'workbench', 'robot', 'contact']) {
    if (
      isStation(station) &&
      station !== 'arrival' &&
      document.querySelector<HTMLDialogElement>(`#${station}-dialog`)?.open
    ) {
      router.sync({ kind: 'station', station });
      return;
    }
  }
  router.sync({
    kind: document.body.classList.contains('is-exploring') ? 'room' : 'home',
  });
}

router = createLabRouter({
  publishedSlugs,
  apply(route) {
    ++pendingOpen;
    if (route.kind === 'home') {
      shell.closeAll();
      document.body.classList.remove('is-exploring');
      const note = document.querySelector<HTMLElement>('#explore-note');
      if (note) note.hidden = true;
      controller?.navigate('arrival');
      syncSceneAccessibility();
      return;
    }
    enterLab();
    if (route.kind === 'room') shell.closeAll();
    else if (route.kind === 'article') {
      controller?.navigate('recipes');
      if (locationLabel) locationLabel.textContent = labels.recipes;
      reader?.open(route.slug);
    } else void openStation(route.station, { kind: 'scene' }, true);
  },
});
router.start();

for (const button of document.querySelectorAll<HTMLButtonElement>(
  '[data-copy-lab-link]'
)) {
  button.addEventListener('click', async () => {
    const panel = button.closest('dialog');
    const feedback = panel?.querySelector<HTMLElement>(
      '#reader-status, [data-status]'
    );
    try {
      await navigator.clipboard.writeText(location.href);
      if (feedback) feedback.textContent = 'Link copied.';
    } catch {
      if (feedback)
        feedback.textContent =
          'Could not copy. You can copy the address from your browser.';
    }
  });
}

document.addEventListener('keydown', (event) => {
  if (shell.anyOpen() || event.defaultPrevented) return;
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    target.closest('button, a, input, textarea, select')
  )
    return;
  if (
    [
      ' ',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'PageUp',
      'PageDown',
      'Home',
      'End',
    ].includes(event.key)
  )
    event.preventDefault();
});

document.querySelector('#enter-lab')?.addEventListener('click', enterLab);
document.querySelector('[data-robot-explore]')?.addEventListener('click', () => {
  shell.closeAll();
  enterLab();
});
pauseButton?.addEventListener('click', () => {
  userPaused = !userPaused;
  updatePause();
});
document.addEventListener('visibilitychange', updatePause);
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) userPaused = true;
  updatePause();
});

canvas?.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab' || event.shiftKey || shell.anyOpen()) return;
  if (!document.body.classList.contains('is-exploring')) return;
  event.preventDefault();
  (
    pauseButton ?? document.querySelector<HTMLElement>('.station-button')
  )?.focus({ preventScroll: true });
});

syncSceneAccessibility();
updatePause();

if (canvas) {
  import('../campus')
    .then(async ({ createCampus }) => {
      const active = await createCampus(
        canvas,
        {
          onStation: (station) => void openStation(station, { kind: 'scene' }),
          onReady: () => {
            if (status) status.textContent = '';
          },
          onError: () => {
            document.body.classList.add('scene-failed');
            if (status)
              status.textContent =
                'The 3D room is unavailable. Use the lab directory to open a station.';
          },
        },
        { controlsRoot: document.querySelector('#lab-main') ?? document.body }
      );
      if (disposed) active.dispose();
      else {
        controller = active;
        const route = parseLabRoute(location.hash, publishedSlugs);
        if (route?.kind === 'article') active.navigate('recipes');
        else if (route?.kind === 'station') active.navigate(route.station);
        updatePause();
      }
    })
    .catch(() => {
      document.body.classList.add('scene-failed');
      if (status)
        status.textContent =
          'The 3D room is unavailable. Use the lab directory to open a station.';
    });
}

window.addEventListener('pagehide', (event) => {
  ++pendingOpen;
  if (event.persisted) {
    // BFcache keeps the shell and its listeners. The robot releases its own
    // worker on every pagehide; the room only needs to stop rendering here.
    controller?.setPaused(true);
    return;
  }
  disposed = true;
  reader?.dispose();
  shelfSearch?.destroy();
  router?.destroy();
  controller?.dispose();
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    syncSceneAccessibility();
    updatePause();
  }
});
