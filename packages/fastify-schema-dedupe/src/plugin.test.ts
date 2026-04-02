import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { fastifySchemaDedupePlugin } from './plugin.js';

const sharedBody = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string' },
  },
} as const;

const sharedBodyPermuted = {
  required: ['name'],
  properties: {
    name: { type: 'string' },
  },
  type: 'object',
} as const;

const sharedResponse200 = {
  type: 'object',
  required: ['ok'],
  properties: {
    ok: { type: 'boolean' },
  },
} as const;

const sharedResponse200Permuted = {
  required: ['ok'],
  properties: {
    ok: { type: 'boolean' },
  },
  type: 'object',
} as const;

describe('fastifySchemaDedupePlugin', () => {
  it('dedupes repeated inline route schemas and tracks stats', async () => {
    const app = Fastify();
    await app.register(fastifySchemaDedupePlugin);

    app.post(
      '/first',
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

    app.post(
      '/second',
      {
        schema: {
          body: { ...sharedBodyPermuted },
          response: {
            200: { ...sharedResponse200Permuted },
          },
        },
      },
      async () => ({ ok: true }),
    );

    await app.ready();

    const stats = app.getSchemaDedupeStats();
    expect(stats).toEqual({
      encountered: 4,
      created: 2,
      cacheHits: 2,
    });
    expect(Object.keys(app.getSchemas())).toHaveLength(2);

    const success = await app.inject({
      method: 'POST',
      url: '/second',
      payload: { name: 'Schema Dedupe' },
    });
    expect(success.statusCode).toBe(200);
    expect(success.json()).toEqual({ ok: true });

    const invalid = await app.inject({
      method: 'POST',
      url: '/second',
      payload: {},
    });
    expect(invalid.statusCode).toBe(400);

    await app.close();
  });

  it('uses custom dedupePrefix for registered schema $id keys', async () => {
    const app = Fastify();
    await app.register(fastifySchemaDedupePlugin, { dedupePrefix: 'custom:' });

    app.post('/a', { schema: { body: { ...sharedBody } } }, async () => ({}));
    app.post('/b', { schema: { body: { ...sharedBodyPermuted } } }, async () => ({}));

    await app.ready();

    const ids = Object.keys(app.getSchemas());
    expect(ids).toHaveLength(1);
    expect(ids[0]).toMatch(/^custom:[a-f0-9]{12}$/);

    await app.close();
  });

  it('only dedupes schema slots listed in schemaTypes', async () => {
    const app = Fastify();
    await app.register(fastifySchemaDedupePlugin, { schemaTypes: ['body'] });

    app.post(
      '/first',
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

    app.post(
      '/second',
      {
        schema: {
          body: { ...sharedBodyPermuted },
          response: {
            200: { ...sharedResponse200Permuted },
          },
        },
      },
      async () => ({ ok: true }),
    );

    await app.ready();

    expect(app.getSchemaDedupeStats()).toEqual({
      encountered: 2,
      created: 1,
      cacheHits: 1,
    });
    expect(Object.keys(app.getSchemas())).toHaveLength(1);

    await app.close();
  });

  it('completes when verifyHashCollisions is false', async () => {
    const app = Fastify();
    await app.register(fastifySchemaDedupePlugin, { verifyHashCollisions: false });

    app.post('/a', { schema: { body: { ...sharedBody } } }, async () => ({}));
    app.post('/b', { schema: { body: { ...sharedBodyPermuted } } }, async () => ({}));

    await app.ready();
    expect(app.getSchemaDedupeStats().created).toBe(1);

    await app.close();
  });
});
