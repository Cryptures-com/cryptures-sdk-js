// Compile-time checks of the per-chain typing (verified by `npm run typecheck`;
// the runtime assertions here are no-ops). No request is ever sent.
import { describe, expectTypeOf, it } from 'vitest';
import type {
  BalanceCelo,
  BalanceSimple,
  BalanceUtxo,
  BinaryResponse,
  Cryptures,
  CursorPage,
  EvmBlock,
  EvmTransactionEntry,
  SessionSummary,
  TxHistoryTron,
  TxHistoryUnified,
  TxIdResponse,
  UtxoBlock,
  WalletAccount,
  WalletHd,
  WalletSolana,
} from '../src/index.js';

type Awaited2<T> = T extends PromiseLike<infer U> ? U : T;

describe('type-level API', () => {
  it('narrows response shapes by chain', () => {
    const c = null as unknown as Cryptures;
    const lazy = () => {
      expectTypeOf<Awaited2<ReturnType<typeof c.blockchain.data.getBalance<'BTC'>>>>().toEqualTypeOf<BalanceUtxo>();
      expectTypeOf<Awaited2<ReturnType<typeof c.blockchain.data.getBalance<'ETH'>>>>().toEqualTypeOf<BalanceSimple>();
      expectTypeOf<Awaited2<ReturnType<typeof c.blockchain.data.getBalance<'CELO'>>>>().toEqualTypeOf<BalanceCelo>();
      expectTypeOf<Awaited2<ReturnType<typeof c.blockchain.wallet.generate<'BTC'>>>>().toEqualTypeOf<WalletHd>();
      expectTypeOf<Awaited2<ReturnType<typeof c.blockchain.wallet.generate<'XRP'>>>>().toEqualTypeOf<WalletAccount>();
      expectTypeOf<Awaited2<ReturnType<typeof c.blockchain.wallet.generate<'SOL'>>>>().toEqualTypeOf<WalletSolana>();
      expectTypeOf<Awaited2<ReturnType<typeof c.blockchain.data.getTransactionHistory<'BASE'>>>>().toEqualTypeOf<TxHistoryUnified>();
      expectTypeOf<Awaited2<ReturnType<typeof c.blockchain.data.getTransactionHistory<'TRON'>>>>().toEqualTypeOf<TxHistoryTron>();
      expectTypeOf<Awaited2<ReturnType<typeof c.blockchain.lookups.getTransaction<'ETH'>>>>().toEqualTypeOf<EvmTransactionEntry[]>();
      expectTypeOf<Awaited2<ReturnType<typeof c.blockchain.lookups.getBlock<'FTM'>>>>().toEqualTypeOf<EvmBlock>();
      expectTypeOf<Awaited2<ReturnType<typeof c.blockchain.lookups.getBlock<'LTC'>>>>().toEqualTypeOf<UtxoBlock>();
      expectTypeOf<Awaited2<ReturnType<typeof c.blockchain.operations.send>>>().toEqualTypeOf<TxIdResponse>();
      expectTypeOf<Awaited2<ReturnType<typeof c.compliance.sessions.list>>>().toEqualTypeOf<CursorPage<SessionSummary>>();
      expectTypeOf<Awaited2<ReturnType<typeof c.compliance.sessions.downloadReport>>>().toEqualTypeOf<BinaryResponse>();
    };
    void c;
    void lazy;
  });

  it('rejects request bodies and chains that do not match', () => {
    const c = null as unknown as Cryptures;
    const lazy = () => {
      // @ts-expect-error -- BTC sends need the UTXO body, not the EVM one.
      void c.blockchain.operations.send('BTC', { currency: 'BTC', amount: '1', to: 'x', fromPrivateKey: 'k' });
      // @ts-expect-error -- Solana sends require an explicit `from`.
      void c.blockchain.operations.send('SOL', { fromPrivateKey: 'k', to: 'x', amount: '1' });
      // @ts-expect-error -- BCH has no balance coverage.
      void c.blockchain.data.getBalance('BCH', 'addr');
      // @ts-expect-error -- fee tiers exist only for BTC, ETH, LTC, DOGE.
      void c.blockchain.fee.getRecommended('SOL');
      // @ts-expect-error -- getBalanceBatch requires one of blockNumber / time / unix.
      void c.blockchain.data.getBalanceBatch({ chain: 'ethereum-mainnet', addresses: '0x1' });
      // @ts-expect-error -- updating a tag requires name or color.
      void c.card.tags.update('tag_1', {});
      // @ts-expect-error -- portfolio requires tokenTypes.
      void c.blockchain.data.getPortfolio('ETH', '0x1', {});
    };
    void lazy;
  });
});
