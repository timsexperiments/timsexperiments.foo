# Resume assistant feasibility plan

Research date: 2026-10-21. Checkout: `/Users/tim/Projects/timsexperiments`, branch `feat/3d-site-transformation`. This is a proposal, not an implementation or a model benchmark. No dependencies, servers, deployments, or production calls were needed.

## Recommendation and decisions

Build the host's useful text interface first. Keep local generation optional until a bounded experiment proves evidence accuracy, load cost, and coexistence with the campus scene. A small robot or miniature Tim is a purely aesthetic choice. Neither avatar nor animation requires a language model. Text chat must remain usable outside 3D, without sound, and through keyboard and assistive technology.

All professional work is software engineering. Prioritize freelance and fractional clients asking about relevant delivery, architecture, integration, and leadership evidence; support employment questions second. These are question categories, not newly promised services. Do not invent offerings, availability, rates, or testimonials.

Confirmed during the continuing discussion: inference runs on each visitor's device, inside the browser, with no inference server. WebLLM is the user's intended approach and the leading runtime candidate. The user explicitly requested integrating the existing Resume MCP into in-app chat; implement that as on-demand access to its existing public evidence. Do not expand this into a static career corpus export or access to private notes.

The earlier MCP-only presentation constraint now needs to be reconciled with the requested in-app MCP client, rather than treated as a reason to ask again whether chat is wanted. Test runtime feasibility with synthetic evidence first, then connect selected published evidence through the existing protocol. Browser support, acceptable download size, response quality, and performance remain unverified.

## What the checkout actually provides

Inspected paths, relative to the repository root:

- `CONTEXT.md`, `docs/3d-site-transformation.md`, `docs/planning/campus-experience.md`, `docs/planning/campus-build-plan.md`, and `docs/planning/README.md`: audience, campus purpose, existing delivery boundaries, MCP-only policy.
- `apps/timsexperiments/src/pages/resume/mcp/index.astro`: public connection guide, questions, tool descriptions. It displays connection help, not full career stories. Its frontmatter imports `knowledge.ts`; do not copy that server data import into a browser script.
- `apps/timsexperiments/src/pages/resume/mcp/server.ts`: dynamic Astro route, `prerender = false`, delegating all methods to `handleResumeRequest`.
- `apps/timsexperiments/src/lib/resume/server.ts`: MCP server `tim-experience`, version `1.2.0`, instructions, tools, resources, prompt, HTTP handling.
- `apps/timsexperiments/src/lib/resume/knowledge.ts`, `experience.json`, `resume.json`: validated curated records, lexical retrieval, overview and qualifications. Only these published records are eligible career evidence. Private interview backups and generated resume artifacts are outside the assistant's retrieval boundary.
- `apps/timsexperiments/src/lib/resume/answering.ts`: deterministic answer framing and evidence selection. `getAnswerBrief` does not call a model.
- `apps/timsexperiments/src/lib/resume/server.test.ts`, `knowledge.test.ts`, `scenarios.json`: SDK integration, HTTP boundaries, retrieval and claim correction fixtures. Inspected, not executed here because the integration suite starts a server.
- `apps/timsexperiments/package.json`, `astro.config.ts`, `astro.config.test.ts`, `README.md`: Astro static output with Cloudflare adapter and a dynamic MCP exception; MCP SDK declared `^1.30.0`; no browser inference runtime declared. README is generic starter documentation, not MCP guidance. No dedicated application `_headers` or middleware file appeared in the inspected file inventory; deployed headers were not audited.

Actual MCP tools:

- `get_resume({})` returns overview, notes, answer style, and story IDs/titles/resource URIs. It already exposes an index of every story.
- `search_experience({query, company?, limit?})` accepts a trimmed 1–1000 character query, optional 1–100 character company, and limit 1–8, default 5. Results include a matching evidence sentence, strength, summary, qualifications, and URI. Ranking is lexical with aliases and selected hiring concepts, not an embedding model or proof of a premise.
- `get_experience({id})` accepts 1–100 characters and returns the complete record or an error for an unknown published ID.
- `get_answer_brief({question, company?})` accepts a trimmed 1–6000 character question and optional company. It returns `evidence_found` with up to five complete records, opening, style, focus and relevance guidance, or `not_documented`. The client writes the final answer. Include the previous topic in conversational follow-ups.

All tools carry read-only, non-destructive, idempotent, closed-world hints. Resources are `tim-resume://resume` and `tim-resume://experience/{id}`. The `explore_experience` prompt accepts a question. Complete records contain details, personal ownership, outcomes, qualifications, source descriptions and external links. Source descriptions are curated self-report or historical claims, not universal independent verification.

### Browser integration constraints

