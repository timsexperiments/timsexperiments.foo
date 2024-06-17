/// <reference path="../.astro/db-types.d.ts" />
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_VIEW_COUNTER_API: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
