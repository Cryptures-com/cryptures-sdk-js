import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  APIPromise,
  CrypturesAbortError,
  CrypturesApiError,
  CrypturesConnectionError,
  CrypturesError,
  CrypturesTimeoutError,
  VERSION,
  type Cryptures,
} from '../src/index.js';
import { TEST_API_KEY, jsonResponse, makeClient, stubFetch } from './helpers.js';

const errorEnvelope = (code: string, message: string, requestId = 'req_abc') => ({ error: { code, message, requestId } });

/** Starts `call`, drains every pending backoff timer, then settles. */
async function settle<T>(call: () => PromiseLike<T>): Promise<{ value?: T; error?: unknown }> {
  const promise = Promise.resolve(call()).then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );
  await vi.runAllTimersAsync();
  return promise;
}

describe('error mapping', () => {
  it('maps the standard error envelope onto CrypturesApiError', async () => {
    stubFetch(jsonResponse(errorEnvelope('forbidden_scope', 'This project token is not scoped.'), 403, { 'x-request-id': 'req_abc' }));
    const error = await makeClient().card.balance.get().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CrypturesApiError);
    expect(error).toBeInstanceOf(CrypturesError);
    expect(error).toBeInstanceOf(Error);
    const e = error as CrypturesApiError;
    expect(e.name).toBe('CrypturesApiError');
    expect(e.status).toBe(403);
    expect(e.code).toBe('forbidden_scope');
    expect(e.message).toBe('This project token is not scoped.');
    expect(e.requestId).toBe('req_abc');
    expect(e.body).toEqual(errorEnvelope('forbidden_scope', 'This project token is not scoped.'));
    expect(e.headers.get('x-request-id')).toBe('req_abc');
  });

  it('maps a 402 insufficient_balance on card.create', async () => {
    stubFetch(jsonResponse(errorEnvelope('insufficient_balance', 'Balance cannot cover this debit.', 'req_402'), 402));
    await expect(
      makeClient().card.cards.create({ product_code: 'us_493_visa_bin', first_name: 'A', last_name: 'B', email: 'a@b.co', initial_load: 10 }),
    ).rejects.toMatchObject({ status: 402, code: 'insufficient_balance', requestId: 'req_402' });
  });

  it("maps the card issuer's passthrough body and falls back to the X-Request-ID header", async () => {
    stubFetch(jsonResponse({ status: 'failure', message: 'Card not found.', code: 'CARD_NOT_FOUND' }, 404, { 'x-request-id': 'req_hdr' }));
    await expect(makeClient().card.cards.get('card_gone')).rejects.toMatchObject({
      status: 404,
      code: 'CARD_NOT_FOUND',
      message: 'Card not found.',
      requestId: 'req_hdr',
    });
  });

  it("maps exchange.rate's rate-not-found 403 body", async () => {
    stubFetch(jsonResponse({ statusCode: 403, errorCode: 'rate.not.found', message: 'No USD, XRP currency rates.' }, 403));
    await expect(makeClient().blockchain.data.getExchangeRate('XRP')).rejects.toMatchObject({
      status: 403,
      code: 'rate.not.found',
      message: 'No USD, XRP currency rates.',
    });
  });

  it('handles a non-JSON error body', async () => {
    stubFetch(new Response('<html>Bad gateway</html>', { status: 502, statusText: 'Bad Gateway', headers: { 'content-type': 'text/html' } }));
    await expect(makeClient({ maxRetries: 0 }).card.balance.get()).rejects.toMatchObject({
      status: 502,
      code: 'http_502',
      message: '<html>Bad gateway</html>',
      requestId: null,
      body: '<html>Bad gateway</html>',
    });
  });

  it('handles an empty error body', async () => {
    stubFetch(new Response(null, { status: 401, statusText: 'Unauthorized' }));
    await expect(makeClient().card.balance.get()).rejects.toMatchObject({ status: 401, code: 'http_401', message: '401 Unauthorized' });
  });

  it('throws CrypturesError when a 2xx body is not valid JSON', async () => {
    stubFetch(new Response('not json', { status: 200 }));
    const error = await makeClient().card.balance.get().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CrypturesError);
    expect(error).not.toBeInstanceOf(CrypturesApiError);
  });
});

