import type { APIPromise } from '../../core/api-promise.js';
import { APIResource, path } from '../../core/resource.js';
import type { RequestOptions } from '../../core/types.js';
import type {
  DerivePrivateKeyParams,
  DerivedAddress,
  DerivedPrivateKey,
  GenerateWalletOptions,
  GeneratedWalletFor,
} from '../../types/blockchain.js';
import type { ChainCode, HdChain } from '../../types/common.js';

/** Wallet generation and HD derivation. `client.blockchain.wallet`. */
export class BlockchainWallet extends APIResource {
  /**
   * Generates a new wallet and returns its secret material in plaintext
   * (`wallet.generate`). Store it yourself -- it cannot be retrieved again.
   * The response shape depends on the chain -- see {@link GeneratedWalletFor}.
   */
  generate<C extends ChainCode>(
    chain: C,
    params?: GenerateWalletOptions,
    options?: RequestOptions,
  ): APIPromise<GeneratedWalletFor<C>> {
    return this._client.request(
      { method: 'GET', path: path`/api/v1/blockchain/wallet/${chain}`, query: { mnemonic: params?.mnemonic } },
      options,
    );
  }

  /**
   * Derives the address at `index` from an extended public key
   * (`address.derive`).
   *
   * **EGLD:** this path segment carries your mnemonic instead of an xpub.
   * A URL is not a safe place for a secret -- derive EGLD addresses locally.
   */
  deriveAddress(chain: HdChain, xpub: string, index: number, options?: RequestOptions): APIPromise<DerivedAddress> {
    return this._client.request(
      { method: 'GET', path: path`/api/v1/blockchain/wallet/${chain}/address/${xpub}/${index}` },
      options,
    );
  }

  /**
   * Derives the private key at `index` from a mnemonic (`privatekey.derive`).
   * The response's `key` is a real private key, in plaintext.
   */
  derivePrivateKey(chain: HdChain, params: DerivePrivateKeyParams, options?: RequestOptions): APIPromise<DerivedPrivateKey> {
    return this._client.request({ method: 'POST', path: path`/api/v1/blockchain/key/${chain}/derive`, body: params }, options);
  }
}
