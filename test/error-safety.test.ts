import { describe, expect, it } from 'vitest';
import { CrypturesApiError } from '../src/index.js';
import { jsonResponse, makeClient, stubFetch } from './helpers.js';

const MAX_ERROR_BODY_BYTES = 1 << 20;

describe('error safety', () => {
  it('replaces control characters in code, message and requestId, and caps their length', async () => {
    const long = 'x'.repeat(5000);
    stubFetch(
      jsonResponse(
        { error: { code: 'bad\r\ncode', message: `line one\r\nINFO forged log line\u2028${long}`, requestId: 'req\n1' } },
        400,
      ),
    );
    const error = (await makeClient().card.balance.get().catch((e: unknown) => e)) as CrypturesApiError;

    expect(error).toBeInstanceOf(CrypturesApiError);
    for (const text of [error.message, error.code, error.requestId ?? '', String(error)]) {
      expect(text).not.toMatch(/[\r\n\u2028]/);
    }
    expect(error.message.startsWith('line one  INFO forged log line ')).toBe(true);
    expect(error.message.endsWith('... [truncated]')).toBe(true);
    expect(error.message).toHaveLength(1024 + '... [truncated]'.length);
    expect(error.code).toBe('bad  code');
    expect(error.requestId).toBe('req 1');
    // The parsed body is kept as received.
    expect((error.body as { error: { message: string } }).error.message.endsWith(long)).toBe(true);
  });

  it('counts the cap in characters, never splitting a surrogate pair', async () => {
    stubFetch(jsonResponse({ error: { code: 'x', message: '\u{1F600}'.repeat(2000) } }, 400));
    const error = (await makeClient().card.balance.get().catch((e: unknown) => e)) as CrypturesApiError;
    const kept = error.message.slice(0, -'... [truncated]'.length);
    expect(Array.from(kept)).toHaveLength(1024);
    expect(kept).toBe('\u{1F600}'.repeat(1024));
  });

  it('sanitizes the X-Request-ID header fallback too', async () => {
    stubFetch(new Response('nope', { status: 418, headers: { 'x-request-id': 'req_1' } }));
    const error = (await makeClient().card.balance.get().catch((e: unknown) => e)) as CrypturesApiError;
    expect(error.requestId).toBe('req_1');
    expect(error.message).toBe('nope');
  });

  it('reads at most 1 MiB of an error body', async () => {
    const huge = 'y'.repeat(3 * MAX_ERROR_BODY_BYTES);
    stubFetch(new Response(huge, { status: 502, headers: { 'content-type': 'text/plain' } }));
    const error = (await makeClient({ maxRetries: 0 }).card.balance.get().catch((e: unknown) => e)) as CrypturesApiError;
    expect(error).toBeInstanceOf(CrypturesApiError);
    expect(error.status).toBe(502);
    expect(typeof error.body).toBe('string');
    expect((error.body as string).length).toBe(MAX_ERROR_BODY_BYTES);
    expect(error.message.length).toBeLessThanOrEqual(500);
  });

  it('still parses a JSON error body under the cap', async () => {
    stubFetch(jsonResponse({ error: { code: 'forbidden_scope', message: 'nope', requestId: 'r' } }, 403));
    const error = (await makeClient().card.balance.get().catch((e: unknown) => e)) as CrypturesApiError;
    expect(error.body).toEqual({ error: { code: 'forbidden_scope', message: 'nope', requestId: 'r' } });
  });
});
