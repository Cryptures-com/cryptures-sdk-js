// Request and response types for the `blockchain` domain. Every shape here is
// transcribed from the Cryptures API reference (https://docs.cryptures.com/).
// Fields the reference does not mark as required are optional.

import type { BalanceChain, ChainCode, EvmChain, TxHistoryChain } from './common.js';

/** A JSON object whose fields the API reference does not model individually. */
export type UnmodelledObject = Record<string, unknown>;

/** Token category used across portfolio / balance / tx-history records. */
export type TokenCategory = 'native' | 'fungible' | 'nft' | 'multitoken';

/** `{ result, prevPage, nextPage }` envelope used by several data operations. */
export interface ResultPage<T> {
  result: T[];
  prevPage?: string;
  nextPage?: string;
}

/** The `{ txId }` body every signing/broadcasting operation returns. */
export interface TxIdResponse {
  /** The broadcast transaction hash/id. */
  txId: string;
}

// ---------------------------------------------------------------------------
// data: balance.check
// ---------------------------------------------------------------------------

/** ETH, SOL, BNB, MATIC, AVAX, ALGO, ARB, OP, BASE, FTM, VET, EGLD. */
export interface BalanceSimple {
  /** Native balance, as a decimal string in the chain's own unit. */
  balance: string;
}

/** BTC, LTC, DOGE. */
export interface BalanceUtxo {
  /** Confirmed balance (confirmed incoming minus confirmed outgoing), in satoshis. */
  balance: string;
  /** Incoming sum, including confirmed and pending mempool transactions. */
  incoming: string;
  /** Outgoing sum, including confirmed and pending mempool transactions. */
  outgoing: string;
  /** Incoming sum of pending (unconfirmed, mempool) transactions only, in satoshis. */
  incomingPending: string;
  /** Outgoing sum of pending (unconfirmed, mempool) transactions only, in satoshis. */
  outgoingPending: string;
}

/** CELO -- three named currencies, no generic `balance` field. */
export interface BalanceCelo {
  celo: string;
  cUsd: string;
  cEur: string;
}

/** ADA -- a bare multi-asset array. */
export type BalanceCardano = Array<{
  currency: { symbol: string; decimals?: number };
  /** The held amount of that asset, as a decimal string. */
  value: string;
}>;

/** XLM -- a full Stellar account object (only the documented fields are typed). */
export interface BalanceStellar {
  account_id?: string;
  sequence?: string;
  balances: Array<{
    /** e.g. "native" for XLM itself, "credit_alphanum4" for an issued asset. */
    asset_type: string;
    balance: string;
    /** Trustline limit. Absent for the native asset. */
    limit?: string;
    asset_code?: string;
    asset_issuer?: string;
  }>;
  [field: string]: unknown;
}

/** XRP -- `balance` is in drops (1 XRP = 1,000,000 drops). */
export interface BalanceXrp {
  balance: string;
  /** Issued (non-native) currencies held by the account. */
  assets: Array<{ balance: string; currency: string }>;
}

/** TRON -- a full account object; `balance` is in SUN (1 TRX = 1,000,000 SUN). */
export interface BalanceTron {
  address: string;
  balance: number;
  trc10?: UnmodelledObject[];
  trc20?: UnmodelledObject[];
  bandwidth?: UnmodelledObject;
  [field: string]: unknown;
}

/** Every shape `getBalance` can return, across all chains. */
export type BalanceResponse =
  | BalanceSimple
  | BalanceUtxo
  | BalanceCelo
  | BalanceCardano
  | BalanceStellar
  | BalanceXrp
  | BalanceTron;

/** The `getBalance` response shape for a specific chain. */
export type BalanceResponseFor<C extends BalanceChain> = C extends 'BTC' | 'LTC' | 'DOGE'
  ? BalanceUtxo
  : C extends 'CELO'
    ? BalanceCelo
    : C extends 'ADA'
      ? BalanceCardano
      : C extends 'XLM'
        ? BalanceStellar
        : C extends 'XRP'
          ? BalanceXrp
          : C extends 'TRON'
            ? BalanceTron
            : BalanceSimple;

