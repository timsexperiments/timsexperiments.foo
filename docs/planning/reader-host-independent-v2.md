# Independent reader, local host, and SEO review

Reviewed October 21, 2026 in the shared checkout on `feat/3d-site-transformation`. This review owns only this document. No application edits, full application builds, installations, commits, pushes, deployments, or delegated agents were performed.

Disposition: **needs fixes for the completed local host**, due to the two P2 answer-selection findings below. **Tablet reader and SEO source pass this bounded review with zero additional findings.** This is not a disposition on the whole site's release readiness.

## Findings

### P2: Education replies discard the institution in the question

Paths: `apps/timsexperiments/src/lib/resume/browser-answer.ts:248` and `apps/timsexperiments/src/lib/resume/answering.ts:18`.

Reproduction, independently confirmed against both current source and the compiled UI at `http://127.0.0.1:4340/`:

1. Open Meet the host.
2. Ask `Does Tim have a degree from University of Houston?`.
3. The entire visible reply is `The resume lists a Georgia Tech computer science master's entry dated 2026, but completion status is not confirmed. His demonstrated engineering work can be evaluated independently through the project stories.`

`Did Tim graduate from University of Houston?` has the same result in a direct source probe. The existing career-context record explicitly lists the Houston BBA and minor, with the uncertainty attached to the Georgia Tech entry. The broad education rule ignores the named institution. The new browser selector promotes that briefing opening directly to the final visible answer and suppresses the matching detail when `useOpening` is true. The correct full record remains behind the source disclosure, but the ordinary reply answers a different question and can leave the wrong impression about which credential is unconfirmed.

The framing rule predates these changes. Its direct use as the browser's completed answer exposes this behavior in the new local host. This is an answer relevance and credential-scoping defect, not evidence of an invented graduation claim.

Minimal repair: qualify education selection by the institution named in the question. Show the existing Houston statement for Houston questions, keep the explicit Georgia Tech completion limit for Georgia Tech questions, and avoid inferring any additional completion facts. An unrecognized institution can remain unknown. Add browser-answer assertions for the visible Houston and Georgia Tech replies, rather than checking only source membership or the same framing function used by the implementation. This can be confined to the browser selector if preserving the shared MCP briefing behavior is preferable.

### P2: Short availability questions select unrelated project evidence

Paths: `apps/timsexperiments/src/lib/resume/browser-answer.ts:36`, `apps/timsexperiments/src/lib/resume/browser-answer.ts:74`, and `apps/timsexperiments/src/lib/resume/answering.ts:15`.

Reproduction, independently confirmed against current source and the compiled UI:

1. Ask `Is Tim available?`.
2. The reply starts `Tim used operational evidence to identify a routing problem, led a redesign, and planned a controlled cutover with explicit reliability tradeoffs.` It continues with the urgent-care routing incident and offers routing, contract-approval, and scheduling records.
3. A direct source probe of `Can Tim start?` similarly returns the duplicate-appointment-slot investigation.

The sensitive employment framing covers `available to start` and `start date`, but misses these ordinary short questions. `available`, `availability`, and `start` are excluded from the unsupported-topic check, while the underlying search can match those words in unrelated operational facts. The resulting reply has `evidence_found` status and becomes conversation topic state instead of explaining that availability is unknown.

No available-to-hire claim was fabricated in these reproductions. The concrete defect is answering an unsupported personal availability question with unrelated facts and presenting them as its answer. A bounded resume guide needs to make this particular unknown clear.

Minimal repair: recognize personal employment availability before generic retrieval and return the existing confirmation-with-Tim response, without setting an unrelated project topic. Preserve technical uses such as counterpart availability in routing questions. Add visible-answer regressions for both short questions and a technical availability control case. A browser-local intent guard is sufficient; no model, transport, or corpus expansion is required.

## Independently verified behavior

### Local data, network, and worker boundaries

