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

const ROUTE_COUNT = 300;

/** Longer than default so Tinybench collects enough samples for heavy `ready()` work. */
const benchTimeMs = 3000;

/** ~30 string + ~10 number top-level fields, plus deep nesting (addresses, org tree, line items). */
function createComplexBodySchema(): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  for (let i = 0; i < 5; i++) {
    properties[`str_${i}`] = {
      type: 'string',
      minLength: i % 4,
      maxLength: 2048,
    };
    properties[`num_${i}`] = { type: 'number', minimum: 0 };
    properties[`bool_${i}`] = { type: 'boolean' };
  }

  const addressSchema = {
    type: 'object',
    required: ['line1', 'city', 'country'],
    properties: {
      line1: { type: 'string', minLength: 1 },
      line2: { type: 'string' },
      city: { type: 'string' },
      region: { type: 'string' },
      postal: { type: 'string' },
      country: { type: 'string', minLength: 2, maxLength: 2 },
      geo: {
        type: 'object',
        required: ['lat', 'lng'],
        properties: {
          lat: { type: 'number', minimum: -90, maximum: 90 },
          lng: { type: 'number', minimum: -180, maximum: 180 },
          altM: { type: 'number' },
        },
      },
    },
  };

  properties.billing = addressSchema;
  properties.shipping = addressSchema;

  properties.organization = {
    type: 'object',
    required: ['name', 'dept'],
    properties: {
      name: { type: 'string', minLength: 1 },
      taxId: { type: 'string' },
      dept: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string' },
          costCenter: { type: 'string' },
          manager: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              displayName: { type: 'string' },
              title: { type: 'string' },
              reports: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['rId'],
                  properties: {
                    rId: { type: 'string' },
                    role: { type: 'string' },
                    capacity: { type: 'number' },
                    meta: {
                      type: 'object',
                      properties: {
                        since: { type: 'string', format: 'date-time' },
                        tags: { type: 'array', items: { type: 'string' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  properties.lineItems = {
    type: 'array',
    maxItems: 500,
    items: {
      type: 'object',
      required: ['sku', 'qty'],
      properties: {
        sku: { type: 'string', minLength: 1 },
        qty: { type: 'integer', minimum: 1 },
        unitPrice: { type: 'number' },
        attrs: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
        dimensions: {
          type: 'object',
          properties: {
            w: { type: 'number' },
            h: { type: 'number' },
            d: { type: 'number' },
            weightKg: { type: 'number' },
          },
        },
        notes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              author: { type: 'string' },
              text: { type: 'string' },
              priority: { type: 'integer', minimum: 0, maximum: 9 },
            },
          },
        },
      },
    },
  };

  properties.metadata = {
    type: 'object',
    properties: {
      source: { type: 'string' },
      traceId: { type: 'string' },
      flags: { type: 'array', items: { type: 'string' } },
      extra: {
        type: 'object',
        properties: {
          a: { type: 'integer' },
          b: { type: 'integer' },
          c: { type: 'object', properties: { x: { type: 'string' }, y: { type: 'string' } } },
        },
      },
    },
  };

  return {
    type: 'object',
    required: ['str_0', 'str_1', 'billing', 'organization', 'lineItems'],
    properties,
  };
}

/** Distinct tree from body schema so response compilation is separate work; similar complexity. */
function createComplexResponseSchema(): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  for (let i = 0; i < 5; i++) {
    properties[`out_${i}`] = {
      type: 'string',
      minLength: 0,
      maxLength: 4096,
    };
    properties[`metric_${i}`] = { type: 'number' };
  }

  properties.status = {
    type: 'object',
    required: ['code', 'message'],
    properties: {
      code: { type: 'integer', minimum: 100, maximum: 599 },
      message: { type: 'string' },
      details: {
        type: 'array',
        items: {
          type: 'object',
          required: ['field'],
          properties: {
            field: { type: 'string' },
            issue: { type: 'string' },
            context: {
              type: 'object',
              properties: {
                path: { type: 'array', items: { type: 'string' } },
                value: {},
              },
            },
          },
        },
      },
    },
  };

  properties.payload = {
    type: 'object',
    required: ['records'],
    properties: {
      records: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
            version: { type: 'integer', minimum: 1 },
            data: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                body: { type: 'string' },
                facets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      key: { type: 'string' },
                      values: { type: 'array', items: { type: 'string' } },
                    },
                  },
                },
              },
            },
            nested: {
              type: 'object',
              properties: {
                level1: {
                  type: 'object',
                  properties: {
                    level2: {
                      type: 'object',
                      properties: {
                        level3: {
                          type: 'object',
                          properties: {
                            leaf: { type: 'string' },
                            nums: { type: 'array', items: { type: 'number' } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      paging: {
        type: 'object',
        properties: {
          next: { type: 'string' },
          prev: { type: 'string' },
          total: { type: 'integer', minimum: 0 },
        },
      },
    },
  };

  return {
    type: 'object',
    required: ['ok', 'status', 'payload'],
    properties: {
      ok: { type: 'boolean' },
      ...properties,
    },
  };
}

const sharedBody = createComplexBodySchema();
const sharedResponse200 = createComplexResponseSchema();

/** Minimal value satisfying `sharedResponse200` if routes are hit. */
function exampleResponsePayload(): Record<string, unknown> {
  const out: Record<string, unknown> = { ok: true };
  for (let i = 0; i < 28; i++) out[`out_${i}`] = '';
  for (let i = 0; i < 12; i++) out[`metric_${i}`] = 0;
  out.status = {
    code: 200,
    message: 'OK',
    details: [],
  };
  out.payload = {
    records: [
      {
        id: '1',
        version: 1,
        data: { title: '', body: '', facets: [] },
        nested: { level1: { level2: { level3: { leaf: '', nums: [] } } } },
      },
    ],
    paging: { next: '', prev: '', total: 1 },
  };
  return out;
}

const responseExample = exampleResponsePayload();

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
      async () => responseExample,
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
