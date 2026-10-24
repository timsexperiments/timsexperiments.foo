# Tim's Experiments 3D logo

The two GLBs in `assets/campus/logo/` extrude the repository's original logo paths. The original SVGs remain the design authority. No font, raster tracing, or replacement lettering is used. Each theme is generated from its own SVG, including the small coordinate differences between the files.

## Rebuild

From the repository root, with Node 24 and npm:

```sh
npm ci --prefix tools/campus/logo
node tools/campus/logo/generate.mjs
```

All npm dependencies and their lockfile are isolated under this tooling directory. `node_modules/` is ignored. The generator resolves paths relative to itself, so the generation command also works from other working directories. No app packages, project lockfiles, or shared install state are involved.

Editable source: `generate.mjs`. Source SVGs:

- `apps/timsexperiments/src/assets/tim_s_experiments_logo.svg`
- `apps/timsexperiments/src/assets/tim_s_experiments_logo_dark.svg`

Outputs include two GLBs, a resource/check manifest, front and perspective renders, source raster references, silhouette difference images, and `review.html` for local visual review. The review HTML is a static companion and does not need rebuilding when only geometry is regenerated unless its displayed resource counts change.

## Geometry and materials

- Three 0.165.0 SVGLoader parses the original nine paths, their inherited `fill="none"`, stroke width, round caps, and default miter joins. Shape holes come from the original path winding.
- Curves are adaptively flattened to 0.002 SVG unit chord deviation. Stroke triangles are expanded by 0.00001 SVG unit before polygon union to close Float32 cap seams; contours are cleaned within 0.00005 SVG unit. Tiny union artifacts below 0.0001 square SVG unit are discarded. These tolerances are recorded in the manifest.
- The flask stroke is one connected shape with one opening. Lettering retains three counters. All nine source paths remain independently named meshes.
- Extrusion is 2.4 SVG units deep, with a 0.08-unit bevel, two bevel segments, and an inward offset. The side contour follows the original outline; the bevel does not enlarge it. Curve sampling makes any polygonal 3D outline an approximation within the recorded tolerance.
- World coordinates are Y up and +Z front. The 252 × 42 viewBox becomes 6 × 1 units, centered at the viewBox center. Visible geometry occupies slightly less than those bounds. Total extrusion depth including bevels is about 0.061 units. Each successive SVG path receives a 0.00001-world-unit front offset to preserve painter order and avoid coplanar flicker.
- MeshStandardMaterial uses roughness 0.65 and metalness 0. All base colors are exact source sRGB values converted to glTF linear baseColorFactor. Light: mint `#17B897`, flask `#02120F`, text `#0A0B0A`. Dark: mint `#17B897`, flask `#E4FCF7`, text `#FAFAFA`.
- Each GLB has nine meshes, three materials, 42,896 triangles, no textures, no animations, no compression extensions, and no external resources. Per-variant byte and vertex counts are in `manifest.json`.

Load with the existing Three r165 GLTFLoader, then add `gltf.scene` to the caller's scene. Choose one theme variant at a time. App wiring, delivery URLs, scene lighting, placement, and transitions are intentionally left to the owning implementation. The GLBs currently live in the repository asset directory, not the app public directory.

These are display assets with separate overlapping painted volumes, not a single printable watertight boolean solid. The overlapping liquid and outline preserve the SVG's paint order. Lit renders naturally differ from flat SVG color swatches.

## Verification actually performed

`node tools/campus/logo/generate.mjs` exports and then reloads each GLB using Three r165 GLTFLoader. It checks finite geometry attributes, valid indices, round-trip mesh/triangle counts, and all glTF material color factors. It then renders the reloaded geometry with the included local CPU triangle z-buffer renderer.

Front silhouette verification compares geometry coverage with resvg's original SVG raster at 1512 × 252 and 6048 × 1008, using alpha >= 128. Required intersection-over-union is at least 99% and 99.5%, respectively. Actual values are stored in the manifest. Raster coverage near boundaries and finite curve sampling prevent a pixel-identical raster result. Green diff pixels agree, red pixels are SVG-only, and blue pixels are geometry-only. These masks test union coverage, while material factors are checked separately.

Front and perspective PNGs were opened and visually inspected. Perspective previews use perspective projection and diffuse lighting. The included renderer has no shadows, antialiasing, environment reflections, or WebGL dependency; these images are genuine geometry projections, not browser/GPU render claims. No interactive app or GPU behavior has been tested.

Two consecutive generation runs produced identical GLB SHA-256 hashes, checked with `shasum -a 256` and `shasum -a 256 -c`. Source SHA-256 hashes in the manifest identify the exact inputs. Changing config, source paths, or dependency versions requires regenerating and inspecting previews.

## Versions and rights

Generator version 1.0.0. Geometry derives only from the existing repository logo. Original brand ownership and permissions continue to apply; this work grants no new brand rights. No third-party models or fonts are embedded.

Build-time packages are pinned in the isolated lockfile:

| Package | Version | License |
| --- | --- | --- |
| three | 0.165.0 | MIT |
| jsdom | 26.1.0 | MIT |
| polygon-clipping | 0.15.7 | MIT |
| @resvg/resvg-js | 2.6.2 | MPL-2.0 |
| pngjs | 7.0.0 | MIT |

The lockfile also pins transitive dependencies. Their licenses remain in their installed package distributions. resvg is used only to verify the SVG reference and is not embedded into the geometry or needed by the application. No paid service was used.
