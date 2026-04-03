# fastify-schema-dedupe

[![NPM Package][npm]][npm-url]
[![NPM Downloads][npm-downloads]][npmtrends-url]
[![CI][ci-badge]][ci-url]

> **Archived.** This project is **not recommended for new use**. Startup benchmarks with **large, nested, duplicated** route schemas showed **no meaningful improvement** over baseline Fastify—on the order of **~1.00× to ~1.06×**, i.e. noise. **Ajv already avoids redundant compilation** for the same logical schema shape; doing the same job earlier at the Fastify layer (canonicalize, hash, `addSchema`, `$ref`) does not buy wall-clock startup and can add measurable overhead. Prefer Fastify’s ordinary schema registration.

_ESM-only._ A Fastify plugin that **deduplicates inline JSON Schemas** on your routes by registering each distinct schema once under a generated `$id` and replacing duplicates with `$ref`.

## Background

The original idea was that many routes with identical **inline** schema objects might each pay a separate Ajv compile at `ready()`, and that collapsing those to shared `addSchema` + `$ref` would cut startup cost.

In practice, **Ajv’s own internal caching** (compiled validators keyed by structural identity) already covers the “same shape many times” case. This plugin’s `onRoute` work trades one deduplication strategy for another with **similar end cost**, while adding per-route canonicalization and hashing. With **complex schemas**, that extra work dominates any hypothetical win: deep key sorting, serialization, and hashing run **per route × per slot**, which is expensive when objects are large.

Schemas that already use `$ref` or define their own `$id` are left unchanged.

## Installation

```sh
pnpm add fastify-schema-dedupe
```

## Usage

Register **before** you register routes (or any plugin that adds routes), so every route is seen by the hook.

```ts
import Fastify from 'fastify';
import { fastifySchemaDedupePlugin } from 'fastify-schema-dedupe';

const app = Fastify();
await app.register(fastifySchemaDedupePlugin);

app.post(
  '/example',
  {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' } },
      },
    },
  },
  async (request) => ({ ok: true }),
);

await app.ready();
console.log(app.getSchemaDedupeStats());
```

## Plugin options

| Option                 | Type                 | Default   | Description                                                                                                                                   |
| ---------------------- | -------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `dedupePrefix`         | `string`             | `'hash:'` | Prefix for generated schema `$id` values (e.g. `hash:a1b2c3d4e5f6`).                                                                          |
| `schemaTypes`          | `SchemaDedupeSlot[]` | All slots | Subset of `'body' \| 'querystring' \| 'params' \| 'headers' \| 'response'` to dedupe.                                                         |
| `verifyHashCollisions` | `boolean`            | `true`    | If true, on a hash match verifies the canonical JSON matches; throws on mismatch (truncated SHA-1 collision). Set `false` to skip that check. |

`SchemaDedupeSlot` is exported for typing.

The default prefix is also exported as `DEFAULT_DEDUPE_PREFIX`.

## Stats

After routes are registered, `app.getSchemaDedupeStats()` returns:

- `encountered` — inline object schemas considered for deduplication
- `created` — new shared schemas registered
- `cacheHits` — times an existing shared schema was reused

## Development

```bash
pnpm install
pnpm dev
pnpm tsc
pnpm build
pnpm lint
pnpm lint:fix
pnpm format
pnpm test
```

### Benchmarks (startup)

**How to run:** from the repo root, after `pnpm install`:

```bash
pnpm bench
```

This runs [Vitest’s benchmark mode](https://vitest.dev/guide/features.html#benchmarking-experimental) (Tinybench) over [`packages/fastify-schema-dedupe/src/plugin.startup.bench.ts`](packages/fastify-schema-dedupe/src/plugin.startup.bench.ts). The scenario is **300 POST routes** that each declare the **same** duplicated inline **`body`** and **`response.200`** schemas; the schemas are **large and nested** so Ajv compilation is non-trivial. Two suites compare **baseline Fastify** vs **`fastifySchemaDedupePlugin`** (`verifyHashCollisions: false` in the bench for less overhead):

1. Full cycle through **`await app.ready()`** (then `close()`).
2. Same, but **`ready()`** plus **`listen({ port: 0 })`** to approximate “time until accepting TCP.”

Each Tinybench sample includes a **fresh `Fastify()` instance**, route registration, and teardown so iterations stay independent.

**What we observed (high level):** With these complex schemas, results are essentially a **dead heat** with baseline—**~1.00×–1.06×**, i.e. within noise. The plugin is **not** “broken”: `getSchemaDedupeStats()` still shows the intended behavior (for example **2** shared schemas **created**, **598** **cache hits** across body + response for 300 routes). The takeaway is that **Fastify + Ajv were already doing the expensive part once per unique structure**; replacing many inline copies with explicit `$ref` + `addSchema` **does not improve** measured `ready()` time in a meaningful way.

**Why there’s no win (and sometimes a small loss):** When Fastify ends up with `$ref` to a shared `$id`, work is still roughly “resolve ref → compile once.” When Fastify sees many identical inline shapes, **Ajv’s internal caching** already limits redundant recursive compilation. This plugin mainly **re-implements** that idea upstream, with extra cost from **per-route** deep normalization (e.g. stable key order), **JSON serialization** of large trees, and **hashing**—which shows up as **~6% overhead** on `ready()` in our complex-schema runs.

**Broader picture:** For apps with many routes, **startup time is usually dominated by other work**, not duplicate Ajv compilation of identical shapes—for example **find-my-way** trie construction, the **avvio** plugin boot chain, and **fast-json-stringify** serializer compilation. This plugin only targets the Ajv validator side; it does **not** address those costs.

Benchmark numbers depend on **machine, Node version, and load**; treat them as **illustrative**, not guarantees. **Do not gate CI on performance thresholds** from these benches.

## Author

[Ben Houston](https://ben3d.ca), sponsored by [Land of Assets](https://landofassets.com)

[npm]: https://img.shields.io/npm/v/fastify-schema-dedupe
[npm-url]: https://www.npmjs.com/package/fastify-schema-dedupe
[npm-downloads]: https://img.shields.io/npm/dw/fastify-schema-dedupe
[npmtrends-url]: https://www.npmtrends.com/fastify-schema-dedupe
[ci-badge]: https://github.com/bhouston/fastify-schema-dedupe/actions/workflows/ci.yml/badge.svg
[ci-url]: https://github.com/bhouston/fastify-schema-dedupe/actions/workflows/ci.yml
