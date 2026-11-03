# Serialization bench

Import `src/components/campus/SerializationBench.astro` and render
`<SerializationBench />`. It defaults to `id="challenge"`; pass a unique `id`
when the article and dialog appear on the same page. Its own bundled Astro
script registers `serialization-bench` once. No parent initialization call,
visibility observer, dependency installation, or layout measurement is needed.
The default is a four-step lesson: predict, change a concrete record, measure,
then inspect the return trip. Three challenges cover an emoji, repeated hobbies,
and proto3 defaults. Every step is directly accessible. Predictions are optional;
Sandbox and Skip lesson open the freeform editor immediately. Byte inspectors
and the shared schema are opt-in details. Reconnecting starts a fresh lesson,
clears results, and preserves the textarea draft.

Connecting inside a closed native dialog works. The parent owns opening,
closing, initial focus, Escape behavior, and focus restoration.

The current challenge ID is `json-vs-protobuf-person`, version 1, following
`docs/planning/article-playgrounds.md`. It supersedes the earlier plan's
`message-packing-lab`. The canonical target is
`/lab/json-vs-protobuf#challenge`.

## Result handoff

Listen on the rendered `serialization-bench` element for
`serialization-result`. The bubbling `CustomEvent` carries
`SerializationResultDetail` from `contracts.ts`:

- A deeply frozen completed result includes both byte counts, decoded values,
  input, compact JSON, full hex dumps, run ID, and three named checks.
- `null` clears the previous result on edits, reset, invalid input, disconnect,
  mode changes, and before replacing it with a completed result.

This is a local element event, not a window event. Subscribers should clear
scene measurements on `null` and use actual byte lengths for any graphics.
`kind: "completed"` can include failed checks; inspect all check statuses
before calling a run passed. Each connection has its own monotonic
run counter. A completed run does not steal focus. Input errors mark and focus
the editor with an associated explanation; the polite status announces record changes and completed comparisons.
Returning from the sandbox republishes the lesson snapshot only when its record
is still unchanged. A sandbox draft is kept separately and always needs a new run
after a mode switch.

## Execution and measurement

This is structured JSON editing with a trusted, fixed Person codec. It runs
synchronously on bounded input, without a Worker, guest code, iframe, eval,
network calls, storage, or timers. There is no pending run to cancel and no
Stop control. This is a deliberate simplification of the proposal's Worker
lifecycle for the authorized first-stage implementation. No arbitrary-code
isolation or timing benchmark is claimed.

`parsePerson` validates at the JSON boundary; `evaluateSerialization` is the
shared evaluator. `encodePerson` expects an already validated Person.
`decodePerson` bounds and validates wire input. The codec implements the
article's `person.proto`, omits proto3 scalar defaults, restores them when
decoding, and preserves ordered repeated strings, including empty entries.
It skips unknown wire fields, including bounded legacy groups; malformed tags,
wire types, lengths, UTF-8, varints and excess fields are rejected. This is a
codec for this schema, not a general Protobuf library.

Compact JSON includes all four keys in a fixed order. Both encodings are
measured as actual UTF-8/binary byte arrays. Negative int32 is sign-extended
to 64 bits, not ZigZag encoded. Per-string limit is 1,024 UTF-8 bytes, hobby
count is 32, raw editor limit is 16,384 UTF-8 bytes, and decoder byte limit is
40,000. A leading U+FEFF, emoji, combining text, and duplicate hobbies are
preserved. Lone UTF-16 surrogates are rejected.

## Checks performed

```sh
bun test apps/timsexperiments/src/lib/playgrounds
```

58 tests cover the original codec fixtures and lesson transitions. The lesson
fixtures use the actual evaluator: one additional emoji measures 111/72 bytes,
one additional stargazing hobby 120/80, and defaults 43/0. Starting bytes remain
107/68. Tests cover skipped predictions, direct navigation without a result,
back/edit invalidation, next/restart/replay, and frozen snapshots.

For DOM and lifecycle checks, open the local Astro page in a browser and run:

```js
const { verifySerializationBench } =
  await import('/src/scripts/playgrounds/serialization-bench.browser.ts');
verifySerializationBench(document.querySelector('serialization-bench'));
```

This test-only module is not imported by the component. It clones the real Astro
markup, exercises the registered custom element, and removes its fixtures. Its
27 assertions cover the lesson, sandbox errors, clear/reset, stale byte clearing,
mode handoffs, duplicate instances, closed-dialog mounting, reconnect listeners,
draft retention, and null on disconnect.

See `docs/planning/guided-experiment-v2.md` for the exact browser sizes,
screenshots, keyboard checks, strict TypeScript command, and verification limits.
