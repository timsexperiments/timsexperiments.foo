# MCP validation and example answers

Validated September 15, 2026. Local preview: http://127.0.0.1:4322/resume/mcp

## Results

- 35 curated stories, up from 9, covering all narrated employers and independent projects.
- 186 automated tests passed, with 1,029 assertions.
- All 147 hiring queries found their expected source: 43 within the first three results and 104 within the first five. Every answer brief included the expected supporting story.
- A real MCP SDK client completed initialization, tool discovery, overview retrieval, search, full-story retrieval, resources, and prompt discovery/use.
- The built Astro application passed all 147 scenarios under the local Cloudflare runtime. All 35 citation anchors and story resources were checked.
- Invalid inputs, nonexistent records, unknown tools, request-size limits, malformed JSON, unsupported topics, and browser-origin restrictions were tested.
- Production build passed with zero type errors. Existing unrelated deprecation hints remain. The installed local runtime used its supported July 18, 2025 compatibility date.

The raw built-runtime transcript is in `output/resume-mcp-client-check.json`. The reusable runner is `apps/timsexperiments/scripts/check-resume-mcp.ts`.

## What testing caught

The first project-specific scenarios passed, but broader questions about Staff scope and influencing without authority initially matched incidental words. Search now uses normalized hiring concepts and consistent topic tags. The final suite includes those broad questions. A Staff-scope query has multiple valid results; its test checks for the substantive mentorship example rather than forcing the newest employer to rank first.

Older overview wording overstated the Included Health MCP contribution and Avanade pipeline ownership. The MCP overview now follows the interview corrections. Exact formatted resume artifacts were not regenerated in this pass.

The expanded suite also covers positive framing, skeptical premises, company aliases, simultaneous client requests, invalid tool arguments, prompt injection, and attempted filesystem access. Manual brief review caught generic hiring questions that had initially fallen back to unknown; explicit hiring and breadth/depth framing now supports them. All 35 records have a strength statement.

See [actual answer-brief openings](mcp-answer-examples.md) for the stronger presentation returned by the tool.

## Answer review

These are manually reviewed example answers grounded in the full stories returned by the real client. They are not outputs from a separate ChatGPT/Claude test session and do not claim universal model behavior.

### Did Tim personally implement the R1 Slack bot?

Tim originated the idea, defined its design and tools, secured access, and led delivery. Teammates implemented the bot; he also developed shared investigation tools. Approximately 71% of conversations were resolved without a reply from his team. That is not an answer-accuracy measurement or proof of no background review. [Source](http://127.0.0.1:4322/resume/mcp#r1-support)

### Has he trained production ML models?

The home-services fulfillment story establishes integration of a model built by another team, not model training. He led development of the surrounding workflow with one other engineer. That is strong applied integration evidence, but the available stories do not establish production model-training ownership. [Source](http://127.0.0.1:4322/resume/mcp#credera)

### Did patients receive care in 500 ms?

No. The reported 500 ms measures matching once an eligible counterpart was available. It is not total wait time or time to care. The router story separately reports an 80% member-wait reduction and explains the database-availability tradeoff. [Source](http://127.0.0.1:4322/resume/mcp#included-health-router)

### Did he complete the entire Workday migration?

The evidence supports design leadership and partial delivery, including parts of the SCIM implementation, response masking, and initial pages. It does not establish completion of the entire onboarding migration. [Source](http://127.0.0.1:4322/resume/mcp#included-health-data)

### Give an example of influencing without authority.

At Credera, Tim proposed a simpler release workflow, met initial resistance, and built a demonstration to win support. Combining trunk-based development and CI/CD replaced a roughly day-long weekly packaging effort involving four engineers with automated packaging and one person verifying and triggering releases. Remaining verification time is unknown. [Source](http://127.0.0.1:4322/resume/mcp#credera-ci)

### Are Naya and Arumi Moves separate companies?

No. Naya Studio is the new brand for Arumi Moves LLC. Tim owns 50% and handles its software, with additional administrative hiring and studio-buildout responsibilities. [Source](http://127.0.0.1:4322/resume/mcp#naya-studio)

### Is he a fit for a Staff platform role that also requires model training?

There is concrete evidence of cross-team platform design, technical leadership, and mentoring: shared care-process definitions, scoped authentication across finance applications, and coaching extensible designs. The model-training requirement remains unsupported; the ML story is integration. A hiring decision should distinguish that gap from his strong platform and applied AI experience. [Practitioner platform](http://127.0.0.1:4322/resume/mcp#included-health), [Google integration](http://127.0.0.1:4322/resume/mcp#google-buying), [mentorship](http://127.0.0.1:4322/resume/mcp#included-health-mentorship)

### Has he graduated from Georgia Tech?

The supplied resume lists 2026, but completion status is not confirmed. The MCP should not infer graduation from that year alone. [Source](http://127.0.0.1:4322/resume/mcp#career-context)

## Limits

This was local testing, including the Cloudflare build, not a public deployment or an independently configured third-party AI client. Browser click/clipboard behavior was not exercised; guide HTML, setup content, and source anchors were verified over HTTP. The desktop app queued the request to open the preview rather than confirming it had displayed it.

The base server uses lexical retrieval over a curated snapshot. Turso loading and vectorization have not been performed. Historical resume metrics remain qualified, and no automated test establishes their real-world accuracy.
