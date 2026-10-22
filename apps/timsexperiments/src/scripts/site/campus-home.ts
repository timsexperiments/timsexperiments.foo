import type { StationId } from '../campus';
import { createDialogShell, type DialogOrigin } from './dialog-shell';
import { createTabletReader } from './tablet-reader';

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
}

async function openStation(station: StationId, origin: DialogOrigin) {
  if (station === 'arrival') {
    shell.closeAll();
    enterLab();
    return;
  }
  const request = ++pendingOpen;
  controller?.navigate(station);
  if (locationLabel) locationLabel.textContent = labels[station];
  if (controller && !shell.anyOpen() && !userPaused && !reducedMotion.matches) {
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

window.addEventListener('pagehide', () => {
  disposed = true;
  ++pendingOpen;
  reader?.dispose();
  controller?.dispose();
});
