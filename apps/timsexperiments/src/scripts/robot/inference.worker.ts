import { workerRequest, type WorkerReply } from './protocol';
import {
  generationPrompt,
  parseModelDraft,
  robotInstructions,
} from './evidence';
import { MLCEngine, prebuiltAppConfig } from '@mlc-ai/web-llm';

let engine: MLCEngine | undefined;
let busy = false;
function reply(message: WorkerReply) {
  self.postMessage(message);
}
self.addEventListener('message', async (event: MessageEvent<unknown>) => {
  const parsed = workerRequest.safeParse(event.data);
  if (!parsed.success || busy) {
    reply({
      kind: 'error',
      stage: 'request',
      message: 'Invalid or overlapping worker request.',
    });
    return;
  }
  busy = true;
  try {
    const request = parsed.data;
    if (request.kind === 'load') {
      // Use the installed release's compatible binary mapping, never a guessed WASM URL.
      if (
        !prebuiltAppConfig.model_list.some(
          (record) => record.model_id === request.model
        )
      )
        throw new Error('Model unavailable in this runtime.');
      engine = new MLCEngine({
        initProgressCallback: (report) =>
          reply({
            kind: 'progress',
            progress: report.progress,
            text: report.text,
          }),
        logLevel: 'SILENT',
      });
      await engine.reload(request.model, { context_window_size: 4096 });
      reply({ kind: 'ready' });
    } else {
      if (!engine) throw new Error('Model is not loaded.');
      // No history from previous generations, no autonomous tools, no remote inference.
      await engine.resetChat();
      const result = await engine.chat.completions.create({
        messages: [
          { role: 'system', content: robotInstructions },
          {
            role: 'user',
            content: generationPrompt({
              question: request.question,
              context: request.context,
              allowedIds: request.allowedIds,
            }),
          },
        ],
        max_tokens: 160,
        temperature: 0,
        response_format: {
          type: 'json_object',
          schema: JSON.stringify({
            type: 'object',
            additionalProperties: false,
            required: ['answer', 'citations'],
            properties: {
              answer: { type: 'string', minLength: 1, maxLength: 500 },
              citations: {
                type: 'array',
                minItems: 1,
                maxItems: 1,
                uniqueItems: true,
                items: { type: 'string', enum: request.allowedIds },
              },
            },
          }),
        },
        stream: false,
      });
      const choice = result.choices[0];
      reply({
        kind: 'answer',
        text:
          choice?.finish_reason === 'stop'
            ? (parseModelDraft(
                choice.message.content ?? '',
                request.allowedIds
              ) ?? '')
            : '',
      });
    }
  } catch (error) {
    reply({
      kind: 'error',
      stage: parsed.data.kind,
      message:
        error instanceof Error
          ? error.message.slice(0, 500)
          : 'Unknown runtime error.',
    });
  } finally {
    busy = false;
  }
});
