# Changelog

## 0.1.1 (2026-10-02)

### Changed

- **Retry behavior is now fail-safe and identical across the JavaScript, Python and Go SDKs.** An operation used to be retried after a `5xx` or a network error unless it opted out. Now an operation is retried only if it opts in, and every operation sets its policy explicitly. Five operations were retried in 0.1.0 and no longer are:
  - `blockchain.operations.rpc`: a JSON-RPC call can be a broadcast, such as `eth_sendRawTransaction`, and a `5xx` after it does not mean it failed.
  - `blockchain.storage.uploadToIpfs`: billed per call.
  - `blockchain.wallet.generate`: a retry would return a different new wallet.
  - `card.tags.create`.
  - `card.cards.setPin`, `block`, `unblock` and `terminate`: card state changes forwarded to the card issuer.

  Every read and idempotent write is still retried as before. To opt a single call back in, pass `{ maxRetries: n }`. The README lists every operation that is not retried.

### Security

- `CrypturesApiError.code`, `message` and `requestId` now have CR, LF and other control characters replaced with spaces, and each is capped at 1024 characters. This stops a malicious or buggy upstream from injecting forged log lines. The parsed body is still in `err.body`.
- At most 1 MiB of an error response body is read, matching the Go SDK.

### Internal

- The retry helpers in `core/http.ts` (`RETRY_BASE_DELAY_MS`, `RETRY_MAX_DELAY_MS`, `retryDelay`, `HttpClientConfig`) are no longer exported. They were never part of the package entry point.
- Documented `BalanceUtxo.incomingPending` and `outgoingPending`.
- Dev-only: `esbuild` is pinned to `^0.28.1` through `overrides` to clear GHSA-g7r4-m6w7-qqqr. The published build output is byte-for-byte identical.
