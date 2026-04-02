import { defineRoute } from 'fastify-file-router';

import { paramsPermuted } from '../schemas/demoSlots.ts';

export const route = defineRoute({
  schema: {
    params: paramsPermuted,
  },
  handler: async (request) => ({
    route: 'params-b',
    id: request.params.id,
  }),
});
