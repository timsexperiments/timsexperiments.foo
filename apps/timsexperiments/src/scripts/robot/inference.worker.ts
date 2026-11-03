import { localModel } from './model';
import { workerRequest, type WorkerReply } from './protocol';
import { conversationMessages, conversationalReply } from './conversation';
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
      await engine.reload(request.model, {
        context_window_size: localModel.contextTokens,
      });
      reply({ kind: 'ready' });
    } else {
      if (!engine) throw new Error('Model is not loaded.');
      await engine.resetChat();
      const result = await engine.chat.completions.create({
        messages: conversationMessages(
          request.question,
          request.context,
          request.turns
        ),
        max_tokens: localModel.replyTokens,
        temperature: 0.2,
        top_p: 0.9,
        extra_body: { enable_thinking: false },
        stream: false,
      });
      const choice = result.choices[0];
      reply({
        kind: 'answer',
        text:
          choice?.finish_reason === 'stop'
            ? (conversationalReply(choice.message.content ?? '') ?? '')
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
