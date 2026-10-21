import { describe, expect, test } from 'bun:test';
import {
  briefSchema,
  checkGeneratedAnswer,
  generationPrompt,
  groundedContext,
  parseModelDraft,
  parseToolResult,
  safeSourceLink,
} from './evidence';
import { selectGpuModel, modelIds } from './gpu';

export const record = {
  id: 'support',
  title: 'Support workflow',
  company: 'Example',
  dates: 'Historical',
  strength: 'Led a support workflow.',
  summary: 'A team delivered support automation.',
  tags: ['support'],
  details: [
    'Approximately 71% of conversations resolved without an engineering reply.',
  ],
  qualifications: [
    'The 71% measures resolution, not answer accuracy.',
    'Teammates implemented the bot.',
  ],
  source: 'Curated self-report.',
  links: ['https://example.com/evidence'],
  url: 'tim-resume://experience/support',
};
export const fixture = {
  status: 'evidence_found',
  opening: record.strength,
  relevance: 'Candidate evidence, not confirmation.',
  focus: 'Preserve the metric and ownership qualifications.',
  evidence: [record],
};

describe('browser evidence boundary', () => {
  test('generation prompt names real allowed IDs and rejects placeholder guidance', () => {
    const prompt = generationPrompt({
      question: 'What did Tim lead?',
      context: JSON.stringify(fixture),
      allowedIds: ['support'],
    });
    expect(prompt).toContain('ALLOWED SOURCE IDS:\nsupport');
    expect(prompt).toContain(record.qualifications[0]);
  });
  test('parses a constrained draft and appends only allowed citations', () => {
    expect(
      parseModelDraft(
        JSON.stringify({
          answer: record.details[0],
          citations: ['support'],
        }),
        ['support']
      )
    ).toBe(`${record.details[0]} [support]`);
    expect(
      parseModelDraft(
        JSON.stringify({ answer: 'Claim.', citations: ['made-up'] }),
        ['support']
      )
    ).toBeUndefined();
    expect(
      parseModelDraft(
        JSON.stringify({ answer: 'A supported fact.', citations: ['support'] }),
        ['support']
      )
    ).toBeUndefined();
  });
  test('parses the actual MCP text envelope and keeps complete qualifications', () => {
    const brief = parseToolResult({
      content: [{ type: 'text', text: JSON.stringify(fixture) }],
    });
    expect(brief.evidence[0]?.qualifications).toEqual(record.qualifications);
    expect(brief.opening).toBe(record.strength);
  });
  test('rejects tool errors, malformed or oversized responses and mismatched resource IDs', () => {
    expect(() => parseToolResult({ isError: true, content: [] })).toThrow();
    expect(() =>
      parseToolResult({ content: [{ type: 'text', text: '{}' }] })
    ).toThrow();
    expect(() =>
      parseToolResult({ content: [{ type: 'text', text: 'x'.repeat(200000) }] })
    ).toThrow();
    expect(() =>
      briefSchema.parse({
        ...fixture,
        evidence: [{ ...record, url: 'https://example.com' }],
      })
    ).toThrow();
    expect(() =>
      briefSchema.parse({
        ...fixture,
        evidence: [{ ...record, qualifications: undefined }],
      })
    ).toThrow();
  });
  test('not documented stays unknown and cannot enter generation', () => {
    const brief = briefSchema.parse({
      status: 'not_documented',
      opening: 'Not established.',
      evidence: [],
    });
    expect(groundedContext(brief)).toBeUndefined();
  });
  test('context includes whole records, keeps qualifications, and excludes an oversized record', () => {
    const brief = briefSchema.parse({
      ...fixture,
      evidence: [
        record,
        {
          ...record,
          id: 'large',
          url: 'tim-resume://experience/large',
          details: ['x'.repeat(10000)],
        },
      ],
    });
    const context = groundedContext(brief);
    expect(context?.text).toContain(record.qualifications[0]);
    expect(context?.ids).toEqual(['support']);
    expect(context?.text).not.toContain('"opening"');
    expect(
      groundedContext(
        briefSchema.parse({
          ...fixture,
          evidence: [{ ...record, details: ['x'.repeat(10000)] }],
        })
      )
    ).toBeUndefined();
  });
  test('accepts only source HTTPS links with no credentials', () => {
    for (const link of [
      'javascript:alert(1)',
      'data:text/html,test',
      'http://example.com',
      'https://user:password@example.com',
    ])
      expect(safeSourceLink(link)).toBeUndefined();
    expect(safeSourceLink('https://example.com/evidence')).toBe(
      'https://example.com/evidence'
    );
  });
  test('withholds the literal placeholder citations observed in browser evaluation', () => {
    const brief = briefSchema.parse(fixture);
    for (const answer of [
      '[source-id]: Tim Mentors Other Engineers\n[source-id]: Tim Mentors Other Engineers',
      '[source-id]: Tim has professional COBOL mainframe experience',
      '', // The worker suppresses incomplete generations before this boundary.
    ])
      expect(checkGeneratedAnswer(answer, brief)).toBeUndefined();
  });
  test('withholds obvious generated grounding failures', () => {
    const brief = briefSchema.parse(fixture);
    const copied = `${record.details[0]} [support]`;
    expect(checkGeneratedAnswer(copied, brief)).toBe(copied);
    for (const answer of [
      'Tim led delivery [support].',
      'Tim led delivery.',
      'Tim led delivery [made-up].',
      'Reached 95% [support].',
      'See https://evil.example [support].',
      '<script>bad</script> [support]',
      '[link](javascript:bad) [support]',
    ])
      expect(checkGeneratedAnswer(answer, brief)).toBeUndefined();
  });
});

describe('GPU model selection', () => {
  function gpu(f16: boolean, capacity = 128 * 1024 * 1024) {
    return {
      async requestAdapter() {
        return {
          limits: { maxStorageBufferBindingSize: capacity },
          features: new Set(f16 ? ['shader-f16'] : []),
        };
      },
    };
  }
  test('selects only a supported precision before downloading', async () => {
    expect(await selectGpuModel(gpu(true))).toBe(modelIds.f16);
    expect(await selectGpuModel(gpu(false))).toBe(modelIds.f32);
  });
  test('fails absent adapters and insufficient capacity honestly', async () => {
    await expect(selectGpuModel(undefined)).rejects.toThrow();
    await expect(
      selectGpuModel({
        async requestAdapter() {
          return null;
        },
      })
    ).rejects.toThrow();
    await expect(selectGpuModel(gpu(true, 1024))).rejects.toThrow();
  });
});
