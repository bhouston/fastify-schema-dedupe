import { defineRoute } from 'fastify-file-router';

import { querystringCanonical } from '../schemas/demoSlots.ts';

export const route = defineRoute({
  schema: {
    querystring: querystringCanonical,
  },
  handler: async (request) => ({
    route: 'query-a',
    q: request.query.q,
  }),
});