describe('retries', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0); // no jitter: delays are exactly 250, 500, 1000ms
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries a 5xx and returns the eventual success', async () => {
    const { requests } = stubFetch(jsonResponse(errorEnvelope('upstream_backoff', 'busy'), 503), jsonResponse({ balance: '1' }));
    const { value } = await settle(() => makeClient().blockchain.data.getBalance('ETH', '0xabc'));
    expect(value).toEqual({ balance: '1' });
    expect(requests).toHaveLength(2);
  });

  it('gives up after maxRetries (default 3) and throws the last API error', async () => {
    const { requests } = stubFetch(jsonResponse(errorEnvelope('internal_error', 'boom'), 500));
    const { error } = await settle(() => makeClient().card.balance.get());
    expect(requests).toHaveLength(4);
    expect(error).toBeInstanceOf(CrypturesApiError);
    expect(error).toMatchObject({ status: 500, code: 'internal_error' });
  });

  it('backs off exponentially from 250ms', async () => {
    const { requests } = stubFetch(jsonResponse(errorEnvelope('internal_error', 'boom'), 500));
    const promise = makeClient().card.balance.get().catch(() => undefined);
    await vi.advanceTimersByTimeAsync(0);
    expect(requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(249);
    expect(requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(requests).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(499);
    expect(requests).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(requests).toHaveLength(3);
    await vi.advanceTimersByTimeAsync(1000);
    expect(requests).toHaveLength(4);
    await promise;
  });

  it('retries network errors, then surfaces CrypturesConnectionError with the cause', async () => {
    const cause = new TypeError('fetch failed');
    const { requests } = stubFetch(cause);
    const { error } = await settle(() => makeClient({ maxRetries: 2 }).card.balance.get());
    expect(requests).toHaveLength(3);
    expect(error).toBeInstanceOf(CrypturesConnectionError);
    expect((error as Error).cause).toBe(cause);
  });

  it('recovers from a transient network error', async () => {
    const { requests } = stubFetch(new TypeError('socket hang up'), jsonResponse({ balance_usd: 1, updated_at: null }));
    const { value } = await settle(() => makeClient().card.balance.get());
    expect(value).toEqual({ balance_usd: 1, updated_at: null });
    expect(requests).toHaveLength(2);
  });

  it.each([400, 401, 402, 403, 404, 409, 410, 429])('never retries a %i', async (status) => {
    const { requests } = stubFetch(jsonResponse(errorEnvelope('some_error', 'nope'), status));
    const { error } = await settle(() => makeClient().compliance.sessions.get('s_1'));
    expect(requests).toHaveLength(1);
    expect(error).toMatchObject({ status });
  });

  it('honors maxRetries: 0 on the client', async () => {
    const { requests } = stubFetch(jsonResponse(errorEnvelope('internal_error', 'boom'), 500));
    await settle(() => makeClient({ maxRetries: 0 }).card.balance.get());
    expect(requests).toHaveLength(1);
  });

  it('honors a per-request maxRetries override', async () => {
    const { requests } = stubFetch(jsonResponse(errorEnvelope('internal_error', 'boom'), 500));
    await settle(() => makeClient().card.balance.get({ maxRetries: 1 }));
    expect(requests).toHaveLength(2);
  });

  const nonRetryable: Array<[string, (c: Cryptures) => PromiseLike<unknown>]> = [
    ['blockchain.operations.send', (c) => c.blockchain.operations.send('TRON', { fromPrivateKey: 'k', to: 'T', amount: '1' })],
    ['blockchain.operations.broadcast', (c) => c.blockchain.operations.broadcast('BTC', { txData: 'ab' })],
    ['blockchain.contracts.deployToken', (c) => c.blockchain.contracts.deployToken({ chain: 'ETH', symbol: 'S', name: 'N', supply: '1', address: '0x', fromPrivateKey: 'k' })],
    ['blockchain.contracts.mintToken', (c) => c.blockchain.contracts.mintToken({ chain: 'ETH', contractAddress: '0x', amount: '1', to: '0x', fromPrivateKey: 'k' })],
    ['blockchain.contracts.burnToken', (c) => c.blockchain.contracts.burnToken({ chain: 'ETH', contractAddress: '0x', amount: '1', fromPrivateKey: 'k' })],
    ['card.cards.create', (c) => c.card.cards.create({ product_code: 'us_493_visa_bin', first_name: 'A', last_name: 'B', email: 'a@b.co', initial_load: 10 })],
    ['card.cards.fund', (c) => c.card.cards.fund('card_1', { amount: 10 })],
    ['card.cards.withdraw', (c) => c.card.cards.withdraw('card_1', { amount: 10 })],
    ['compliance.sessions.create', (c) => c.compliance.sessions.create({ preset_id: 'p', external_user_id: 'u' })],
    ['compliance.aml.check (no key)', (c) => c.compliance.aml.check({ external_user_id: 'u', full_name: 'Jane Doe' })],
    ['compliance.walletScreening.create (no key)', (c) => c.compliance.walletScreening.create({ address: '0x0', chain: 'ETH' })],
    // Not retried since 0.1.1, matching the Go and Python SDKs.
    ['blockchain.operations.rpc', (c) => c.blockchain.operations.rpc('ETH', { method: 'eth_sendRawTransaction', params: ['0xf86c'], id: 1 })],
    ['blockchain.storage.uploadToIpfs', (c) => c.blockchain.storage.uploadToIpfs(new TextEncoder().encode('x'))],
    ['blockchain.wallet.generate', (c) => c.blockchain.wallet.generate('ETH')],
    ['card.tags.create', (c) => c.card.tags.create({ name: 'Marketing' })],
    ['card.cards.setPin', (c) => c.card.cards.setPin('card_1', { pin: '123456' })],
    ['card.cards.terminate', (c) => c.card.cards.terminate('card_1')],
    ['card.cards.block', (c) => c.card.cards.block('card_1')],
    ['card.cards.unblock', (c) => c.card.cards.unblock('card_1')],
  ];

  it.each(nonRetryable)('does not automatically retry %s after a 5xx', async (_name, call) => {
    const { requests } = stubFetch(jsonResponse(errorEnvelope('internal_error', 'timed out'), 500));
    const { error } = await settle(() => call(makeClient()));
    expect(requests).toHaveLength(1);
    expect(error).toMatchObject({ status: 500 });
  });

  it.each(nonRetryable)('does not automatically retry %s after a network error', async (_name, call) => {
    const { requests } = stubFetch(new TypeError('fetch failed'));
    const { error } = await settle(() => call(makeClient()));
    expect(requests).toHaveLength(1);
    expect(error).toBeInstanceOf(CrypturesConnectionError);
  });

  it('lets a caller opt a non-retryable call into retries explicitly', async () => {
    const { requests } = stubFetch(jsonResponse(errorEnvelope('internal_error', 'boom'), 500), jsonResponse({ txId: '0x1' }));
    const { value } = await settle(() => makeClient().blockchain.operations.broadcast('ETH', { txData: '0xf8' }, { maxRetries: 1 }));
    expect(value).toEqual({ txId: '0x1' });
    expect(requests).toHaveLength(2);
  });

  it('retries an idempotent aml.check, resending the same Idempotency-Key', async () => {
    const { requests } = stubFetch(
      jsonResponse(errorEnvelope('upstream_error', 'try again'), 502),
      jsonResponse({ check_id: 'chk_1' }, 201),
    );
    const { value } = await settle(() =>
      makeClient().compliance.aml.check({ external_user_id: 'u', full_name: 'Jane Doe' }, { idempotencyKey: 'key-1' }),
    );
    expect(value).toEqual({ check_id: 'chk_1' });
    expect(requests).toHaveLength(2);
    expect(requests.map((r) => r.headers.get('idempotency-key'))).toEqual(['key-1', 'key-1']);
  });

  it('retries an idempotent walletScreening.create on a network error', async () => {
    const { requests } = stubFetch(new TypeError('reset'), jsonResponse({ check_id: 'chk_2' }, 201));
    const { value } = await settle(() =>
      makeClient().compliance.walletScreening.create({ address: '0x0', chain: 'ETH' }, { idempotencyKey: 'key-2' }),
    );
    expect(value).toEqual({ check_id: 'chk_2' });
    expect(requests.map((r) => r.headers.get('idempotency-key'))).toEqual(['key-2', 'key-2']);
  });

  it('times out an attempt with CrypturesTimeoutError', async () => {
    const hang = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    vi.stubGlobal('fetch', hang);
    const { error } = await settle(() => makeClient({ timeout: 1000, maxRetries: 0 }).card.balance.get());
    expect(error).toBeInstanceOf(CrypturesTimeoutError);
    expect(error).toBeInstanceOf(CrypturesConnectionError);
    expect(hang).toHaveBeenCalledTimes(1);
  });

  it('retries a timed-out attempt on a retryable call', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        calls++;
        if (calls === 1) {
          return new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
          });
        }
        return Promise.resolve(jsonResponse({ balance_usd: 3, updated_at: null }));
      }),
    );
    const { value } = await settle(() => makeClient({ timeout: 500 }).card.balance.get());
    expect(value).toEqual({ balance_usd: 3, updated_at: null });
    expect(calls).toBe(2);
  });

  it('stops with CrypturesAbortError when the caller aborts, without retrying', async () => {
    const controller = new AbortController();
    const hang = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    vi.stubGlobal('fetch', hang);
    const promise = makeClient().card.balance.get({ signal: controller.signal }).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(10);
    controller.abort();
    const error = await promise;
    expect(error).toBeInstanceOf(CrypturesAbortError);
    expect(hang).toHaveBeenCalledTimes(1);
  });

  it('aborts during a backoff wait', async () => {
    const controller = new AbortController();
    const { requests } = stubFetch(jsonResponse(errorEnvelope('internal_error', 'boom'), 500));
    const promise = makeClient().card.balance.get({ signal: controller.signal }).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(100);
    controller.abort();
    expect(await promise).toBeInstanceOf(CrypturesAbortError);
    expect(requests).toHaveLength(1);
  });
});

