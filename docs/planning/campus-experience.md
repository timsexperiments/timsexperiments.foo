# Campus experience handoff

Status: refined design proposal, 2026-10-21. Owns experience direction for the first implementer, not application changes. The current uncommitted `docs/3d-site-transformation.md` and `CONTEXT.md` remain the requirements. Camera preference, service positioning, and mobile scene scope remain user decisions.

## First implementer brief

Build the isolated local `/campus` slice described in [campus-build-plan.md](campus-build-plan.md). Keep the existing homepage and article routes. Compose one arrival courtyard, one lab threshold, and one serialization bench with two authored viewpoints and ordinary HTML navigation. Prove the composition with procedural geometry before custom Blender assets. No character, walking system, extra building interiors, or minigame belongs in this slice.

Use the single first-visit flow below. The first useful demonstration is the real JSON/Protobuf exercise in [article-playgrounds.md](article-playgrounds.md), accessible independently at `/lab/json-vs-protobuf#challenge` once implemented. The anchor is a proposed contract, not an existing exercise. A scene with an article link is a reviewable visual milestone; it is not a completed playable bench.

The campus should help prospective freelance and fractional clients understand Tim's thinking and contact him. Employment is another audience. Until Tim chooses service positioning, use the proposed neutral introduction, "Software engineer. Explore what I build and how I think." Keep Contact visible throughout. Do not invent services, availability, customer results, or testimonials. Preserve the existing MCP-only treatment of detailed experience stories.

## Single first-visit flow

1. **Arrive on `/campus`.** Show Tim's name, the neutral introduction, Writing, Experience guide, and Contact as ordinary links. Writing opens `/lab`; Experience guide opens `/resume/mcp`; Contact uses the existing contact email destination. Include the existing GitHub and LinkedIn destinations as secondary links. All work before scene initialization. Do not introduce a fictional Work or downloadable Resume destination that has no agreed content.
2. **Choose "Explore the campus".** Initialize the scene on this explicit action. Before entry, use a CSS background or an owned still if one exists; do not initialize a live scene merely to supply the introduction's background. Show loading status and a recoverable failure state. Entry reveals the arrival view and the labeled HTML button "Serialization bench". Exploration requires no tutorial, sound, pointer lock, or movement skill.
3. **Select "Serialization bench".** Place the camera at its inspection view. The canvas hit target invokes the same action as the HTML button. Reveal a short DOM station summary, "Compare the encoded bytes of the same message," with "Read the article" and, once the exercise exists, "Try the challenge". Keep Contact nearby. Arrival remains an available scene button.
4. **Open the challenge.** Follow a normal full-page link to `/lab/json-vs-protobuf#challenge`. The article remains readable above it. Edit the sample, Run, inspect byte counts and named checks, then try another input or read the explanation. Use the playground plan's exercise and runtime gates, not a second campus-only evaluator. If the challenge is not implemented, expose the existing article link and clearly state that the interactive bench is unfinished in the review handoff. Never show fabricated run results.
5. **Continue or contact.** The article and campus each retain ordinary contact access. Browser Back uses normal document history. No success gate, collectible, login, or required MCP connection stands between the visitor and Contact.

This is the proposed default flow for the first slice. It does not select the eventual exploration camera or require visitors to enter 3D before using the site.

## Composition and three focal assets

Start with an approximately 24 by 18 meter courtyard only to test proportions. From arrival, the path and pavilion ribs converge on the bench. The bench is visible through the threshold. The tower sits off that axis and behind the pavilion so it adds depth without competing with the useful action. There are two views, arrival and bench inspection. Neither requires walking through a doorway.

1. **Ribbed lab portal.** A pale structural frame around a deep, warm-lit threshold. Repeat a few ribs to create shadows and a recognizable silhouette. Use opaque dark window panels initially. From arrival, the portal frames the bench; close inspection must not reveal an empty promised interior. First implementation uses boxes and repeated frame geometry. Later Blender work adds bevels, panel joints, and authored trim.
2. **Serialization bench.** A dark instrument housing with a recessed work surface and two parallel illuminated byte rails labeled JSON and Protobuf in HTML. Each rail has an identical bytes-to-length scale when real output is connected. Keep the largest permitted result within the frame using one shared scale for that run, and display exact byte counts as text. Do not normalize each rail separately or imply that decorative blocks are individual bytes. First implementation uses a shaped base, cylinders, rails, and restrained emissive accents. Custom housing, fasteners, and cable details come later.
3. **Split-fin research tower.** Two narrow, offset vertical fins rising behind the pavilion, with one warm slot between them. Its job is distant scale and a distinct campus skyline. It is noninteractive scenery with no destination label or door. First implementation uses a few low-detail solids; custom modeling is optional until a close view exists.

