# Visitor-browser model evaluation

2026-10-21. Decision: ship neither tested model as a visitor answer writer. Keep public MCP retrieval and deterministic, qualified evidence answers. Qwen2.5 1.5B is better at extraction than 0.5B, but the useful exact mentoring extraction missed the existing deadline. Its grounded chat outputs still fabricate facts and lose qualifications. A larger download does not buy a reliable visitor answer here.

Only `tools/campus/model-evaluation/` and this document were written for this evaluation. No production source, dependency, deployment or commit changes. The concurrent conversational UI work was not touched.

## Scope and selection

Inspected the installed `@mlc-ai/web-llm@0.2.86` catalog and each selected model's MLC config, full weight manifest, converted model card, upstream model card and Apache 2.0 license. Used the installed catalog's compatible WASM mappings, not guessed model binaries.

- `Qwen2.5-0.5B-Instruct-q4f16_1-MLC`: 277,996,288 weight bytes in eight shards, about 278 MB decimal. Catalog VRAM estimate 944.62 MB. Weight plus listed tokenizer/config/manifest assets and WASM total 295,140,769 bytes, about 295 MB.
- `Qwen2.5-1.5B-Instruct-q4f16_1-MLC`: 868,547,584 weight bytes in thirty shards, about 869 MB decimal. Catalog VRAM estimate 1,629.75 MB. Weight plus listed ancillary assets and WASM total 886,193,485 bytes, about 886 MB.

Both fit the requested weight limit; 1.5B's memory requirement is larger than its download. Ancillary totals include all tokenizer files named by the config, even where the runtime may not request every alternative. They are logical file sizes, not measured compressed transfer. Catalog memory estimates are not measured resident GPU memory or a guarantee that a visitor's device has enough free memory. No portable actual GPU residency measurement was available. No claim of low-memory mobile compatibility follows.

Sources are the [0.5B MLC repository](https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC), [1.5B MLC repository](https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC), and upstream [0.5B license](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/blob/main/LICENSE) and [1.5B license](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct/blob/main/LICENSE). Saved revisions and inspected source copies are in the fixture directory.

## Method

T3 opened an owned preview tab. Two snapshot attempts returned `Preview automation snapshot timed out after 15000ms.` Chrome fallback used a new owned tab at `http://127.0.0.1:4399/`. Actual ES workers ran MLCEngine inference through Apple Metal-3 WebGPU with `shader-f16`. No server inference, paid API, new dependency or private evidence was used. The local loopback server only served fixture files and saved benchmark events.

Retrieved four fresh public `get_answer_brief` responses through the connected resume MCP. Questions covered architecture, mentoring, undocumented COBOL mainframes, and a follow-up asking which architecture outcomes were measured versus estimated or team outcomes. The follow-up explicitly included the architecture topic. This tests resolved follow-up answer quality, not the UI's ability to resolve a short pronoun or maintain conversation state.

Reused production `groundedContext`: at most two complete records under 6,500 UTF-8 bytes, including every qualification. Architecture and follow-up selected Included Health and R1 Dispatch. Mentoring selected Included Health mentorship and Google supplier messaging. Wider retrieved evidence remains saved in full. No field was sliced to improve results.

Each model got exactly three production-style extraction requests and four experimental grounded chat requests. Unknown experience bypassed extraction, matching production. It was also deliberately generated in the isolated chat stress test to assess whether the model respected uncertainty. That stress test does not authorize removing the production bypass. Models loaded sequentially and were unloaded between tests. One warm reload per model reused cached weights. No tuning rounds or inference retries.

Extraction used production instructions, JSON shape, temperature zero and 160 tokens. Chat asked for a direct answer within 120 words, factual claims only from records, bracketed record citations, relevant qualifications, accurate ownership and no invented causation. It used temperature zero and 256 tokens. Exact prompts, contexts, outputs, finish reasons and timings are saved. All fourteen requests completed; the 1.5B architecture chat hit its token cap. An initial fixture telemetry serialization error happened before loading or inference; it was corrected once and is preserved in the event log.

## Task mismatch versus model quality