// ---------------------------------------------------------------------------
// data: balance.batch
// ---------------------------------------------------------------------------

/** Network-id style identifiers accepted by `getBalanceBatch` (not the usual chain codes). */
export type BalanceBatchNetwork =
  | 'bitcoin-mainnet'
  | 'ethereum-mainnet'
  | 'bsc-mainnet'
  | 'polygon-mainnet'
  | 'avax-mainnet'
  | 'arb-one-mainnet'
  | 'optimism-mainnet'
  | 'base-mainnet'
  | 'celo-mainnet';

interface BalanceBatchBase {
  chain: BalanceBatchNetwork;
  /**
   * Up to 10 addresses. Sent as the API's comma-separated string; an array
   * is joined with `,` for you.
   */
  addresses: string | string[];
}

/**
 * Parameters for `getBalanceBatch`. One of `blockNumber`, `time` or `unix`
 * is required -- omitting all three is a validation error, not "now".
 */
export type BalanceBatchParams = BalanceBatchBase &
  (
    | { blockNumber: number; time?: string; unix?: number }
    | { blockNumber?: number; time: string; unix?: number }
    | { blockNumber?: number; time?: string; unix: number }
  );

export interface BalanceBatchEntry {
  chain: string;
  address: string;
  /** Plain decimal string in the chain's native unit. */
  balance: string;
  lastUpdatedBlockNumber: number;
  /** e.g. "native". */
  type: string;
}

export interface BalanceBatchResponse {
  result?: BalanceBatchEntry[];
  prevPage?: string;
  nextPage?: string;
}

// ---------------------------------------------------------------------------
// data: token.transfers (TRON TRC-20)
// ---------------------------------------------------------------------------

export interface TokenTransfersQuery {
  /** Pagination cursor, from a previous response's `next` field. */
  next?: string;
  onlyConfirmed?: boolean;
  onlyUnconfirmed?: boolean;
  /** Only transfers where the queried address is the recipient. */
  onlyTo?: boolean;
  /** Only transfers where the queried address is the sender. */
  onlyFrom?: boolean;
  /** Sort order for results. */
  orderBy?: string;
  minTimestamp?: number;
  maxTimestamp?: number;
  /** Restrict results to this TRC-20 token contract. */
  contractAddress?: string;
}

export interface Trc20Transfer {
  txID?: string;
  tokenInfo?: {
    symbol?: string;
    /** The TRC-20 token contract address. */
    address?: string;
    decimals?: number;
    name?: string;
  };
  from?: string;
  to?: string;
  /** e.g. "Transfer" or "Approval". */
  type?: string;
  value?: string;
}

export interface TokenTransfersResponse {
  transactions: Trc20Transfer[];
  /** Cursor for the following page, when more results exist. */
  next?: string;
}

// ---------------------------------------------------------------------------
// data: tx.history
// ---------------------------------------------------------------------------

export interface TxHistoryQuery {
  /** 1-50. Ignored on EGLD. */
  pageSize?: number;
  /** Pagination offset. Ignored on EGLD. */
  offset?: number;
}

/** One normalized transfer record (BNB, AVAX, ARB, OP, BASE, CELO only). */
export interface TxHistoryRecord {
  chain?: string;
  hash?: string;
  address?: string;
  counterAddress?: string;
  tokenAddress?: string;
  tokenId?: string;
  blockNumber?: number;
  transactionType?: TokenCategory;
  transactionSubtype?: 'incoming' | 'outgoing' | 'zero-transfer';
  amount?: string;
  timestamp?: number;
}

/** Unified shape -- BNB, AVAX, ARB, OP, BASE, CELO. */
export interface TxHistoryUnified {
  result: TxHistoryRecord[];
  prevPage?: string;
  nextPage?: string;
}

/** TRON's own shape. */
export interface TxHistoryTron {
  transactions: UnmodelledObject[];
  /** Cursor for the following page, when more results exist. */
  next?: string;
}

