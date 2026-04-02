import type { FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';
import {
  DEFAULT_DEDUPE_PREFIX,
  type FastifySchemaDedupeOptions,
  type SchemaDedupeSlot,
} from './fastifySchemaDedupeOptions.js';
import type { FastifySchemaDedupeStats } from './fastifySchemaDedupeStats.js';
import {
  hashSerializedSchema,
  hasExplicitSchemaId,
  isPlainObject,
  isReferenceSchema,
  serializeSchema,
} from './schemaUtils.js';

const DEFAULT_SCHEMA_TYPES: readonly SchemaDedupeSlot[] = ['body', 'querystring', 'params', 'headers', 'response'];

type RefSchema = { $ref: string };

declare module 'fastify' {
  interface FastifyInstance {
    getSchemaDedupeStats(): FastifySchemaDedupeStats;
  }
}

const fastifySchemaDedupePluginCallback: FastifyPluginCallback<FastifySchemaDedupeOptions> = (fastify, opts, done) => {
  const dedupePrefix = opts.dedupePrefix ?? DEFAULT_DEDUPE_PREFIX;
  const schemaTypes = opts.schemaTypes ?? DEFAULT_SCHEMA_TYPES;
  const verifyHashCollisions = opts.verifyHashCollisions ?? true;

  const schemaTypeSet = new Set(schemaTypes);

  const hashToId = new Map<string, string>();
  const hashToSerializedSchema = new Map<string, string>();
  const stats: FastifySchemaDedupeStats = {
    encountered: 0,
    created: 0,
    cacheHits: 0,
  };

  const dedupeSchema = (schema: unknown): RefSchema | undefined => {
    if (!isPlainObject(schema) || isReferenceSchema(schema) || hasExplicitSchemaId(schema)) {
      return undefined;
    }

    stats.encountered++;
    const serializedSchema = serializeSchema(schema);
    const hash = hashSerializedSchema(serializedSchema);
    const existingId = hashToId.get(hash);
    if (existingId) {
      const existingSerializedSchema = hashToSerializedSchema.get(hash);
      if (verifyHashCollisions && existingSerializedSchema !== serializedSchema) {
        throw new Error(`fastify-schema-dedupe: hash collision detected for ${hash}`);
      }
      stats.cacheHits++;
      return { $ref: `${existingId}#` };
    }

    const schemaId = `${dedupePrefix}${hash}`;
    hashToId.set(hash, schemaId);
    hashToSerializedSchema.set(hash, serializedSchema);
    stats.created++;
    fastify.addSchema({
      ...schema,
      $id: schemaId,
    });
    return { $ref: `${schemaId}#` };
  };

  fastify.decorate('getSchemaDedupeStats', () => ({ ...stats }));

  fastify.addHook('onRoute', (routeOptions) => {
    const routeSchema = routeOptions.schema;
    if (!isPlainObject(routeSchema)) {
      return;
    }

    const requestSlots: Exclude<SchemaDedupeSlot, 'response'>[] = ['body', 'querystring', 'params', 'headers'];
    for (const schemaKey of requestSlots) {
      if (!schemaTypeSet.has(schemaKey)) {
        continue;
      }
      const dedupedSchema = dedupeSchema(routeSchema[schemaKey]);
      if (dedupedSchema) {
        routeSchema[schemaKey] = dedupedSchema;
      }
    }

    if (!schemaTypeSet.has('response')) {
      return;
    }

    const responseSchemas = routeSchema.response;
    if (!isPlainObject(responseSchemas)) {
      return;
    }

    for (const [statusCode, responseSchema] of Object.entries(responseSchemas)) {
      const dedupedSchema = dedupeSchema(responseSchema);
      if (dedupedSchema) {
        responseSchemas[statusCode] = dedupedSchema;
      }
    }
  });

  done();
};

/**
 * Deduplicates inline route schemas registered after this plugin is loaded.
 * Register it before route registration so `onRoute` can rewrite schemas.
 */
export const fastifySchemaDedupePlugin = fp(fastifySchemaDedupePluginCallback, {
  name: 'fastify-schema-dedupe',
});
