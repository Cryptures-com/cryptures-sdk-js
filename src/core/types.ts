/** Per-request overrides accepted as the last argument of every SDK method. */
export interface RequestOptions {
  /** Abort the request from the outside. */
  signal?: AbortSignal;
  /** Per-attempt timeout in milliseconds. Overrides the client's `timeout`. */
  timeout?: number;
  /**
   * Maximum automatic retries for this call. Overrides the client's
   * `maxRetries`. Passing this explicitly also opts a non-retryable
   * operation (see the README's "Retries" section) into retries.
   */
  maxRetries?: number;
  /** Extra headers to send with this request. */
  headers?: Record<string, string>;
}

/**
 * Request options for the operations that document `Idempotency-Key`
 * support (`compliance.aml.check` and `compliance.walletScreening.create`).
 */
export interface IdempotentRequestOptions extends RequestOptions {
  /**
   * Sent as the `Idempotency-Key` header (1-128 printable characters). A
   * repeated call with the same key and the same request returns the
   * original result without screening or charging again. When set, the SDK
   * also retries these calls automatically on network errors and 5xx.
   */
  idempotencyKey?: string;
}

/** Values of the `X-Relay-Cache` response header. */
export type RelayCacheStatus = 'HIT' | 'MISS' | 'STALE' | 'BYPASS';

/** Response metadata, available through `.withResponse()` on any call. */
export interface ResponseMeta {
  /** HTTP status code, e.g. `200` or `201`. */
  status: number;
  /** All response headers. */
  headers: Headers;
  /** The `X-Request-ID` header, if present. */
  requestId: string | null;
  /**
   * The `X-Relay-Cache` header (`HIT`, `MISS`, `STALE` or `BYPASS`), or
   * `null` when the operation is not cached and omits the header (treat
   * that like `BYPASS`).
   */
  relayCache: RelayCacheStatus | null;
  /**
   * `true` when the response carried `Idempotent-Replay: true`, i.e. it is
   * a replay of an earlier successful call with the same idempotency key.
   */
  idempotentReplay: boolean;
}

/** A binary (non-JSON) response body, e.g. a document image or a PDF report. */
export interface BinaryResponse {
  /** The raw bytes. */
  data: ArrayBuffer;
  /** The response `Content-Type`, e.g. `image/jpeg`, `video/mp4` or `application/pdf`. */
  contentType: string | null;
  /** The response `Content-Disposition`, when sent. */
  contentDisposition: string | null;
}

/** One page of a cursor-paginated list. */
export interface CursorPage<T> {
  /** The items on this page. */
  data: T[];
  /** Pass as `cursor` to fetch the next page; `null` on the last page. */
  nextCursor: string | null;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryValue = string | number | boolean | null | undefined;

/** Internal description of one API call, built by the resource classes. */
export interface RequestSpec {
  method: HttpMethod;
  /** Path with every dynamic segment already URL-encoded. */
  path: string;
  query?: Record<string, QueryValue>;
  /** JSON request body. */
  body?: unknown;
  /** Multipart request body (sent instead of `body`). */
  formData?: FormData;
  /** How to read a 2xx response. Defaults to `json`. */
  responseType?: 'json' | 'binary';
  /**
   * Whether network errors and 5xx responses may be retried automatically.
   * Defaults to `true`; set `false` for operations whose outcome is
   * ambiguous after a failure (broadcasts, money movement, billable checks
   * without an idempotency key).
   */
  retryable?: boolean;
  idempotencyKey?: string;
}
