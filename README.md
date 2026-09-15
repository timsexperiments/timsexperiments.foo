# Tim’s Experiments

Bun workspaces and Turborepo coordinate the apps in `apps/*` and shared TypeScript packages in `packages/*`. The repositories under `projects/` are independent Git submodules and retain their own package managers and lockfiles.

## Setup

Use Bun **1.4.2**, pinned in `.bun-version` and `package.json`, and Node **22.12 or newer** for the build tooling. Install with:

```sh
bun install --frozen-lockfile
```

The root `bun.lock` is the only lockfile for this workspace. After changing dependencies, run `bun install` and commit the updated lockfile. CI uses frozen installs and reads the Bun version from `.bun-version`.

## Commands

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the Astro site |
| `bun run test` | Run tests in all five workspaces, in separate processes |
| `bun run check` | Run the site’s Astro type check |
| `bun run build` | Build the site and validate the view-counter Worker bundle without deploying |
| `bun run build:site` | Build only the Astro site |
| `bun run test --filter=apps-timsexperiments` | Run the site’s page and MCP tests |

Shared packages export TypeScript source, so they do not need a separate compilation step. Turbo caching is disabled while builds can embed environment-specific configuration. Deployments remain explicit workspace commands.

The site needs `DATABASE_URL` and `DATABASE_AUTH_TOKEN` for the existing subscription service. For a build-only CI check, use `DATABASE_URL=https://ci-build.invalid` and `DATABASE_AUTH_TOKEN=ci-placeholder`; this does not provide a working database or belong in a deployed environment. Local app `.env` files remain supported by Astro.

## Cloudflare Pages

After this PR is merged, use these settings for the existing `timsexperiments-foo` project:

| Setting | Value |
| --- | --- |
| Root directory | Repository root, leave blank |
| Build command | `bun install --frozen-lockfile && bun run build:site` |
| Build output directory | `apps/timsexperiments/dist` |
| `BUN_VERSION` | `1.4.2` |
| `SKIP_DEPENDENCY_INSTALL` | `1` |

Set the two build variables in both preview and production. Preserve the existing database and public API variables. For the root build, Turbo explicitly forwards `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `PUBLIC_*`, and `ASTRO_STUDIO_APP_TOKEN` to Astro.

If keeping the current root directory `apps/timsexperiments`, the existing build command `bun install --frozen-lockfile && bun run build` and output `dist` still work. That executes the app build directly without Turbo.

Pages Git build commands and root directories remain dashboard settings. A Wrangler file can own runtime bindings and compatibility settings, but adding one would replace the existing dashboard configuration. This change keeps that ownership intact. The separate view-counter Worker retains its `wrangler.toml`.

References: [Bun lockfiles](https://bun.sh/docs/pm/lockfile), [Turborepo configuration](https://turborepo.com/docs/reference/configuration), [Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Pages build image variables](https://developers.cloudflare.com/pages/configuration/build-image/), [Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/).
