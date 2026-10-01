import type { HttpClient } from './http.js';

/** Base class of every API namespace (`client.card.cards`, `client.compliance.sessions`, ...). */
export abstract class APIResource {
  protected readonly _client: HttpClient;

  constructor(client: HttpClient) {
    this._client = client;
  }
}

/**
 * Tagged template that URL-encodes every interpolated path segment:
 * path`/api/v1/card/cards/${cardId}` never lets a value escape its segment.
 * Commas are left literal (they are valid in a path segment and the API
 * accepts comma-separated id lists, e.g. `/market/tickers/90,80`).
 */
export function path(strings: TemplateStringsArray, ...values: Array<string | number>): string {
  let out = strings[0] ?? '';
  values.forEach((value, i) => {
    const segment = String(value);
    if (segment.length === 0) throw new TypeError('Path parameters must be non-empty strings.');
    out += encodeURIComponent(segment).replace(/%2C/gi, ',') + (strings[i + 1] ?? '');
  });
  return out;
}