/** Chain-native array shape -- BTC, LTC, DOGE, BCH, ETH, MATIC, XRP, XLM, EGLD. */
export type TxHistoryNative = UnmodelledObject[];

export type TxHistoryResponse = TxHistoryUnified | TxHistoryNative | TxHistoryTron;

/** The `getTransactionHistory` response shape for a specific chain. */
export type TxHistoryResponseFor<C extends TxHistoryChain> = C extends 'BNB' | 'AVAX' | 'ARB' | 'OP' | 'BASE' | 'CELO'
  ? TxHistoryUnified
  : C extends 'TRON'
    ? TxHistoryTron
    : TxHistoryNative;

// ---------------------------------------------------------------------------
// data: portfolio.get
// ---------------------------------------------------------------------------

export interface PortfolioQuery {
  /**
   * Required token-type filter. Sent as the API's comma-separated string;
   * an array is joined with `,` for you.
   */
  tokenTypes: TokenCategory | TokenCategory[] | string;
  /** Exclude NFT/multitoken metadata. Defaults to false. */
  excludeMetadata?: boolean;
  /** 1-50. Defaults to 50. */
  pageSize?: number;
  offset?: number;
}

export interface PortfolioItem {
  chain?: string;
  type?: TokenCategory;
  address?: string;
  balance?: string;
  denominatedBalance?: string;
  decimals?: number;
  tokenAddress?: string;
  tokenId?: string;
  metadataURI?: string;
  metadata?: UnmodelledObject;
}

export type PortfolioResponse = Partial<ResultPage<PortfolioItem>>;

// ---------------------------------------------------------------------------
// data: balance-history.get
// ---------------------------------------------------------------------------

/** Supply at most one of `time`, `blockNumber`, `unix`; none returns the current balance. */
export interface BalanceHistoryQuery {
  /** ISO-8601-ish timestamp, e.g. "2022-12-24T00:20". */
  time?: string;
  blockNumber?: number;
  unix?: number;
}

export interface BalanceHistoryEntry {
  chain?: string;
  address?: string;
  balance?: string;
  denominatedBalance?: string;
  decimals?: number;
  type?: TokenCategory;
}

export type BalanceHistoryResponse = Partial<ResultPage<BalanceHistoryEntry>>;

// ---------------------------------------------------------------------------
// data: security.address-check
// ---------------------------------------------------------------------------

export interface AddressSecurityResponse {
  /** "valid" for a clean/unflagged address, "invalid" for a flagged one. */
  status: 'valid' | 'invalid';
  /** Present only when status is "invalid". */
  address?: string;
  /** The intelligence source that flagged the address. Present only when status is "invalid". */
  source?: string;
  /** Brief explanation of the flagged risk. Present only when status is "invalid". */
  description?: string;
}

// ---------------------------------------------------------------------------
// data: exchange rates
// ---------------------------------------------------------------------------

export interface ExchangeRateQuery {
  /** Defaults to "USD". */
  basePair?: string;
}

export interface ExchangeRate {
  /** The rate, as a decimal string. */
  value?: string;
  basePair?: string;
  /** The symbol that was priced. */
  id?: string;
  /** Unix timestamp in milliseconds. */
  timestamp?: number;
}

export interface ExchangeRateByContractQuery {
  /** Network-id style identifier, e.g. "ethereum-mainnet". */
  chain: string;
  /** The token contract address to price. */
  contractAddress: string;
  /** Defaults to "EUR" (not USD) when omitted. */
  basePair?: string;
}

export interface ExchangeRateByContract {
  value?: string;
  basePair?: string;
  timestamp?: number;
  chain?: string;
  address?: string;
}

export interface ExchangeRateBatchEntry {
  /** Caller-supplied id to correlate this entry's response (order is not guaranteed). */
  batchId: string;
  symbol: string;
  /** Defaults to EUR when omitted. */
  basePair?: string;
}

export interface ExchangeRateBatchResult {
  batchId?: string;
  symbol?: string;
  value?: string;
  basePair?: string;
  timestamp?: number;
  source?: string;
}

// ---------------------------------------------------------------------------
// data: sentiment & market data
// ---------------------------------------------------------------------------