Supporting geometry is a stone terrace, one short path, low planted edges, and one reusable planter. Omit the previously proposed bridge, archive alcove, extra interiors, and cube attraction from the first slice. Writing and Experience are real links, not additional empty buildings.

Use warm stone and pale ribs against graphite equipment, dark window panels, warm interior light, and restrained cyan wayfinding. Let silhouette, shadow, roughness variation, and contact with the ground carry the image. Keep text in a stable DOM area with an opaque backing. Readability must not depend on luminous lettering inside the renderer. Reuse local typography; avoid making fonts or external image downloads a prerequisite.

## What can work before Blender

The convincing first slice is a composed scene, not an asset catalog. Implement the three silhouettes, terrace, portal depth, bench framing, consistent scale, and one lighting condition. Follow the build plan's initial directional shadow light and environment fill proposal. Avoid making bloom, transmission glass, reflection captures, lightmap tooling, or imported models a dependency of the first frame. These are scope recommendations, not measured rendering results.

Review the arrival and inspection views with simple geometry under the actual browser lighting. The bench should read as equipment rather than an unadorned cube; the portal needs thickness and a shaded recess; the tower needs a deliberate outline. If these fail, adjust proportions, lighting, and composition before adding polygons. An approved still should eventually come from this owned scene. No external model or generated raster has been commissioned in this handoff.

Before Blender, it is reasonable to deliver the local route, both views, scene entry/pause/exit, useful navigation, fallback state, and a real structured-data bench if the trusted serializer is ready. It is not reasonable to call bespoke model quality, a finished interior, character animation, free walking, or a fully isolated code playground complete. Use the build plan's asset ownership, license records, cleanup contract, and provisional performance budgets without adding a second set here.

## Reconciliation with the other plans

- **Scene navigation.** Follow the build plan's `selectDestination`, `pause`, `resume`, and `dispose` controller boundary. DOM controls own destination selection; picking calls the same action. Use local view state for arrival/bench. Drop this document's earlier scene URL/history requirement for the first slice. Full-page content links use browser history without adding a client router. Cross-page input persistence and restoring an exact camera pose on Back are later work.
- **Camera.** Authored viewpoints with bounded drag inspection are a reversible prototype recommendation. Provide instant placement for reduced motion and a way to skip any proposed transition. Stop a transition before accepting a new destination. The user has since selected first person throughout. Keep inspection and destination views at the visitor viewpoint; free walking versus destination selection remains open. Do not commission a third person character rig.
- **Names.** Visible station name is "Serialization bench". Use `message-packing-lab` as the proposed station/challenge identifier already named in the playground plan, and map it explicitly to `/lab/json-vs-protobuf#challenge`. Arrival is a separate scene destination. Display names, IDs, and URLs are distinct values.
- **Exercise UI.** The playground plan's primary exercise edits a JavaScript function returning the article's `Person` payload. This replaces the earlier requirement here for both a field form and a JSON editor. Begin with its labeled textarea and Run, Stop, Reset, output, and explanation. A second editor mode adds synchronization work and is unnecessary for this milestone.
- **Fallback.** If arbitrary edited code is not ready, the playground plan permits a bounded structured-data editor using a trusted serializer. Label it as a data example and keep arbitrary code disabled. Run real encoding and checks; do not treat this fallback as completion of the code-execution acceptance gate. Interpreter choice and resource limits remain owned by the playground plan and unverified here.
- **Shared instrument state.** For a runnable campus bench, reuse the exercise controller/result contract. HTML and 3D consume the same validated run result, including run identity, status, byte counts, decoded values, and check outcomes. The scene must not calculate its own estimates or replay stored success as a fresh result. Changing input marks old results stale; failed or canceled runs leave no apparent new success. Pause decorative rail motion without changing results. A linked-only visual slice does not yet prove this integration.

Keep the first runnable exercise attached to the ordinary article. Campus embedding of the same controller can follow its independent proof. This sequencing lets scene composition progress without duplicating runtime work or misrepresenting an unfinished exhibit.

## Accessible interaction contract

Use semantic links, destination buttons, a labeled editor, and a textual results table. Complete the learning task without canvas aiming, dragging, color recognition, or sound. Keep camera shortcuts inactive while editing or using navigation. Focus stays on the initiating control for a viewpoint change; announce the destination once. Report run completion once without moving focus away from the editor. Detailed check output remains available to read.

Keep the first station summary inline instead of introducing a modal. Full articles use document navigation. The surrounding HTML must convey the place, actions, and meaningful results before treating the canvas as decorative for assistive technology. Loading, failed graphics, and runtime initialization failure preserve navigation and explanations. Do not start audio in this slice.

Reduced motion gets immediate viewpoints and still equipment. Provide Pause for scene motion. This is a product requirement; W3C's interaction-animation criterion is Level AAA, while its pause criterion is Level A and applies to specified automatic movement and updates. Do not present every motion choice as an AA requirement. See [W3C animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) and [pause, stop, hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).