The extraction prompt says copy one sentence. `checkGeneratedAnswer` accepts an entire `strength`, `summary`, `details[]` or `qualifications[]` field. Several fields contain multiple sentences, so a faithful single-sentence extraction can fail. This is a real contract mismatch, not evidence that all rejected prose is false.

In this run, however, none of the rejected extracts was an exact sentence from its cited field. A sentence-aware gate alone would rescue zero tested outputs. The 0.5B model changed wording, and its architecture answer cited the wrong record. The 1.5B architecture paraphrase was grounded but failed the requested copying task. Two 1.5B extracts matched full fields. One was useful but too slow; the other did not answer the question. Exact copying also does not establish relevance or preserve qualifications when the displayed excerpt is isolated.

## Real outputs and manual grades

The complete raw text is in `tools/campus/model-evaluation/results.json`; per-case factual, qualification and wording grades are in `assessment.json`.

### Qwen2.5 0.5B

- Architecture extraction: `Tim led the development of an agent dispatch platform.` It cited `included-health`, although dispatch is the R1 record. Fails factual attribution and exact copying.
- Mentoring extraction: `Tim mentored engineers through real project work, coaching engineers to design extensible capabilities and understand system interactions.` Correct source ID and broadly grounded wording, but a paraphrase. Took 31.1 seconds, beyond the current deadline.
- Follow-up extraction copied most of the API/process field but changed `His team` to `Tim's team`. Grounded content, wrong task: it does not explain measurement or scope.
- Architecture chat added `significantly reducing the observability time required by domain teams.` No such measured improvement is documented. It also called Tim his own lab host and supplied no citations.
- Mentoring chat broadly preserved coaching and the intern's implementation ownership. It was repetitive and supplied no citations. It avoided unsupported promotion and metric claims.
- Unknown-experience chat: `Tim has not worked professionally on COBOL mainframes.` Unsupported negative claim. The record only establishes missing documentation.
- Follow-up chat changed accounts to `account visits`, recast current throughput as design capacity, and blurred the project chronology. It did not provide the requested measurement qualifications or citations.

Zero of three extracts passed the exact field gate. One of four chat answers was broadly factual, but none passed the complete accuracy, qualification, relevance and citation requirements.

### Qwen2.5 1.5B

- Architecture extraction: `Tim led the platform architecture for Included Health, originating a shared practitioner platform that generalized two or three bespoke care flows into tens of configurable processes built by other teams.` Useful, grounded paraphrase with the correct ID. Fails exact-copy contract.
- Mentoring extraction copied the complete strength field: `Tim develops engineering judgment through real project work, coaching engineers to design extensible capabilities and understand system interactions.` Correct ID and useful answer, but 35.3 seconds exceeds the existing 30-second generation deadline.
- Follow-up extraction copied `Tim created reusable platform capabilities from fragmented care workflows, combining architectural direction, implementation, and enablement of other teams.` Passes the gate but does not answer the measurement question.
- Architecture chat mostly described the two projects accurately, but exceeded the requested length, omitted citations and ended mid-claim at 256 tokens. The production finish-reason check must withhold it. It also undercredited Tim's personal Included Health implementation.
- Mentoring chat confused messaging direction: it described messages between suppliers and operations using email or an enrollment link. The source says operations send in-app and suppliers receive/reply by email or use the link. It also blurred lifecycle ownership and domain contributions, and repeated the eleven-to-three-day resubmission figure without the unknown-methodology qualification.
- Unknown-experience chat: `Tim has worked professionally on COBOL mainframes. Specifically, he led the development of a critical application for a major financial institution using COBOL.` It continued inventing legacy integrations, performance optimization and deployment. None is in the evidence.
- Follow-up chat ended `Estimates or team outcomes are not specified.` False. The complete context explicitly distinguishes reported current volume from a measured increase, notes unspecified counting, distinguishes processes from service lines and preserves ownership.

Two of three extracts passed the field gate. Only one answered its question usefully, and that one exceeded the deadline. Zero of four chat answers passed the complete requirements. No sample justifies showing unrestricted model prose.

## Startup, speed and memory

0.5B cold startup was 19.57 seconds; warm reload was 1.66 seconds. Extraction requests took 10.59, 31.09 and 2.10 seconds. Chat requests took 1.72, 1.34, 0.28 and 2.34 seconds in question order. Chat time to first token was 0.12 to 0.32 seconds; decode speed was approximately 51 to 73 tokens/second.

