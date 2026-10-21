import { afterEach, expect, spyOn, test } from 'bun:test';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { getEvidence } from './mcp';

const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
afterEach(() => {
  if (windowDescriptor)
    Object.defineProperty(globalThis, 'window', windowDescriptor);
  else Reflect.deleteProperty(globalThis, 'window');
});
function fetchImplementation(
  fn: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>
) {
  return Object.assign(fn, { preconnect: fetch.preconnect });
}
function browserOrigin() {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { origin: 'https://portfolio.example' } },
  });
}

test('real SDK initialization and allowlisted tool call work with stateless JSON transport, without a listening server', async () => {
  browserOrigin();
  const methods: string[] = [];
  const questions: string[] = [];
  const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
    fetchImplementation(async (input, init) => {
      const request = new Request(input, init);
      expect(request.url).toBe('https://portfolio.example/resume/mcp/server');
      expect(init?.credentials).toBe('omit');
      expect(init?.redirect).toBe('error');
      expect(init?.cache).toBe('no-store');
      methods.push(request.method);
      if (request.method !== 'POST') return new Response(null, { status: 405 });
      const server = new McpServer({
        name: 'synthetic-evidence',
        version: '1.0.0',
      });
      server.registerTool(
        'get_answer_brief',
        { inputSchema: { question: z.string() } },
        async ({ question }) => {
          questions.push(question);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'not_documented',
                  opening: 'This fixture does not establish that detail.',
                  evidence: [],
                }),
              },
            ],
          };
        }
      );
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      try {
        await server.connect(transport);
        return await transport.handleRequest(request, {
          parsedBody: await request.json(),
        });
      } finally {
        await server.close();
      }
    })
  );
  try {
    const brief = await getEvidence(
      'Does this record establish a skill?',
      new AbortController().signal
    );
    expect(brief.status).toBe('not_documented');
    expect(questions).toEqual(['Does this record establish a skill?']);
    expect(
      methods.filter((method) => method === 'POST').length
    ).toBeGreaterThanOrEqual(2);
  } finally {
    fetchSpy.mockRestore();
  }
});

test('an already cancelled request never contacts the endpoint', async () => {
  browserOrigin();
  const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
    fetchImplementation(async () => {
      throw new Error('Unexpected network access');
    })
  );
  const controller = new AbortController();
  controller.abort();
  try {
    await expect(getEvidence('question', controller.signal)).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally {
    fetchSpy.mockRestore();
  }
});

test('oversized responses fail before SDK parsing', async () => {
  browserOrigin();
  const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
    fetchImplementation(
      async () =>
        new Response('x'.repeat(257 * 1024), {
          headers: { 'Content-Type': 'application/json' },
        })
    )
  );
  try {
    await expect(
      getEvidence('question', new AbortController().signal)
    ).rejects.toThrow('Evidence response too large');
  } finally {
    fetchSpy.mockRestore();
  }
});
