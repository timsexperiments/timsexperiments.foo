# Visitor-local WebLLM validation

2026-10-21. Tested on `http://127.0.0.1:4321` in an owned Chrome tab. T3 preview opened the page, then two snapshots failed with `Preview automation snapshot timed out after 15000ms`, so testing moved to Chrome. The browser reused the cached f16 model files rather than downloading them again.

## Outcome

WebLLM 0.2.86 now starts after the Vite worker output was changed to ES format by the config owner. The cached `SmolLM2-360M-Instruct-q4f16_1-MLC` model reached ready state in about two seconds. Inference stayed in the worker and on the visitor device.

The 360M model is not reliable enough to author free-form resume answers. Before the final gate, it produced placeholder citations or stopped after an entity name. JSON-constrained generation fixed the output shape but produced a contradictory architecture answer that combined claims from two records. That answer was not kept.

The final implementation treats the model as an extractive helper. It must return one sentence copied exactly from one record plus that record's allowlisted ID. The browser-side gate rejects paraphrases, combined claims, unknown IDs, new numbers, URLs, markup, placeholders, and incomplete output. If extraction fails, the UI withholds the AI answer and keeps the curated same-origin evidence summary, complete records, dates, and qualifications visible.

## Browser results

- Architecture, `What platform architecture has Tim led?`: retrieval returned five relevant records and a useful curated summary. The strict extractive AI answer was withheld. No unsupported model prose was shown.
- Mentoring, `How has Tim mentored engineers?`: retrieval returned five relevant records and a useful curated summary. The strict extractive AI answer was withheld.
- Unknown experience, `Has Tim worked professionally on COBOL mainframes?`: returned `not_documented`, said the records do not establish the experience, and did not invoke generation.
- Stop: the control returned the session to an askable state and unloaded local inference. Published evidence remained visible.
- Close and reopen: local inference was off after reopen, the existing transcript remained, and a fresh mentoring query returned evidence successfully.
- Retry after stop: evidence retrieval succeeded without re-enabling or re-downloading the model.

The model loaded and generated, but none of the representative questions produced an exact-source extraction worth displaying. That is the measured quality limit for this model and prompt budget. The deterministic evidence path is the dependable visitor answer.

## Checks

- `bun test apps/timsexperiments/src/scripts/robot`: 14 passed, 0 failed, 60 assertions.
- `bun run --cwd apps/timsexperiments check`: 0 errors, 0 warnings, 32 existing hints.
- `bun run --cwd apps/timsexperiments build`: completed and emitted the ES worker bundle.
- Browser startup used the cached f16 model. No paid API, server inference, dependency change, deployment, commit, or external message was involved in this validation pass.
