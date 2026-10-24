# Visitor-local resume host

Implemented on `feat/3d-site-transformation` from `52edd372` for PR 38, October 21, 2026. No commits, pushes, deployment, package installs, paid services, or delegated agents.

## Changed paths

- `apps/timsexperiments/src/components/campus/RobotHost.astro`
- `apps/timsexperiments/src/components/campus/RobotConversation.astro`
- `apps/timsexperiments/src/scripts/robot/host.ts`
- `apps/timsexperiments/src/scripts/chat-view/presentation.ts`
- `apps/timsexperiments/src/scripts/chat-view/evidence.ts`, new
- `apps/timsexperiments/src/lib/resume/browser-answer.ts`, new
- `apps/timsexperiments/src/lib/resume/browser-answer.test.ts`, new
- `docs/planning/local-host-v2.md`, new

Other files changing in this shared checkout belong to other work. The logo, scene, server endpoint, public resume data, and standalone MCP guide were not edited for this task. PR 38 is registered with this T3 thread.

## Behavior and composition

The host calls `retrieveInBrowser`, which uses the existing `knowledge.ts` search index and `answering.ts` deterministic brief rules. Its only resume data dependencies are the existing public `experience.json` and `resume.json`. These are the same curated records already exposed by the standalone resume integration. No intake notes, private interview files, or new personal data enter the browser graph. Reusing `knowledge.ts` also brings its already-public overview into the download, even though the host selects its answers from experience records.

The browser selects fixed openings and exact source statements. It does not generate ordinary replies. Question wording cannot author new facts. A conservative vocabulary check rejects unsupported topics, including a known skill paired with an employer where it is undocumented. Complete source records retain dates, personal versus team ownership, historical metrics, and every qualification. Critical metric corrections stay visible in the reply. Personal failures remain unknown instead of being inferred from technical tradeoffs.

The last supported topic and shown statements support short follow-ups, additional details, and company changes. An explicit new topic such as payroll can replace the previous mentoring topic. Unsupported turns do not erase the last supported topic. State remains in page memory, with the existing 12-question bound. Clear removes the transcript and topic; closing cancels work and terminates the optional worker while retaining the conversation for reopening.

`RobotConversation` owns markup and scoped chrome. `chat-view/presentation` owns options, focus, and scroll-follow behavior. `chat-view/evidence` renders text safely and nests full sources behind contextual disclosures. `browser-answer` owns selection and follow-up state; `robot/host` coordinates controls and the existing optional inference worker. Original subscription/dialog components were reviewed for composition. No component named GroupX was found in this checkout, so its exact patterns could not be reviewed.

The main conversation contains no MCP setup, resource identifiers, retrieval timestamps, or integration instructions. Options hold privacy and optional-model details. The transcript is a polite live log. Native keyboard controls, IME handling, Shift+Enter, source disclosures, and visible focus remain available. The composer starts disabled until its local submit handler is attached, preventing native question submission if JavaScript fails. Navigation disposes component listeners and the transcript observer.

## Download traffic versus answering

Loading the page downloads its scripts, public records, styles, fonts, and scene assets. After loading, default retrieval and answer selection require no network. There is no in-app import of `robot/mcp.ts`, no resume-service request, and no server inference. The standalone MCP implementation and tests remain intact.

Optional WebLLM stays behind an explicit download action. Its existing model and runtime can require roughly 204 MB plus runtime assets, with precision selected from local GPU support. Model hosts receive download requests. Questions and bounded source context go only to the local worker. The existing whole-record context limit, allowed citations, exact-extract validation, worker termination, and timeouts remain in force. Optional results appear separately behind a disclosure and cannot replace the deterministic reply. Source membership does not prove that an extract answers a compound question.

## Verification

Focused tests, run from the repository root:

```sh
bun test apps/timsexperiments/src/lib/resume/browser-answer.test.ts apps/timsexperiments/src/lib/resume/knowledge.test.ts apps/timsexperiments/src/lib/resume/server.test.ts apps/timsexperiments/src/scripts/robot/evidence.test.ts apps/timsexperiments/src/scripts/robot/mcp.test.ts
```

149 tests pass. Coverage includes all existing recruiter retrieval scenarios, exact public statement membership, complete qualifications, sensitive metric and ownership corrections, unsupported skills and skills at the wrong employer, follow-ups with and without a prior topic, unknown failures, ML integration versus training, cancellation before and after the local yield, a throwing fetch boundary, and a browser bundle without server or MCP transport code. Existing endpoint and client transport tests also pass.

`bun run build` in `apps/timsexperiments` passes. Astro checking reports zero errors, zero warnings, and 35 hints across 165 files in the shared checkout. Production bundling and prerendering complete. The existing large-chunk build warning remains. Scoped `git diff --check` passes.

The T3 collaborative browser smoke test uses the compiled campus page, served locally. After initial assets and fonts load, fetch, XMLHttpRequest, sendBeacon, WebSocket creation, and EventSource creation are replaced with throwing recorders, and resource timing is cleared. Mentoring, `Tell me more`, `What about at Google?`, the 71% accuracy correction, and unsupported COBOL all completed with **zero API calls and zero new resource requests**. This establishes local answering after download; it does not promise an offline first visit or offline reload.

The final compiled root page was checked again through a complete 12-question session with the network block still installed. It covered an initial follow-up without context, mentoring, an additional detail, a Google follow-up, the 71% correction, Flutter at Google as an unknown, a switch to payroll, and repeated local questions up to the session bound. There were zero API calls, new resources, or JavaScript errors. The bound disabled the composer, and Clear reset and focused it. Separate checks covered Shift+Enter without submission, immediate cancellation with the question retained, entering a question while Options was open, source disclosures operated with Enter, and Escape restoring focus to the host station. A forced unavailable-GPU check kept default answers enabled and made no download request.

At 1280×800 and 320×640, the page had no overflow. At 320×640 the document measured 320×640 and the dialog's client and scroll heights both measured 592 px, including with source disclosures open. Transcript content scrolls internally. These checks do not establish full WCAG conformance or behavior with a real mobile keyboard.

## Limits and observed blockers

Selection is deterministic and lexical. Valid paraphrases can be rejected, and matching source text does not establish every premise in a question. Follow-ups select additional facts rather than generating reasoning. Employer narrowing handles a single named employer; this is not a general comparison or role-fit reasoning engine. Missing evidence is not evidence of inability.

No model was downloaded or searched for during this task. Actual WebLLM generation and GPU compatibility were not retested. Guard and GPU-selection unit tests cover the retained constraints. Screen-reader speech and a full accessibility audit remain unverified.

The shared dev preview returned HTTP 500 and stale dependency errors, including `504 (Outdated Optimize Dep)` for Three.js and a failed dynamic host import. A fresh dev port had the same dependency-cache issue. One production build also reported `Unable to find the module for src/pages/resume/mcp/index.astro`; a later full build passed without editing that route. Browser smoke testing therefore uses compiled assets rather than that unstable dev session. The exact GroupX reference is unavailable in this checkout.

The temporary development server started for this task is stopped. A local static production preview is available at `http://127.0.0.1:4340/`. Its test overrides are removed by reloading before handoff. This preview is not a deployment.
