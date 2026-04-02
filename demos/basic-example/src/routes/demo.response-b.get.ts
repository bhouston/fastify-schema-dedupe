import { defineRoute } from 'fastify-file-router';

import { response200Permuted } from '../schemas/demoSlots.ts';

export const route = defineRoute({
  schema: {
    response: {
      200: response200Permuted,
    },
  },
  handler: async (_request, reply) => {
    reply.status(200).send({ kind: 'response', slot: 'response-b' });
  },
});