describe('request construction', () => {
  it('sends auth, accept and user-agent headers on every request', async () => {
    const { requests } = stubFetch(jsonResponse({ products: [] }));
    await makeClient().card.cards.listProducts();
    const h = requests[0]!.headers;
    expect(h.get('x-api-key')).toBe(TEST_API_KEY);
    expect(h.get('accept')).toBe('application/json');
    expect(h.get('user-agent')).toBe(`cryptures-sdk-js/${VERSION}`);
    expect(h.get('idempotency-key')).toBeNull();
  });

  it('merges default and per-request headers but never lets them replace x-api-key', async () => {
    const { requests } = stubFetch(jsonResponse({ products: [] }));
    await makeClient({ defaultHeaders: { 'x-trace': 'a' } }).card.cards.listProducts({
      headers: { 'x-extra': 'b', 'x-api-key': 'attacker' },
    });
    const h = requests[0]!.headers;
    expect(h.get('x-trace')).toBe('a');
    expect(h.get('x-extra')).toBe('b');
    expect(h.get('x-api-key')).toBe(TEST_API_KEY);
  });

  it('uses a custom baseUrl and strips trailing slashes', async () => {
    const { requests } = stubFetch(jsonResponse({ products: [] }));
    const client = makeClient({ baseUrl: 'https://sandbox.example.test/' });
    expect(client.baseUrl).toBe('https://sandbox.example.test');
    await client.card.cards.listProducts();
    expect(requests[0]!.url.toString()).toBe('https://sandbox.example.test/api/v1/card/products');
  });

  it('omits undefined query parameters', async () => {
    const { requests } = stubFetch(jsonResponse({ sessions: [], next_cursor: null }));
    await makeClient().compliance.sessions.list({ status: undefined, limit: 10 });
    expect(requests[0]!.url.search).toBe('?limit=10');
  });

  it('percent-encodes path parameters so they cannot escape their segment', async () => {
    const { requests } = stubFetch(jsonResponse({ status: 'success', data: { card_id: 'x', status: 'active' } }));
    await makeClient().card.cards.get('../tags/evil?x=1');
    expect(requests[0]!.url.pathname).toBe('/api/v1/card/cards/..%2Ftags%2Fevil%3Fx%3D1');
    expect(requests[0]!.url.search).toBe('');
  });

  it('rejects empty path parameters before sending', () => {
    const { requests } = stubFetch(jsonResponse({}));
    expect(() => makeClient().card.cards.get('')).toThrow(TypeError);
    expect(requests).toHaveLength(0);
  });

  it('uses a custom fetch implementation when provided', async () => {
    const global = stubFetch(jsonResponse({ never: true }));
    const custom = vi.fn(async () => jsonResponse({ balance_usd: 9, updated_at: null }));
    const value = await makeClient({ fetch: custom }).card.balance.get();
    expect(value).toEqual({ balance_usd: 9, updated_at: null });
    expect(custom).toHaveBeenCalledTimes(1);
    expect(global.requests).toHaveLength(0);
  });
});