export interface FearGreedQuery {
  /** Number of days of historical data. Defaults to 1. */
  limit?: number;
  /** e.g. "world" for DD-MM-YYYY. Defaults to a Unix timestamp. */
  date_format?: string;
}

export interface FearGreedResponse {
  name?: string;
  data?: Array<{
    /** Index value, 0-100. */
    value?: string;
    /** e.g. "Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed". */
    value_classification?: string;
    timestamp?: string;
    /** Seconds until the next update. Present only on the most recent entry. */
    time_until_update?: string;
  }>;
  metadata?: { error?: string | null };
}

export interface MarketGlobalStats {
  coins_count?: number;
  active_markets?: number;
  total_mcap?: number;
  total_volume?: number;
  /** Bitcoin dominance percentage. */
  btc_d?: string;
  /** Ethereum dominance percentage. */
  eth_d?: string;
  mcap_change?: string;
  volume_change?: string;
  avg_change_percent?: string;
  volume_ath?: number;
  mcap_ath?: number;
}

export interface MarketAsset {
  id?: string;
  symbol?: string;
  name?: string;
  nameid?: string;
  rank?: number;
}

export interface MarketAssetsResponse {
  data?: MarketAsset[];
}

export interface MarketTickersQuery {
  /** Pagination start offset. Defaults to 0. */
  start?: number;
  /** Up to 100. Defaults to 100. */
  limit?: number;
}

export interface MarketTicker {
  id?: string;
  symbol?: string;
  name?: string;
  nameid?: string;
  rank?: number;
  price_usd?: string;
  percent_change_24h?: string;
  percent_change_1h?: string;
  percent_change_7d?: string;
  price_btc?: string;
  market_cap_usd?: string;
  volume24?: number;
  volume24a?: number;
  csupply?: string;
  tsupply?: string;
  msupply?: string;
}

export interface MarketTickersResponse {
  data?: MarketTicker[];
  info?: { coins_num?: number; time?: number };
}

export interface MarketTickerSummary {
  id?: string;
  symbol?: string;
  name?: string;
  price_usd?: string;
  percent_change_24h?: string;
  market_cap_usd?: string;
}

export interface MarketMoversQuery {
  /** Passed through unvalidated; results are ranked by 24-hour change either way. */
  sort?: string;
}

export interface MarketMoversResponse {
  data?: {
    winners?: UnmodelledObject[];
    losers?: UnmodelledObject[];
  };
}

export interface CoinInfo {
  id?: string;
  symbol?: string;
  name?: string;
  nameid?: string;
  website?: string;
  twitter?: string;
  explorer?: string;
  logo?: string;
  /** All-time high price, USD. */
  ath?: number;
  rank?: number;
  ath_date?: string;
  csupply?: string;
  tsupply?: string;
  msupply?: string;
  startdate?: string | null;
  platform?: string | null;
  first_price?: number;
  first_price_date?: string;
}

/** `[unixTimestamp, open, high, low, close, volume]`. */
export type OhlcvCandle = [number, number, number, number, number, number];

export interface CoinMarket {
  /** Exchange name. */
  name?: string;
  base?: string;
  quote?: string;
  price?: number;
  price_usd?: number;
  volume?: number;
  volume_usd?: number;
  time?: number;
}

export interface CoinSocialStats {
  reddit?: { avg_active_users?: number | null; subscribers?: number };
  twitter?: { followers_count?: number | null; status_count?: number | null };
}

export interface ExchangeSummary {
  id?: string;
  name?: string;
  name_id?: string;
  volume_usd?: number;
  active_pairs?: number;
  url?: string;
  country?: string;
}

/** Keyed by exchange id (as a string). */
export type ExchangeList = Record<string, ExchangeSummary>;

export interface ExchangePair {
  base?: string;
  quote?: string;
  volume?: number;
  price?: number;
  price_usd?: number;
  time?: number;
}

export interface ExchangeDetail {
  /** The exchange metadata, keyed "0" (not by the exchange id). */
  '0'?: { name?: string; date_live?: string | null; url?: string };
  pairs?: ExchangePair[];
}

