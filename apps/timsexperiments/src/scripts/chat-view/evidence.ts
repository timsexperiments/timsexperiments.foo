import type { BrowserAnswer } from '../../lib/resume/browser-answer';
import { experiences } from '../../lib/resume/knowledge';
import type { ConversationTurn } from '../../lib/conversations/protocol';

export function textNode(tag: string, text: string, className?: string) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

/** Conversational framing never rewrites the selected facts or their qualifications. */
export function conversationalParagraphs(answer: BrowserAnswer): string[] {
  const first = answer.paragraphs[0];
  const record = answer.brief.evidence[0];
  if (!first || !record || /^I\b|^Those are\b/.test(first))
    return answer.paragraphs;
  const introduction =
    record.company === 'Career overview'
      ? "Here's what I have about his background."
      : `I'd point you to his work at ${record.company}.`;
  return [
    `${introduction} ${first.replace(/^Tim's\b/, 'His').replace(/^Tim\b/, 'He')}`,
    ...answer.paragraphs.slice(1),
  ];
}

export function renderAnswer(container: HTMLElement, answer: BrowserAnswer) {
  renderSavedAnswer(container, {
    question: '',
    paragraphs: conversationalParagraphs(answer),
    experienceIds: answer.brief.evidence.map((record) => record.id),
  });
}

export function renderSavedAnswer(
  container: HTMLElement,
  answer: ConversationTurn
) {
  answer.paragraphs.forEach((paragraph) =>
    container.append(textNode('p', paragraph))
  );
  const records = experiences.filter((record) =>
    answer.experienceIds.includes(record.id)
  );
  if (!records.length) return;
  const references = document.createElement('section');
  references.className = 'robot-evidence';
  references.setAttribute('aria-label', 'Experiences referenced');
  references.append(textNode('h4', 'Experiences referenced'));
  const list = document.createElement('ul');
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    const item = document.createElement('li');
    item.append(
      textNode('span', record.title),
      textNode('small', `${record.company} · ${record.dates}`)
    );
    list.append(item);
  }
  references.append(list);
  container.append(references);
}
