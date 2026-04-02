import { expectedDedupeStats, expectedSharedSchemaCount, getApp } from './buildFastify.ts';

const port = process.env.PORT !== undefined ? Number(process.env.PORT) : 3001;

const app = await getApp();
try {
  const address = await app.listen({ port, host: '127.0.0.1' });
  app.log.info(`Server listening at ${address}`);

  const dedupe = app.getSchemaDedupeStats();
  const sharedSchemas = Object.keys(app.getSchemas());
  app.log.info(
    {
      dedupe: {
        encountered: dedupe.encountered,
        created: dedupe.created,
        cacheHits: dedupe.cacheHits,
      },
      expectedDedupe: expectedDedupeStats,
      sharedSchemaCount: sharedSchemas.length,
      expectedSharedSchemaCount,
      sharedSchemaIds: sharedSchemas,
    },
    'fastify-schema-dedupe: stats (5 unique slots; GET routes also register HEAD with the same schemas)',
  );
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
