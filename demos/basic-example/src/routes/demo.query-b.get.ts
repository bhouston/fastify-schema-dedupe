import { defineRoute } from 'fastify-file-router';

import { querystringPermuted } from '../schemas/demoSlots.ts';

export const route = defineRoute({
  schema: {
    querystring: querystringPermuted,
  },
  handler: async (request) => ({
    route: 'query-b',
    q: request.query.q,
  }),
});
