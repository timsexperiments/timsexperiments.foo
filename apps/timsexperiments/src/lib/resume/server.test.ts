import { describe, expect, test } from 'bun:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { handleResumeRequest } from './server';
import { experiences } from './knowledge';

describe('resume MCP', () => {
  test('a real SDK client can initialize, search, retrieve sources, and read the resume', async () => {
    const listener = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: handleResumeRequest });
    const client = new Client({ name: 'resume-test', version: '1.0.0' });
    try {
      await client.connect(new StreamableHTTPClientTransport(new URL('/resume/mcp/server', listener.url)));
      expect(client.getServerVersion()?.name).toBe('tim-experience');
      expect(client.getInstructions()).toContain('Consulting client identities are withheld');
      const list = await client.listTools();
      expect(list.tools.map(t => t.name)).toEqual(['get_resume', 'search_experience', 'get_experience', 'get_answer_brief']);
      const search = await client.callTool({ name: 'search_experience', arguments: { query: 'Slack support' } });
      expect(JSON.stringify(search)).toContain('r1-support');
      const story = await client.callTool({ name: 'get_experience', arguments: { id: 'r1-support' } });
      expect(JSON.stringify(story)).toContain('tim-resume://experience/r1-support');
      expect(JSON.stringify(story)).not.toContain('/resume/mcp#');
      expect(JSON.stringify(story)).toContain('71%');
      expect(JSON.stringify(story)).toContain('delegated');
      expect(JSON.stringify(story)).toContain('measurement window');
      const missing = await client.callTool({ name: 'get_experience', arguments: { id: '../../docs/private' } });
      expect(missing.isError).toBe(true);
      const invalid = await client.callTool({ name: 'search_experience', arguments: { query: 'a', limit: 10000 } });
      expect(invalid.isError).toBe(true);
      const overview = await client.callTool({ name: 'get_resume', arguments: {} });
      expect(JSON.stringify(overview)).toContain('Naya');
      const questions = ['Tell me about the routing redesign', 'Explain the database lock tradeoffs in routing'];
      const briefs = await Promise.all(questions.map(question => client.callTool({ name: 'get_answer_brief', arguments: { question } })));
      for (const brief of briefs) {
        expect(brief.isError).not.toBe(true);
        expect(JSON.stringify(brief)).toContain('included-health-router');
        expect(JSON.stringify(brief)).toContain('advocate');
      }
      for (const args of [{ question: '' }, { question: ' ' }, { question: 'x'.repeat(6001) }, { question: 5 }, { question: 'test', company: '' }]) {
        expect((await client.callTool({ name: 'get_answer_brief', arguments: args })).isError).toBe(true);
      }
      expect((await client.callTool({ name: 'delete_experience', arguments: {} })).isError).toBe(true);
      const resources = await client.listResources();
      expect(resources.resources).toHaveLength(experiences.length + 1);
      const resume = await client.readResource({ uri: 'tim-resume://resume' });
      expect(JSON.stringify(resume)).toContain('Feb 2026');
      const resource = await client.readResource({ uri: 'tim-resume://experience/r1-support' });
      expect(JSON.stringify(resource)).toContain('71%');
      const prompt = await client.getPrompt({ name: 'explore_experience', arguments: { question: 'Staff platform role' } });
      expect(JSON.stringify(prompt)).toContain('distinguish personal ownership');
      const prompts = await client.listPrompts();
      expect(prompts.prompts[0]?.name).toBe('explore_experience');
    } finally { await client.close(); listener.stop(true); }
  });
  test('bounds requests without Content-Length and rejects malformed JSON', async () => {
    const large = await handleResumeRequest(new Request('http://localhost/resume/mcp/server', { method: 'POST', headers: { 'content-type': 'application/json' }, body: ' '.repeat(32769) }));
    expect(large.status).toBe(413);
    const malformed = await handleResumeRequest(new Request('http://localhost/resume/mcp/server', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' }));
    expect(malformed.status).toBe(400);
  });
});

describe('HTTP boundary behavior', () => {
  for (const method of ['GET', 'PUT', 'PATCH', 'DELETE']) test(`reject ${method} without exposing data`, async () => {
    const response = await handleResumeRequest(new Request('http://localhost/resume/mcp/server', { method }));
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST, OPTIONS');
  });
  test('preflight permits any browser client', async () => {
    const response = await handleResumeRequest(new Request('http://localhost/resume/mcp/server', { method: 'OPTIONS', headers: { origin: 'https://any-agent.example' } }));
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
  test('wrong media type is rejected', async () => {
    expect((await handleResumeRequest(new Request('http://localhost/resume/mcp/server', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' }))).status).toBe(415);
  });
  test('initialization accepts browser, opaque, and origin-free clients', async () => {
    for (const origin of ['https://any-agent.example', 'null', undefined]) {
      const headers = new Headers({ 'content-type': 'application/json', accept: 'application/json, text/event-stream' });
      if (origin) headers.set('origin', origin);
      const response = await handleResumeRequest(new Request('https://timsexperiments.foo/resume/mcp/server', {
        method: 'POST', headers,
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'generic-agent', version: '1.0.0' } } }),
      }));
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.has('Access-Control-Allow-Credentials')).toBe(false);
      expect(await response.text()).toContain('tim-experience');
    }
  });
});