describe('APIPromise', () => {
  it('is a Promise and resolves to the parsed body', async () => {
    stubFetch(jsonResponse({ balance_usd: 1, updated_at: null }));
    const p = makeClient().card.balance.get();
    expect(p).toBeInstanceOf(APIPromise);
    expect(p).toBeInstanceOf(Promise);
    expect(await p.then((b) => b.balance_usd)).toBe(1);
  });

  it('exposes response metadata through withResponse()', async () => {
    stubFetch(
      jsonResponse({ check_id: 'chk_1' }, 200, { 'x-request-id': 'req_meta', 'idempotent-replay': 'true', 'x-relay-cache': 'hit' }),
    );
    const { data, response } = await makeClient()
      .compliance.aml.check({ external_user_id: 'u', full_name: 'Jane Doe' }, { idempotencyKey: 'k' })
      .withResponse();
    expect(data).toEqual({ check_id: 'chk_1' });
    expect(response.status).toBe(200);
    expect(response.requestId).toBe('req_meta');
    expect(response.idempotentReplay).toBe(true);
    expect(response.relayCache).toBe('HIT');
    expect(response.headers.get('content-type')).toBe('application/json');
  });

  it('reports a missing X-Relay-Cache header as null and no replay', async () => {
    stubFetch(new Response(JSON.stringify({ fast: 1 }), { status: 200 }));
    const { response } = await makeClient().blockchain.fee.getRecommended('BTC').withResponse();
    expect(response.relayCache).toBeNull();
    expect(response.idempotentReplay).toBe(false);
    expect(response.requestId).toBeNull();
  });

  it('applies list transformations to withResponse() data too', async () => {
    stubFetch(jsonResponse({ subscriptions: [], next_cursor: 'c2' }));
    const { data, response } = await makeClient().compliance.monitoring.list().withResponse();
    expect(data).toEqual({ data: [], nextCursor: 'c2' });
    expect(response.status).toBe(200);
  });

  it('supports catch() and finally()', async () => {
    stubFetch(jsonResponse(errorEnvelope('forbidden_scope', 'no'), 403));
    const onFinally = vi.fn();
    const code = await makeClient()
      .card.balance.get()
      .catch((e: CrypturesApiError) => e.code)
      .finally(onFinally);
    expect(code).toBe('forbidden_scope');
    expect(onFinally).toHaveBeenCalledOnce();
  });
});
