import type { APIPromise } from '../../core/api-promise.js';
import { APIResource, path } from '../../core/resource.js';
import type { RequestOptions } from '../../core/types.js';
import type { EstimateGasParams, FeeTiers, GasEstimate } from '../../types/blockchain.js';
import type { FeeChain, GasChain } from '../../types/common.js';

/** Network fee tiers and gas estimation. `client.blockchain.fee`. */
export class BlockchainFee extends APIResource {
  /** Recommended slow/medium/fast fee tiers (`fee.get`). BTC, ETH, LTC, DOGE only. */
  getRecommended(chain: FeeChain, options?: RequestOptions): APIPromise<FeeTiers> {
    return this._client.request({ method: 'GET', path: path`/api/v1/blockchain/data/fee/${chain}`, retryable: true }, options);
  }

  /** Gas price and limit for one specific transfer on an EVM chain (`fee.gas`). */
  estimateGas(chain: GasChain, params: EstimateGasParams, options?: RequestOptions): APIPromise<GasEstimate> {
    return this._client.request({ method: 'POST', path: path`/api/v1/blockchain/data/fee/gas/${chain}`, body: params, retryable: true }, options);
  }
}
