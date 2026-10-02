import type { APIPromise } from '../../core/api-promise.js';
import { APIResource, path } from '../../core/resource.js';
import type { RequestOptions } from '../../core/types.js';
import type {
  BlockResponseFor,
  ListUtxosQuery,
  TokenMetadata,
  TokenMetadataQuery,
  TransactionResponseFor,
  TronLatestBlock,
  Utxo,
  UtxoBatchEntry,
  UtxoBatchParams,
} from '../../types/blockchain.js';
import type { ChainCode, PortfolioChain, UtxoChain } from '../../types/common.js';

const DATA = '/api/v1/blockchain/data';

/** Transaction, block, token and UTXO lookups. `client.blockchain.lookups`. */
export class BlockchainLookups extends APIResource {
  /**
   * A transaction's full detail by hash (`tx.hash`). The response shape
   * depends on the chain -- see {@link TransactionResponseFor}. A 404 is
   * often transient for a just-broadcast transaction.
   */
  getTransaction<C extends ChainCode>(chain: C, hash: string, options?: RequestOptions): APIPromise<TransactionResponseFor<C>> {
    return this._client.request({ method: 'GET', path: `${DATA}${path`/tx/${chain}/${hash}`}`, retryable: true }, options);
  }

  /**
   * A block by explicit hash or height (`block.get`). Does not accept
   * `"latest"` -- use {@link BlockchainLookups.getLatestBlock} for TRON.
   */
  getBlock<C extends ChainCode>(chain: C, hashOrHeight: string | number, options?: RequestOptions): APIPromise<BlockResponseFor<C>> {
    return this._client.request({ method: 'GET', path: `${DATA}${path`/block/${chain}/${hashOrHeight}`}`, retryable: true }, options);
  }

  /** TRON's current block, for local transaction signing (`block.latest`). TRON only. */
  getLatestBlock(chain: 'TRON' = 'TRON', options?: RequestOptions): APIPromise<TronLatestBlock> {
    return this._client.request({ method: 'GET', path: `${DATA}${path`/block/${chain}/latest`}`, retryable: true }, options);
  }

  /**
   * Metadata for a fungible token, NFT collection, single NFT (`tokenId`) or
   * the native currency (`tokenAddress: "native"`) (`tokens.get`).
   */
  getToken(chain: PortfolioChain, tokenAddress: string, query?: TokenMetadataQuery, options?: RequestOptions): APIPromise<TokenMetadata> {
    return this._client.request(
      { method: 'GET', path: `${DATA}${path`/tokens/${chain}/${tokenAddress}`}`, query: { ...query }, retryable: true },
      options,
    );
  }

  /**
   * Just enough unspent outputs of an address to cover `totalValue`
   * (`utxo.list`). BTC, LTC, DOGE only.
   */
  listUtxos(chain: UtxoChain, address: string, query: ListUtxosQuery, options?: RequestOptions): APIPromise<Utxo[]> {
    return this._client.request(
      { method: 'GET', path: `${DATA}${path`/utxo/${chain}/${address}`}`, query: { ...query }, retryable: true },
      options,
    );
  }

  /** Unspent outputs for up to 50 addresses (`utxo.batch`). */
  getUtxoBatch(params: UtxoBatchParams, options?: RequestOptions): APIPromise<UtxoBatchEntry[]> {
    return this._client.request({ method: 'POST', path: `${DATA}/utxo/batch`, body: params, retryable: true }, options);
  }
}
