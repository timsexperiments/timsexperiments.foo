/** Presentation only. The host remains responsible for requests and model state. */
export function createConversationView(root: HTMLElement) {
  const transcript = root.querySelector('[data-transcript]');
  const options = root.querySelector('[data-chat-options]');
  const panel = root.querySelector('.chat-options');
  const back = root.querySelector('[data-chat-back]');
  const newest = root.querySelector('[data-chat-new]');
  if (!(transcript instanceof HTMLElement) || !(options instanceof HTMLButtonElement) ||
      !(panel instanceof HTMLElement) || !(back instanceof HTMLButtonElement) ||
      !(newest instanceof HTMLButtonElement)) throw new Error('Incomplete conversation presentation');
  let following = true;
  let frame = 0;
  const greeting = transcript.firstElementChild?.cloneNode(true);
  const nearBottom = () => transcript.scrollHeight - transcript.clientHeight - transcript.scrollTop < 64;
  const follow = () => { transcript.scrollTop = transcript.scrollHeight; newest.hidden = true; following = true; };
  const onScroll = () => { following = nearBottom(); if (following) newest.hidden = true; };
  const showOptions = (open: boolean) => {
    options.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    transcript.hidden = open;
    if (open) { newest.hidden = true; back.focus(); }
    else { options.focus(); if (following) follow(); else newest.hidden = false; }
  };
  const revealLatest = () => { follow(); transcript.focus({ preventScroll: true }); };
  const toggle = () => showOptions(panel.hidden);
  const close = () => showOptions(false);
  options.addEventListener('click', toggle);
  back.addEventListener('click', close);
  newest.addEventListener('click', revealLatest);
  transcript.addEventListener('scroll', onScroll, { passive: true });
  const observer = new MutationObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (following) follow();
      else if (panel.hidden) newest.hidden = false;
    });
  });
  observer.observe(transcript, { childList: true, subtree: true, characterData: true });
  return {
    /** Call immediately before appending a turn, while the old scroll geometry exists. */
    beforeTurn() {
      if (!panel.hidden) {
        showOptions(false);
        root.querySelector('textarea')?.focus();
      }
      following = nearBottom();
    },
    /** Keep host textContent rendering, validation, and pending reply construction. */
    clear() {
      transcript.replaceChildren();
      if (greeting) transcript.append(greeting.cloneNode(true));
      following = true;
      newest.hidden = true;
      showOptions(false);
    },
    destroy() {
      observer.disconnect(); cancelAnimationFrame(frame);
      options.removeEventListener('click', toggle); back.removeEventListener('click', close);
      newest.removeEventListener('click', revealLatest); transcript.removeEventListener('scroll', onScroll);
    },
  };
}
