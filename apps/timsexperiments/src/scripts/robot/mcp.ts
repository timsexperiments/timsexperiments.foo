import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { parseToolResult } from './evidence';

/** One bounded, read-only tool invocation. No model-selected tool names or destinations. */
export async function getEvidence(question: string, signal: AbortSignal) {
  const client = new Client({ name: 'campus-robot', version: '1.0.0' });
  const endpoint = new URL('/resume/mcp/server', window.location.origin);
  const transport = new StreamableHTTPClientTransport(endpoint, {
    requestInit: { credentials: 'omit', cache: 'no-store', redirect: 'error' },
    fetch: async (input, init) => {
      const response = await fetch(input, {
        ...init,
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        signal: init?.signal ? AbortSignal.any([signal, init.signal]) : signal,
      });
      // Initialization can attempt GET; this stateless endpoint correctly responds 405.
      if (!response.body) return response;
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 256 * 1024) {
            await reader.cancel();
            throw new Error('Evidence response too large.');
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      return new Response(bytes, {
        status: response.status,
        headers: response.headers,
      });
    },
  });
  try {
    signal.throwIfAborted();
    await client.connect(transport);
    signal.throwIfAborted();
    const result = await client.callTool(
      { name: 'get_answer_brief', arguments: { question } },
      undefined,
      { signal, timeout: 15000 }
    );
    return parseToolResult(result);
  } finally {
    await client.close().catch(() => undefined);
  }
}
