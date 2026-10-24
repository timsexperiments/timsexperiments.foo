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
  const showOptions = (open: boolean) => {
    options.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    transcript.hidden = open;
    if (open) back.focus();
  };
  const toggle = () => showOptions(panel.hidden);
  const close = () => {
    showOptions(false);
    options.focus();
  };
  const toggleHistory = () => {
    const expanded = root.dataset.history !== 'true';
    root.dataset.history = String(expanded);
    history?.setAttribute('aria-expanded', String(expanded));
    transcript.scrollTop = expanded ? 0 : transcript.scrollHeight;
  };
  const latest = () => {
    root.dataset.history = 'false';
    history?.setAttribute('aria-expanded', 'false');
    transcript.scrollTop = transcript.scrollHeight;
  };
  options.addEventListener('click', toggle);
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
      back.removeEventListener('click', close);
      history?.removeEventListener('click', toggleHistory);
    },
  };
}
