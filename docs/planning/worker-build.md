# Worker build note

The production build uses Vite's module worker output:

```ts
vite: {
  worker: {
    format: 'es',
  },
}
```

Vite defaults worker bundles to `iife`. That format is incompatible with the
code-splitting build emitted for `src/scripts/robot/inference.worker.ts?worker`,
so production bundling fails before the worker is emitted. The module format
preserves code-splitting and matches the worker's module dependencies without
changing the worker or its client.
