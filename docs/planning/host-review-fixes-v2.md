# Local host independent-review fixes

October 21, 2026, on `feat/3d-site-transformation` in the shared checkout.

Both P2 selection findings in `reader-host-independent-v2.md` are repaired in the browser-local selector. I read that full review and `local-host-v2.md`, including their evidence and limits. Reader and SEO review were not repeated.

## Changed paths

- `apps/timsexperiments/src/lib/resume/browser-answer.ts`
- `apps/timsexperiments/src/lib/resume/browser-answer.test.ts`
- `docs/planning/host-review-fixes-v2.md`

Only these three paths were edited for this task. Shared MCP `answering.ts`, public corpus records, scene, guided experiment, and host presentation files were left to their existing owners. No commits, pushes, deployments, package installs, or delegated agents were performed.

## Education selection

Education questions now select the exact curated education detail from `career-context`, before the shared generic briefing can replace it. The visible answer states that the supplied resume lists a University of Houston BBA in Information Systems with a Computer Science minor, dated 2019, and a Georgia Tech MS entry dated 2026. The statement explicitly attaches unconfirmed completion to Georgia Tech. It does not infer additional graduation facts.

The complete source and qualifications remain available. Both `degree from` and `graduate from` questions are covered for Houston, Georgia Tech, and the resume's Georgia Institute of Technology name. Education vocabulary is checked against the education detail, with recognized institution names handled as complete names. Unrelated employers and locations cannot validate an unknown institution. Harvard, MIT, UT, University of Texas, University of Georgia, and Google degree questions remain unknown.

## Hiring availability selection

Anchored patterns recognize short questions about Tim or his availability and starting work before project retrieval. `Is Tim available?` and `Can Tim start?` now return the existing response:

> Tim's engineering experience is documented; these employment preferences or eligibility details need to be confirmed with him directly.

These replies have `not_documented` status, no project evidence, no optional-generation context, and no new topic. The host's existing conditional topic update therefore preserves a previous supported project. An initial availability question followed by `Tell me more` remains unknown. Pronoun, start-date, and several short hiring variants are also covered.

The matcher requires a complete personal question. Mentions of Tim and technical availability alone do not trigger it. Counterpart and application-database availability questions retain their routing evidence, visible technical opening, and full qualifications. The existing lexical rejection of `How did Tim improve system availability in routing?` remains unchanged and does not become a hiring response.

## Verification

Visible-answer expectations were written directly from the curated evidence and the review's confirmation response. The new regressions do not call `getAnswerBrief` as an answer oracle. Before implementation, they reproduced the reported failures. Existing scenario source-membership checks remain as separate coverage.

Run from the repository root:

```sh
bun test \
  apps/timsexperiments/src/lib/resume/browser-answer.test.ts \
  apps/timsexperiments/src/lib/resume/knowledge.test.ts \
  apps/timsexperiments/src/lib/resume/server.test.ts \
  apps/timsexperiments/src/scripts/robot/evidence.test.ts \
  apps/timsexperiments/src/scripts/robot/mcp.test.ts
```

Result: **167 passed, zero failed, across five files**. Coverage includes visible institution scoping, unknown institutions, short hiring questions, technical controls, prior-topic behavior, existing conversational follow-ups, sensitive qualifications, and cancellation. Throwing-fetch tests exercise the new selection paths with zero requests. The existing in-memory browser bundle test passes without server or MCP transport code. This focused bundle does not write application build artifacts.

Prettier checks pass for both owned TypeScript files. Scoped whitespace checks pass, including checks of the new untracked files without staging them.

## Residual limits and integration handoff

Selection remains deterministic and lexical. The hiring matcher intentionally covers bounded personal forms; other paraphrases can still be rejected. The education check can also reject valid paraphrases outside the curated wording. Source membership and vocabulary matching do not establish every premise or relationship in arbitrary compound questions. No credential or availability inference was added.

No full application build or browser check of the repaired code was run while the scene and guided experiment work remained active. The existing compiled preview predates these fixes. **Parent integration must run a fresh combined build, then verify the Houston, Georgia Tech, unknown-institution, short hiring, technical availability, and prior-topic cases in that browser output.** Prior browser evidence in the two reviewed documents applies only to the versions they inspected. No new claim is made about first-load offline use, optional-model execution, or general browser behavior.

There were no implementation blockers. The deferred fresh-build browser check is the remaining integration verification.
