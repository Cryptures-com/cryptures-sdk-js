import type { APIPromise } from '../../core/api-promise.js';
import { APIResource, path } from '../../core/resource.js';
import type { RequestOptions } from '../../core/types.js';
import type { NftCollectionItem, NftCollectionQuery, NftOwnersQuery } from '../../types/blockchain.js';
import type { PortfolioChain } from '../../types/common.js';

const NFT = '/api/v1/blockchain/data/nft';

/** NFT collection listings and ownership. `client.blockchain.nft`. */
export class BlockchainNft extends APIResource {
  /** The NFTs in a collection (`nft.collection.get`). Returns a bare array. */
  listCollection(
    chain: PortfolioChain,
    collectionAddress: string,
    query?: NftCollectionQuery,
    options?: RequestOptions,
  ): APIPromise<NftCollectionItem[]> {
    return this._client.request(
      { method: 'GET', path: `${NFT}${path`/collection/${chain}/${collectionAddress}`}`, query: { ...query } },
      options,
    );
  }

  /** The current owner address(es) of one token (`nft.owner.get`). Returns a bare array of addresses. */
  getOwners(
    chain: PortfolioChain,
    tokenAddress: string,
    tokenId: string,
    query?: NftOwnersQuery,
    options?: RequestOptions,
  ): APIPromise<string[]> {
    return this._client.request(
      { method: 'GET', path: `${NFT}${path`/owner/${chain}/${tokenAddress}/${tokenId}`}`, query: { ...query } },
      options,
    );
  }
}