// ---------------------------------------------------------------------------
// operations: tx.send / tx.broadcast / rpc.gateway
// ---------------------------------------------------------------------------

/** Group 1 -- EVM-style (ETH, MATIC, BNB, AVAX, ARB, OP, BASE, CELO, FTM). */
export interface TxSendEvmBody {
  /** The chain's native currency code, e.g. "ETH", "MATIC", "CELO". */
  currency: string;
  /** Amount in the native currency (not the smallest unit). */
  amount: string;
  /** Recipient address. */
  to: string;
  /** Optional -- gas is estimated automatically if omitted. */
  fee?: { gasLimit?: string; /** In Gwei. */ gasPrice?: string };
  /** Optional -- looked up automatically if omitted. */
  nonce?: number;
  /** Sender private key (the only signing path this operation offers). */
  fromPrivateKey: string;
  /** Optional hex-encoded contract call data. */
  data?: string;
}

/** Group 2 -- UTXO (BTC, LTC, DOGE, BCH). */
export interface TxSendUtxoBody {
  fromUTXO: Array<{ txHash: string; index: number; privateKey: string }>;
  to: Array<{ address: string; value: number }>;
  /** Optional -- deducted from outputs if omitted. */
  fee?: string;
  /** Optional -- address for remaining funds. */
  changeAddress?: string;
}

/**
 * Group 3 -- Cardano (ADA). Select inputs either by address (automatic coin
 * selection) or by explicit UTXO. The reference does not name the field that
 * carries ADA's signing secret, so additional fields are allowed here; see
 * https://docs.cryptures.com/ for the authoritative shape.
 */
export type TxSendCardanoBody = (
  | { fromAddress: Array<{ address: string; [field: string]: unknown }>; fromUTXO?: never }
  | { fromUTXO: Array<{ txHash: string; index: number; [field: string]: unknown }>; fromAddress?: never }
) & {
  to: Array<{ address: string; value: number }>;
  [field: string]: unknown;
};

/** Group 4 -- simple account-based (TRON, ALGO, VET). */
export interface TxSendAccountBody {
  fromPrivateKey: string;
  to: string;
  amount: string;
}

/** Group 4 -- Solana additionally requires an explicit `from` address. */
export interface TxSendSolanaBody extends TxSendAccountBody {
  from: string;
}

/** Group 5 -- XRP. Add `issuerAccount`/`token` to send an issued (non-native) currency. */
export interface TxSendXrpBody {
  fromAccount: string;
  to: string;
  amount: string;
  fromSecret: string;
  fee?: string;
  sourceTag?: number;
  destinationTag?: number;
  issuerAccount?: string;
  token?: string;
}

/** Group 6 -- XLM/Stellar. Add `token`/`issuerAccount` to send an issued asset. */
export interface TxSendXlmBody {
  fromAccount: string;
  to: string;
  amount: string;
  fromSecret: string;
  /** Creates the destination account if it doesn't yet exist. */
  initialize?: boolean;
  message?: string;
  token?: string;
  issuerAccount?: string;
}

/** Group 7 -- EGLD/MultiversX: requires the sender's `from` address alongside the key. */
export interface TxSendEgldBody {
  fromPrivateKey: string;
  from: string;
  to: string;
  amount: string;
  fee?: { gasLimit: string; gasPrice: string };
  data?: string;
}

/** The `send` request body for a specific chain. */
export type TxSendBodyFor<C extends ChainCode> = C extends EvmChain
  ? TxSendEvmBody
  : C extends 'BTC' | 'LTC' | 'DOGE' | 'BCH'
    ? TxSendUtxoBody
    : C extends 'ADA'
      ? TxSendCardanoBody
      : C extends 'SOL'
        ? TxSendSolanaBody
        : C extends 'TRON' | 'ALGO' | 'VET'
          ? TxSendAccountBody
          : C extends 'XRP'
            ? TxSendXrpBody
            : C extends 'XLM'
              ? TxSendXlmBody
              : C extends 'EGLD'
                ? TxSendEgldBody
                : never;