The browser answer graph imports `knowledge.ts`, `answering.ts`, and the validation module. `knowledge.ts` imports only the existing tracked `experience.json` and `resume.json`. The unchanged resume server already exposes these records through its tools and resources. I found no newly imported personal data beyond that curated public material. The overview resume also enters the graph, even though story selection uses the experience records. I did not read secrets, raw interview notes, or private projects to make this assessment.

The default host calls `retrieveInBrowser`, not the MCP client. In the compiled browser after page assets loaded, I replaced fetch, XMLHttpRequest, sendBeacon, WebSocket, EventSource, and Worker creation with throwing recorders. The Houston question, availability question, 71% accuracy question, and Flutter-at-Google question all completed with zero recorded calls, zero new resource timing entries, and zero captured JavaScript errors. The 71% reply explicitly distinguished resolution from accuracy; Flutter at Google stayed unknown. This establishes answering after download for these cases, not offline first-load behavior.

Source inspection keeps optional WebLLM behind the explicit enable action. Questions and bounded whole-record context go to a local worker. Worker identity checks, termination, loading and generation deadlines, schema validation, and exact-extract checks remain present. The optional result is separately disclosed and does not replace the deterministic reply. No model was downloaded or executed during this review. Exact membership in a source is not proof that an extract answers every premise, relation, or comparison in a question.

Clear removed the turns, enabled the composer, and focused it. Immediate Stop after submission retained the typed question, displayed the stopped message, cleared busy state, and left Send enabled. Native Escape from the host closed the modal and restored focus to the host station. These checks do not exercise real GPU cancellation or every worker error sequence.

### Reader reconstruction, navigation, and races

All three existing compiled articles were fetched and opened through the tablet. Each reconstructed article's full text equaled its source fragment text. All 25 code blocks matched exactly: 14 Protobuf, 11 development environment, and zero Hello World. Each opening left one dialog open and the scene canvas inert. Standalone links retained `/lab/<slug>/` URLs.

An injected fragment containing script, iframe, inline handler, JavaScript link, data-image URL, and an island hydration wrapper executed no attack code. Reconstructed content had no script, iframe, island node, event handler, unsafe href, or data-image src. Static widget text and the allowed Shiki color survived. This checks the specified hostile payload, not every possible HTML parser input.

A delayed Protobuf fetch observed abort when Shelf was activated. The test transport deliberately ignored abort and later resolved its old response after Hello World was opened. Hello World remained displayed with one dialog open. An injected HTTP 503 displayed recovery with `aria-busy=false` and the correct standalone fallback; restoring fetch and activating Retry recovered. These fixture actions used programmatic control activation. Native Enter separately opened the focused recipe link.

Native Enter on Next selected section 1, scrolled the article, and focused `JSON and Protobuf`. With clipboard writes intercepted locally, the copied code equaled the source `pre.textContent`, and heading copying produced `/lab/json-vs-protobuf/#json-and-protobuf`, not a fragment URL. Native Escape returned to the shelf and focused the selected Protobuf recipe link after the return animation finished. I did not infer an animation deadline from short timers in the background browser tab. Reverse Tab at the first control yielded a document body active element, not a background page control; this is not evidence of exhaustive focus traversal or screen-reader behavior.

Source inspection confirms same-origin fragment requests, same-origin credentials, redirect rejection, content-type and envelope validation, a 15-second abort deadline, and session identity checks before applying results. The fragment endpoint prerenders published, non-future content through the original MDX component. Fetched scripts are not inserted or hydrated. Canonical article links and code text survive reconstruction. No separate reader correctness finding was established.

### Static SEO

The source fragment response begins with robots `noindex`. Fragment URLs are explicitly excluded from sitemap generation. The current `public/robots.txt` allows crawling, so crawlers can read that directive. The parent already removed the conflicting Disallow rule; it is not an outstanding source finding.

