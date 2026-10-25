/** Filters published shelf metadata without fetching article bodies. */
export function setupRecipeSearch(shelf: HTMLElement) {
  const input = shelf.querySelector<HTMLInputElement>('#recipe-search');
  const clear = shelf.querySelector<HTMLButtonElement>('[data-search-clear]');
  const count = shelf.querySelector<HTMLElement>('[data-search-count]');
  const empty = shelf.querySelector<HTMLElement>('[data-search-empty]');
  const emptyMessage = shelf.querySelector<HTMLElement>(
    '[data-search-empty-message]'
  );
  const resetButton = shelf.querySelector<HTMLButtonElement>(
    '[data-search-reset]'
  );
  const normalize = (text: string) =>
    text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
  const cards = [
    ...shelf.querySelectorAll<HTMLElement>('[data-search-text]'),
  ].map((card) => ({
    card,
    text: normalize(card.dataset.searchText ?? ''),
  }));
  const filter = () => {
    const terms = normalize(input?.value ?? '')
      .split(/\s+/)
      .filter(Boolean);
    let found = 0;
    for (const { card, text } of cards) {
      card.hidden = !terms.every((term) => text.includes(term));
      if (!card.hidden) found++;
    }
    if (clear) clear.hidden = !input?.value;
    if (count)
      count.textContent = `${found} ${found === 1 ? 'article' : 'articles'}${terms.length ? ' found' : ''}`;
    if (empty) empty.hidden = found !== 0;
    if (emptyMessage)
      emptyMessage.textContent = `No articles match "${input?.value.trim() ?? ''}".`;
  };
  const reset = () => {
    if (input) {
      input.value = '';
      input.focus();
    }
    filter();
  };
  input?.addEventListener('input', filter);
  input?.addEventListener('search', filter);
  clear?.addEventListener('click', reset);
  resetButton?.addEventListener('click', reset);
  filter();
  return {
    destroy() {
      input?.removeEventListener('input', filter);
      input?.removeEventListener('search', filter);
      clear?.removeEventListener('click', reset);
      resetButton?.removeEventListener('click', reset);
    },
  };
}
