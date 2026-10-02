import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { blockchainCases } from './cases/blockchain.js';
import { cardCases } from './cases/card.js';
import { complianceCases } from './cases/compliance.js';
import { MANIFEST, jsonResponse, makeClient, stubFetch } from './helpers.js';

/**
 * Whether each operation is retried automatically after a 5xx or a network
 * error (without an `Idempotency-Key`). This matrix is identical in the JS,
 * Go and Python SDKs; each SDK's test suite asserts the same table.
 */
const RETRY_MATRIX: Record<string, boolean> = {
  // Never retried: repeating them could duplicate a broadcast, a charge, a
  // money movement or another irreversible side effect.
  'tx.send': false,
  'tx.broadcast': false,
  'rpc.gateway': false, // may carry eth_sendRawTransaction
  'contract.token.deploy': false,
  'contract.token.mint': false,
  'contract.token.burn': false,
  'storage.ipfs.upload': false, // billed per call
  'wallet.generate': false, // a retry returns a different wallet
  'card.create': false,
  'card.fund': false,
  'card.withdraw': false,
  'card.setpin': false,
  'card.block': false,
  'card.unblock': false,
  'card.terminate': false,
  'card.tags.create': false,
  'compliance.session.create': false,
  'compliance.aml.check': false, // retried only with an Idempotency-Key
  'compliance.wallet_screening.create': false, // retried only with an Idempotency-Key

  // Retried: reads, and idempotent writes.
  'address.derive': true,
  'balance-history.get': true,
  'balance.batch': true,
  'balance.check': true,
  'block.get': true,
  'block.latest': true,
  'card.balance.get': true,
  'card.balance.transactions': true,
  'card.get': true,
  'card.list': true,
  'card.products.list': true,
  'card.reports.summary': true,
  'card.tags.delete': true,
  'card.tags.list': true,
  'card.tags.set': true,
  'card.tags.update': true,
  'card.transactions': true,
  'card.webhooks.register': true,
  'card.webhooks.status': true,
  'compliance.monitoring.disable': true,
  'compliance.monitoring.enable': true,
  'compliance.monitoring.list': true,
  'compliance.presets.list': true,
  'compliance.session.delete': true,
  'compliance.session.documents.get': true,
  'compliance.session.get': true,
  'compliance.session.report.create': true,
  'compliance.session.report.download': true,
  'compliance.session.status.update': true,
  'compliance.sessions.list': true,
  'compliance.wallet_screening.get': true,
  'compliance.webhooks.register': true,
  'compliance.webhooks.status': true,
  'exchange.rate': true,
  'exchange.rate.batch': true,
  'exchange.rate.contract': true,
  'fee.gas': true,
  'fee.get': true,
  'market.assets': true,
  'market.coin.info': true,
  'market.coin.markets': true,
  'market.coin.ohlcv': true,
  'market.coin.social': true,
  'market.exchanges': true,
  'market.exchanges.single': true,
  'market.global': true,
  'market.movers': true,
  'market.tickers': true,
  'market.tickers.single': true,
  'nft.collection.get': true,
  'nft.owner.get': true,
  'portfolio.get': true,
  'privatekey.derive': true,
  'security.address-check': true,
  'sentiment.fear-greed': true,
  'token.transfers': true,
  'tokens.get': true,
  'tx.hash': true,
  'tx.history': true,
  'utxo.batch': true,
  'utxo.list': true,
};

const ALL_CASES = [...blockchainCases, ...cardCases, ...complianceCases];

describe('retry matrix', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists every API operation exactly once', () => {
    expect(Object.keys(RETRY_MATRIX).sort()).toEqual(MANIFEST.map((e) => e.operationId).sort());
  });

  for (const c of ALL_CASES) {
    const withKey = Object.keys(c.request.headers ?? {}).some((h) => h.toLowerCase() === 'idempotency-key');
    const retryable = RETRY_MATRIX[c.operationId] === true || withKey;
    const title = `${c.sdkMethod}${c.label ? ` (${c.label})` : ''} [${c.operationId}] is ${retryable ? '' : 'not '}retried after a 5xx`;

    it(title, async () => {
      const { requests } = stubFetch(() => jsonResponse({ error: { code: 'internal_error', message: 'boom' } }, 500));
      const settled = Promise.resolve(c.call(makeClient({ maxRetries: 1 }))).then(
        () => undefined,
        (error: unknown) => error,
      );
      await vi.runAllTimersAsync();
      const error = await settled;
      expect(error).toMatchObject({ status: 500 });
      expect(requests).toHaveLength(retryable ? 2 : 1);
    });
  }
});
