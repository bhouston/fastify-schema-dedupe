import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import Fastify from 'fastify';
import { fastifyFileRouter } from 'fastify-file-router';
import { fastifySchemaDedupePlugin } from 'fastify-schema-dedupe';

/** `demos/basic-example` — used with `relative(process.cwd(), …)` so `buildRoot` stays valid without touching `REMIX_ROOT` (parallel tests would race on env). */
const demoPackageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

export type GetAppOptions = {
  /** Default `true` (verbose startup). Use `false` in tests to avoid request logs. */
  logger?: boolean;
};

export async function getApp(options?: GetAppOptions) {
  const app = Fastify({ logger: options?.logger ?? true });

  await app.register(fastifySchemaDedupePlugin);

  const buildRoot = relative(process.cwd(), join(demoPackageRoot, 'src'));
  await app.register(fastifyFileRouter, {
    buildRoot,
    routesDirs: ['./routes'],
    logLevel: options?.logger === false ? 'silent' : 'info',
  });

  return app;
}

/** Expected dedupe totals: 5 unique slots; Fastify adds HEAD for each GET, so 18 inline encounters (2 POST + 8 GET + 8 HEAD). */
export const expectedDedupeStats = {
  encountered: 18,
  created: 5,
  cacheHits: 13,
} as const;

export const expectedSharedSchemaCount = 5;
