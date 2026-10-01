import type { EndpointCase } from '../helpers.js';

const CARDS = '/api/v1/card/cards';
const CARD_ID = 'card_a1b2c3d4';
const TAG_ID = 'tag_9f1a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8';
const TAG = { tag_id: TAG_ID, name: 'Marketing', color: '#4F46E5' };

const FULL_CARD = {
  card_id: CARD_ID,
  product_code: 'us_493_visa_bin',
  brand: 'visa',
  type: 'virtual',
  currency: 'USD',
  status: 'active',
  name_on_card: 'Jane Doe',
  email: 'a1b2c3d4-e5f6-4789-a012-3456789abcde@placeholder.invalid',
  last_four: '1111',
  expiry_month: '08',
  expiry_year: '2031',
  balance: { amount: 10000000, display_amount: 10, currency: 'USD' },
  card_number: '4111111111111111',
  cvv: '123',
  cardnumber: '4111111111111111',
  expiredate: '08/31',
  created_at: '2026-08-29T00:00:00Z',
  tags: [TAG],
};

export const cardCardsCases: EndpointCase[] = [
  {
    operationId: 'card.create',
    sdkMethod: 'card.cards.create',
    call: (c) =>
      c.card.cards.create({
        product_code: 'us_493_visa_bin',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        initial_load: 20,
        tags: ['Marketing'],
      }),
    request: {
      method: 'POST',
      path: `${CARDS}/create`,
      body: { product_code: 'us_493_visa_bin', first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com', initial_load: 20, tags: ['Marketing'] },
    },
    response: {
      body: { status: 'success', message: 'Card created successfully.', data: { card_id: CARD_ID, status: 'active', last_four: '4242', tags: [TAG] } },
    },
  },
  {
    operationId: 'card.get',
    sdkMethod: 'card.cards.get',
    call: (c) => c.card.cards.get(CARD_ID),
    request: { method: 'GET', path: `${CARDS}/${CARD_ID}` },
    response: { body: { status: 'success', message: 'Card fetched successfully.', data: FULL_CARD } },
  },
  {
    operationId: 'card.get',
    sdkMethod: 'card.cards.get',
    label: 'with reveal_token',
    call: (c) => c.card.cards.get(CARD_ID, { reveal_token: 'rvl_123' }),
    request: { method: 'GET', path: `${CARDS}/${CARD_ID}`, query: { reveal_token: 'rvl_123' } },
    response: { body: { status: 'success', data: FULL_CARD } },
  },
  {
    operationId: 'card.list',
    sdkMethod: 'card.cards.list',
    call: (c) => c.card.cards.list(),
    request: { method: 'GET', path: CARDS },
    response: {
      body: {
        data: [
          {
            card_id: CARD_ID,
            product_code: 'us_493_visa_bin',
            email: 'jane@example.com',
            first_name: 'Jane',
            last_name: 'Doe',
            status: 'active',
            last_four: '4242',
            label: null,
            created_at: '2026-08-28T00:00:00Z',
            tags: [TAG],
          },
        ],
      },
    },
  },
  {
    operationId: 'card.products.list',
    sdkMethod: 'card.cards.listProducts',
    call: (c) => c.card.cards.listProducts(),
    request: { method: 'GET', path: '/api/v1/card/products' },
    response: {
      body: {
        products: [
          {
            product_code: 'us_493_visa_atm',
            display_name: 'US Visa ATM Card',
            min_load_usd: null,
            max_load_usd: null,
            issuance_fee_usd: 1,
            fund_fee_flat_usd: 0,
            fund_fee_pct: 0,
            annual_fee_usd: 9,
            disallow_initial_load: true,
          },
        ],
      },
    },
  },
  {
    operationId: 'card.setpin',
    sdkMethod: 'card.cards.setPin',
    call: (c) => c.card.cards.setPin('card_atm_1a2b3c', { pin: '654321' }),
    request: { method: 'POST', path: `${CARDS}/card_atm_1a2b3c/pin`, body: { pin: '654321' } },
    response: { body: { status: 'success', message: 'Card PIN set successfully.' } },
  },
  {
    operationId: 'card.fund',
    sdkMethod: 'card.cards.fund',
    call: (c) => c.card.cards.fund(CARD_ID, { amount: 10 }),
    request: { method: 'POST', path: `${CARDS}/${CARD_ID}/fund`, body: { amount: 10 } },
    response: { body: { status: 'success', data: { card_id: CARD_ID, amount: 10000000, display_amount: 10 } } },
  },
  {
    operationId: 'card.withdraw',
    sdkMethod: 'card.cards.withdraw',
    call: (c) => c.card.cards.withdraw(CARD_ID, { amount: 10 }),
    request: { method: 'POST', path: `${CARDS}/${CARD_ID}/withdraw`, body: { amount: 10 } },
    response: {
      body: {
        status: 'success',
        message: 'Card withdrawal completed successfully.',
        data: { card_id: CARD_ID, amount: 10000000, display_amount: 10 },
      },
    },
  },
  {
    operationId: 'card.terminate',
    sdkMethod: 'card.cards.terminate',
    call: (c) => c.card.cards.terminate(CARD_ID),
    request: { method: 'POST', path: `${CARDS}/${CARD_ID}/terminate` },
    response: { body: { status: 'success', message: 'Card terminated successfully.', data: { card_id: CARD_ID, status: 'terminated' } } },
  },
  {
    operationId: 'card.block',
    sdkMethod: 'card.cards.block',
    call: (c) => c.card.cards.block(CARD_ID),
    request: { method: 'POST', path: `${CARDS}/${CARD_ID}/block` },
    response: { body: { status: 'success', message: 'Card blocked successfully.', data: { card_id: CARD_ID, status: 'blocked' } } },
  },
  {
    operationId: 'card.unblock',
    sdkMethod: 'card.cards.unblock',
    call: (c) => c.card.cards.unblock(CARD_ID),
    request: { method: 'POST', path: `${CARDS}/${CARD_ID}/unblock` },
    response: { body: { status: 'success', message: 'Card unblocked successfully.', data: { card_id: CARD_ID, status: 'active' } } },
  },
  {
    operationId: 'card.transactions',
    sdkMethod: 'card.cards.listTransactions',
    call: (c) => c.card.cards.listTransactions(CARD_ID, { pageNum: 1 }),
    request: { method: 'GET', path: `${CARDS}/${CARD_ID}/transactions`, query: { pageNum: '1' } },
    response: {
      body: {
        status: 'success',
        message: 'Transactions fetched successfully.',
        data: {
          transactions: [
            {
              id: '260820000000002879',
              card_id: CARD_ID,
              type: 'authorization',
              status: 'completed',
              amount: 460000,
              display_amount: 0.46,
              currency: 'USD',
              merchant_name: 'Grab',
              created_at: '2026-08-20T05:55:00Z',
            },
          ],
          pagination: { type: 'page', page_num: 1, page_size: 1, total: 1, has_more: false },
        },
      },
    },
  },
];

export const cardWebhooksCases: EndpointCase[] = [
  {
    operationId: 'card.webhooks.register',
    sdkMethod: 'card.webhooks.register',
    call: (c) => c.card.webhooks.register({ url: 'https://example.com/webhooks/card' }),
    request: { method: 'POST', path: '/api/v1/card/webhooks/register', body: { url: 'https://example.com/webhooks/card' } },
    response: {
      body: { url: 'https://example.com/webhooks/card', secret: '3f1a9c2e7b6d4058a1c9e3f70b8d2a5c6e9f1b3d7a0c5e8f2b4d6a9c1e3f5b7d' },
    },
  },
  {
    operationId: 'card.webhooks.status',
    sdkMethod: 'card.webhooks.getStatus',
    call: (c) => c.card.webhooks.getStatus(),
    request: { method: 'GET', path: '/api/v1/card/webhooks/status' },
    response: { body: { registered: true, url: 'https://example.com/webhooks/card', registered_at: '2026-09-12T18:04:33Z' } },
  },
];

export const cardBalanceCases: EndpointCase[] = [
  {
    operationId: 'card.balance.get',
    sdkMethod: 'card.balance.get',
    call: (c) => c.card.balance.get(),
    request: { method: 'GET', path: '/api/v1/card/balance' },
    response: { body: { balance_usd: 42.5, updated_at: '2026-08-29T00:00:00Z' } },
  },
  {
    operationId: 'card.balance.transactions',
    sdkMethod: 'card.balance.listTransactions',
    call: (c) => c.card.balance.listTransactions({ page: 2, limit: 100 }),
    request: { method: 'GET', path: '/api/v1/card/balance/transactions', query: { page: '2', limit: '100' } },
    response: {
      body: {
        data: [
          {
            id: 'bl_9f1a2b3c',
            type: 'card_fund_debit',
            amount_usd: 11.4,
            related_reference: CARD_ID,
            status: 'completed',
            created_at: '2026-08-29T00:00:01Z',
          },
        ],
        page: 2,
        limit: 100,
        total: 101,
      },
    },
  },
];

export const cardTagsCases: EndpointCase[] = [
  {
    operationId: 'card.tags.list',
    sdkMethod: 'card.tags.list',
    call: (c) => c.card.tags.list(),
    request: { method: 'GET', path: '/api/v1/card/tags' },
    response: { body: { data: [{ ...TAG, created_at: '2026-08-29T00:00:00Z', updated_at: '2026-08-29T00:00:00Z' }] } },
  },
  {
    operationId: 'card.tags.create',
    sdkMethod: 'card.tags.create',
    call: (c) => c.card.tags.create({ name: 'Marketing' }),
    request: { method: 'POST', path: '/api/v1/card/tags', body: { name: 'Marketing' } },
    response: { status: 201, body: { ...TAG, created_at: '2026-08-29T00:00:00Z', updated_at: '2026-08-29T00:00:00Z' } },
  },
  {
    operationId: 'card.tags.update',
    sdkMethod: 'card.tags.update',
    call: (c) => c.card.tags.update(TAG_ID, { color: '#DC2626' }),
    request: { method: 'PATCH', path: `/api/v1/card/tags/${TAG_ID}`, body: { color: '#DC2626' } },
    response: { body: { tag_id: TAG_ID, name: 'Marketing', color: '#DC2626', updated_at: '2026-08-29T01:00:00Z' } },
  },
  {
    operationId: 'card.tags.delete',
    sdkMethod: 'card.tags.delete',
    call: (c) => c.card.tags.delete(TAG_ID),
    request: { method: 'DELETE', path: `/api/v1/card/tags/${TAG_ID}` },
    response: { body: { deleted: true } },
  },
  {
    operationId: 'card.tags.set',
    sdkMethod: 'card.tags.setForCard',
    call: (c) => c.card.tags.setForCard(CARD_ID, { tags: ['Marketing', 'marketing', 'VIP'] }),
    request: { method: 'PUT', path: `${CARDS}/${CARD_ID}/tags`, body: { tags: ['Marketing', 'marketing', 'VIP'] } },
    response: { body: { tags: [TAG, { tag_id: 'tag_2', name: 'VIP', color: '#DC2626' }] } },
  },
];

export const cardReportsCases: EndpointCase[] = [
  {
    operationId: 'card.reports.summary',
    sdkMethod: 'card.reports.getSummary',
    call: (c) => c.card.reports.getSummary({ from: '2026-01-01T00:00:00Z', to: '2026-09-01T00:00:00Z' }),
    request: { method: 'GET', path: '/api/v1/card/reports/summary', query: { from: '2026-01-01T00:00:00Z', to: '2026-09-01T00:00:00Z' } },
    response: {
      body: {
        range: { from: '2026-01-01T00:00:00.000Z', to: '2026-09-01T00:00:00.000Z' },
        totals: { funded_usd: 1250, withdrawn_usd: 300, net_usd: 950, card_count: 4 },
        unattributed: { funded_usd: 0 },
        by_month: [{ month: '2026-08', funded_usd: 200, withdrawn_usd: 0, net_usd: 200 }],
        by_type: [{ product_code: 'us_493_visa_bin', funded_usd: 1250, withdrawn_usd: 300, net_usd: 950, card_count: 4 }],
        by_tag: [{ ...TAG, funded_usd: 400, withdrawn_usd: 0, net_usd: 400, card_count: 2 }],
        untagged: { funded_usd: 850, withdrawn_usd: 300, net_usd: 550, card_count: 2 },
        by_card: [
          {
            card_id: CARD_ID,
            first_name: 'Jane',
            last_name: 'Doe',
            last_four: '4242',
            product_code: 'us_493_visa_bin',
            tags: [],
            funded_usd: 300,
            withdrawn_usd: 0,
            net_usd: 300,
          },
        ],
      },
    },
  },
];

export const cardCases: EndpointCase[] = [
  ...cardCardsCases,
  ...cardWebhooksCases,
  ...cardBalanceCases,
  ...cardTagsCases,
  ...cardReportsCases,
];
