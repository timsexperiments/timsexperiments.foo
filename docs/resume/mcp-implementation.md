# Resume MCP implementation

Updated September 15, 2026.

## What is ready

The Astro app provides a human setup page at `/resume/mcp` and a Streamable HTTP endpoint at `/resume/mcp/server`. The page starts with a copyable connection prompt, followed by optional manual instructions and example questions. Its 35 readable stories are the same records served by the MCP.

The official MCP SDK creates a stateless server per request. Tools are `get_resume`, `search_experience`, `get_experience`, and `get_answer_brief`; resources expose the overview and every story. The `explore_experience` prompt helps a client compare evidence with a question or role. The client's model writes answers; the server retrieves evidence and does not call a model.

## Sources of truth

- `apps/timsexperiments/src/lib/resume/experience.json`: curated public-ready stories, with stable IDs, ownership, outcomes, strengths, qualifications, and external links where available.
- `apps/timsexperiments/src/lib/resume/resume.json`: interview-reconciled MCP career overview, not an exact extraction of the PDF. This pass did not edit the formatted DOCX/PDF.
- `docs/resume/mcp-stories.md`: readable export of the current curated collection for review.
- `docs/resume/experience/`: archival intake and research notes. These are not imported by the app or exposed as MCP resources. Later corrections can supersede earlier entries in these historical notes.
- `src/lib/resume/scenarios.json`: 43 representative hiring questions with expected relevant sources; `extended-scenarios.json` adds 104 paraphrases and skeptical questions.

Consulting clients are described by industry, except Microsoft. Naya Studio and Arumi Moves LLC are one business. The education record explicitly leaves Georgia Tech completion unconfirmed. Historical resume metrics retain their source and qualifications, and model integration is distinguished from model training.

## Retrieval

Search uses a small in-memory index over titles, companies, tags, summaries, and narrative facts. Ranking uses inverse document frequency and length-normalized term frequency, with higher weight for headings and editorial tags. Normalization covers common word forms and hiring concepts such as influence and Staff scope. Search results include an evidence excerpt and qualifications; the client should still retrieve complete stories before answering.

This is lexical retrieval, not embeddings. The prepared Turso schema and migration remain available, but the running MCP currently uses the versioned JSON snapshot. No remote migration, import, or vector index was performed in this cleanup. This keeps the reviewed content and tested runtime identical. Future persistence can replace the content loader without changing the four client tools.

## Positive answer framing

Each story includes an evidence-based strength statement. `get_answer_brief` provides a suggested opening, complete supporting stories, source links, and guidance for confident advocacy. Specific framing covers hiring pitches, breadth versus depth, leadership, ownership, metrics, and undocumented details. It treats technical tradeoffs as engineering judgment and distinguishes missing information from lack of ability.

The client should lead with strengths and include qualifications only when they matter to the question. The brief is deterministic guidance, not a generated final answer or an instruction to invent facts. The connected model still controls the final response.

## Validation

From `apps/timsexperiments`:

```sh
bun test src/pages src/lib/resume
bun run build
node node_modules/wrangler/bin/wrangler.js pages dev dist --ip 127.0.0.1 --port 4322 --compatibility-date 2025-07-18 --compatibility-flags nodejs_compat --kv SESSION
bun scripts/check-resume-mcp.ts http://127.0.0.1:4322/resume/mcp/server ../../output/resume-mcp-client-check.json
```

The tests use a real SDK client over HTTP. The separate check script targets the built application and can accept another endpoint URL as its first argument after deployment. It verifies the guide, all citation anchors, all story resources, and all 147 search-and-answer-brief scenarios (43 top-three retrieval checks and 104 top-five checks). See `mcp-validation.md` for results and answer review.

The existing Pages test files have `_` prefixes so Astro does not publish test routes or bundle `bun:test` in production. Existing page test contents were preserved.

## Runtime boundaries

The service is read-only, requires no API key, and bounds requests to 32 KiB. It rejects unexpected browser origins and malformed inputs. Server-side clients without Origin headers are supported. It exposes no filesystem or write tools. These transport checks are not a guarantee that every third-party model will obey the supplied answer instructions.

## Deployment

Build and local Cloudflare-runtime validation passed. This cleanup did not deploy publicly. Production remains a separate rollout step through the existing Cloudflare Pages project `timsexperiments-foo`; do not create a replacement site. Verify the production endpoint using the same client check after deployment. Source links are canonical production URLs, so newly added anchors will become available there when the new build is deployed.
