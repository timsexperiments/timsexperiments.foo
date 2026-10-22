import { describe, expect, test } from 'bun:test';
import { conversationalParagraphs } from './evidence';
import { answerInBrowser } from '../../lib/resume/browser-answer';

describe('robot conversation framing', () => {
  test('keeps all selected facts and qualifications while introducing the example', () => {
    for (const question of [
      'What platform architecture has Tim led?',
      'What did the 71% support metric measure?',
      'How has Tim mentored engineers?',
      'What is his education?',
    ]) {
      const answer = answerInBrowser(question);
      const paragraphs = conversationalParagraphs(answer);
      expect(paragraphs.length).toBe(answer.paragraphs.length);
      expect(paragraphs.slice(1)).toEqual(answer.paragraphs.slice(1));
      if (answer.brief.evidence.length && answer.paragraphs[0]) {
        const fact = answer.paragraphs[0]
          .replace(/^Tim's\b/, 'His')
          .replace(/^Tim\b/, 'He');
        expect(paragraphs[0]).toContain(fact);
        expect(paragraphs[0]).not.toContain("He's engineering");
      }
    }
  });
  test('never invents an introduction for an unsupported question', () => {
    const answer = answerInBrowser('Has Tim worked on COBOL mainframes?');
    expect(answer.brief.evidence).toHaveLength(0);
    expect(conversationalParagraphs(answer)).toEqual(answer.paragraphs);
  });
});
