import { describe, expect, it } from 'vitest';
import { cardBalanceCases, cardCardsCases, cardReportsCases, cardTagsCases, cardWebhooksCases } from './cases/card.js';
import { jsonResponse, makeClient, runEndpointCases, stubFetch } from './helpers.js';

describe('client.card.cards', () => {
  runEndpointCases(cardCardsCases);

  it('submitKyc surfaces an API error code and the path segment is encoded', async () => {
    const { requests } = stubFetch(
      jsonResponse({ error: { code: 'kyc_not_supported', message: 'This card does not accept KYC documents.' } }, 409),
    );
    await expect(makeClient().card.cards.submitKyc('card/x', { documentFront: new Uint8Array([1]) })).rejects.toMatchObject({
      status: 409,
      code: 'kyc_not_supported',
    });
    expect(requests[0]!.url.pathname).toBe('/api/v1/card/cards/card%2Fx/kyc');
  });

  it('submitKyc is not retried after a 502 even with client maxRetries set', async () => {
    const failure = () => jsonResponse({ error: { code: 'upstream_error', message: 'boom' } }, 502);
    const first = stubFetch(failure);
    await expect(makeClient({ maxRetries: 2 }).card.cards.submitKyc('c1', { documentFront: new Uint8Array([1]) })).rejects.toMatchObject({
      status: 502,
      code: 'upstream_error',
    });
    expect(first.requests).toHaveLength(1);
  });
});
describe('client.card.webhooks', () => runEndpointCases(cardWebhooksCases));
describe('client.card.balance', () => runEndpointCases(cardBalanceCases));
describe('client.card.reports', () => runEndpointCases(cardReportsCases));

describe('client.card.tags', () => {
  runEndpointCases(cardTagsCases);

  it('setForCard refuses to send a request without an explicit tags array', () => {
    const { requests } = stubFetch(jsonResponse({ tags: [] }));
    // The API treats a missing `tags` field as [] and silently clears every tag.
    expect(() => makeClient().card.tags.setForCard('card_1', {} as never)).toThrow(TypeError);
    expect(requests).toHaveLength(0);
  });

  it('setForCard sends an explicit empty array to clear tags', async () => {
    const { requests } = stubFetch(jsonResponse({ tags: [] }));
    await expect(makeClient().card.tags.setForCard('card_1', { tags: [] })).resolves.toEqual({ tags: [] });
    expect(requests[0]!.json).toEqual({ tags: [] });
  });
});
