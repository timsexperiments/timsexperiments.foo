import { safeSourceLink, type EvidenceRecord } from '../robot/evidence';
import type { BrowserAnswer } from '../../lib/resume/browser-answer';

export function textNode(tag: string, text: string, className?: string) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function source(record: EvidenceRecord) {
  const disclosure = document.createElement('details');
  disclosure.className = 'robot-source';
  const summary = document.createElement('summary');
  summary.append(
    textNode('span', record.title),
    textNode('small', `${record.company} · ${record.dates}`)
  );
  disclosure.append(summary, textNode('p', record.summary));
  const facts = document.createElement('ul');
  record.details.forEach((detail) => facts.append(textNode('li', detail)));
  disclosure.append(facts);
  if (record.qualifications.length) {
    disclosure.append(textNode('h5', 'Context and limits'));
    const limits = document.createElement('ul');
    record.qualifications.forEach((detail) =>
      limits.append(textNode('li', detail))
    );
    disclosure.append(limits);
  }
  disclosure.append(textNode('p', record.source, 'robot-source-note'));
  record.links.forEach((link) => {
    const href = safeSourceLink(link);
    if (!href) return;
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.textContent = new URL(href).hostname;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    disclosure.append(anchor);
  });
  return disclosure;
}

export function renderAnswer(container: HTMLElement, answer: BrowserAnswer) {
  answer.paragraphs.forEach((paragraph) =>
    container.append(textNode('p', paragraph))
  );
  if (!answer.brief.evidence.length) return;
  const evidence = document.createElement('details');
  evidence.className = 'robot-evidence';
  evidence.append(
    textNode(
      'summary',
      answer.brief.evidence.length === 1
        ? 'Source and context'
        : 'Sources and context'
    )
  );
  answer.brief.evidence.forEach((record) => evidence.append(source(record)));
  container.append(evidence);
}