The existing dist contains all three noindex fragments, excludes them from its sitemap, emits the canonical and social metadata exercised by the SEO suite, and contains `/campus / 301` in `_redirects`. Its `_routes.json` excludes fragment assets and `/campus` from the worker. I inspected that generated redirect entry; I did not equate the Python static server's behavior with Cloudflare redirect handling.

There is one artifact freshness limit: the existing dist `robots.txt` still contains the old `Disallow: /article-fragments/`, although current source does not. The dist tests pass despite that discrepancy because they do not assert crawl permission. A later integrated build should copy the corrected robots file; no build was run here. This is stale output, not a request to reapply the parent's source fix.

## Tests actually run

From the repository root:

```sh
bun test \
  apps/timsexperiments/src/lib/resume/browser-answer.test.ts \
  apps/timsexperiments/src/lib/resume/knowledge.test.ts \
  apps/timsexperiments/src/lib/resume/server.test.ts \
  apps/timsexperiments/src/scripts/robot/evidence.test.ts \
  apps/timsexperiments/src/scripts/robot/mcp.test.ts \
  tools/seo/validate-dist.test.ts
```

Result: **160 passed, zero failed, 552 assertions across six files**. The browser-dependency test performs a small in-memory Bun bundle and writes no application build artifacts. The server and client tests exercise their in-process boundaries; no listening resume service or production request was needed. Scoped `git diff --check` also passed for the reviewed tracked source changes.

Additional direct `bun` source probes called `answerInBrowser` with institution-specific education, short availability, bot ownership, metric, unknown employer/skill pairing, and model-training questions. The two findings above include exact reproductions. The browser checks described above used the existing compiled static server on port 4340 at 1280 by 800. Temporary network and clipboard overrides were confined to my tab and restored. No shared server was started or rebuilt.

The focused tests provide useful cancellation, schema, public-statement, qualification, SDK transport, and bundle-isolation evidence. They do not establish general natural-language correctness. In particular, accepting `getAnswerBrief(...).opening` as an oracle in the source-membership scenario tests cannot catch the Houston framing error. Likewise, checking a source file for `status: 301` does not test a deployed redirect, and fragment noindex assertions alone do not test robots crawl access. There are no persisted reader-module tests in the reviewed site-script directory; the existing reader evidence is browser-session evidence rather than a maintained regression suite.

## Prior evidence and review limits

I read `tablet-reader-v2.md`, `local-host-v2.md`, and `seo-followthrough-v2.md`, plus the reader's existing browser-check artifact. Their full-build, reduced-motion, 320/390px reflow, contrast, full keyboard traversal, timeout, denied-clipboard, standalone-newsletter, and scene draw-count results are prior author evidence, not independent reruns here. The dist observed during this review was timestamped October 21 at 13:22 local time. Its freshness is bounded by that existing build; passing its tests does not prove an exact rebuild of every current shared edit.

I did not run a full app build, the whole site suite, live production requests, a real model download, mobile keyboard tests, Safari/Firefox, assistive technology, or a complete accessibility/security/performance audit. The static server's initial `/api/contact` GET returned 404; it cannot serve the application backend. That is outside these completed features and is not reported as a release defect. No contact or subscription form was submitted.

Active scene and workbench files under `scripts/campus`, SerializationBench, `scripts/playgrounds`, and `lib/playgrounds` were not edited or audited. Their transient test/build outcomes are not findings in this report. The original handcrafted cube precedent is `scripts/cube/main.ts`, `actions.ts`, and `worker.ts`, backed by `@timsexperiments/three-rubiks-cube`. I read that boundary and did not treat module line counts, lack of a new package, or lack of a reader worker as defects.

Lazy article loading, separate reader/dialog/content modules, and the local host's selection/presentation/worker boundaries support the goal of less homepage text and maintainable components. They do not by themselves prove the cinematic first-person experience or production readiness. The remaining owned correctness work is the two narrowly scoped local-host selection repairs above. Reader and SEO source pass within the evidence and limits recorded here.