export interface BroadcastParams {
  /** Raw signed transaction (hex or the chain's native serialization), 1-500,000 chars. */
  txData: string;
}

/** A JSON-RPC 2.0 request, forwarded to the chain node as-is. */
export interface JsonRpcRequest {
  /** Defaults to "2.0" when omitted. */
  jsonrpc?: '2.0';
  /** Request id, echoed back on the response. */
  id?: number | string;
  /** The chain node's RPC method name -- varies by chain. */
  method: string;
  /** Method parameters -- shape depends on `method`. */
  params?: unknown;
}

/**
 * A JSON-RPC 2.0 response, returned as-is. RPC-level failures arrive with
 * HTTP 200 and an `error` key -- check for it rather than relying on the
 * status code.
 */
export interface JsonRpcResponse<TResult = unknown> {
  jsonrpc?: '2.0';
  id?: number | string;
  /** Present on success. */
  result?: TResult;
  /** Present on an RPC-level error instead of `result`. */
  error?: { code?: number; message?: string; [field: string]: unknown };
}

// ---------------------------------------------------------------------------
// wallet
// ---------------------------------------------------------------------------

/** HD chains (BTC, ETH, BNB, MATIC, AVAX, TRON, LTC, DOGE, ARB, OP, BASE, CELO, FTM, BCH, ADA, VET). */
export interface WalletHd {
  /** BIP-39 mnemonic phrase, in plaintext. */
  mnemonic: string;
  /** Extended public key, for `deriveAddress`. */
  xpub: string;
}

/** XRP, XLM and ALGO (no HD/mnemonic concept). */
export interface WalletAccount {
  address: string;
  /** The account's secret seed/key, in plaintext. */
  secret: string;
}

/** Solana -- no xpub; the address and private key are returned directly. */
export interface WalletSolana {
  mnemonic: string;
  address: string;
  /** The raw private key (base58), in plaintext. */
  privateKey: string;
}

/** MultiversX (EGLD) -- mnemonic only. */
export interface WalletEgld {
  mnemonic: string;
}

export type GeneratedWallet = WalletHd | WalletAccount | WalletSolana | WalletEgld;

/** The `generate` response shape for a specific chain. */
export type GeneratedWalletFor<C extends ChainCode> = C extends 'XRP' | 'XLM' | 'ALGO'
  ? WalletAccount
  : C extends 'SOL'
    ? WalletSolana
    : C extends 'EGLD'
      ? WalletEgld
      : WalletHd;

export interface GenerateWalletOptions {
  /**
   * Recover a wallet from an existing mnemonic instead of generating a new
   * one. Sent as the `mnemonic` query parameter -- a URL is not a safe place
   * for secret material (it can end up in logs); prefer local derivation.
   */
  mnemonic?: string;
}

export interface DerivedAddress {
  address: string;
}

export interface DerivePrivateKeyParams {
  /** BIP-39 mnemonic phrase (as returned by `generate`). */
  mnemonic: string;
  /** HD derivation index (>= 0). */
  index: number;
}

export interface DerivedPrivateKey {
  /** The derived private key, in plaintext. */
  key: string;
}

// ---------------------------------------------------------------------------
// contracts
// ---------------------------------------------------------------------------

/**
 * `chain` values for token deploy. Several differ from the usual chain codes:
 * BSC (= BNB), ETH_BASE (= BASE), ETH_OP (= OP), ETH_ARB (= ARB).
 */
export type TokenDeployChain = 'ETH' | 'BSC' | 'MATIC' | 'AVAX' | 'ETH_BASE' | 'ETH_OP' | 'FTM' | 'ETH_ARB' | 'ALGO' | 'CELO' | 'SOL';
/** `chain` values for token mint (no ALGO, no SOL). */
export type TokenMintChain = Exclude<TokenDeployChain, 'ALGO' | 'SOL'>;
/** `chain` values for token burn (no SOL). */
export type TokenBurnChain = Exclude<TokenDeployChain, 'SOL'>;

