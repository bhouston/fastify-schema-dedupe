import Fastify from 'fastify';
import { fastifySchemaDedupePlugin } from 'fastify-schema-dedupe';

/** Each pair below registers the same logical JSON Schema twice (second route uses permuted key order) so dedupe produces one cache hit per slot. */

const bodyCanonical = {
  type: 'object',
  required: ['message'],
  properties: {
    message: { type: 'string' },
  },
} as const;

const bodyPermuted = {
  properties: { message: { type: 'string' } },
  required: ['message'],
  type: 'object',
} as const;

const querystringCanonical = {
  type: 'object',
  required: ['q'],
  properties: {
    q: { type: 'string' },
    limit: { type: 'string' },
  },
} as const;

const querystringPermuted = {
  properties: {
    limit: { type: 'string' },
    q: { type: 'string' },
  },
  required: ['q'],
  type: 'object',
} as const;

const paramsCanonical = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string' },
  },
} as const;

const paramsPermuted = {
  properties: { id: { type: 'string' } },
  required: ['id'],
  type: 'object',
} as const;

const headersCanonical = {
  type: 'object',
  required: ['x-demo-token'],
  properties: {
    'x-demo-token': { type: 'string' },
  },
} as const;

const headersPermuted = {
  properties: { 'x-demo-token': { type: 'string' } },
  required: ['x-demo-token'],
  type: 'object',
} as const;

const response200Canonical = {
  type: 'object',
  required: ['kind'],
  properties: {
    kind: { type: 'string' },
    slot: { type: 'string' },
  },
} as const;

const response200Permuted = {
  properties: {
    kind: { type: 'string' },
    slot: { type: 'string' },
  },
  required: ['kind'],
  type: 'object',
} as const;

export type GetAppOptions = {
  /** Default `true` (verbose startup). Use `false` in tests to avoid request logs. */
  logger?: boolean;
};

export async function getApp(options?: GetAppOptions) {
  const app = Fastify({ logger: options?.logger ?? true });

  await app.register(fastifySchemaDedupePlugin);

  app.post('/demo/body-a', { schema: { body: bodyCanonical } }, (request) => {
    const body = request.body as { message: string };
    return { route: 'body-a', message: body.message };
  });

  app.post('/demo/body-b', { schema: { body: bodyPermuted } }, (request) => {
    const body = request.body as { message: string };
    return { route: 'body-b', message: body.message };
  });

  app.get('/demo/query-a', { schema: { querystring: querystringCanonical } }, (request) => ({
    route: 'query-a',
    q: (request.query as { q: string }).q,
  }));

  app.get('/demo/query-b', { schema: { querystring: querystringPermuted } }, (request) => ({
    route: 'query-b',
    q: (request.query as { q: string }).q,
  }));

  app.get('/demo/params-a/:id', { schema: { params: paramsCanonical } }, (request) => ({
    route: 'params-a',
    id: (request.params as { id: string }).id,
  }));

  app.get('/demo/params-b/:id', { schema: { params: paramsPermuted } }, (request) => ({
    route: 'params-b',
    id: (request.params as { id: string }).id,
  }));

  app.get('/demo/headers-a', { schema: { headers: headersCanonical } }, () => ({ route: 'headers-a' }));

  app.get('/demo/headers-b', { schema: { headers: headersPermuted } }, () => ({ route: 'headers-b' }));

  app.get(
    '/demo/response-a',
    {
      schema: {
        response: {
          200: response200Canonical,
        },
      },
    },
    (_request, reply) => {
      reply.status(200).send({ kind: 'response', slot: 'response-a' });
    },
  );

  app.get(
    '/demo/response-b',
    {
      schema: {
        response: {
          200: response200Permuted,
        },
      },
    },
    (_request, reply) => {
      reply.status(200).send({ kind: 'response', slot: 'response-b' });
    },
  );

  return app;
}

/** Expected dedupe totals: 5 slots × (2 inline encounters → 1 created + 1 cache hit). */
export const expectedDedupeStats = {
  encountered: 10,
  created: 5,
  cacheHits: 5,
} as const;

export const expectedSharedSchemaCount = 5;
