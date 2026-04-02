export const DEFAULT_DEDUPE_PREFIX = 'hash:';

export type SchemaDedupeSlot = 'body' | 'querystring' | 'params' | 'headers' | 'response';

export type FastifySchemaDedupeOptions = {
  /** Prefix for generated `$id` values. Default: `hash:` */
  dedupePrefix?: string;
  /** Which route schema slots to dedupe. Default: all of body, querystring, params, headers, response. */
  schemaTypes?: SchemaDedupeSlot[];
  /**
   * When true (default), throws if two distinct schemas map to the same truncated hash (extremely unlikely).
   * Set to false to skip the extra string comparison on cache hits.
   */
  verifyHashCollisions?: boolean;
};
