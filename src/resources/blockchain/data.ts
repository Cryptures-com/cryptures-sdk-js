import type { APIPromise } from '../../core/api-promise.js';
import { APIResource, path } from '../../core/resource.js';
import type { RequestOptions } from '../../core/types.js';
import type {
  AddressSecurityResponse,
  BalanceBatchParams,
  BalanceBatchResponse,
  BalanceHistoryQuery,
  BalanceHistoryResponse,
  BalanceResponseFor,
  CoinInfo,
  CoinMarket,
  CoinSocialStats,
  ExchangeDetail,
  ExchangeList,
  ExchangeRate,
  ExchangeRateBatchEntry,
  ExchangeRateBatchResult,
  ExchangeRateByContract,
  ExchangeRateByContractQuery,
  ExchangeRateQuery,
  FearGreedQuery,
  FearGreedResponse,
  MarketAssetsResponse,
  MarketGlobalStats,
  MarketMoversQuery,
  MarketMoversResponse,
  MarketTickerSummary,
  MarketTickersQuery,
  MarketTickersResponse,
  OhlcvCandle,
  PortfolioQuery,
  PortfolioResponse,
  TokenTransfersQuery,
  TokenTransfersResponse,
  TxHistoryQuery,
  TxHistoryResponseFor,
} from '../../types/blockchain.js';
import type { BalanceChain, BalanceHistoryChain, PortfolioChain, TxHistoryChain } from '../../types/common.js';

const DATA = '/api/v1/blockchain/data';

function csv(value: string | readonly string[]): string {
  return typeof value === 'string' ? value : value.join(',');
}

/**
 * Read-only blockchain data: balances, history, portfolios, rates and market
 * data. `client.blockchain.data`.
 */
export class BlockchainData extends APIResource {
  /**
   * Native-token balance for an address (`balance.check`). The response
   * shape depends on the chain -- see {@link BalanceResponseFor}. BCH has no
   * balance coverage.
   */
  getBalance<C extends BalanceChain>(chain: C, address: string, options?: RequestOptions): APIPromise<BalanceResponseFor<C>> {
    return this._client.request({ method: 'GET', path: `${DATA}${path`/balance/${chain}/${address}`}`, retryable: true }, options);
  }

  /**
   * Native balances for up to 10 addresses on one chain, as of a block or
   * time (`balance.batch`). One of `blockNumber`/`time`/`unix` is required.
   */
  getBalanceBatch(params: BalanceBatchParams, options?: RequestOptions): APIPromise<BalanceBatchResponse> {
    return this._client.request(
      { method: 'POST', path: `${DATA}/balance/batch`, body: { ...params, addresses: csv(params.addresses) }, retryable: true },
      options,
    );
  }

  /** TRC-20 token transfer history for a TRON address (`token.transfers`). */
  getTokenTransfers(
    chain: 'TRON',
    address: string,
    query?: TokenTransfersQuery,
    options?: RequestOptions,
  ): APIPromise<TokenTransfersResponse> {
    return this._client.request(
      { method: 'GET', path: `${DATA}${path`/token-transfers/${chain}/${address}`}`, query: { ...query }, retryable: true },
      options,
    );
  }

  /**
   * Transaction history for an address (`tx.history`). The response shape
   * depends on the chain -- see {@link TxHistoryResponseFor}.
   */
  getTransactionHistory<C extends TxHistoryChain>(
    chain: C,
    address: string,
    query?: TxHistoryQuery,
    options?: RequestOptions,
  ): APIPromise<TxHistoryResponseFor<C>> {
    return this._client.request(
      { method: 'GET', path: `${DATA}${path`/history/${chain}/${address}`}`, query: { ...query }, retryable: true },
      options,
    );
  }

  /** Native, fungible-token and NFT/multitoken balances for an address (`portfolio.get`). */
  getPortfolio(chain: PortfolioChain, address: string, query: PortfolioQuery, options?: RequestOptions): APIPromise<PortfolioResponse> {
    const { tokenTypes, ...rest } = query;
    return this._client.request(
      {
        method: 'GET',
        path: `${DATA}${path`/portfolio/${chain}/${address}`}`,
        query: { tokenTypes: csv(tokenTypes), ...rest },
        retryable: true,
      },
      options,
    );
  }

  /** An address's native balance as of a past point in time (`balance-history.get`). */
  getBalanceHistory(
    chain: BalanceHistoryChain,
    address: string,
    query?: BalanceHistoryQuery,
    options?: RequestOptions,
  ): APIPromise<BalanceHistoryResponse> {
    return this._client.request(
      { method: 'GET', path: `${DATA}${path`/balance-history/${chain}/${address}`}`, query: { ...query }, retryable: true },
      options,
    );
  }

  /** Screens one address against a malicious-address feed (`security.address-check`). */
  checkAddressSecurity(address: string, options?: RequestOptions): APIPromise<AddressSecurityResponse> {
    return this._client.request({ method: 'GET', path: `${DATA}${path`/security/${address}`}`, retryable: true }, options);
  }