export interface DeployTokenParams {
  chain: TokenDeployChain;
  symbol: string;
  name: string;
  totalCap?: string;
  supply: string;
  digits?: number;
  /** Recipient of the initial supply. */
  address: string;
  fromPrivateKey: string;
}

export interface MintTokenParams {
  chain: TokenMintChain;
  contractAddress: string;
  amount: string;
  to: string;
  fromPrivateKey: string;
}

export interface BurnTokenParams {
  chain: TokenBurnChain;
  contractAddress: string;
  amount: string;
  fromPrivateKey: string;
}

// ---------------------------------------------------------------------------
// fee
// ---------------------------------------------------------------------------

export interface FeeTiers {
  slow?: number;
  medium?: number;
  fast?: number;
  /** ETH only (wei). */
  baseFee?: number;
  block?: number;
  /** ISO 8601 date-time. */
  time?: string;
}

export interface EstimateGasParams {
  /** Sender address. */
  from: string;
  /** Recipient address. */
  to: string;
  /** Decimal string in the chain's native unit. */
  amount: string;
  /** Optional raw transaction data, for a contract call. */
  data?: string;
  /** Set when pricing a token transfer rather than a native transfer. */
  contractAddress?: string;
}

export interface GasEstimate {
  /** In the chain's smallest unit (e.g. wei), as a decimal string. */
  gasPrice: string;
  /** Estimated gas units, as a decimal string. */
  gasLimit: string;
}

// ---------------------------------------------------------------------------
// lookups
// ---------------------------------------------------------------------------

/** One entry per participant/asset affected (ARB, AVAX, BASE, BNB, CELO, ETH, MATIC, OP). */
export interface EvmTransactionEntry {
  chain: string;
  hash: string;
  address: string;
  counterAddress?: string;
  blockNumber?: number;
  transactionIndex?: number;
  transactionType: TokenCategory;
  transactionSubtype: 'incoming' | 'outgoing';
  amount?: string;
  timestamp?: number;
}

/** BTC/LTC/DOGE/BCH raw UTXO-chain transaction. */
export interface UtxoTransaction {
  hash: string;
  blockNumber?: number;
  fee?: number;
  size?: number;
  vsize?: number;
  weight?: number;
  time?: number;
  version?: number;
  locktime?: number;
  inputs: UnmodelledObject[];
  outputs: UnmodelledObject[];
  hex?: string;
  [field: string]: unknown;
}

/** TRON's own transaction object. */
export interface TronTransaction {
  txID: string;
  blockNumber?: number;
  ret?: UnmodelledObject[];
  signature?: string[];
  rawData: UnmodelledObject;
  [field: string]: unknown;
}

export type TransactionResponse = EvmTransactionEntry[] | UtxoTransaction | TronTransaction | UnmodelledObject;

/** The `getTransaction` response shape for a specific chain. */
export type TransactionResponseFor<C extends ChainCode> = C extends Exclude<EvmChain, 'FTM'>
  ? EvmTransactionEntry[]
  : C extends 'BTC' | 'LTC' | 'DOGE' | 'BCH'
    ? UtxoTransaction
    : C extends 'TRON'
      ? TronTransaction
      : UnmodelledObject;

/** EVM-style block (ARB, AVAX, BASE, BNB, CELO, ETH, FTM, MATIC, OP). */
export interface EvmBlock {
  hash: string;
  number: number;
  height?: number;
  parentHash: string;
  timestamp?: number;
  miner?: string;
  gasLimit?: number;
  gasUsed?: number;
  size?: number;
  difficulty?: string;
  /** Fully expanded transactions. */
  transactions: UnmodelledObject[];
  [field: string]: unknown;
}

/** UTXO-style block header (BTC/LTC/DOGE/BCH). */
export interface UtxoBlock {
  hash: string;
  height: number;
  mediantime?: number;
  bits?: number;
  difficulty?: number;
  chainwork?: string;
  confirmations?: number;
  merkleRoot: string;
  [field: string]: unknown;
}

