import { APIPromise, type RawResult } from './api-promise.js';
import {
  CrypturesAbortError,
  CrypturesConnectionError,
  CrypturesError,
  CrypturesTimeoutError,
  apiErrorFromResponse,
} from './errors.js';
import type { BinaryResponse, QueryValue, RelayCacheStatus, RequestOptions, RequestSpec, ResponseMeta } from './types.js';
import { VERSION } from '../version.js';

export type FetchFn = (input: string, init: RequestInit) => Promise<Response>;

export interface HttpClientConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  fetch?: FetchFn | undefined;
  defaultHeaders?: Record<string, string> | undefined;
}

/** Base delay of the exponential backoff between retries. */
export const RETRY_BASE_DELAY_MS = 250;
/** Upper bound for a single backoff delay. */
export const RETRY_MAX_DELAY_MS = 8_000;

const RELAY_CACHE_VALUES: ReadonlySet<string> = new Set(['HIT', 'MISS', 'STALE', 'BYPASS']);

/** Exponential backoff with up to 25% downward jitter: ~250ms, 500ms, 1s, 2s, ... */
export function retryDelay(attempt: number): number {
  const exponential = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  return Math.round(exponential * (1 - Math.random() * 0.25));
}

function isNode(): boolean {
  return typeof process !== 'undefined' && typeof process.versions?.node === 'string';
}

function buildQueryString(query: Record<string, QueryValue> | undefined): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function responseMeta(res: Response): ResponseMeta {
  const cache = res.headers.get('x-relay-cache')?.toUpperCase() ?? null;
  return {
    status: res.status,
    headers: res.headers,
    requestId: res.headers.get('x-request-id'),
    relayCache: cache && RELAY_CACHE_VALUES.has(cache) ? (cache as RelayCacheStatus) : null,
    idempotentReplay: res.headers.get('idempotent-replay')?.toLowerCase() === 'true',
  };
}

async function readErrorBody(res: Response): Promise<unknown> {
  let text: string;
  try {
    text = await res.text();
  } catch {
    return null;
  }
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new CrypturesAbortError('Request was aborted.', { cause: signal.reason }));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new CrypturesAbortError('Request was aborted.', { cause: signal?.reason }));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** The shared transport: auth, timeouts, retries, error mapping and response parsing. */
export class HttpClient {
  readonly #config: HttpClientConfig;

  constructor(config: HttpClientConfig) {
    this.#config = config;
  }

  get baseUrl(): string {
    return this.#config.baseUrl;
  }

  /** Issues one API call. Every resource method funnels through here. */
  request<T>(spec: RequestSpec, options?: RequestOptions): APIPromise<T> {
    return new APIPromise<T>(this.#execute(spec, options));
  }

  buildUrl(path: string, query?: Record<string, QueryValue>): string {
    return `${this.#config.baseUrl}${path}${buildQueryString(query)}`;
  }

  #buildHeaders(spec: RequestSpec, options: RequestOptions | undefined): Headers {
    const headers = new Headers();
    headers.set('accept', spec.responseType === 'binary' ? '*/*' : 'application/json');
    if (isNode()) headers.set('user-agent', `cryptures-sdk-js/${VERSION}`);
    for (const [k, v] of Object.entries(this.#config.defaultHeaders ?? {})) headers.set(k, v);
    for (const [k, v] of Object.entries(options?.headers ?? {})) headers.set(k, v);
    if (spec.body !== undefined && spec.formData === undefined) headers.set('content-type', 'application/json');
    if (spec.idempotencyKey !== undefined) headers.set('idempotency-key', spec.idempotencyKey);
    // Set last so a stray per-request header can never override the key.
    headers.set('x-api-key', this.#config.apiKey);
    return headers;
  }

  async #execute(spec: RequestSpec, options: RequestOptions | undefined): Promise<RawResult> {
    const url = this.buildUrl(spec.path, spec.query);
    const headers = this.#buildHeaders(spec, options);
    const body: BodyInit | undefined =
      spec.formData !== undefined ? spec.formData : spec.body !== undefined ? JSON.stringify(spec.body) : undefined;
    const retryable = spec.retryable ?? true;
    const maxRetries = Math.max(0, options?.maxRetries ?? (retryable ? this.#config.maxRetries : 0));
    const timeout = options?.timeout ?? this.#config.timeout;
    const userSignal = options?.signal;

    for (let attempt = 0; ; attempt++) {
      if (userSignal?.aborted) throw new CrypturesAbortError('Request was aborted.', { cause: userSignal.reason });

      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeout);
      const forwardAbort = () => controller.abort(userSignal?.reason);
      userSignal?.addEventListener('abort', forwardAbort, { once: true });

      try {
        let res: Response;
        try {
          const fetchFn: FetchFn = this.#config.fetch ?? ((input, init) => globalThis.fetch(input, init));
          res = await fetchFn(url, { method: spec.method, headers, body, signal: controller.signal });
        } catch (cause) {
          if (userSignal?.aborted) throw new CrypturesAbortError('Request was aborted.', { cause });
          const error = timedOut
            ? new CrypturesTimeoutError(`Request timed out after ${timeout}ms.`, { cause })
            : new CrypturesConnectionError(
                `Could not reach the Cryptures API: ${cause instanceof Error ? cause.message : String(cause)}`,
                { cause },
              );
          if (attempt < maxRetries) {
            await sleep(retryDelay(attempt), userSignal);
            continue;
          }
          throw error;
        }

        if (res.ok) {
          try {
            return await this.#readSuccess(res, spec);
          } catch (cause) {
            if (cause instanceof CrypturesError) throw cause;
            if (userSignal?.aborted) throw new CrypturesAbortError('Request was aborted.', { cause });
            if (timedOut) throw new CrypturesTimeoutError(`Request timed out after ${timeout}ms.`, { cause });
            throw new CrypturesConnectionError('The connection failed while reading the response body.', { cause });
          }
        }

        const errorBody = await readErrorBody(res);
        const error = apiErrorFromResponse(res.status, res.statusText, res.headers, errorBody);
        // Only server-side failures are retried -- a 4xx is never retried.
        if (res.status >= 500 && attempt < maxRetries) {
          await sleep(retryDelay(attempt), userSignal);
          continue;
        }
        throw error;
      } finally {
        clearTimeout(timer);
        userSignal?.removeEventListener('abort', forwardAbort);
      }
    }
  }

  async #readSuccess(res: Response, spec: RequestSpec): Promise<RawResult> {
    const response = responseMeta(res);
    if (spec.responseType === 'binary') {
      const data: BinaryResponse = {
        data: await res.arrayBuffer(),
        contentType: res.headers.get('content-type'),
        contentDisposition: res.headers.get('content-disposition'),
      };
      return { data, response };
    }
    const text = res.status === 204 ? '' : await res.text();
    if (!text) return { data: undefined, response };
    try {
      return { data: JSON.parse(text) as unknown, response };
    } catch (cause) {
      throw new CrypturesError(
        `Expected a JSON response but could not parse it (status ${res.status}, request id ${response.requestId ?? 'unknown'}).`,
        { cause },
      );
    }
  }
}
