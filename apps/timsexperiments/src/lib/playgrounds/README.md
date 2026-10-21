# Serialization bench

Import `src/components/campus/SerializationBench.astro` and render
`<SerializationBench />`. It defaults to `id="challenge"`; pass a unique `id`
when the article and dialog appear on the same page. Its own bundled Astro
script registers `serialization-bench` once. No parent initialization call,
visibility observer, dependency installation, or layout measurement is needed.
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
  and before replacing it with a completed result.

This is a local element event, not a window event. Subscribers should clear
scene measurements on `null` and use actual byte lengths for any graphics.
`kind: "completed"` can include failed checks; inspect all check statuses
before calling a run passed. Each connected instance has its own monotonic
run counter. A completed run does not steal focus. Input errors mark and focus
the editor with an associated explanation; the polite status announces only
completed comparisons.

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

Run serializer fixtures with:

```sh
bun test apps/timsexperiments/src/lib/playgrounds/serialization.test.ts
```

51 tests pass, including an independently transcribed complete wire fixture,
int32 endpoints and negative values, Unicode, default restoration, unknown
fields, malformed wire data, input boundaries, and deliberate check failures.
The Pixel starter measures 107 JSON bytes and 68 Protobuf bytes. All-default
data measures 43 and 0.

Strict standalone TypeScript checking and `astro check --root
apps/timsexperiments` passed, with 25 existing hints elsewhere in the app.
The actual Astro component was rendered with scoped CSS and the bundled
browser script in a temporary standalone verification document, without
starting a server. Headless Chrome 154.0.8037.92 checks at 1,050px and 320px
passed recipes, error recovery, edit invalidation, confirmed/cancelled reset,
literal HTML-looking text, zero-width zero-byte bars, ten disconnect/reconnect
cycles with one completed event per submit, unique editor IDs, initially hidden
dialog initialization, and absence of horizontal overflow. The document
recorded no resource requests. Wide and narrow screenshots were reviewed.

The parent still needs to verify the integrated article/dialog and actual
Astro asset loading. Firefox, Safari, real keyboard traversal, screen readers,
and enlarged-text browsing were not tested in this standalone check.
