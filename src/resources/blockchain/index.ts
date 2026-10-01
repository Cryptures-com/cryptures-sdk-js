import type { HttpClient } from '../../core/http.js';
import { BlockchainContracts } from './contracts.js';
import { BlockchainData } from './data.js';
import { BlockchainFee } from './fee.js';
import { BlockchainLookups } from './lookups.js';
import { BlockchainNft } from './nft.js';
import { BlockchainOperations } from './operations.js';
import { BlockchainStorage } from './storage.js';
import { BlockchainWallet } from './wallet.js';

/** The `blockchain` domain. `client.blockchain`. */
export class BlockchainDomain {
  readonly data: BlockchainData;
  readonly operations: BlockchainOperations;
  readonly wallet: BlockchainWallet;
  readonly contracts: BlockchainContracts;
  readonly fee: BlockchainFee;
  readonly lookups: BlockchainLookups;
  readonly nft: BlockchainNft;
  readonly storage: BlockchainStorage;

  constructor(client: HttpClient) {
    this.data = new BlockchainData(client);
    this.operations = new BlockchainOperations(client);
    this.wallet = new BlockchainWallet(client);
    this.contracts = new BlockchainContracts(client);
    this.fee = new BlockchainFee(client);
    this.lookups = new BlockchainLookups(client);
    this.nft = new BlockchainNft(client);
    this.storage = new BlockchainStorage(client);
  }
}

export {
  BlockchainContracts,
  BlockchainData,
  BlockchainFee,
  BlockchainLookups,
  BlockchainNft,
  BlockchainOperations,
  BlockchainStorage,
  BlockchainWallet,
};
