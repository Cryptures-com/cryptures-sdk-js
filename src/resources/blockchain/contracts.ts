import type { APIPromise } from '../../core/api-promise.js';
import { APIResource } from '../../core/resource.js';
import type { RequestOptions } from '../../core/types.js';
import type { BurnTokenParams, DeployTokenParams, MintTokenParams, TxIdResponse } from '../../types/blockchain.js';

const TOKEN = '/api/v1/blockchain/operations/contract/token';

/**
 * Fungible-token contract deployment, minting and burning.
 * `client.blockchain.contracts`.
 *
 * All three sign and broadcast a real transaction and are **not retried
 * automatically**: a `500` does not mean nothing was broadcast.
 */
export class BlockchainContracts extends APIResource {
  /** Deploys a new fungible token contract (`contract.token.deploy`). */
  deployToken(params: DeployTokenParams, options?: RequestOptions): APIPromise<TxIdResponse> {
    return this._client.request({ method: 'POST', path: `${TOKEN}/deploy`, body: params, retryable: false }, options);
  }

  /** Mints additional tokens on an existing contract (`contract.token.mint`). */
  mintToken(params: MintTokenParams, options?: RequestOptions): APIPromise<TxIdResponse> {
    return this._client.request({ method: 'POST', path: `${TOKEN}/mint`, body: params, retryable: false }, options);
  }

  /** Burns tokens on an existing contract (`contract.token.burn`). */
  burnToken(params: BurnTokenParams, options?: RequestOptions): APIPromise<TxIdResponse> {
    return this._client.request({ method: 'POST', path: `${TOKEN}/burn`, body: params, retryable: false }, options);
  }
}
