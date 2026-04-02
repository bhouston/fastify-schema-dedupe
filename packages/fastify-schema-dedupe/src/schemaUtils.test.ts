import { describe, expect, it } from 'vitest';
import {
  hashSerializedSchema,
  hasExplicitSchemaId,
  isPlainObject,
  isReferenceSchema,
  serializeSchema,
} from './schemaUtils.js';

describe('isPlainObject', () => {
  it('returns false for null and non-objects', () => {
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
    expect(isPlainObject('x')).toBe(false);
    expect(isPlainObject(1)).toBe(false);
    expect(isPlainObject(true)).toBe(false);
  });

  it('returns false for arrays and built-in object types', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(new Date())).toBe(false);
    expect(isPlainObject(/x/)).toBe(false);
  });

  it('returns true for ordinary objects and null-prototype objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject(Object.create(null))).toBe(true);
  });
});

describe('serializeSchema', () => {
  it('produces stable key order independent of insertion order', () => {
    const a = { type: 'object', required: ['x'], properties: { x: { type: 'string' } } };
    const b = { required: ['x'], properties: { x: { type: 'string' } }, type: 'object' };
    expect(serializeSchema(a)).toBe(serializeSchema(b));
  });
});

describe('hashSerializedSchema', () => {
  it('returns 12 lowercase hex characters', () => {
    const h = hashSerializedSchema('{}');
    expect(h).toMatch(/^[a-f0-9]{12}$/);
  });

  it('is deterministic for the same input', () => {
    const s = '{"type":"object"}';
    expect(hashSerializedSchema(s)).toBe(hashSerializedSchema(s));
  });

  it('differs for different serialized strings', () => {
    expect(hashSerializedSchema('{"a":1}')).not.toBe(hashSerializedSchema('{"a":2}'));
  });
});

describe('isReferenceSchema', () => {
  it('returns true when $ref is a non-empty string', () => {
    expect(isReferenceSchema({ $ref: '#/components/schemas/Foo' })).toBe(true);
  });

  it('returns false when $ref is missing or not a string', () => {
    expect(isReferenceSchema({})).toBe(false);
    expect(isReferenceSchema({ $ref: 1 } as unknown as Record<string, unknown>)).toBe(false);
  });
});

describe('hasExplicitSchemaId', () => {
  it('returns true when $id is a string', () => {
    expect(hasExplicitSchemaId({ $id: 'mySchema' })).toBe(true);
  });

  it('returns false when $id is missing or not a string', () => {
    expect(hasExplicitSchemaId({})).toBe(false);
    expect(hasExplicitSchemaId({ $id: 1 } as unknown as Record<string, unknown>)).toBe(false);
  });
});
