import { z } from 'zod';
import records from './experience.json';
import resume from './resume.json';

const experienceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1), company: z.string().min(1), dates: z.string().min(1),
  strength: z.string().min(1), tags: z.array(z.string()).min(1), summary: z.string().min(1),
  details: z.array(z.string()).min(1), qualifications: z.array(z.string()),
  source: z.string().min(1), links: z.array(z.string().url()),
});
export const experiences = z.array(experienceSchema).superRefine((items, ctx) => {
  if (new Set(items.map(item => item.id)).size !== items.length) {
    ctx.addIssue({ code: 'custom', message: 'Experience IDs must be unique.' });
  }
}).parse(records);
export const currentResume = z.object({
  name: z.string(), title: z.string(), website: z.string().url(), updated: z.string(),
  description: z.string(), text: z.string(), notes: z.array(z.string()),
}).parse(resume);
export const guideUrl = 'https://timsexperiments.foo/resume/mcp';
export const endpointUrl = `${guideUrl}/server`;
export const sourceUrl = (id: string) => `tim-resume://experience/${id}`;

const stopWords = new Set('a an and are as at be been by can could did do does for from had has have he her him his how i in into is it me most much my of on or our s should show some tell that the their them there these they this tim timothy to us used using was were what when where whether which who why will with work worked experience about example examples give please describe anything any know you your built build building system systems time people use without strongest evidence level operate ever actually need make looking'.split(' '));
const aliases: Record<string, string> = {
  led: 'leadership', lead: 'leadership', leading: 'leadership', leader: 'leadership',
  mentor: 'mentoring', mentorship: 'mentoring', mentored: 'mentoring',
  scalability: 'scale', scaling: 'scale', scalable: 'scale',
  authentication: 'authentication', auth: 'authentication',
  postgres: 'postgresql', golang: 'go', protobufs: 'protobuf',
  automated: 'automation', automating: 'automation', automate: 'automation',
  localization: 'localization', localisation: 'localization',
  salary: 'compensation', graduation: 'education', graduated: 'education',
  pushback: 'influence', resistance: 'influence', skeptical: 'influence',
  productive: 'productivity',
  secure: 'security', secured: 'security',
  latencies: 'latency', rebuilds: 'rebuild', rebuilding: 'rebuild',
};
const tokenize = (text: string): string[] => (text.toLowerCase().match(/[a-z0-9+#]+/g) ?? [])
  .filter(term => !stopWords.has(term))
  .map(term => aliases[term] ?? (term.length > 4 && term.endsWith('s') && !term.endsWith('ss') ? term.slice(0, -1) : term));

// Index curated facts only. Qualifications remain attached to results, but their
// descriptions of unsupported topics must not make those topics rank as expertise.
const index = experiences.map(record => {
  const headline = tokenize(`${record.title} ${record.company} ${record.tags.join(' ')} ${record.summary}`);
  const body = tokenize(record.details.join(' '));
  const frequency = new Map<string, number>();
  for (const term of body) frequency.set(term, (frequency.get(term) ?? 0) + 1);
  for (const term of headline) frequency.set(term, (frequency.get(term) ?? 0) + 3);
  return { record, frequency, length: body.length + headline.length * 3 };
});
const averageLength = index.reduce((sum, entry) => sum + entry.length, 0) / Math.max(1, index.length);
const documentFrequency = new Map<string, number>();
for (const entry of index) for (const term of entry.frequency.keys()) {
  documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
}

export function matchesCompany(recordCompany: string, company?: string): boolean {
  if (!company) return true;
  const names: Record<string, string> = { tsa: 'texas sports academy', r1rcm: 'r1 rcm', r1: 'r1 rcm', ih: 'included health', 'arumi moves': 'naya studio' };
  const query = company.trim().toLowerCase();
  return recordCompany.toLowerCase().includes(names[query] ?? query);
}

export function searchExperience({ query, company, limit }: { query: string; company?: string; limit: number }) {
  // Translate common hiring concepts to editorial topic labels, not to invented facts.
  const concepts: Array<[RegExp, string]> = [
    [/\b(why.{0,35}(hire|choose|consider)|hire (him|tim)|stand out|strongest strengths|tell me about (yourself|tim)|generalist|breadth)\b/gi, 'staff-scope'],
    [/\b(staff|principal)([- ]level| engineer| scope| role)?\b/gi, 'staff-scope'],
    [/\b(influenc\w*|persuad\w*|convinc\w*|changed? minds|without authority)\b/gi, 'influence'],
    [/\b(measurable|measured|quantified|business) impact\b/gi, 'impact'],
    [/\b(thousands|millions|large scale|at scale)\b/gi, 'scale'],
    [/\b(machine learning)\b/gi, 'ML'],
    [/\b(visa sponsorship|work permit|right to work)\b/gi, 'work authorization'],
    [/\b(targeting|formal title|job title|actual title)\b/gi, 'career titles'],
    [/\b(headcount|team productivity|release productivity)\b/gi, 'developer productivity'],
  ];
  const normalized = concepts.reduce((text, [pattern, topic]) => text.replace(pattern, topic), query);
  const terms = [...new Set(tokenize(normalized))];
  return index
    .filter(({ record }) => matchesCompany(record.company, company))
    .map(entry => {
      const score = terms.reduce((sum, term) => {
        const tf = entry.frequency.get(term) ?? 0;
        const df = documentFrequency.get(term) ?? 0;
        const idf = Math.log(1 + (index.length - df + 0.5) / (df + 0.5));
        return sum + idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * entry.length / averageLength));
      }, 0);
      return { record: entry.record, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id))
    .slice(0, limit)
    .map(({ record }) => {
      const evidence = record.details.map((text, position) => ({ text, position,
        matches: tokenize(text).filter(term => terms.includes(term)).length,
      })).sort((a, b) => b.matches - a.matches || a.position - b.position)[0]?.text ?? record.summary;
      return { id: record.id, title: record.title, company: record.company, summary: record.summary,
        evidence, strength: record.strength, qualifications: record.qualifications, url: sourceUrl(record.id) };
    });
}
