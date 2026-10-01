import { expect, it, vi } from 'vitest';
import { Cryptures, type BinaryResponse, type CrypturesOptions } from '../src/index.js';
import manifest from './fixtures/endpoints.json';

export const TEST_API_KEY = 'test_api_key_123';
export const BASE_URL = 'https://api.cryptures.com';

/** One endpoint of the API reference, as listed in fixtures/endpoints.json. */
export interface ManifestEntry {
  operationId: string;
  method: string;
  path: string;
  tag: string;
}

export const MANIFEST = manifest as ManifestEntry[];

/** A request captured by the fetch mock. */
export interface RecordedRequest {
  url: URL;
  method: string;
  headers: Headers;
  /** The raw `init.body` (string for JSON, FormData for multipart). */
  rawBody: unknown;
  /** The parsed JSON body, or `undefined` when no JSON body was sent. */
  json: unknown;
}

export type MockReply = Response | Error | (() => Response | Promise<Response>);

/** Builds a JSON `Response`. */
export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'x-request-id': 'req_test_1', ...headers },
  });
}

/**
 * Replaces the global `fetch` with a mock that answers with `replies` in
 * order (the last reply repeats) and records every request.
 */
export function stubFetch(...replies: MockReply[]): { requests: RecordedRequest[]; fetch: ReturnType<typeof vi.fn> } {
  const requests: RecordedRequest[] = [];
  let i = 0;
  const fetch = vi.fn(async (input: string, init: RequestInit) => {
    const raw = init.body;
    requests.push({
      url: new URL(input),
      method: init.method ?? 'GET',
      headers: new Headers(init.headers),
      rawBody: raw,
      json: typeof raw === 'string' ? (JSON.parse(raw) as unknown) : undefined,
    });
    const reply = replies[Math.min(i++, replies.length - 1)];
    if (reply === undefined) throw new Error('stubFetch: no reply configured');
    if (reply instanceof Error) throw reply;
    if (typeof reply === 'function') return reply();
    return reply.clone();
  });
  vi.stubGlobal('fetch', fetch);
  return { requests, fetch };
}

export function makeClient(options: Partial<CrypturesOptions> = {}): Cryptures {
  return new Cryptures({ apiKey: TEST_API_KEY, ...options });
}

/** Declarative description of one SDK method call and the HTTP exchange it must produce. */
export interface EndpointCase {
  /** The API operationId this call maps to (must exist in the manifest). */
  operationId: string;
  /** Dotted SDK method path, e.g. `blockchain.data.getBalance`. */
  sdkMethod: string;
  /** Optional label distinguishing several cases of the same method. */
  label?: string;
  call: (client: Cryptures) => PromiseLike<unknown>;
  request: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    /** Exact expected pathname (URL-encoded form). */
    path: string;
    /** Exact expected query parameters (string values). */
    query?: Record<string, string>;
    /** Expected JSON body. Omit to assert that no JSON body was sent. */
    body?: unknown;
    /** Additional headers that must be present with these values. */
    headers?: Record<string, string>;
    /** Custom assertions for bodies that are not JSON (e.g. multipart). */
    assert?: (request: RecordedRequest) => void | Promise<void>;
  };
  /** The mocked response. JSON `body` is serialized; `raw` replaces it entirely. */
  response: { status?: number; body?: unknown; headers?: Record<string, string>; raw?: () => Response };
  /** Expected resolved value. Defaults to `response.body`. */
  expected?: unknown;
  /** Custom assertion on the resolved value (replaces the `expected` check). */
  assertResult?: (result: unknown) => void | Promise<void>;
}

function templateToRegExp(template: string): RegExp {
  const pattern = template
    .split(/\{[^}]+\}/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^/]+');
  return new RegExp(`^${pattern}$`);
}

/** Registers one `it()` per case. */
export function runEndpointCases(cases: EndpointCase[]): void {
  for (const c of cases) {
    const title = `${c.sdkMethod}${c.label ? ` (${c.label})` : ''} -> ${c.request.method} ${c.request.path} [${c.operationId}]`;
    it(title, async () => {
      const entry = MANIFEST.find((e) => e.operationId === c.operationId);
      expect(entry, `operationId ${c.operationId} is not in the API manifest`).toBeDefined();
      // The case itself must agree with the API reference.
      expect(c.request.method).toBe(entry!.method);
      expect(c.request.path).toMatch(templateToRegExp(entry!.path));

      const reply = c.response.raw
        ? c.response.raw
        : () =>
            c.response.status === 204
              ? new Response(null, { status: 204, headers: { 'x-request-id': 'req_test_1' } })
              : jsonResponse(c.response.body, c.response.status ?? 200, c.response.headers);
      const { requests } = stubFetch(reply);

      const result = await c.call(makeClient());

      expect(requests).toHaveLength(1);
      const req = requests[0]!;
      expect(req.method).toBe(c.request.method);
      expect(`${req.url.origin}`).toBe(BASE_URL);
      expect(req.url.pathname).toBe(c.request.path);
      expect(Object.fromEntries(req.url.searchParams)).toEqual(c.request.query ?? {});
      expect(req.headers.get('x-api-key')).toBe(TEST_API_KEY);

      if (c.request.assert) {
        await c.request.assert(req);
      } else if (c.request.body === undefined) {
        expect(req.rawBody).toBeUndefined();
        expect(req.headers.get('content-type')).toBeNull();
      } else {
        expect(req.headers.get('content-type')).toBe('application/json');
        expect(req.json).toEqual(c.request.body);
      }
      for (const [name, value] of Object.entries(c.request.headers ?? {})) {
        expect(req.headers.get(name)).toBe(value);
      }

      if (c.assertResult) {
        await c.assertResult(result);
      } else {
        expect(result).toEqual('expected' in c ? c.expected : c.response.body);
      }
    });
  }
}

/** Asserts a binary response's content type and (text) bytes. */
export function expectBinary(result: unknown, contentType: string, text: string): void {
  const r = result as BinaryResponse;
  expect(r.data).toBeInstanceOf(ArrayBuffer);
  expect(r.contentType).toBe(contentType);
  expect(new TextDecoder().decode(r.data)).toBe(text);
}
