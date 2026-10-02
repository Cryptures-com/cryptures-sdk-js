import type { APIPromise } from '../../core/api-promise.js';
import { APIResource, path } from '../../core/resource.js';
import type { RequestOptions } from '../../core/types.js';
import type { BroadcastParams, JsonRpcRequest, JsonRpcResponse, TxIdResponse, TxSendBodyFor } from '../../types/blockchain.js';
import type { ChainCode } from '../../types/common.js';

const OPS = '/api/v1/blockchain/operations';

/**
 * Transaction sending, raw broadcasting and the JSON-RPC gateway.
 * `client.blockchain.operations`.
 */
export class BlockchainOperations extends APIResource {
  /**
   * Builds, signs and broadcasts a transaction (`tx.send`). The body shape
   * depends on the chain -- see {@link TxSendBodyFor}.
   *
   * **Not retried automatically.** A `500` after the API's ~5s wait does not
   * mean the transaction was not broadcast; confirm it is absent (e.g. with
   * `getTransactionHistory`) before resending.
   */
  send<C extends ChainCode>(chain: C, body: TxSendBodyFor<C>, options?: RequestOptions): APIPromise<TxIdResponse> {
    return this._client.request({ method: 'POST', path: `${OPS}${path`/transaction/${chain}/send`}`, body, retryable: false }, options);
  }

  /**
   * Broadcasts an already-signed raw transaction (`tx.broadcast`).
   *
   * **Not retried automatically** -- a timed-out broadcast may still
   * confirm; look the hash up with `lookups.getTransaction` before resending.
   */
  broadcast(chain: ChainCode, params: BroadcastParams, options?: RequestOptions): APIPromise<TxIdResponse> {
    return this._client.request(
      { method: 'POST', path: `${OPS}${path`/transaction/${chain}/broadcast`}`, body: params, retryable: false },
      options,
    );
  }

  /**
   * Forwards a JSON-RPC 2.0 request to the chain's node and returns its
   * response as-is (`rpc.gateway`). `jsonrpc` defaults to `"2.0"`. RPC-level
   * errors arrive with HTTP 200 in `response.error`.
   *
   * **Not retried automatically** -- the request may be a broadcast such as
   * `eth_sendRawTransaction`, and a `5xx` after it does not mean it failed.
   */
  rpc<TResult = unknown>(chain: ChainCode, request: JsonRpcRequest, options?: RequestOptions): APIPromise<JsonRpcResponse<TResult>> {
    return this._client.request(
      { method: 'POST', path: `${OPS}${path`/rpc/${chain}`}`, body: { jsonrpc: '2.0', ...request }, retryable: false },
      options,
    );
  }
}
