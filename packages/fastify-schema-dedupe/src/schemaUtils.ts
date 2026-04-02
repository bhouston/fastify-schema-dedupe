import crypto from 'node:crypto';
import stableStringify from 'fast-json-stable-stringify';

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function serializeSchema(schema: Record<string, unknown>): string {
  return stableStringify(schema);
}

export function hashSerializedSchema(serialized: string): string {
  return crypto.createHash('sha1').update(serialized).digest('hex').slice(0, 12);
}

export function isReferenceSchema(schema: Record<string, unknown>): boolean {
  return typeof schema.$ref === 'string';
}

export function hasExplicitSchemaId(schema: Record<string, unknown>): boolean {
  return typeof schema.$id === 'string';
}
