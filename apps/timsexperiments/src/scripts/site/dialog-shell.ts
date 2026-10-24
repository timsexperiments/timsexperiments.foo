export type DialogOrigin =
  | { kind: 'scene' }
  | { kind: 'control'; element: HTMLElement };

/** Owns native modal lifecycle and focus. Scene policy stays with the page bridge. */
export function createDialogShell(options: {
  dialogs: HTMLDialogElement[];
  fallbackFocus: () => HTMLElement | null;
  onChange: () => void;
  onDismiss: (dialog: HTMLDialogElement, reason: 'close' | 'escape') => boolean;
}) {
  let origin: DialogOrigin = { kind: 'scene' };
  const switched = new WeakSet<HTMLDialogElement>();
  const anyOpen = () => options.dialogs.some((dialog) => dialog.open);

  function restoreFocus() {
    const target =
      origin.kind === 'control' ? origin.element : options.fallbackFocus();
    if (
      target?.isConnected &&
      target.checkVisibility() &&
      !target.closest('[inert], [hidden], dialog:not([open])')
    ) {
      target.focus({ preventScroll: true });
    } else options.fallbackFocus()?.focus({ preventScroll: true });
  }

  function changed() {
    document.body.style.overflow = anyOpen() ? 'hidden' : '';
    options.onChange();
    if (!anyOpen()) restoreFocus();
  }

  function closeOthers(destination?: HTMLDialogElement) {
    for (const dialog of options.dialogs) {
      if (!dialog.open || dialog === destination) continue;
      switched.add(dialog);
      dialog.dispatchEvent(new Event('lab:before-close'));
      dialog.close();
    }
  }

  function show(
    dialog: HTMLDialogElement,
    nextOrigin?: DialogOrigin,
    focus?: HTMLElement | null
  ) {
    if (nextOrigin) origin = nextOrigin;
    if (!dialog.open) dialog.showModal();
    closeOthers(dialog);
    changed();
    (
      focus ??
      dialog.querySelector<HTMLElement>('.dialog-close') ??
      dialog
    ).focus({ preventScroll: true });
  }

  function dismiss(dialog: HTMLDialogElement) {
    if (!dialog.open) return;
    switched.add(dialog);
    dialog.dispatchEvent(new Event('lab:before-close'));
    dialog.close();
    changed();
  }

  for (const dialog of options.dialogs) {
    const requestClose = (reason: 'close' | 'escape') => {
      if (!options.onDismiss(dialog, reason)) dismiss(dialog);
    };
    dialog
      .querySelector('.dialog-close')
      ?.addEventListener('click', () => requestClose('close'));
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      requestClose('escape');
    });
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      )
        requestClose('close');
    });
    dialog.addEventListener('close', () => {
      if (!switched.delete(dialog)) changed();
    });
  }

  return {
    show,
    dismiss,
    anyOpen,
    closeAll: () => {
      closeOthers();
      changed();
    },
  };
}

export type DialogShell = ReturnType<typeof createDialogShell>;