/** TRON's block shape (as returned by `getBlock`). */
export interface TronBlock {
  blockNumber: number;
  hash: string;
  parentHash?: string;
  timestamp?: number;
  witnessAddress: string;
  witnessSignature?: string;
  [field: string]: unknown;
}

export type BlockResponse = EvmBlock | UtxoBlock | TronBlock | UnmodelledObject;

/** The `getBlock` response shape for a specific chain. */
export type BlockResponseFor<C extends ChainCode> = C extends EvmChain
  ? EvmBlock
  : C extends 'BTC' | 'LTC' | 'DOGE' | 'BCH'
    ? UtxoBlock
    : C extends 'TRON'
      ? TronBlock
      : UnmodelledObject;

/** TRON's current block (`getLatestBlock`). */
export interface TronLatestBlock {
  /** The block hash -- `ref_block_hash` is derived from bytes of this. */
  blockID?: string;
  block_header?: {
    raw_data?: {
      timestamp?: number;
      /** Block height -- `ref_block_bytes` is derived from its last 2 bytes. */
      number?: number;
      witness_address?: string;
      version?: number;
    };
    witness_signature?: string;
  };
  transactions?: UnmodelledObject[];
}

export interface TokenMetadataQuery {
  /** Look up one specific NFT within a collection. Omit for fungible/native/collection metadata. */
  tokenId?: string;
}

export interface TokenMetadata {
  symbol?: string;
  name?: string;
  decimals?: number;
  /** Cached, not live -- can lag the chain by 24 hours or more. */
  supply?: string;
  tokenType?: 'native' | 'fungible' | 'nonfungible' | 'multitoken';
  logo?: string;
  /** Present for a specific NFT (`tokenId`) only. */
  metadataURI?: string;
}

export interface ListUtxosQuery {
  /**
   * Required intended spend amount, in the chain's native unit (e.g. BTC,
   * not satoshis). Just enough UTXOs to cover it are returned.
   */
  totalValue: number;
}

export interface Utxo {
  chain?: string;
  address?: string;
  txHash: string;
  index: number;
  value: number;
  valueAsString?: string;
}

/** `chain` values accepted by `getUtxoBatch` (not the usual chain codes). */
export type UtxoBatchNetwork = 'bitcoin-mainnet' | 'litecoin-mainnet' | 'doge-mainnet';

export interface UtxoBatchParams {
  /** 1-50 addresses. */
  addresses: string[];
  /** Per-address spend target, same semantics as `listUtxos`. */
  totalValue: number;
  chain: UtxoBatchNetwork;
}

export interface UtxoBatchEntry {
  address: string;
  utxos: Array<{ txHash?: string; index?: number; value?: number; valueAsString?: string }>;
  /** Whether the returned UTXOs sum to at least `totalValue` for this address. */
  transactionPossible: boolean;
}

// ---------------------------------------------------------------------------
// nft
// ---------------------------------------------------------------------------

export interface NftCollectionQuery {
  /** Exclude per-token metadata. Defaults to false. */
  excludeMetadata?: boolean;
  pageSize?: number;
  offset?: number;
}

export interface NftCollectionItem {
  chain?: string;
  tokenId?: string;
  tokenAddress?: string;
  tokenType?: string;
  metadataURI?: string;
  metadata?: {
    identifier?: string;
    collection?: string;
    contract?: string;
    token_standard?: string;
    name?: string;
    description?: string;
    image_url?: string;
    display_image_url?: string;
    display_animation_url?: string | null;
    metadata_url?: string;
  };
}

export interface NftOwnersQuery {
  pageSize?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// storage
// ---------------------------------------------------------------------------

/** Anything that can be uploaded as the multipart `file` field. */
export type UploadableFile = Blob | ArrayBuffer | ArrayBufferView;

export interface IpfsUploadOptions {
  /** File name sent with the multipart `file` field. Defaults to the `File` name, or "file". */
  filename?: string;
  /** MIME type for raw bytes (ignored when a `Blob` already has one). */
  contentType?: string;
}

export interface IpfsUploadResponse {
  /** The uploaded file's IPFS content hash (CID). */
  ipfsHash: string;
}
