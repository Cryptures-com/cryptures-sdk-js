import { describe, expect, it } from 'vitest';
import { cardBalanceCases, cardCardsCases, cardReportsCases, cardTagsCases, cardWebhooksCases } from './cases/card.js';
import { jsonResponse, makeClient, runEndpointCases, stubFetch } from './helpers.js';

describe('client.card.cards', () => runEndpointCases(cardCardsCases));
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
