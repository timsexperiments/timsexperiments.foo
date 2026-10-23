import { experiences } from '../../lib/resume/knowledge';
import { textNode } from '../chat-view/evidence';

/** Public record navigation, never generated dialogue or archived chat. */
export function createExperienceExplorer(root: HTMLElement, open: () => void) {
  const panel = root.querySelector('[data-explorer]');
  const entry = root.querySelector('[data-explore]');
  const topics = root.querySelector('[data-explorer-topics]');
  const content = root.querySelector('[data-explorer-content]');
  if (
    !(panel instanceof HTMLElement) ||
    !(topics instanceof HTMLElement) ||
    !(content instanceof HTMLElement)
  )
    return;
  const groups = [
    { title: 'Platform', ids: ['r1-dispatch', 'included-health'] },
    { title: 'GraphQL', ids: ['included-health-graphql'] },
    { title: 'Mentoring', ids: ['included-health-mentorship'] },
    {
      title: 'Google',
      ids: experiences
        .filter((record) => record.company === 'Google')
        .map((record) => record.id),
    },
  ];
  const recordContent = content;
  function showRecords(ids: string[]) {
    recordContent.replaceChildren();
    for (const id of ids) {
      const record = experiences.find((item) => item.id === id);
      if (!record) continue;
      const item = document.createElement('article');
      item.append(
        textNode('h4', record.title),
        textNode('small', `${record.company} · ${record.dates}`)
      );
      recordContent.append(item);
    }
  }
  for (const group of groups) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = group.title;
    button.setAttribute('aria-pressed', String(group === groups[0]));
    button.addEventListener('click', () => {
      topics
        .querySelectorAll('button')
        .forEach((item) =>
          item.setAttribute('aria-pressed', String(item === button))
        );
      showRecords(group.ids);
    });
    topics.append(button);
  }
  const all = document.createElement('button');
  all.type = 'button';
  all.textContent = 'All records';
  all.addEventListener('click', () => {
    topics
      .querySelectorAll('button')
      .forEach((button) =>
        button.setAttribute('aria-pressed', String(button === all))
      );
    showRecords(experiences.map((record) => record.id));
  });
  topics.append(all);
  showRecords(groups[0]?.ids ?? []);
  const show = () => {
    open();
    panel.hidden = false;
    root.dataset.exploring = 'true';
    topics.querySelector('button')?.focus();
  };
  const hide = () => {
    panel.hidden = true;
    root.dataset.exploring = 'false';
  };
  entry?.addEventListener('click', show);
  return {
    hide,
    destroy() {
      entry?.removeEventListener('click', show);
    },
  };
}
