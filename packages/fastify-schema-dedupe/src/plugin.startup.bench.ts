/**
 * Startup benchmarks: time to `ready()` (schema compilation) with many routes that
 * share the same inline JSON Schema shapes.
 *
 * Run from repo root: `pnpm bench` (see README). Prefer `--no-file-parallelism`
 * for steadier numbers locally. Results are informative only — do not gate CI on them.
 *
 * Note: Vitest forwards `bench()` options to Tinybench’s `Bench` constructor; per-iteration
 * `beforeEach` on that object is not wired to Tinybench `Task` hooks, so each iteration
 * must build a fresh app inside the benchmark function.
 */
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { bench, beforeAll, describe } from 'vitest';
import { fastifySchemaDedupePlugin } from './plugin.js';

/** Matches plugin.test.ts shapes; each route uses spreads so objects are distinct. */
const sharedBody = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string' },
  },
} as const;

const sharedResponse200 = {
  type: 'object',
  required: ['ok'],
  properties: {
    ok: { type: 'boolean' },
  },
} as const;

const ROUTE_COUNT = 300;

/** Longer than default so Tinybench collects enough samples for heavy `ready()` work. */
const benchTimeMs = 3000;

function registerManyRoutes(app: FastifyInstance): void {
  for (let i = 0; i < ROUTE_COUNT; i++) {
    app.post(
      `/r${i}`,
      {
        schema: {
          body: { ...sharedBody },
          response: {
            200: { ...sharedResponse200 },
          },
        },
      },
      async () => ({ ok: true }),
    );
  }
}

describe('schema dedupe startup (300 POST routes, identical inline body + response)', () => {
  beforeAll(async () => {
    const app = Fastify();
    await app.register(fastifySchemaDedupePlugin, { verifyHashCollisions: false });
    registerManyRoutes(app);
    await app.ready();
    console.log('[plugin.startup.bench] getSchemaDedupeStats():', app.getSchemaDedupeStats());
    await app.close();
  });

  describe('await app.ready() only (Ajv compilation)', () => {
    bench(
      'baseline: no plugin',
      async () => {
        const app = Fastify();
        registerManyRoutes(app);
        await app.ready();
        await app.close();
      },
      { time: benchTimeMs },
    );

    bench(
      'with fastifySchemaDedupePlugin (verifyHashCollisions: false)',
      async () => {
        const app = Fastify();
        await app.register(fastifySchemaDedupePlugin, { verifyHashCollisions: false });
        registerManyRoutes(app);
        await app.ready();
        await app.close();
      },
      { time: benchTimeMs },
    );
  });

  describe('await app.ready() then listen (wall clock until accepting TCP)', () => {
    bench(
      'baseline: no plugin',
      async () => {
        const app = Fastify();
        registerManyRoutes(app);
        await app.ready();
        await app.listen({ port: 0, host: '127.0.0.1' });
        await app.close();
      },
      { time: benchTimeMs },
    );

    bench(
      'with fastifySchemaDedupePlugin (verifyHashCollisions: false)',
      async () => {
        const app = Fastify();
        await app.register(fastifySchemaDedupePlugin, { verifyHashCollisions: false });
        registerManyRoutes(app);
        await app.ready();
        await app.listen({ port: 0, host: '127.0.0.1' });
        await app.close();
      },
      { time: benchTimeMs },
    );
  });
});
