# fastify-schema-dedupe

[![NPM Package][npm]][npm-url]
[![NPM Downloads][npm-downloads]][npmtrends-url]
[![CI][ci-badge]][ci-url]

_ESM-only._ A Fastify plugin that **deduplicates inline JSON Schemas** on your routes by registering each distinct schema once under a generated `$id` and replacing duplicates with `$ref`.

## Why use it

Fastify uses Ajv to compile JSON Schemas for validation. If many routes declare the **same logical schema** as separate inline objects, Ajv still treats them as separate schemas and compiles them again. With **dozens or hundreds** of repeated shapes (common in large APIs), that work shows up as **slower startup** and more memory.

This plugin runs in an `onRoute` hook: for each selected part of the route schema (`body`, `querystring`, `params`, `headers`, and per-status `response` entries), it **canonicalizes** the object (stable key order via [`fast-json-stable-stringify`](https://www.npmjs.com/package/fast-json-stable-stringify)), hashes it, and reuses a single `fastify.addSchema` entry when the hash was seen before. That keeps the number of **compiled** schemas closer to the number of **unique** shapes.

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

`pnpm bench` runs [Vitest benchmarks](https://vitest.dev/guide/features.html#benchmarking-experimental) (Tinybench) in [`packages/fastify-schema-dedupe/src/plugin.startup.bench.ts`](packages/fastify-schema-dedupe/src/plugin.startup.bench.ts): 300 routes with duplicated inline `body` and `response` schemas, comparing baseline Fastify to the same app with `fastifySchemaDedupePlugin`. Each sample times a full cycle (new instance, route registration, `await app.ready()`, and `close()`; a second suite also calls `listen`).

Results vary by machine and Node version. They are for local investigation only: **do not use hard performance thresholds in CI**, since noise and JIT effects make that unreliable. The benchmark may show slower wall time with the plugin when route-count is modest, because per-route `onRoute` work (serialize + hash) is included in the timed loop; try raising `ROUTE_COUNT` in the bench file if you want compilation savings to dominate.

## Author

[Ben Houston](https://ben3d.ca), sponsored by [Land of Assets](https://landofassets.com)

[npm]: https://img.shields.io/npm/v/fastify-schema-dedupe
[npm-url]: https://www.npmjs.com/package/fastify-schema-dedupe
[npm-downloads]: https://img.shields.io/npm/dw/fastify-schema-dedupe
[npmtrends-url]: https://www.npmtrends.com/fastify-schema-dedupe
[ci-badge]: https://github.com/bhouston/fastify-schema-dedupe/actions/workflows/ci.yml/badge.svg
[ci-url]: https://github.com/bhouston/fastify-schema-dedupe/actions/workflows/ci.yml
