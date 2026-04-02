import { defineRoute } from 'fastify-file-router';

import { bodyCanonical } from '../schemas/demoSlots.ts';

export const route = defineRoute({
  schema: {
    body: bodyCanonical,
  },
  handler: async (request) => {
    const body = request.body;
    return { route: 'body-a', message: body.message };
  },
});
