/**
 * Base class for every error thrown by this SDK. Catch this to handle any
 * SDK failure in one place; narrow with `instanceof` on the subclasses below.
 */
export class CrypturesError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/**
 * Thrown for every non-2xx HTTP response from the Cryptures API.
 *
 * Most failures use the API's standard envelope
 * `{ "error": { "code", "message", "requestId" } }`, and those three fields
 * are copied onto this error as-is. A handful of operations document a
 * different error body (for example card-issuer failures forwarded verbatim
 * as `{ status: "failure", message, code }`, or the `exchange.rate` 403
 * `{ statusCode, errorCode, message }`); for those, `code` and `message` are
 * read from the body's own fields where present. The untouched parsed body is
 * always available as {@link CrypturesApiError.body}.
 */
export class CrypturesApiError extends CrypturesError {
  /** HTTP status code of the response. */
  readonly status: number;
  /**
   * Machine-readable error code, e.g. `"forbidden_scope"` or
   * `"insufficient_balance"`. Falls back to `"http_<status>"` when the
   * response body carried no recognizable code.
   */
  readonly code: string;
  /**
   * The request id from `error.requestId`, falling back to the
   * `X-Request-ID` response header. Include it when reporting an issue.
   */
  readonly requestId: string | null;
  /** The parsed response body (JSON when parseable, otherwise raw text). */
  readonly body: unknown;
  /** The response headers. */
  readonly headers: Headers;

  constructor(params: {
    status: number;
    code: string;
    message: string;
    requestId: string | null;
    body: unknown;
    headers: Headers;
  }) {
    super(params.message);
    this.status = params.status;
    this.code = params.code;
    this.requestId = params.requestId;
    this.body = params.body;
    this.headers = params.headers;
  }
}

/** Thrown when the request could not reach the API (DNS, TLS, reset, ...). */
export class CrypturesConnectionError extends CrypturesError {}

/** Thrown when a request exceeded the configured `timeout`. */
export class CrypturesTimeoutError extends CrypturesConnectionError {}

/** Thrown when the caller aborted the request through its own `AbortSignal`. */
export class CrypturesAbortError extends CrypturesError {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Builds a {@link CrypturesApiError} from a non-2xx response's status, headers and parsed body. */
export function apiErrorFromResponse(status: number, statusText: string, headers: Headers, body: unknown): CrypturesApiError {
  let code: string | undefined;
  let message: string | undefined;
  let requestId: string | undefined;

  if (isRecord(body)) {
    const envelope = body['error'];
    if (isRecord(envelope)) {
      // The API's standard `{ error: { code, message, requestId } }` envelope.
      code = stringField(envelope, 'code');
      message = stringField(envelope, 'message');
      requestId = stringField(envelope, 'requestId');
    } else {
      // Documented non-envelope bodies: the card issuer's
      // `{ status: "failure", message, code }` and exchange.rate's
      // `{ statusCode, errorCode, message }`.
      code = stringField(body, 'code') ?? stringField(body, 'errorCode');
      message = stringField(body, 'message') ?? (typeof envelope === 'string' ? envelope : undefined);
    }
  } else if (typeof body === 'string' && body.trim().length > 0) {
    message = body.trim().slice(0, 500);
  }

  return new CrypturesApiError({
    status,
    code: code ?? `http_${status}`,
    message: message ?? (statusText ? `${status} ${statusText}` : `Request failed with status ${status}`),
    requestId: requestId ?? headers.get('x-request-id'),
    body,
    headers,
  });
}
