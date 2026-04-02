import { defineRoute } from 'fastify-file-router';

import { response200Canonical } from '../schemas/demoSlots.ts';

export const route = defineRoute({
  schema: {
    response: {
      200: response200Canonical,
    },
  },
  handler: async (_request, reply) => {
    reply.status(200).send({ kind: 'response', slot: 'response-a' });
  },
});
