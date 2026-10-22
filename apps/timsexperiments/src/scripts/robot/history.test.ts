import { describe, expect, test } from 'bun:test';
import { answerInBrowser } from '../../lib/resume/browser-answer';
import { conversationalParagraphs } from '../chat-view/evidence';
import { conversationTurnSchema } from '../../lib/conversations/protocol';
import scenarios from '../../lib/resume/scenarios.json';

describe('saved resume reply protocol', () => {
  for (const { question } of scenarios) test(`stores the complete displayed reply: ${question}`, () => {
    const answer = answerInBrowser(question);
    const payload = {
      question,
      paragraphs: conversationalParagraphs(answer),
      experienceIds: answer.brief.evidence.map((record) => record.id),
    };
    expect(conversationTurnSchema.parse(payload)).toEqual(payload);
  });
});
