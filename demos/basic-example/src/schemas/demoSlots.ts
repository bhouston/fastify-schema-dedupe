/** Each pair of routes imports one canonical and one permuted schema so dedupe produces one cache hit per slot. */

export const bodyCanonical = {
  type: 'object',
  required: ['message'],
  properties: {
    message: { type: 'string' },
  },
} as const;

export const bodyPermuted = {
  properties: { message: { type: 'string' } },
  required: ['message'],
  type: 'object',
} as const;

export const querystringCanonical = {
  type: 'object',
  required: ['q'],
  properties: {
    q: { type: 'string' },
    limit: { type: 'string' },
  },
} as const;

export const querystringPermuted = {
  properties: {
    limit: { type: 'string' },
    q: { type: 'string' },
  },
  required: ['q'],
  type: 'object',
} as const;

export const paramsCanonical = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string' },
  },
} as const;

export const paramsPermuted = {
  properties: { id: { type: 'string' } },
  required: ['id'],
  type: 'object',
} as const;

export const headersCanonical = {
  type: 'object',
  required: ['x-demo-token'],
  properties: {
    'x-demo-token': { type: 'string' },
  },
} as const;

export const headersPermuted = {
  properties: { 'x-demo-token': { type: 'string' } },
  required: ['x-demo-token'],
  type: 'object',
} as const;

export const response200Canonical = {
  type: 'object',
  required: ['kind'],
  properties: {
    kind: { type: 'string' },
    slot: { type: 'string' },
  },
} as const;

export const response200Permuted = {
  properties: {
    kind: { type: 'string' },
    slot: { type: 'string' },
  },
  required: ['kind'],
  type: 'object',
} as const;
