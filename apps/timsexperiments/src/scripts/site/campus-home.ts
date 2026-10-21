import type { StationId } from '../campus';

const canvas = document.querySelector<HTMLCanvasElement>('#campus-canvas');
const status = document.querySelector<HTMLElement>('#scene-status');
const pauseButton = document.querySelector<HTMLButtonElement>('#toggle-scene');
const locationLabel = document.querySelector<HTMLElement>('#location-label');
const copyStatus = document.querySelector<HTMLElement>('#reader-copy-status');
const labels = { arrival: 'Arrival', recipes: 'The recipe shelf', workbench: 'The workbench', robot: 'Your lab host', contact: 'The letter desk' } satisfies Record<StationId, string>;
let controller: Awaited<ReturnType<typeof import('../campus')['createCampus']>> | undefined;
let userPaused = matchMedia('(prefers-reduced-motion: reduce)').matches;
let disposed = false;
type DialogOrigin = { kind: 'scene' } | { kind: 'control'; element: HTMLElement };
let dialogOrigin: DialogOrigin = { kind: 'scene' };
const handledCloseEvents = new WeakSet<HTMLDialogElement>();
let pendingOpen = 0;
const dialogs = [...document.querySelectorAll<HTMLDialogElement>('.lab-dialog')];
const wiredCopyRoots = new WeakSet<ParentNode>();

function isStation(value: string | undefined): value is StationId {
  return value === 'arrival' || value === 'recipes' || value === 'workbench' || value === 'robot' || value === 'contact';
}

function anyDialogOpen() {
  return dialogs.some(dialog => dialog.open);
}

function syncSceneAccessibility() {
  const exploring = document.body.classList.contains('is-exploring');
  const hideScene = !exploring || anyDialogOpen();
  if (canvas) {
    canvas.setAttribute('aria-hidden', String(hideScene));
    canvas.tabIndex = hideScene ? -1 : 0;
    canvas.inert = hideScene;
    if (hideScene && document.activeElement === canvas) {
      (document.querySelector<HTMLElement>('#enter-lab') ?? document.querySelector<HTMLElement>('.station-button'))?.focus({ preventScroll: true });
    }
  }
}

function focusDialog(dialog: HTMLDialogElement) {
  const target =
    dialog.querySelector<HTMLElement>('.dialog-close') ??
    dialog.querySelector<HTMLElement>('#reader-back') ??
    dialog.querySelector<HTMLElement>('button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
  (target ?? dialog).focus({ preventScroll: true });
}

function wireArticleCopy(root: ParentNode) {
  if (wiredCopyRoots.has(root)) return;
  wiredCopyRoots.add(root);
  for (const block of root.querySelectorAll('div[data-code-block]')) {
    const copyButton = block.querySelector<HTMLButtonElement>('button[data-copy-code-button]') ?? block.querySelector<HTMLButtonElement>('button');
    const copyText = block.querySelector('pre')?.innerText ?? '';
    copyButton?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyText);
        if (copyStatus) copyStatus.textContent = 'Copied code to clipboard';
      } catch {
        if (copyStatus) copyStatus.textContent = 'Could not copy. Select the code and copy it manually.';
      }
    });
  }
}