1.5B cold startup was 51.91 seconds. Warm reload was 3.12 seconds. Exact timings are recorded in `results.json`. Extraction requests took 10.90, 35.33 and 3.09 seconds. Chat requests took 12.35, 6.91, 2.96 and 4.51 seconds. Chat time to first token was 0.27 to 0.88 seconds; decode speed was approximately 22 to 37 tokens/second.

JSON grammar initialization dominated the first two extraction requests for each model, approximately 9 and 30 to 33 seconds. Decode speed alone would conceal that visitor delay. Both mentoring extracts would miss the current production timeout. Models used 4,096-token contexts despite a larger upstream maximum. Memory grades are based on successful initialization at that setting and the catalog estimates above, not measured residency. One desktop run does not establish wider hardware support.

## Exact integration plan for a later task

1. Coordinate with the active RobotConversation/chat-view owner. Keep this evaluation out of the production import graph. Do not swap a model ID or relax `checkGeneratedAnswer` on the strength of these results.
2. Make public retrieval the conversational answer path. Keep the same-origin, read-only MCP transport and existing evidence schemas. Resolve short follow-ups using the last visitor topic, never model output, then retrieve fresh evidence. Render the public opening with complete relevant records, source dates, ownership and qualifications. Qualifiers for a displayed numeric claim must appear next to that claim, not solely inside a collapsed disclosure.
3. Keep `not_documented` deterministic and skip inference. Say the records do not establish the specific experience, not that Tim lacks it. Preserve empty-evidence behavior, cancellation, source links, session bounds, close/unload and retry without downloading a model.
4. Remove or disable the production local-model download offer for this release rather than asking visitors to download 295 or 886 MB for unreliable prose. The conversation owner should place this decision in the new UI without editing or reverting their unrelated work. No unsupported generated claim should enter history or later prompts.
5. If a later, separately authorized experiment needs a local model, test 1.5B only as a bounded selector of allowlisted record/field indices. Validate indices deterministically and render the source text plus its complete relevant qualifications from the trusted evidence object. Never render the model's rewritten factual text. This selector was not evaluated here and is not a shipping recommendation. Whole-field identifiers align the task and gate; sentence segmentation alone does not solve attribution, relevance or qualification loss.
6. Validate the later integration with the four saved scenarios and explicit assertions for intern implementation credit, process versus service-line counts, reported throughput versus improvement, unknown COBOL experience and metric methodology. Include the actual short follow-up UI flow, cancellation, no-WebGPU behavior and a check that no model download occurs on the default path. If a selector is pursued, add fabricated/out-of-range IDs, irrelevant selection, incomplete output and attached-qualification checks before enabling it. Keep factual grounding at least as strict as today.

No further model or prompt search is recommended within this bounded evaluation. The deterministic evidence path already offers stronger factual reliability without startup, memory or download cost.

## Artifacts

- `tools/campus/model-evaluation/README.md`: reproducible isolated fixture instructions and limitations.
- `worker.ts`, generated `worker.js`, `index.html`, `serve.mjs`: actual browser-worker fixture.
- `brief-0.json` through `brief-3.json`: current public MCP evidence.
- `events.jsonl`: raw progress, prompts, complete selected records, outputs and runtime measurements.
- `results.json`, `assessment.json`: compact results and manual grades.
- Model cards, licenses, manifests, configs, `provenance.json`, `asset-sizes.json`: selection and download-size evidence.
- `implementation-hashes.json`: production Robot implementation files read by this evaluation, for later comparison.

The fixture bundled successfully with the existing esbuild and ran all fourteen GPU generations. Production tests/build were not rerun because no production code changed; the prior validation document records its fourteen passing tests and build. There were no new dependencies, paid inference, server inference, deployment or commits.

Final concurrency check: `host.ts` changed after its recorded read, consistent with the active conversational UI work. It was not edited by this evaluation. The worker, evidence builder/gate, GPU selector, protocol and MCP transport matched their recorded hashes. References to the 30-second deadline describe the host implementation inspected during this evaluation; the UI owner should reconcile that detail with their latest code.
