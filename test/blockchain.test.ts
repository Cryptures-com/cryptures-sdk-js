import { describe } from 'vitest';
import {
  blockchainContractsCases,
  blockchainDataCases,
  blockchainFeeCases,
  blockchainLookupsCases,
  blockchainNftCases,
  blockchainOperationsCases,
  blockchainStorageCases,
  blockchainWalletCases,
} from './cases/blockchain.js';
import { runEndpointCases } from './helpers.js';

describe('client.blockchain.data', () => runEndpointCases(blockchainDataCases));
describe('client.blockchain.operations', () => runEndpointCases(blockchainOperationsCases));
describe('client.blockchain.wallet', () => runEndpointCases(blockchainWalletCases));
describe('client.blockchain.contracts', () => runEndpointCases(blockchainContractsCases));
describe('client.blockchain.fee', () => runEndpointCases(blockchainFeeCases));
describe('client.blockchain.lookups', () => runEndpointCases(blockchainLookupsCases));
describe('client.blockchain.nft', () => runEndpointCases(blockchainNftCases));
describe('client.blockchain.storage', () => runEndpointCases(blockchainStorageCases));