function updatePause() {
  controller?.setPaused(userPaused || document.hidden || anyDialogOpen());
  pauseButton?.setAttribute('aria-pressed', String(userPaused));
  if (pauseButton) pauseButton.textContent = userPaused ? 'Resume scene' : 'Pause scene';
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

function closeDialogs(destination?: HTMLDialogElement) {
  for (const dialog of dialogs) {
    if (!dialog.open || dialog === destination) continue;
    // Native close events are queued, so remember each switched panel until its event arrives.
    handledCloseEvents.add(dialog);
    dialog.close();
  }
}

function restoreDialogOrigin() {
  const target = dialogOrigin.kind === 'control' ? dialogOrigin.element : canvas;
  if (target?.isConnected && target.checkVisibility() && !target.closest('[inert], [hidden], dialog:not([open])')) {
    target.focus({ preventScroll: true });
    return;
  }
  const fallback = document.body.classList.contains('is-exploring')
    ? canvas
    : document.querySelector<HTMLElement>('.station-button');
  fallback?.focus({ preventScroll: true });
}

function finishDialogClose() {
  if (anyDialogOpen()) return;
  ++pendingOpen;
  document.body.style.overflow = '';
  syncSceneAccessibility();
  updatePause();
  restoreDialogOrigin();
}

function dismissDialog(dialog: HTMLDialogElement) {
  handledCloseEvents.add(dialog);
  dialog.close();
  // Restore before the next key event, rather than waiting for the queued native close event.
  finishDialogClose();
}

async function openStation(station: StationId, origin: DialogOrigin) {
  if (station === 'arrival') { closeDialogs(); enterLab(); return; }
  const request = ++pendingOpen;
  controller?.navigate(station);
  if (locationLabel) locationLabel.textContent = labels[station];
  if (controller && !anyDialogOpen() && !userPaused && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    await new Promise(resolve => setTimeout(resolve, 450));
  }
  if (request !== pendingOpen || disposed) return;
  const dialog = document.getElementById(`${station}-dialog`);
  if (!(dialog instanceof HTMLDialogElement)) return;
  dialogOrigin = origin;
  dialog.showModal();
  closeDialogs(dialog);
  document.body.style.overflow = 'hidden';
  syncSceneAccessibility();
  focusDialog(dialog);
  updatePause();
}

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-open-station]')) {
  button.addEventListener('click', () => {
    const station = button.dataset.openStation;
    if (!isStation(station)) return;
    // A reader CTA disappears on close. Return to the matching visible station route instead.
    const route = button.closest('#reader-dialog')
      ? document.querySelector<HTMLElement>(`.station-button[data-open-station="${station}"]`)
      : button;
    void openStation(station, route ? { kind: 'control', element: route } : { kind: 'scene' });
  });
}

for (const dialog of dialogs) {
  dialog.querySelector('.dialog-close')?.addEventListener('click', () => dismissDialog(dialog));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dismissDialog(dialog);
  });
  dialog.addEventListener('close', () => {
    if (handledCloseEvents.delete(dialog)) return;
    finishDialogClose();
  });
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    if (dialog.id === 'reader-dialog') {
      void openStation('recipes', dialogOrigin);
    } else {
      dismissDialog(dialog);
    }
  });
}

const reader = document.querySelector<HTMLDialogElement>('#reader-dialog');
if (reader) wireArticleCopy(reader);

for (const book of document.querySelectorAll<HTMLButtonElement>('#recipes-dialog [data-recipe]')) {
  book.addEventListener('click', () => {
    const slug = book.dataset.recipe;
    if (!reader) return;
    for (const article of reader.querySelectorAll<HTMLElement>('[data-recipe-content]')) article.hidden = article.dataset.recipeContent !== slug;
    ++pendingOpen;
    reader.showModal();
    closeDialogs(reader);
    reader.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    syncSceneAccessibility();
    focusDialog(reader);
    updatePause();
  });
}

document.addEventListener('keydown', event => {
  if (anyDialogOpen() || event.defaultPrevented) return;
  const target = event.target;
  if (target instanceof HTMLElement && target.closest('button, a, input, textarea, select')) return;
  if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) event.preventDefault();
});

document.querySelector('#reader-back')?.addEventListener('click', () => void openStation('recipes', dialogOrigin));
document.querySelector('#enter-lab')?.addEventListener('click', enterLab);
pauseButton?.addEventListener('click', () => { userPaused = !userPaused; updatePause(); });
document.addEventListener('visibilitychange', updatePause);

canvas?.addEventListener('keydown', event => {
  if (event.key !== 'Tab' || event.shiftKey || anyDialogOpen()) return;
  if (!document.body.classList.contains('is-exploring')) return;
  event.preventDefault();
  (pauseButton ?? document.querySelector<HTMLElement>('.station-button'))?.focus({ preventScroll: true });
});

syncSceneAccessibility();
updatePause();

if (canvas) {
  import('../campus').then(async ({ createCampus }) => {
    const active = await createCampus(canvas, {
      onStation: station => void openStation(station, { kind: 'scene' }),
      onReady: () => { if (status) status.textContent = ''; },
      onError: () => { document.body.classList.add('scene-failed'); if (status) status.textContent = 'The 3D room is unavailable. Use the lab directory to open a station.'; },
    });
    if (disposed) active.dispose();
    else { controller = active; updatePause(); }
  }).catch(() => {
    document.body.classList.add('scene-failed');
    if (status) status.textContent = 'The 3D room is unavailable. Use the lab directory to open a station.';
  });
}

window.addEventListener('pagehide', () => { disposed = true; ++pendingOpen; controller?.dispose(); });