  /**
   * Exchange rate for a symbol (`exchange.rate`). `basePair` defaults to USD.
   * A pair with no rate answers 403 with a rate-not-found body -- not a
   * scoping failure.
   */
  getExchangeRate(symbol: string, query?: ExchangeRateQuery, options?: RequestOptions): APIPromise<ExchangeRate> {
    return this._client.request({ method: 'GET', path: `${DATA}${path`/rate/${symbol}`}`, query: { ...query }, retryable: true }, options);
  }

  /** Exchange rate for a token by contract address (`exchange.rate.contract`). `basePair` defaults to EUR. */
  getExchangeRateByContract(query: ExchangeRateByContractQuery, options?: RequestOptions): APIPromise<ExchangeRateByContract> {
    return this._client.request({ method: 'GET', path: `${DATA}/rate/contract`, query: { ...query }, retryable: true }, options);
  }

  /** Exchange rates for several symbols in one call (`exchange.rate.batch`). */
  getExchangeRateBatch(entries: ExchangeRateBatchEntry[], options?: RequestOptions): APIPromise<ExchangeRateBatchResult[]> {
    return this._client.request({ method: 'POST', path: `${DATA}/rate/batch`, body: entries, retryable: true }, options);
  }

  /** The crypto Fear & Greed Index (`sentiment.fear-greed`). */
  getFearGreedIndex(query?: FearGreedQuery, options?: RequestOptions): APIPromise<FearGreedResponse> {
    return this._client.request({ method: 'GET', path: `${DATA}/sentiment/fear-greed`, query: { ...query }, retryable: true }, options);
  }

  /** Aggregate market statistics, wrapped in a one-element array (`market.global`). */
  getMarketGlobal(options?: RequestOptions): APIPromise<MarketGlobalStats[]> {
    return this._client.request({ method: 'GET', path: `${DATA}/market/global`, retryable: true }, options);
  }

  /** Every tracked coin: id, symbol, name, rank (`market.assets`). */
  listMarketAssets(options?: RequestOptions): APIPromise<MarketAssetsResponse> {
    return this._client.request({ method: 'GET', path: `${DATA}/market/assets`, retryable: true }, options);
  }

  /** Paginated coins with price/market data (`market.tickers`). */
  listMarketTickers(query?: MarketTickersQuery, options?: RequestOptions): APIPromise<MarketTickersResponse> {
    return this._client.request({ method: 'GET', path: `${DATA}/market/tickers`, query: { ...query }, retryable: true }, options);
  }

  /**
   * Price/market data for one or more coin ids (`market.tickers.single`).
   * Unknown ids yield an empty array, not a 404.
   */
  getMarketTickers(ids: string | string[], options?: RequestOptions): APIPromise<MarketTickerSummary[]> {
    return this._client.request({ method: 'GET', path: `${DATA}${path`/market/tickers/${csv(ids)}`}`, retryable: true }, options);
  }

  /** Top gaining and losing coins by 24-hour change (`market.movers`). */
  getMarketMovers(query?: MarketMoversQuery, options?: RequestOptions): APIPromise<MarketMoversResponse> {
    return this._client.request({ method: 'GET', path: `${DATA}/market/movers`, query: { ...query }, retryable: true }, options);
  }

  /** Metadata for one coin, wrapped in a one-element array (`market.coin.info`). */
  getCoinInfo(id: string, options?: RequestOptions): APIPromise<CoinInfo[]> {
    return this._client.request({ method: 'GET', path: `${DATA}${path`/market/coin/${id}/info`}`, retryable: true }, options);
  }

  /** ~365 daily OHLCV candles for a coin (`market.coin.ohlcv`). */
  getCoinOhlcv(id: string, options?: RequestOptions): APIPromise<OhlcvCandle[]> {
    return this._client.request({ method: 'GET', path: `${DATA}${path`/market/coin/${id}/ohlcv`}`, retryable: true }, options);
  }

  /** Top exchange markets trading a coin (`market.coin.markets`). */
  getCoinMarkets(id: string, options?: RequestOptions): APIPromise<CoinMarket[]> {
    return this._client.request({ method: 'GET', path: `${DATA}${path`/market/coin/${id}/markets`}`, retryable: true }, options);
  }

  /** Reddit/Twitter stats for a coin (`market.coin.social`). */
  getCoinSocial(id: string, options?: RequestOptions): APIPromise<CoinSocialStats> {
    return this._client.request({ method: 'GET', path: `${DATA}${path`/market/coin/${id}/social`}`, retryable: true }, options);
  }

  /** Every tracked exchange, keyed by exchange id (`market.exchanges`). */
  listExchanges(options?: RequestOptions): APIPromise<ExchangeList> {
    return this._client.request({ method: 'GET', path: `${DATA}/market/exchanges`, retryable: true }, options);
  }

  /** One exchange's metadata and top pairs (`market.exchanges.single`). */
  getExchange(id: string, options?: RequestOptions): APIPromise<ExchangeDetail> {
    return this._client.request({ method: 'GET', path: `${DATA}${path`/market/exchanges/${id}`}`, retryable: true }, options);
  }
}
