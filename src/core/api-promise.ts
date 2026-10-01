import type { ResponseMeta } from './types.js';

/** The raw outcome of one successful HTTP exchange. */
export interface RawResult {
  data: unknown;
  response: ResponseMeta;
}

/**
 * The promise type every SDK method returns. Await it for the parsed
 * response body, or call {@link APIPromise.withResponse} to also get the
 * HTTP status and headers (`X-Request-ID`, `X-Relay-Cache`,
 * `Idempotent-Replay`, ...).
 *
 * ```ts
 * const balance = await client.card.balance.get();
 * const { data, response } = await client.compliance.aml
 *   .check(params, { idempotencyKey: 'order-42' })
 *   .withResponse();
 * if (response.idempotentReplay) console.log('replayed, not charged again');
 * ```
 */
export class APIPromise<T> extends Promise<T> {
  // `then`/`catch`/`finally` on an APIPromise produce plain Promises.
  static override get [Symbol.species](): PromiseConstructor {
    return Promise;
  }

  readonly #raw: Promise<RawResult>;
  readonly #transform: (data: unknown) => T;
  #parsed: Promise<T> | undefined;

  constructor(raw: Promise<RawResult>, transform: (data: unknown) => T = (data) => data as T) {
    // The base promise is never used for its value: every consumer path
    // (`await`, then/catch/finally) is redirected to #parse() below.
    super((resolve) => resolve(undefined as T));
    this.#raw = raw;
    this.#transform = transform;
  }

  #parse(): Promise<T> {
    this.#parsed ??= this.#raw.then(({ data }) => this.#transform(data));
    return this.#parsed;
  }

  /** Resolves to both the parsed body and the response metadata. */
  async withResponse(): Promise<{ data: T; response: ResponseMeta }> {
    const raw = await this.#raw;
    return { data: this.#transform(raw.data), response: raw.response };
  }

  /** @internal Derives a new APIPromise whose value is `fn` applied to this one's. */
  _map<U>(fn: (value: T) => U): APIPromise<U> {
    const transform = this.#transform;
    return new APIPromise<U>(this.#raw, (data) => fn(transform(data)));
  }

  // `reason: any` mirrors the standard Promise signatures so callers can
  // annotate their handlers (e.g. `.catch((e: CrypturesApiError) => ...)`).
  override then<R1 = T, R2 = never>(
    onfulfilled?: ((value: T) => R1 | PromiseLike<R1>) | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onrejected?: ((reason: any) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    return this.#parse().then(onfulfilled, onrejected);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override catch<R = never>(onrejected?: ((reason: any) => R | PromiseLike<R>) | null): Promise<T | R> {
    return this.#parse().catch(onrejected);
  }

  override finally(onfinally?: (() => void) | null): Promise<T> {
    return this.#parse().finally(onfinally);
  }
}
