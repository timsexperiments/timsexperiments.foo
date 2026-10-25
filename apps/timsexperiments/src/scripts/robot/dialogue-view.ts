/** Current NPC subtitle stays visible; earlier turns remain available in the log. */
export function createDialogueView(root: HTMLElement) {
  const transcript = root.querySelector('[data-transcript]');
  const options = root.querySelector('[data-chat-options]');
  const panel = root.querySelector('.chat-options');
  const back = root.querySelector('[data-chat-back]');
  const history = root.querySelector('[data-dialogue-history]');
  if (
    !(transcript instanceof HTMLElement) ||
    !(options instanceof HTMLButtonElement) ||
    !(panel instanceof HTMLElement) ||
    !(back instanceof HTMLButtonElement)
  )
    throw new Error('Incomplete dialogue controls');
  const greeting = transcript.firstElementChild?.cloneNode(true);
  const controls = root.querySelector('[data-ai-controls]');
  const actionHome = root.querySelector('[data-conversation-ai-controls]');
  const settingsHome = root.querySelector('[data-settings-ai-controls]');
  const voice = root.querySelector('[data-voice-toggle]');
  const voiceHome = root.querySelector('[data-header-voice]');
  const voiceSettings = root.querySelector('[data-settings-voice]');
  const label = root.querySelector('[data-options-label]');
  const title = root.querySelector('[data-chat-title]');
  const privacy = root.querySelector('[data-chat-privacy]');
  const showOptions = (open: boolean) => {
    root.dataset.settings = String(open);
    options.setAttribute('aria-expanded', String(open));
    options.setAttribute(
      'aria-label',
      open ? 'Done with settings' : 'Settings'
    );
    options.setAttribute('title', open ? 'Done with settings' : 'Settings');
    if (label) label.textContent = open ? 'Done' : 'Settings';
    if (title) title.textContent = open ? 'Settings' : 'Lab host';
    if (controls) (open ? settingsHome : actionHome)?.append(controls);
    if (voice) (open ? voiceSettings : voiceHome)?.append(voice);
    panel.hidden = !open;
    transcript.hidden = open;
    if (open) {
      const firstControl = [
        ...panel.querySelectorAll<HTMLButtonElement>('button'),
      ].find(
        (control) =>
          !control.disabled && !control.hidden && control.checkVisibility()
      );
      (firstControl ?? back).focus({ preventScroll: true });
      panel.scrollTop = 0;
    }
  };
  const toggle = () => {
    const open = panel.hidden;
    showOptions(open);
    if (!open) options.focus({ preventScroll: true });
  };
  const showPrivacy = () => {
    showOptions(true);
    const details = panel.querySelector('details');
    if (details instanceof HTMLDetailsElement) details.open = true;
    panel.scrollTop = 0;
  };
  const close = () => {
    showOptions(false);
    options.focus();
  };
  const toggleHistory = () => {
    const expanded = root.dataset.history !== 'true';
    root.dataset.history = String(expanded);
    history?.setAttribute('aria-expanded', String(expanded));
    transcript.scrollTop = 0;
  };
  const latest = () => {
    root.dataset.history = 'false';
    history?.setAttribute('aria-expanded', 'false');
    transcript.scrollTop = 0;
  };
  options.addEventListener('click', toggle);
  privacy?.addEventListener('click', showPrivacy);
  back.addEventListener('click', close);
  history?.addEventListener('click', toggleHistory);
  return {
    beforeTurn() {
      showOptions(false);
      latest();
    },
    clear() {
      transcript.replaceChildren();
      if (greeting) transcript.append(greeting.cloneNode(true));
      showOptions(false);
      latest();
    },
    destroy() {
      options.removeEventListener('click', toggle);
      privacy?.removeEventListener('click', showPrivacy);
      back.removeEventListener('click', close);
      history?.removeEventListener('click', toggleHistory);
    },
  };
}
