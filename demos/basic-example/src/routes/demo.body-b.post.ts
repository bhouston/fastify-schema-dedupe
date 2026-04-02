import { defineRoute } from 'fastify-file-router';

import { bodyPermuted } from '../schemas/demoSlots.ts';

export const route = defineRoute({
  schema: {
    body: bodyPermuted,
  },
  handler: async (request) => {
    const body = request.body;
    return { route: 'body-b', message: body.message };
  },
});
