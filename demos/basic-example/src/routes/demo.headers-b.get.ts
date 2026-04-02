import { defineRoute } from 'fastify-file-router';

import { headersPermuted } from '../schemas/demoSlots.ts';

export const route = defineRoute({
  schema: {
    headers: headersPermuted,
  },
  handler: async () => ({ route: 'headers-b' }),
});