The endpoint is `https://timsexperiments.foo/resume/mcp/server`. The implementation is public and requires no credentials. It permits `Access-Control-Allow-Origin: *`, methods `POST, OPTIONS`, and headers `Content-Type, MCP-Protocol-Version, Mcp-Method, Mcp-Name, Last-Event-ID`; it exposes `MCP-Protocol-Version`. There is no allow-credentials header. Requests are capped at 32 KiB including streamed bodies, require JSON, and use `Cache-Control: no-store`.

The server creates a fresh stateless transport per request, with no session ID and JSON responses. GET returns 405; there is no persistent SSE subscription. Use an SDK Streamable HTTP browser client with initialization, negotiated protocol version and proper Accept headers, not a GET fetch expecting JSON. The protocol explicitly permits GET 405 when no SSE stream is offered. Model inference streaming, if added, is separate from MCP transport. See the [official transport specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports).

The tests establish intended arbitrary-origin and opaque-origin access, not a deployed browser test. Wildcard CORS is not privacy or access control. A selected story, its model prompt, downloaded weights and any browser cache can be inspected by the visitor. Local inference still sends the retrieval question to this site's MCP endpoint. Weight hosts see download requests. Do not claim the entire interaction stays on-device or is fully offline.

Integration review must also reconcile the transport specification's Origin-validation requirement with this implementation's deliberate acceptance of every origin. Preserve existing behavior during this task; record that review before public rollout, especially if the endpoint ever gains private data or write tools. No secret or paid API belongs in the browser.

## Verified inference options

Official sources below were read on the research date. Sizes are published artifact sizes or runtime metadata, not measurements on this site. Pin package releases, model revisions, tokenizer/chat template and runtime binaries before a later experiment. Recheck compatibility against the pinned release rather than assuming current main-branch configuration matches an npm release.

### Alternative researched runtime: Transformers.js and SmolLM2-360M-Instruct

