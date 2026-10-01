import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Cryptures, CrypturesError, DEFAULT_BASE_URL, VERSION } from '../src/index.js';
import { jsonResponse, makeClient, stubFetch } from './helpers.js';

describe('Cryptures client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to https://api.cryptures.com', () => {
    expect(DEFAULT_BASE_URL).toBe('https://api.cryptures.com');
    expect(makeClient().baseUrl).toBe('https://api.cryptures.com');
  });

  it('exposes the three domains and their namespaces', () => {
    const client = makeClient();
    expect(Object.keys(client.blockchain).sort()).toEqual(
      ['contracts', 'data', 'fee', 'lookups', 'nft', 'operations', 'storage', 'wallet'].sort(),
    );
    expect(Object.keys(client.card).sort()).toEqual(['balance', 'cards', 'reports', 'tags', 'webhooks']);
    expect(Object.keys(client.compliance).sort()).toEqual(
      ['aml', 'monitoring', 'presets', 'sessions', 'walletScreening', 'webhooks'].sort(),
    );
  });

  it.each([undefined, '', '   '])('requires a non-empty apiKey (%j)', (apiKey) => {
    expect(() => new Cryptures({ apiKey: apiKey as string })).toThrow(CrypturesError);
  });

  it('validates timeout and maxRetries', () => {
    expect(() => makeClient({ timeout: 0 })).toThrow(/timeout/);
    expect(() => makeClient({ maxRetries: -1 })).toThrow(/maxRetries/);
    expect(() => makeClient({ maxRetries: 1.5 })).toThrow(/maxRetries/);
  });

  it('refuses to run in a browser unless explicitly allowed', () => {
    vi.stubGlobal('window', { document: {} });
    vi.stubGlobal('navigator', { userAgent: 'test' });
    expect(() => makeClient()).toThrow(/browser/);
    expect(() => makeClient({ dangerouslyAllowBrowser: true })).not.toThrow();
  });

  it('keeps VERSION in sync with package.json', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
    expect(VERSION).toBe(pkg.version);
  });

  describe('request() escape hatch', () => {
    it('sends an authenticated request to an arbitrary path', async () => {
      const { requests } = stubFetch(jsonResponse({ ok: true }));
      const result = await makeClient().request('GET', '/api/v1/card/balance', { query: { a: 1, b: undefined } });
      expect(result).toEqual({ ok: true });
      expect(requests[0]!.url.pathname).toBe('/api/v1/card/balance');
      expect(requests[0]!.url.search).toBe('?a=1');
      expect(requests[0]!.headers.get('x-api-key')).toBe('test_api_key_123');
    });

    it('sends a JSON body', async () => {
      const { requests } = stubFetch(jsonResponse({ ok: true }));
      await makeClient().request('POST', '/api/v1/card/tags', { body: { name: 'X' } });
      expect(requests[0]!.json).toEqual({ name: 'X' });
    });

    it('does not retry POST by default', async () => {
      const { requests } = stubFetch(jsonResponse({ error: { code: 'internal_error', message: 'x', requestId: 'r' } }, 500));
      await expect(makeClient().request('POST', '/api/v1/x')).rejects.toMatchObject({ status: 500 });
      expect(requests).toHaveLength(1);
    });

    it('requires a leading slash', () => {
      expect(() => makeClient().request('GET', 'api/v1/x')).toThrow(CrypturesError);
    });
  });
});
