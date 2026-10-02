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

/** Longest `code`/`message`/`requestId` taken from a response body; the full body stays in `body`. */
const MAX_ERROR_FIELD_CHARS = 1024;
const TRUNCATED_SUFFIX = '... [truncated]';
// C0/C1 control characters (CR, LF, ...) plus the Unicode line and paragraph separators.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g;

/**
 * Makes a server-supplied string safe to embed in an error message that will
 * likely be logged: control characters become spaces, so a malicious or
 * buggy upstream cannot forge extra log lines, and the result is capped at
 * 1024 characters.
 */
export function sanitizeErrorField(value: string): string {
  let capped = value;
  if (value.length > MAX_ERROR_FIELD_CHARS) {
    const chars = Array.from(value);
    if (chars.length > MAX_ERROR_FIELD_CHARS) capped = chars.slice(0, MAX_ERROR_FIELD_CHARS).join('') + TRUNCATED_SUFFIX;
  }
  return capped.replace(CONTROL_CHARS, ' ');
}

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

  const headerRequestId = headers.get('x-request-id');
  return new CrypturesApiError({
    status,
    code: sanitizeErrorField(code ?? `http_${status}`),
    message: sanitizeErrorField(
      message ?? (statusText ? `${status} ${statusText}` : `Request failed with status ${status}`),
    ),
    requestId: requestId !== undefined ? sanitizeErrorField(requestId) : headerRequestId && sanitizeErrorField(headerRequestId),
    body,
    headers,
  });
}
