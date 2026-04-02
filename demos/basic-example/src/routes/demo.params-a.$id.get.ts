import { defineRoute } from 'fastify-file-router';

import { paramsCanonical } from '../schemas/demoSlots.ts';

export const route = defineRoute({
  schema: {
    params: paramsCanonical,
  },
  handler: async (request) => ({
    route: 'params-a',
    id: request.params.id,
  }),
});
