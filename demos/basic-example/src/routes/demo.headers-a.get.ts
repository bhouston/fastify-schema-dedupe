import { defineRoute } from 'fastify-file-router';

import { headersCanonical } from '../schemas/demoSlots.ts';

export const route = defineRoute({
  schema: {
    headers: headersCanonical,
  },
  handler: async () => ({ route: 'headers-a' }),
});
