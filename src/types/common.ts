/**
 * Chain codes used in `blockchain` URL paths. Each operation accepts only
 * the subset it covers; the narrower aliases below mirror the API's own
 * per-operation chain lists.
 */
export type ChainCode =
  | 'ADA'
  | 'ALGO'
  | 'ARB'
  | 'AVAX'
  | 'BASE'
  | 'BCH'
  | 'BNB'
  | 'BTC'
  | 'CELO'
  | 'DOGE'
  | 'EGLD'
  | 'ETH'
  | 'FTM'
  | 'LTC'
  | 'MATIC'
  | 'OP'
  | 'SOL'
  | 'TRON'
  | 'VET'
  | 'XLM'
  | 'XRP';

/** Chains with native-balance coverage (every chain except BCH). */
export type BalanceChain = Exclude<ChainCode, 'BCH'>;

/** Chains with transaction-history coverage (no SOL, ADA, ALGO, VET or FTM). */
export type TxHistoryChain =
  | 'ARB'
  | 'AVAX'
  | 'BASE'
  | 'BCH'
  | 'BNB'
  | 'BTC'
  | 'CELO'
  | 'DOGE'
  | 'EGLD'
  | 'ETH'
  | 'LTC'
  | 'MATIC'
  | 'OP'
  | 'TRON'
  | 'XLM'
  | 'XRP';

/** Chains covered by portfolio, token metadata and NFT operations. */
export type PortfolioChain = 'ARB' | 'AVAX' | 'BASE' | 'BNB' | 'CELO' | 'ETH' | 'MATIC' | 'OP' | 'SOL';

/** Chains covered by historical-balance lookups. */
export type BalanceHistoryChain = 'ARB' | 'AVAX' | 'BASE' | 'BNB' | 'BTC' | 'CELO' | 'ETH' | 'MATIC' | 'OP';

/** Chains with an xpub/HD-derivation concept (address and private-key derivation). */
export type HdChain =
  | 'ADA'
  | 'ARB'
  | 'AVAX'
  | 'BASE'
  | 'BCH'
  | 'BNB'
  | 'BTC'
  | 'CELO'
  | 'DOGE'
  | 'EGLD'
  | 'ETH'
  | 'FTM'
  | 'LTC'
  | 'MATIC'
  | 'OP'
  | 'TRON'
  | 'VET';

/** Chains with recommended-fee-tier coverage (`fee.get`). */
export type FeeChain = 'BTC' | 'DOGE' | 'ETH' | 'LTC';

/** Chains with gas-estimation coverage (`fee.gas`). */
export type GasChain = 'AVAX' | 'BASE' | 'BNB' | 'CELO' | 'FTM' | 'MATIC' | 'OP';

/** Chains with UTXO-listing coverage (BTC, LTC, DOGE -- not BCH). */
export type UtxoChain = 'BTC' | 'DOGE' | 'LTC';

/** EVM-style chains. */
export type EvmChain = 'ARB' | 'AVAX' | 'BASE' | 'BNB' | 'CELO' | 'ETH' | 'FTM' | 'MATIC' | 'OP';

/** A webhook registration as returned by `register` (the secret is shown only once). */
export interface WebhookRegistration {
  /** The registered URL, normalized. */
  url: string;
  /** 64-character hex secret. Returned once -- store it; it signs every future delivery. */
  secret: string;
}

/** The current webhook registration state, as returned by `getStatus`. */
export interface WebhookStatus {
  /** Whether a webhook URL is currently registered. */
  registered: boolean;
  /** The registered URL, or `null` if none is registered. */
  url: string | null;
  /** ISO 8601 timestamp of the latest (re-)registration, or `null` if none is registered. */
  registered_at: string | null;
}

/** Parameters for registering a webhook URL. */
export interface RegisterWebhookParams {
  /**
   * Public `https://` URL. Must not be a private, loopback or local hostname
   * or IP literal (`400 invalid_webhook_url` otherwise).
   */
  url: string;
}
