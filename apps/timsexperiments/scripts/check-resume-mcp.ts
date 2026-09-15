import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod';
import scenarios from '../src/lib/resume/scenarios.json';
import extendedScenarios from '../src/lib/resume/extended-scenarios.json';
import { experiences } from '../src/lib/resume/knowledge';

const endpoint = new URL(process.argv[2] ?? 'http://127.0.0.1:4322/resume/mcp/server');
const guide = new URL('/resume/mcp', endpoint);
const response = await fetch(guide);
if (!response.ok) throw new Error(`Guide returned ${response.status}`);
const html = await response.text();
for (const text of ['Copy prompt', 'Manual setup', 'search_experience', 'Naya Studio']) {
  if (!html.includes(text)) throw new Error(`Guide missing ${text}`);
}
const client = new Client({ name: 'resume-user-check', version: '1.0.0' });
const searchSchema = z.object({ matches: z.array(z.object({ id: z.string(), url: z.string().url() })) });
const storySchema = z.object({ id: z.string(), summary: z.string(), details: z.array(z.string()), qualifications: z.array(z.string()), url: z.string().url() });
function data(result: unknown): unknown {
  const parsed = z.object({ content: z.array(z.object({ type: z.string(), text: z.string().optional() })) }).parse(result);
  const text = parsed.content.find(item => item.type === 'text')?.text;
  if (!text) throw new Error('Tool returned no text');
  return JSON.parse(text);
}
try {
  await client.connect(new StreamableHTTPClientTransport(endpoint));
  const overview = data(await client.callTool({ name: 'get_resume', arguments: {} }));
  const trials = [];
  for (const scenario of scenarios) {
    const search = searchSchema.parse(data(await client.callTool({ name: 'search_experience', arguments: { query: scenario.question, limit: 3 } })));
    if (!search.matches.some(match => match.id === scenario.expected)) throw new Error(`Retrieval failed: ${scenario.question}`);
    const story = storySchema.parse(data(await client.callTool({ name: 'get_experience', arguments: { id: scenario.expected } })));
    if (!html.includes(`id="${scenario.expected}"`)) throw new Error(`Missing citation anchor: ${scenario.expected}`);
    const answerBrief = z.object({ status: z.string(), opening: z.string(), evidence: z.array(storySchema) }).parse(data(await client.callTool({ name: 'get_answer_brief', arguments: { question: scenario.question } })));
    if (!answerBrief.evidence.some(item => item.id === scenario.expected)) throw new Error(`Answer brief missed source: ${scenario.question}`);
    trials.push({ question: scenario.question, retrieved: search.matches.map(match => match.id), story, answerBrief });
  }
  const briefs = [];
  for (const scenario of extendedScenarios) {
    const search = searchSchema.parse(data(await client.callTool({ name: 'search_experience', arguments: { query: scenario.question, limit: 5 } })));
    if (!search.matches.some(match => match.id === scenario.expected)) throw new Error(`Extended retrieval failed: ${scenario.question}`);
    const brief = z.object({ status: z.string(), opening: z.string(), evidence: z.array(storySchema) }).parse(data(await client.callTool({ name: 'get_answer_brief', arguments: { question: scenario.question } })));
    if (!brief.evidence.some(story => story.id === scenario.expected)) throw new Error(`Brief missed evidence: ${scenario.question}`);
    briefs.push({ question: scenario.question, ...brief });
  }
  for (const story of experiences) {
    if (!html.includes(`id="${story.id}"`)) throw new Error(`Missing source: ${story.id}`);
    await client.readResource({ uri: `tim-resume://experience/${story.id}` });
  }
  const report = { endpoint: endpoint.href, stories: experiences.length, scenariosPassed: trials.length + briefs.length, overview, trials, briefs };
  const output = process.argv[3];
  if (output) await Bun.write(output, JSON.stringify(report, null, 2));
  console.log(`PASS: ${experiences.length} sources, ${trials.length + briefs.length} hiring scenarios, live guide and MCP transport.`);
} finally { await client.close(); }
