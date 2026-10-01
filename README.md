# Cryptures JavaScript / TypeScript SDK

Official JS/TS SDK for the [Cryptures](https://cryptures.com) API: blockchain infrastructure, crypto cards, and compliance in one client.

Cryptures is building a connectivity layer between blockchain networks, financial services, compliance providers and businesses. This package wraps its REST API behind one typed client, with:

- **One method per API operation**, covering all 80 operations, grouped the way the API reference groups them (`client.blockchain.*`, `client.card.*`, `client.compliance.*`).
- **TypeScript types for every request and response**, including per-chain response shapes (for example, `getBalance('BTC', ...)` is typed as the UTXO balance shape and `getBalance('CELO', ...)` as the CELO shape).
- **Typed errors** with the API's `code`, `message`, `requestId` and HTTP `status`.
- **Automatic retries** with exponential backoff on network errors and 5xx responses. Calls that move money, broadcast transactions or bill per call are left out of automatic retries.
- **Idempotency keys** for the operations that support them, and **cursor pagination** helpers with async iteration.
- **No runtime dependencies.** It uses the platform `fetch`, and ships as both ESM and CommonJS.

Full API reference: **https://docs.cryptures.com/**

## Installation

> **Coming soon to npm.** `@cryptures.com/sdk` has not been published to the npm registry yet. Until it is, install it from this repository (see below).

Once it is published:

```bash
npm install @cryptures.com/sdk
```

To install from source in the meantime:

```bash
git clone https://github.com/Cryptures-com/cryptures-sdk-js.git
cd cryptures-sdk-js
npm install
npm run build
# then, from your project:
npm install /path/to/cryptures-sdk-js
```

Requires **Node.js 18 or later**, or any runtime with a global `fetch`.

## Authentication

Every request is authenticated with your project's API token, which the SDK sends as the `x-api-key` header. Cryptures provisions a project for you and shows the raw token once, when the project is created. Keep it in a secret store or an environment variable, and never commit it.

```ts
import { Cryptures } from '@cryptures.com/sdk';

const client = new Cryptures({ apiKey: process.env.CRYPTURES_API_KEY! });
```

A token can be scoped to specific domains, categories and providers. A valid token that isn't scoped for an operation gets `403 forbidden_scope`.

The API key grants full access to your project. That includes moving money and reading card numbers, so **use this SDK from your server only.** The constructor throws if it detects a browser. Pass `dangerouslyAllowBrowser: true` only if you understand that this exposes the key.

## Quickstart

```ts
import { Cryptures, CrypturesApiError } from '@cryptures.com/sdk';

const client = new Cryptures({ apiKey: process.env.CRYPTURES_API_KEY! });

const { balance, incoming, outgoing } = await client.blockchain.data.getBalance(
  'BTC',
  '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
);
console.log(`Confirmed balance: ${balance} sat (in ${incoming}, out ${outgoing})`);
```

### Client options

| Option | Default | Description |
| --- | --- | --- |
| `apiKey` | required | Your project API token. |
| `baseUrl` | `https://api.cryptures.com` | API origin. |
| `timeout` | `60000` | Per-attempt timeout in milliseconds. |
| `maxRetries` | `3` | Automatic retries on network errors, timeouts and 5xx responses. |
| `fetch` | global `fetch` | Custom `fetch` implementation. |
| `defaultHeaders` | none | Extra headers sent on every request. |

Every method also accepts a final `options` argument, `{ signal, timeout, maxRetries, headers }`, to override these values for a single call.

## Examples by domain

### Blockchain

```ts
// Generate an HD wallet. The mnemonic is returned in plaintext once, so store it securely.
const { mnemonic, xpub } = await client.blockchain.wallet.generate('ETH');
const { address } = await client.blockchain.wallet.deriveAddress('ETH', xpub, 0);

// Native, token and NFT holdings
const portfolio = await client.blockchain.data.getPortfolio('ETH', address, {
  tokenTypes: ['native', 'fungible'],
});

// Recommended fee tiers, then a signed transfer
const fees = await client.blockchain.fee.getRecommended('ETH');
const { txId } = await client.blockchain.operations.send('ETH', {
  currency: 'ETH',
  amount: '0.001',
  to: '0x5041F19dC1659E33848cc0f77cbF7447de562917',
  fromPrivateKey: process.env.SENDER_PRIVATE_KEY!,
});

// Raw JSON-RPC to the chain's node. RPC-level errors come back in `error` with HTTP 200.
const block = await client.blockchain.operations.rpc<string>('ETH', { id: 1, method: 'eth_blockNumber' });
```

Namespaces: `data`, `operations`, `wallet`, `contracts`, `fee`, `lookups`, `nft`, `storage`.

### Cards (Expense Management)

```ts
// The product catalog can change, so read the accepted product codes instead of hard-coding them.
const { products } = await client.card.cards.listProducts();

const { data: card } = await client.card.cards.create({
  product_code: 'us_493_visa_bin',
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane@example.com',
  initial_load: 20,
  tags: ['Marketing'],
});

await client.card.cards.fund(card.card_id, { amount: 50 });
const { balance_usd } = await client.card.balance.get();
const ledger = await client.card.balance.listTransactions({ page: 1, limit: 50 });
```

Namespaces: `cards`, `balance`, `tags`, `reports`, `webhooks`.

### Compliance

```ts
// Hosted KYC / KYB verification
const { presets } = await client.compliance.presets.list();
const session = await client.compliance.sessions.create({
  preset_id: presets[0]!.id,
  external_user_id: 'user_42',
});
// Redirect your user to session.url, then read the result back later:
const result = await client.compliance.sessions.get(session.session_id);

// Standalone AML screening. The idempotency key makes retries safe.
const check = await client.compliance.aml.check(
  { external_user_id: 'user_42', full_name: 'Jane Doe', nationality: 'ES' },
  { idempotencyKey: 'aml-user_42-2026-09' },
);

// Wallet risk screening
const screening = await client.compliance.walletScreening.create(
  { address: '0x0000000000000000000000000000000000000000', chain: 'ETH' },
  { idempotencyKey: 'ws-0x0000' },
);
```

Namespaces: `sessions`, `presets`, `aml`, `walletScreening`, `monitoring`, `webhooks`.

## Error handling

Every non-2xx response throws a `CrypturesApiError`:

```ts
import {
  CrypturesApiError,
  CrypturesConnectionError,
  CrypturesTimeoutError,
} from '@cryptures.com/sdk';

try {
  await client.card.cards.fund('card_a1b2c3d4', { amount: 100 });
} catch (err) {
  if (err instanceof CrypturesApiError) {
    console.error(err.status);    // 402
    console.error(err.code);      // "insufficient_balance"
    console.error(err.message);   // human-readable explanation
    console.error(err.requestId); // include this when contacting support
    if (err.code === 'insufficient_balance') {
      // top up, then try again
    }
  } else if (err instanceof CrypturesTimeoutError) {
    // the request timed out (CrypturesTimeoutError extends CrypturesConnectionError)
  } else if (err instanceof CrypturesConnectionError) {
    // network failure: the API was not reached, or the connection dropped
  }
  throw err;
}
```

| Class | When |
| --- | --- |
| `CrypturesApiError` | Any non-2xx response. Fields: `status`, `code`, `message`, `requestId`, `body`, `headers`. |
| `CrypturesConnectionError` | The request failed before a response arrived. |
| `CrypturesTimeoutError` | An attempt exceeded `timeout`. Subclass of `CrypturesConnectionError`. |
| `CrypturesAbortError` | Your own `AbortSignal` cancelled the call. |
| `CrypturesError` | Base class of all of the above. |

Most errors use the API's standard envelope, `{ "error": { "code", "message", "requestId" } }`. A few operations return a different error body: card-issuer failures are forwarded as `{ status: "failure", message, code }`, and `getExchangeRate` reports an unpriced pair as a `403` with `{ statusCode, errorCode, message }`. The SDK reads `code` and `message` from those bodies too, falls back to the `X-Request-ID` header for `requestId`, and keeps the untouched body in `err.body`.

## Retries

Network errors, timeouts and `5xx` responses are retried up to `maxRetries` times (default `3`). The delay starts at 250 ms and doubles each attempt, with some jitter. **4xx responses are never retried.**

Some operations are **not retried automatically**, because after a failure you can't tell whether they took effect:

- `blockchain.operations.send` and `broadcast`, and `blockchain.contracts.deployToken`, `mintToken` and `burnToken`. A `500` after the API's roughly 5-second wait does **not** mean nothing was broadcast.
- `card.cards.create`, `fund` and `withdraw`, which move money.
- `compliance.sessions.create`.
- `compliance.aml.check` and `compliance.walletScreening.create` **without** an `idempotencyKey`. Each of those calls is a separate charge.

Before retrying one of these yourself, check its outcome first, for example with `blockchain.lookups.getTransaction`, `blockchain.data.getTransactionHistory`, `card.cards.list` or `card.balance.listTransactions`. To opt a single call into automatic retries, pass `maxRetries` explicitly:

```ts
await client.blockchain.operations.broadcast('BTC', { txData }, { maxRetries: 2 });
```

## Idempotency

`compliance.aml.check` and `compliance.walletScreening.create` accept an `idempotencyKey`, which the SDK sends as the `Idempotency-Key` header (1-128 printable characters). Repeating a call with the same key and the same request returns the original result without screening or charging again. With a key set, the SDK retries these calls automatically and reuses the same key on every attempt. To check whether a response was a replay:

```ts
const { data, response } = await client.compliance.aml
  .check(params, { idempotencyKey: 'aml-user_42' })
  .withResponse();

if (response.idempotentReplay) {
  // replayed result: nothing was screened or charged again
}
```

## Pagination

`compliance.sessions.list` and `compliance.monitoring.list` use cursor pagination. They return `{ data, nextCursor }`:

```ts
const page = await client.compliance.sessions.list({ status: 'In Review', limit: 50 });
if (page.nextCursor) {
  const next = await client.compliance.sessions.list({ status: 'In Review', cursor: page.nextCursor });
}
```

Or iterate over every item, fetching pages on demand:

```ts
for await (const session of client.compliance.sessions.iterate({ status: 'In Review' })) {
  console.log(session.session_id, session.status);
}
```

## Response metadata

Every method returns an `APIPromise`. Await it to get the parsed body, or call `.withResponse()` to also get the HTTP status and headers:

```ts
const { data, response } = await client.blockchain.data.getBalance('ETH', address).withResponse();
response.status;           // 200
response.requestId;        // X-Request-ID
response.relayCache;       // 'HIT' | 'MISS' | 'STALE' | 'BYPASS' | null (X-Relay-Cache)
response.idempotentReplay; // true when Idempotent-Replay: true
```

## Binary responses

`compliance.sessions.getDocument` and `compliance.sessions.downloadReport` return the raw bytes:

```ts
import { writeFile } from 'node:fs/promises';

const report = await client.compliance.sessions.downloadReport(sessionId);
await writeFile('report.pdf', Buffer.from(report.data)); // report.contentType === 'application/pdf'
```

## File uploads

```ts
import { readFile } from 'node:fs/promises';

const { ipfsHash } = await client.blockchain.storage.uploadToIpfs(await readFile('./logo.png'), {
  filename: 'logo.png',
  contentType: 'image/png',
});
```

## Calling an endpoint the SDK doesn't wrap yet

```ts
const result = await client.request('GET', '/api/v1/some/new/endpoint', { query: { limit: 10 } });
```

Authentication, timeouts and error mapping still apply to these calls.

## Contributing

Issues and pull requests are welcome at [github.com/Cryptures-com/cryptures-sdk-js](https://github.com/Cryptures-com/cryptures-sdk-js).

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest
npm run build       # tsup -> dist/ (ESM + CJS + .d.ts)
```

Every endpoint method has a test that checks the exact HTTP method, path, query, headers and body it sends, and how it parses the response. `test/fixtures/endpoints.json` lists the API's operations, and `test/coverage.test.ts` fails if an operation or a public method has no test. If you add an endpoint, add a case to the matching file in `test/cases/`.

For security issues, please contact Cryptures privately instead of opening a public issue.

## License

[MIT](./LICENSE) © Cryptures.com