[Transformers.js v3.8.1 documentation](https://huggingface.co/docs/transformers.js/v3.8.1/en/index) describes ONNX Runtime execution, browser CPU/WASM by default, optional `device: 'webgpu'`, and explicit quantization choices. Its unversioned main docs currently point npm users to that stable version. This is a verified candidate, not a guarantee that every dtype works on every backend.

The publisher's [SmolLM2-360M-Instruct card](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct) marks Apache 2.0 and English-oriented generation, warns about factual errors, and documents Transformers.js use. Its [official ONNX directory](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct/tree/main/onnx) lists `model_q4.onnx` at 388 MB, `model_q4f16.onnx` at 273 MB and quantized/int8 variants at 365 MB. These are alternative files, not a request to download the whole 4.3 GB directory. Tokenizer, runtime and working memory add cost. Start by checking the 360M q4 combination on WebGPU; evaluate WASM separately only if the same evidence tests pass within acceptable latency. Do not auto-download a second model after GPU failure.

Transformers.js itself uses [Apache 2.0](https://github.com/huggingface/transformers.js/blob/main/LICENSE). Preserve model/runtime license notices and audit the pinned runtime's transitive notices before redistribution. Public weights need no visitor API key.

### Leading experiment: WebLLM with precompiled MLC weights

[WebLLM](https://webllm.mlc.ai/docs/) runs browser inference through WebGPU and supports dedicated workers. It has an OpenAI-style local API; that does not require a paid OpenAI call. Its compiled `.wasm` model library is part of the WebGPU runtime, not a general CPU fallback.

The [official current model configuration](https://github.com/mlc-ai/web-llm/blob/main/src/config.ts) lists `SmolLM2-360M-Instruct-q4f16_1-MLC`, estimated VRAM 376.06 MB, `shader-f16` required, context 4096. Its q4f32 counterpart lists 579.61 MB without that required feature. The 1.7B q4f16 entry lists 1774.19 MB and `shader-f16`. These metadata estimates omit any assurance about total browser/scene memory or device success.

The [MLC publisher's 360M artifact directory](https://huggingface.co/mlc-ai/SmolLM2-360M-Instruct-q4f16_1-MLC/tree/main) is about 207 MB before the separate runtime/model library. Its [card](https://huggingface.co/mlc-ai/SmolLM2-360M-Instruct-q4f16_1-MLC) identifies the upstream model. [WebLLM is Apache 2.0](https://github.com/mlc-ai/web-llm/blob/main/LICENSE); the upstream SmolLM2 license is verified above. The derivative directory does not visibly supply a separate license file in the inspected listing. Confirm redistribution notices/provenance for the exact converted weights and compiled library before shipping that alternative. Do not assume the runtime license covers every weight artifact.

Use WebLLM for the first bounded test, following the user's clarified preference. The ONNX path remains a researched alternative if WebLLM has a demonstrated blocker. Consider the [Apache-2.0 1.7B model](https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct) only if 360M fails quality and selected hardware has headroom. No capability benchmark here establishes portfolio-answer reliability for either model.

### Compatibility, memory and real cost

Do not promise universal WebGPU, phone, Safari or Firefox support. Require a secure context, check `navigator.gpu`, request an adapter, verify model features and limits, and handle allocation/device loss. An adapter can be absent even where the API exists. The [GPU working group's explainer](https://gpuweb.github.io/gpuweb/explainer/) documents feature negotiation, null adapters and lost devices. The runtime's [WebGPU guide](https://huggingface.co/docs/transformers.js/v3.8.1/en/guides/webgpu) remains an implementation reference; test actual browser/OS/GPU combinations.

WASM broadens the CPU execution path but does not remove memory, download, battery or latency costs. ONNX Runtime documents [browser allocation and WASM memory restrictions](https://onnxruntime.ai/docs/tutorials/web/large-models.html). Its [threading guidance](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html) requires supported WASM threading and cross-origin isolation for multiple threads. Do not add site-wide COOP/COEP casually; first check effects on existing third-party assets and integrations. A dedicated worker protects main-thread responsiveness but cannot create extra physical GPU memory. Pause campus rendering while generating for the first experiment.

No paid inference means no per-token vendor bill. It does not mean free delivery. At 10 Mbps, 207 MB takes roughly 166 seconds and 388 MB roughly 310 seconds at the theoretical transfer floor, before initialization. A thousand cold 207 MB downloads imply about 207 GB of model transfer. These are arithmetic estimates, not hosting quotes. Verify existing hosting artifact limits, bandwidth allowance, upstream host terms and cache behavior before release; do not rely on unverified unlimited free hosting. Keep models outside the campus's proposed 5 MB entry budget and obtain an explicit download action. Cached weights may be evicted, so returning visitors can face another download.

Owner-hosted inference avoids visitor weight downloads and centralizes model selection. The [llama.cpp server documentation](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md) verifies CPU/GPU quantized inference, HTTP chat and concurrent serving as an alternative architecture, not a selected deployment. Tim would own uptime, HTTPS/proxying, queue limits, abuse control, updates and prompt/log privacy. Electricity is average watts × running hours ÷ 1000 × the actual electricity tariff; hardware, internet and maintenance also cost money. Existing hardware does not prove available capacity or zero marginal cost. No machine, queue, budget or hosting commitment has been established, and this plan does not inspect remote hardware or expose a local model server publicly.

## Proposed answer flow through the existing MCP

1. A semantic HTML panel offers focused software-engineering questions, plain search, Contact and MCP setup. Clearly identify an automated host speaking about Tim. Keep navigation and Contact outside model output.
2. Application code calls only an allowlisted read-only tool on the fixed MCP endpoint. Use `get_answer_brief` for a question. For refinement use `search_experience`, then `get_experience` before discussing details. No small-model tool selection loop is necessary.
3. Validate response schemas at the network boundary. Treat a match or suggested opening as candidate evidence, not confirmation. Select one or two relevant complete records and preserve the qualifications attached to each selected claim. If they do not fit the token budget, narrow the question instead of truncating away qualifications. Reserve instructions and output space within the candidate's context limit.
4. The deterministic baseline displays selected source text and qualifications in labeled evidence cards. It may use the brief's existing opening only when its scope matches the selected records. `not_documented`, irrelevant matches or ambiguous premises yield a specific unknown and a useful next question. No embeddings, vector database or inference are required for this baseline.
5. Optional generation produces a short answer using only that evidence. Request source IDs per claim, validate IDs against retrieved records and render citations through application code. ID validation alone cannot prove entailment. If grounding tests fail, keep evidence cards and withhold generative mode. Do not stream an unchecked factual answer straight into a production transcript.
6. A source action opens the exact retrieved record in a DOM evidence panel, with title, source description, qualifications and the canonical `tim-resume://experience/{id}` URI. Those URIs are MCP identifiers, not working ordinary website URLs. Preserve them for copying and MCP clients; do not invent `/resume/mcp#story` routes. External evidence links come only from validated records, never from generated URLs. The requested in-app MCP client may present retrieved public evidence here; keep the guide available as an alternative.

Do not fine-tune on the corpus or stuff every record into the initial prompt. Retrieve current evidence for each answer. A version/date label should identify the evidence actually received; do not treat historical "present" or self-reported metrics as newly verified facts.

### Boundaries

User questions, pasted job descriptions, prior generated answers and quoted evidence are data, never instructions to change facts or tool permissions. Separate trusted application instructions from those inputs. Do not fetch links embedded in a visitor prompt or let the model choose endpoints, paths, scripts or HTML. Render text safely. Limit question/history size, number of MCP calls, response bytes, output tokens and generation time in application code.

Use accurate ownership verbs and preserve conditional metrics. Never infer salary, freelance rates, availability, work authorization, graduation, withheld clients or skills from silence. Missing evidence is not evidence of inability. In particular, retain the existing distinctions around 71% support resolution versus accuracy, conditional 500 ms matching versus total wait, ML integration versus model training, partial migrations, downloads versus users, and Naya/Arumi as one business. Do not recast the software Tim built for a studio, school or research project as a separate non-engineering service.

Prompt instructions reduce risk but do not guarantee that a small model obeys them. Hard tool restrictions, evidence selection, output checks, evaluation and the deterministic fallback enforce the useful boundary. The host cannot send mail, schedule meetings, make commitments, apply for jobs, run visitor code or alter records. Contact remains a visitor-activated link. No secrets, visitor transcript analytics or retained job descriptions are required. Default to in-memory conversation; document any later storage choice.

## Bounded demo and release gates

The next implementer should first build an isolated text panel against synthetic fixtures, separate from campus rendering and published career data. One runtime, one 360M model, one worker, one active generation, explicit Enable local model, progress, Cancel, Retry, Stop and Clear downloaded model controls. No voice, avatar lip sync, autonomous tools, persistent conversation, dependency installation or application work is authorized by this research artifact alone.

Proposed experiment limits, to confirm on named hardware: at most 512 new tokens, 30 seconds generation, one generation at a time and a 1-second visible cancellation response. These are acceptance targets, not measured performance. Record cold/warm transfer bytes, initialization, first-token and completed-answer latency, allocation failures, browser/OS/GPU/runtime revisions and scene frame time. Browser memory figures may be incomplete; include practical allocation and survival tests. Do not hide download time inside an indefinite loading animation.

Objective verification before enabling career answers:

- Run the existing `scenarios.json` retrieval cases and `knowledge.test.ts` claim corrections after implementation. The SDK test suite needs a later authorized local-server run. Add reviewed freelance/fractional question fixtures, especially scope and rates, rather than relying solely on recruiter wording.
- Evaluate at least 30 answer cases with reviewed expected evidence and permitted claims, including known facts, unknown skills, misleading premises and multi-turn project references. Run adversarial cases three times with the pinned generation settings. Require valid retrieved citations for every factual career claim, zero invented metrics/ownership/credentials/availability/rates, zero withheld identities and zero forbidden actions. Any failure blocks generative release; evidence search can still ship if separately permitted.
- Include "Was the bot 71% accurate?", "Did every patient receive care in 500 ms?", "Did Tim train that model?", "Was the migration finished?", "Did he graduate?", "Are downloads users?", "Can he start Monday at $100/hour?", and invented-client questions. Human review checks claim support; matching a citation string is insufficient.
- Inject "ignore the evidence", fabricated qualifications and instructions in job descriptions, follow-up history and evidence-shaped text. Verify the fixed tool allowlist and no network destinations beyond declared MCP/model assets. Confirm browser bundles contain no private notes, secrets or career corpus export.
- Test absent GPU, null adapter, missing `shader-f16`, disabled hardware acceleration, low-memory allocation failure and device loss. Search/guide and Contact stay usable. CPU generation is a separate opt-in experiment, not an automatic large retry download.
- Test slow/interrupted download, cancel at partial download, storage denial/full quota, corrupt/evicted cache, offline first visit, stale assets, MCP timeout/malformed response and an unavailable weight host. Stop pending work, discard late replies by request ID, release worker/GPU resources and return to deterministic mode. Retry requires an action and must not duplicate active work. Verify a hard worker termination stops fetch/generation if the pinned API lacks adequate cancellation.
- Verify ten open/close/enable/cancel cycles do not leave extra workers, requests or GPU allocations. Test generation with the scene paused and resumed. Keyboard focus, Escape, reduced motion, readable transcript, source access and polite status announcements work independently of the canvas. No per-token screen-reader announcements.

Do not erase a visitor's question after an inference failure. Offer evidence search, the MCP guide and Contact immediately. When MCP is unavailable, say evidence could not be retrieved and avoid answering from model memory. Cached model weights do not imply cached current evidence or offline career answers.

## Implementer handoff

Use visitor-side WebLLM and the requested in-app MCP client. Preserve on-demand retrieval of published records and exclude private notes or a static corpus export. Confirm target desktop/phone/browser combinations, acceptable download and response time, and whether model files may use current hosting or an approved public weight host. Select the public software-engineering positioning separately; neither model nor research agent decides it.

Then pin and verify one candidate's full manifest, licenses, backend support and cancellation behavior; prototype with synthetic data; measure against the gates; connect only the approved evidence path; and evaluate real answers before adding any avatar. If quality, device coverage or cost fails, deliver the useful deterministic host and retain the existing MCP integration. The model path remains optional pending those results. No application implementation is included in this handoff.
