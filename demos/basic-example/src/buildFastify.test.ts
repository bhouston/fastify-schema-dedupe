import { describe, expect, it } from 'vitest';
import { expectedDedupeStats, expectedSharedSchemaCount, getApp } from './buildFastify.js';

describe('basic-example schema dedupe demo', () => {
  it('dedupes body, querystring, params, headers, and response schemas (one shared schema per slot)', async () => {
    const app = await getApp({ logger: false });
    await app.ready();

    expect(app.getSchemaDedupeStats()).toEqual(expectedDedupeStats);
    expect(Object.keys(app.getSchemas())).toHaveLength(expectedSharedSchemaCount);

    await app.close();
  });

  it('body routes validate payload', async () => {
    const app = await getApp({ logger: false });
    await app.ready();

    const ok = await app.inject({
      method: 'POST',
      url: '/demo/body-b',
      payload: { message: 'hello' },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ route: 'body-b', message: 'hello' });

    const bad = await app.inject({
      method: 'POST',
      url: '/demo/body-a',
      payload: {},
    });
    expect(bad.statusCode).toBe(400);

    await app.close();
  });

  it('querystring routes require q', async () => {
    const app = await getApp({ logger: false });
    await app.ready();

    const ok = await app.inject({ method: 'GET', url: '/demo/query-a?q=find' });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toEqual({ route: 'query-a', q: 'find' });

    const bad = await app.inject({ method: 'GET', url: '/demo/query-b' });
    expect(bad.statusCode).toBe(400);

    await app.close();
  });

  it('params and headers routes enforce schemas', async () => {
    const app = await getApp({ logger: false });
    await app.ready();

    const paramsOk = await app.inject({ method: 'GET', url: '/demo/params-a/abc' });
    expect(paramsOk.statusCode).toBe(200);
    expect(paramsOk.json()).toEqual({ route: 'params-a', id: 'abc' });

    const headersOk = await app.inject({
      method: 'GET',
      url: '/demo/headers-b',
      headers: { 'x-demo-token': 'token' },
    });
    expect(headersOk.statusCode).toBe(200);

    const headersBad = await app.inject({ method: 'GET', url: '/demo/headers-a' });
    expect(headersBad.statusCode).toBe(400);

    await app.close();
  });

  it('response schema routes return 200 payload', async () => {
    const app = await getApp({ logger: false });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/demo/response-b' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ kind: 'response', slot: 'response-b' });

    await app.close();
  });
});
