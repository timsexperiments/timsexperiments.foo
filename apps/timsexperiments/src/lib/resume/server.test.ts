import { describe, expect, test } from 'bun:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { handleResumeRequest } from './server';
import { experiences, searchExperience } from './knowledge';

describe('resume MCP', () => {
  test('a real SDK client can initialize, search, retrieve sources, and read the resume', async () => {
    const listener = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: handleResumeRequest });
    const client = new Client({ name: 'resume-test', version: '1.0.0' });
    try {
      await client.connect(new StreamableHTTPClientTransport(new URL('/resume/mcp/server', listener.url)));
      const list = await client.listTools();
      expect(list.tools.map(t => t.name)).toEqual(['get_resume', 'search_experience', 'get_experience', 'get_answer_brief']);
      const search = await client.callTool({ name: 'search_experience', arguments: { query: 'Slack support' } });
      expect(JSON.stringify(search)).toContain('r1-support');
      const story = await client.callTool({ name: 'get_experience', arguments: { id: 'r1-support' } });
      expect(JSON.stringify(story)).toContain('71%');
      expect(JSON.stringify(story)).toContain('delegated');
      expect(JSON.stringify(story)).toContain('measurement window');
      const missing = await client.callTool({ name: 'get_experience', arguments: { id: '../../docs/private' } });
      expect(missing.isError).toBe(true);
      const invalid = await client.callTool({ name: 'search_experience', arguments: { query: 'a', limit: 10000 } });
      expect(invalid.isError).toBe(true);
      const resources = await client.listResources();
      expect(resources.resources).toHaveLength(experiences.length + 1);
      const resume = await client.readResource({ uri: 'tim-resume://resume' });
      expect(JSON.stringify(resume)).toContain('Feb 2026');
      const prompts = await client.listPrompts();
      expect(prompts.prompts[0]?.name).toBe('explore_experience');
    } finally { await client.close(); listener.stop(true); }
  });
  test('unknown subjects do not return invented evidence', () => {
    expect(searchExperience({ query: 'underwater basketweaving', limit: 5 })).toEqual([]);
    expect(searchExperience({ query: 'banking', company: 'Google', limit: 5 }).every(r => r.company === 'Google')).toBe(true);
  });
  test('rejects unexpected origins and bounds requests without Content-Length', async () => {
    const forbidden = await handleResumeRequest(new Request('http://localhost/resume/mcp/server', { method: 'POST', headers: { origin: 'https://untrusted.example', 'content-type': 'application/json' }, body: '{}' }));
    expect(forbidden.status).toBe(403);
    const large = await handleResumeRequest(new Request('http://localhost/resume/mcp/server', { method: 'POST', headers: { 'content-type': 'application/json' }, body: ' '.repeat(32769) }));
    expect(large.status).toBe(413);
    const malformed = await handleResumeRequest(new Request('http://localhost/resume/mcp/server', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' }));
    expect(malformed.status).toBe(400);
  });
});
