import type { APIPromise } from './core/api-promise.js';
import { CrypturesError } from './core/errors.js';
import { HttpClient, type FetchFn } from './core/http.js';
import type { HttpMethod, QueryValue, RequestOptions } from './core/types.js';
import { BlockchainDomain } from './resources/blockchain/index.js';
import { CardDomain } from './resources/card/index.js';
import { ComplianceDomain } from './resources/compliance/index.js';

export const DEFAULT_BASE_URL = 'https://api.cryptures.com';
export const DEFAULT_TIMEOUT_MS = 60_000;
export const DEFAULT_MAX_RETRIES = 3;

export interface CrypturesOptions {
  /** Your project's API token, sent as the `x-api-key` header on every request. */
  apiKey: string;
  /** API origin. Defaults to `https://api.cryptures.com`. */
  baseUrl?: string;
  /** Per-attempt request timeout in milliseconds. Defaults to 60000. */
  timeout?: number;
  /**
   * Automatic retries (exponential backoff from 250ms) on network errors,
   * timeouts and 5xx responses. Never applied to 4xx. Defaults to 3.
   */
  maxRetries?: number;
  /** Custom `fetch` implementation. Defaults to the global `fetch` (Node 18+). */
  fetch?: FetchFn;
  /** Headers added to every request. */
  defaultHeaders?: Record<string, string>;
  /**
   * The API key grants full access to your project, including moving money
   * and reading card numbers, so the client refuses to run in a browser.
   * Set this only if you understand the risk of exposing the key.
   */
  dangerouslyAllowBrowser?: boolean;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined' && typeof navigator !== 'undefined';
}

/**
 * The Cryptures API client.
 *
 * ```ts
 * import { Cryptures } from '@cryptures/sdk';
 *
 * const client = new Cryptures({ apiKey: process.env.CRYPTURES_API_KEY! });
 * const balance = await client.blockchain.data.getBalance('ETH', '0x...');
 * ```
 */
export class Cryptures {
  /** Blockchain data, transactions, wallets, contracts, fees, NFTs and storage. */
  readonly blockchain: BlockchainDomain;
  /** Virtual cards, the shared USD balance, tags, reports and card webhooks. */
  readonly card: CardDomain;
  /** KYC/KYB sessions, AML and wallet screening, monitoring and compliance webhooks. */
  readonly compliance: ComplianceDomain;

  readonly #http: HttpClient;

  constructor(options: CrypturesOptions) {
    if (!options || typeof options.apiKey !== 'string' || options.apiKey.trim() === '') {
      throw new CrypturesError('A non-empty `apiKey` is required to create a Cryptures client.');
    }
    if (isBrowser() && !options.dangerouslyAllowBrowser) {
      throw new CrypturesError(
        'Refusing to run in a browser: your Cryptures API key would be exposed to end users. ' +
          'Call the API from your server, or pass `dangerouslyAllowBrowser: true` if you accept the risk.',
      );
    }
    const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    if (!Number.isFinite(timeout) || timeout <= 0) throw new CrypturesError('`timeout` must be a positive number of milliseconds.');
    if (!Number.isInteger(maxRetries) || maxRetries < 0) throw new CrypturesError('`maxRetries` must be a non-negative integer.');

    this.#http = new HttpClient({
      apiKey: options.apiKey,
      baseUrl: (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ''),
      timeout,
      maxRetries,
      fetch: options.fetch,
      defaultHeaders: options.defaultHeaders,
    });

    this.blockchain = new BlockchainDomain(this.#http);
    this.card = new CardDomain(this.#http);
    this.compliance = new ComplianceDomain(this.#http);
  }

  /** The API origin this client sends requests to. */
  get baseUrl(): string {
    return this.#http.baseUrl;
  }

  /**
   * Low-level escape hatch for calling an endpoint this SDK version does not
   * wrap yet. Auth, timeouts and error mapping still apply; automatic
   * retries apply to GET, PUT and DELETE only (pass `maxRetries` to opt a
   * POST/PATCH in). `path` must start with `/` and is used verbatim
   * (encode dynamic segments yourself).
   */
  request<T = unknown>(
    method: HttpMethod,
    path: string,
    params?: { query?: Record<string, QueryValue>; body?: unknown },
    options?: RequestOptions,
  ): APIPromise<T> {
    if (!path.startsWith('/')) throw new CrypturesError('`path` must start with "/".');
    return this.#http.request<T>(
      { method, path, query: params?.query, body: params?.body, retryable: method !== 'POST' && method !== 'PATCH' },
      options,
    );
  }
}