At narrow widths, stack navigation, scene, and station summary in document flow. Prioritize the editor and results on the article page. Test essential HTML at 320 CSS pixels and enlarged text; the 3D view is not a reason to exempt surrounding controls from reflow. See [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). This content-access recommendation leaves full mobile 3D scope open.

## Review gates and implementation order

1. Route owner creates the semantic `/campus` shell and real links before scene work. Verify useful access with scene loading prevented. Use the independent layout proposed in the build plan rather than inheriting homepage scroll transforms.
2. Scene owner builds the three focal assets procedurally and connects the two destination controls. Review arrival/inspection compositions, scale, ground contact, shadows, label placement, and material response. Capture the build plan's wide/narrow views. Record this as a visual prototype, not final model quality.
3. Playground owner proves the standalone article exercise under its own acceptance checklist. Validate the article's exact `Person` fields and emoji sample. Never reuse historical Go timings or large byte totals as browser results. The existing article's benchmark claims require separate editorial verification before reuse as evidence.
4. Integration owner connects real results to the bench with the shared contract above. Confirm the same input produces the same textual and spatial result, including stale, invalid, canceled, and reset states. No hardcoded winning format, latency race, or network-transmission claim belongs in the rail visualization.
5. Review keyboard operation, visible focus, loading recovery, reduced motion, pause, 320-pixel reflow, enlarged text, and input release. Check screen-reader output separately. Use the build plan's measured performance and lifecycle checks. Source inspection cannot establish these outcomes.

A complete first experience needs useful navigation, the readable authored scene, and a real runnable bench. If step 3 or 4 is pending, hand back the visual slice with that exact limitation. Do not block useful procedural scene work on Blender. No optional minigame is required to pass these gates.

## Decisions still with Tim

- Which freelance/fractional services should lead the introduction? The neutral copy is provisional. It does not claim an offer or availability.
- How should first person exploration combine free walking and destination selection? First person is confirmed; movement mechanics remain open.
- What is the supported mobile 3D scope and which physical devices define acceptance? Ordinary content and challenge access are the proposed baseline; full touch exploration remains open.
- Does launch require editable arbitrary code or is a working structured-data example an acceptable first milestone? Runtime verification remains a technical gate either way.
- What deliverable is expected before the reset? This handoff scopes a first implementation but does not invent a deadline commitment.

No blocker prevents this planning handoff. The build plan reports dependency installation as a prerequisite for browser verification and Blender as absent at its inspection. Those are prior inspection findings, not a fresh machine inventory. Exact runtime integration and rendered quality still need implementation evidence.

## Evidence and limits

Repository sources inspected for this refinement:

- [`CONTEXT.md`](../../CONTEXT.md) and [`docs/3d-site-transformation.md`](../3d-site-transformation.md), current audience, glossary, requirements, and unresolved choices.
- [`campus-build-plan.md`](campus-build-plan.md), isolated route, controller boundary, asset sequence, and proposed budgets; [`article-playgrounds.md`](article-playgrounds.md), exercise entry, identifier, code interface, runtime gates, and data-editor fallback.
- [`src/pages/index.astro`](../../apps/timsexperiments/src/pages/index.astro), fixed panels and scroll transforms; [`src/components/home/Hero.astro`](../../apps/timsexperiments/src/components/home/Hero.astro), current cube and `/lab` link.
- [`src/pages/lab/[...slug].astro`](../../apps/timsexperiments/src/pages/lab/[...slug].astro) and [`src/layouts/BlogPost.astro`](../../apps/timsexperiments/src/layouts/BlogPost.astro), article content rendering and prose slot. No challenge exists in that inspected layout.
- [`src/content/blog/json-vs-protobuf.mdx`](../../apps/timsexperiments/src/content/blog/json-vs-protobuf.mdx), `Person` schema at lines 41–50, Pixel sample at lines 26–33, and historical Go benchmark at line 74 onward. This inspection verifies what the article contains, not its benchmark accuracy.
- [`src/components/home/Contact.astro`](../../apps/timsexperiments/src/components/home/Contact.astro), existing email configuration reference and professional profile links; [`src/pages/resume/mcp/index.astro`](../../apps/timsexperiments/src/pages/resume/mcp/index.astro), public connection guide. Detailed MCP records were not copied into this handoff.
- [`public/`](../../apps/timsexperiments/public/), local Atkinson font files and current images. No new font or asset download is required by this design.

W3C primary guidance linked above was checked for the motion and reflow distinctions. No new runtime, serialization-library, exporter, or engine capability was verified here. No browser render, performance measurement, accessibility conformance test, installation, server, deployment, or application edit was performed. Only this planning document changed.
