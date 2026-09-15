import { describe, expect, test } from 'bun:test';
import scenarios from './scenarios.json';
import { currentResume, searchExperience } from './knowledge';
import { getAnswerBrief } from './answering';

describe('recruiter retrieval scenarios', () => {
  for (const scenario of scenarios) test(scenario.question, () => {
    expect(searchExperience({ query: scenario.question, limit: 3 }).map(item => item.id)).toContain(scenario.expected);
  });
  test('unsupported subjects and unknown employers return no evidence', () => {
    for (const query of ['quantum cryptography', 'underwater basketweaving', 'a an the']) expect(searchExperience({ query, limit: 5 })).toEqual([]);
    expect(searchExperience({ query: 'software', company: 'Unknown Employer', limit: 5 })).toEqual([]);
  });
  test('overview preserves interview corrections', () => {
    expect(currentResume.text).not.toContain('designed an MCP scheduling agent');
    expect(currentResume.text).not.toContain('preserve 100% of existing use cases');
    expect(currentResume.notes.join(' ')).toContain('graduation');
    expect(currentResume.notes.join(' ')).toContain('one business');
  });
});

describe('positive framing without overstating evidence', () => {
  const checks = [
    { question: 'Was the bot 71% accurate?', id: 'r1-support', expected: 'not answer accuracy' },
    { question: 'Did every patient get care in 500ms?', id: 'included-health-router', expected: 'not total time' },
    { question: 'Did he train the model from scratch?', id: 'credera', expected: 'integrated' },
    { question: 'Was the whole onboarding migration complete?', id: 'included-health-data', expected: 'planned work' },
    { question: 'Are Naya and Arumi separate businesses?', id: 'naya-studio', expected: 'one business' },
    { question: 'Are 850000 npm downloads unique users?', id: 'open-source-es-exec', expected: 'not a count of unique users' },
    { question: 'Did he graduate from Georgia Tech?', id: 'career-context', expected: 'not confirmed' },
    { question: 'What are his salary expectations?', id: 'career-context', expected: 'confirmed with him' },
    { question: 'What are his weaknesses?', id: 'included-health-router', expected: 'engineering judgment' },
    { question: 'Why hire him for a Staff role requiring ML model training?', id: 'credera', expected: 'strong combination' },
    { question: 'Tell me about yourself', id: 'r1-dispatch', expected: 'hands-on platform' },
  ];
  for (const item of checks) test(item.question, () => {
    const brief = getAnswerBrief({ question: item.question });
    expect(brief.opening).toContain(item.expected);
    expect(brief.evidence.map(record => record.id)).toContain(item.id);
  });
  test('unrelated unknown skill is not converted into expertise', () => {
    const brief = getAnswerBrief({ question: 'Quantum cryptography' });
    expect(brief.status).toBe('not_documented');
    expect(brief.evidence).toEqual([]);
    expect(brief.opening).toContain('do not establish');
  });
  for (const company of ['TSA', 'R1RCM', 'IH', 'Arumi Moves', 'Google', 'Unknown Company']) {
    test(`company filter applies to briefing as well as search: ${company}`, () => {
      const expected = ({ TSA: 'Texas Sports Academy', R1RCM: 'R1 RCM', IH: 'Included Health', 'Arumi Moves': 'Naya Studio / Arumi Moves LLC', Google: 'Google', 'Unknown Company': 'Unknown Company' })[company];
      const question = ({ TSA: 'device management', R1RCM: 'dispatch', IH: 'practitioner platform', 'Arumi Moves': 'payroll', Google: 'supplier', 'Unknown Company': 'software' })[company] ?? 'software';
      const brief = getAnswerBrief({ question, company });
      expect(brief.evidence.every(record => record.company === expected)).toBe(true);
      if (company !== 'Unknown Company') expect(brief.evidence.length).toBeGreaterThan(0);
      if (company === 'Unknown Company') expect(brief.status).toBe('not_documented');
    });
  }
});


test('broad hiring questions produce a positive case with relevant evidence', () => {
  for (const question of ['Why should I hire Tim?', 'Is he just a generalist?']) {
    const brief = getAnswerBrief({ question });
    expect(brief.status).toBe('evidence_found');
    expect(brief.evidence.map(record => record.id)).toContain(question.includes('generalist') ? 'google-buying' : 'included-health-mentorship');
    expect(brief.opening).toContain(question.includes('generalist') ? 'consistent technical theme' : 'strong combination');
  }
});
