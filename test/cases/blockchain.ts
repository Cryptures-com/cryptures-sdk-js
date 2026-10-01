import { expect } from 'vitest';
import type { EndpointCase } from '../helpers.js';

const D = '/api/v1/blockchain/data';
const BTC_ADDR = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
const EVM_ADDR = '0xae680ed83baf08a8028118bd19859f8a0e744cc6';
const TRON_ADDR = 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf';
const XPUB =
  'xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz';
const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const TX = { txId: '0x4a198d0d4c28a6a092d0e7598691f25f9defd69fe9e284205cd8b826bd6c09a3' };

export const blockchainDataCases: EndpointCase[] = [
  {
    operationId: 'balance.check',
    sdkMethod: 'blockchain.data.getBalance',
    call: (c) => c.blockchain.data.getBalance('BTC', BTC_ADDR),
    request: { method: 'GET', path: `${D}/balance/BTC/${BTC_ADDR}` },
    response: {
      body: { balance: '5000000000', incoming: '5000000000', outgoing: '0', incomingPending: '0', outgoingPending: '0' },
    },
  },
  {
    operationId: 'balance.batch',
    sdkMethod: 'blockchain.data.getBalanceBatch',
    call: (c) => c.blockchain.data.getBalanceBatch({ chain: 'ethereum-mainnet', addresses: ['0xabc', '0xdef'], unix: 1758700000 }),
    request: {
      method: 'POST',
      path: `${D}/balance/batch`,
      body: { chain: 'ethereum-mainnet', addresses: '0xabc,0xdef', unix: 1758700000 },
    },
    response: {
      body: {
        result: [
          { chain: 'ethereum-mainnet', address: '0xabc', balance: '1.5', lastUpdatedBlockNumber: 21000000, type: 'native' },
          { chain: 'ethereum-mainnet', address: '0xdef', balance: '0', lastUpdatedBlockNumber: 21000000, type: 'native' },
        ],
        prevPage: '',
        nextPage: '',
      },
    },
  },
  {
    operationId: 'token.transfers',
    sdkMethod: 'blockchain.data.getTokenTransfers',
    call: (c) =>
      c.blockchain.data.getTokenTransfers('TRON', TRON_ADDR, {
        onlyConfirmed: true,
        onlyTo: false,
        minTimestamp: 1700000000000,
        contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        next: 'cursor_1',
      }),
    request: {
      method: 'GET',
      path: `${D}/token-transfers/TRON/${TRON_ADDR}`,
      query: {
        onlyConfirmed: 'true',
        onlyTo: 'false',
        minTimestamp: '1700000000000',
        contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        next: 'cursor_1',
      },
    },
    response: {
      body: {
        transactions: [
          {
            txID: '8ea0f5ef97a41e9c236fdb6fa4ca9ff2b6428118ac3b2d484f87a326072d987f',
            tokenInfo: { symbol: 'USDT', address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', decimals: 6, name: 'Tether USD' },
            from: 'TVgY3ayqTGUoe7th84ZNL5peVfRNdLFDjf',
            to: TRON_ADDR,
            type: 'Transfer',
            value: '1994194',
          },
        ],
      },
    },
  },
  {
    operationId: 'tx.history',
    sdkMethod: 'blockchain.data.getTransactionHistory',
    call: (c) => c.blockchain.data.getTransactionHistory('BNB', EVM_ADDR, { pageSize: 50, offset: 0 }),
    request: { method: 'GET', path: `${D}/history/BNB/${EVM_ADDR}`, query: { pageSize: '50', offset: '0' } },
    response: {
      body: {
        result: [
          {
            chain: 'bsc-mainnet',
            hash: '0x549447710026cef714da21fb29cbfae1f689bd3246f2fa0a5081149c4aeb3bb3',
            address: EVM_ADDR,
            counterAddress: '0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852',
            blockNumber: 16819465,
            transactionType: 'fungible',
            transactionSubtype: 'incoming',
            amount: '0.990923706372082143',
            timestamp: 1678715303000,
          },
        ],
        prevPage: '',
        nextPage: '',
      },
    },
  },
  {
    operationId: 'portfolio.get',
    sdkMethod: 'blockchain.data.getPortfolio',
    call: (c) =>
      c.blockchain.data.getPortfolio('ETH', EVM_ADDR, { tokenTypes: ['native', 'fungible'], excludeMetadata: false, pageSize: 50 }),
    request: {
      method: 'GET',
      path: `${D}/portfolio/ETH/${EVM_ADDR}`,
      query: { tokenTypes: 'native,fungible', excludeMetadata: 'false', pageSize: '50' },
    },
    response: {
      body: {
        result: [
          {
            chain: 'ethereum-mainnet',
            address: EVM_ADDR,
            balance: '2.881012674896012762',
            denominatedBalance: '2881012674896012762',
            decimals: 18,
            type: 'native',
          },
        ],
        prevPage: '',
        nextPage: '',
      },
    },
  },
  {
    operationId: 'balance-history.get',
    sdkMethod: 'blockchain.data.getBalanceHistory',
    call: (c) => c.blockchain.data.getBalanceHistory('BTC', BTC_ADDR, { time: '2026-01-01T00:00:00Z' }),
    request: { method: 'GET', path: `${D}/balance-history/BTC/${BTC_ADDR}`, query: { time: '2026-01-01T00:00:00Z' } },
    response: {
      body: {
        result: [
          { chain: 'bitcoin-mainnet', address: BTC_ADDR, balance: '0.5', denominatedBalance: '50000000', decimals: 8, type: 'native' },
        ],
        prevPage: '',
        nextPage: '',
      },
    },
  },
  {
    operationId: 'security.address-check',
    sdkMethod: 'blockchain.data.checkAddressSecurity',
    call: (c) => c.blockchain.data.checkAddressSecurity('0x002bf459dc58584d58886169ea0e80f3ca95ffaf'),
    request: { method: 'GET', path: `${D}/security/0x002bf459dc58584d58886169ea0e80f3ca95ffaf` },
    response: {
      body: {
        status: 'invalid',
        address: '0x002bf459dc58584d58886169ea0e80f3ca95ffaf',
        source: 'CryptoScamDB',
        description: 'Trust trading scam site',
      },
    },
  },
  {
    operationId: 'exchange.rate',
    sdkMethod: 'blockchain.data.getExchangeRate',
    call: (c) => c.blockchain.data.getExchangeRate('BTC', { basePair: 'USD' }),
    request: { method: 'GET', path: `${D}/rate/BTC`, query: { basePair: 'USD' } },
    response: { body: { value: '63000.00', basePair: 'USD', id: 'BTC', timestamp: 1759481315000 } },
  },
  {
    operationId: 'exchange.rate.contract',
    sdkMethod: 'blockchain.data.getExchangeRateByContract',
    call: (c) =>
      c.blockchain.data.getExchangeRateByContract({
        chain: 'ethereum-mainnet',
        contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec',
        basePair: 'USD',
      }),
    request: {
      method: 'GET',
      path: `${D}/rate/contract`,
      query: { chain: 'ethereum-mainnet', contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec', basePair: 'USD' },
    },
    response: {
      body: {
        value: '0.85285664',
        basePair: 'USD',
        timestamp: 1759481315000,
        chain: 'ethereum-mainnet',
        address: '0xdac17f958d2ee523a2206206994597c13d831ec',
      },
    },
  },
  {
    operationId: 'exchange.rate.batch',
    sdkMethod: 'blockchain.data.getExchangeRateBatch',
    call: (c) =>
      c.blockchain.data.getExchangeRateBatch([
        { batchId: '1', symbol: 'BTC', basePair: 'USD' },
        { batchId: '2', symbol: 'ETH', basePair: 'USD' },
      ]),
    request: {
      method: 'POST',
      path: `${D}/rate/batch`,
      body: [
        { batchId: '1', symbol: 'BTC', basePair: 'USD' },
        { batchId: '2', symbol: 'ETH', basePair: 'USD' },
      ],
    },
    response: {
      body: [
        { batchId: '2', symbol: 'ETH', value: '1912.50', basePair: 'USD', timestamp: 1759481315000, source: 'aggregate' },
        { batchId: '1', symbol: 'BTC', value: '63000.00', basePair: 'USD', timestamp: 1759481315000, source: 'aggregate' },
      ],
    },
  },
  {
    operationId: 'sentiment.fear-greed',
    sdkMethod: 'blockchain.data.getFearGreedIndex',
    call: (c) => c.blockchain.data.getFearGreedIndex({ limit: 7, date_format: 'world' }),
    request: { method: 'GET', path: `${D}/sentiment/fear-greed`, query: { limit: '7', date_format: 'world' } },
    response: {
      body: {
        name: 'Fear and Greed Index',
        data: [{ value: '63', value_classification: 'Greed', timestamp: '1788307200', time_until_update: '29641' }],
        metadata: { error: null },
      },
    },
  },
  {
    operationId: 'market.global',
    sdkMethod: 'blockchain.data.getMarketGlobal',
    call: (c) => c.blockchain.data.getMarketGlobal(),
    request: { method: 'GET', path: `${D}/market/global` },
    response: {
      body: [{ coins_count: 14993, active_markets: 28840, total_mcap: 2589177854944.6934, btc_d: '59.50', eth_d: '11.30' }],
    },
  },
  {
    operationId: 'market.assets',
    sdkMethod: 'blockchain.data.listMarketAssets',
    call: (c) => c.blockchain.data.listMarketAssets(),
    request: { method: 'GET', path: `${D}/market/assets` },
    response: { body: { data: [{ id: '90', symbol: 'BTC', name: 'Bitcoin', nameid: 'bitcoin', rank: 1 }] } },
  },
  {
    operationId: 'market.tickers',
    sdkMethod: 'blockchain.data.listMarketTickers',
    call: (c) => c.blockchain.data.listMarketTickers({ start: 0, limit: 50 }),
    request: { method: 'GET', path: `${D}/market/tickers`, query: { start: '0', limit: '50' } },
    response: {
      body: {
        data: [{ id: '90', symbol: 'BTC', name: 'Bitcoin', nameid: 'bitcoin', rank: 1, price_usd: '77146.66' }],
        info: { coins_num: 14993, time: 1788363842 },
      },
    },
  },
  {
    operationId: 'market.tickers.single',
    sdkMethod: 'blockchain.data.getMarketTickers',
    call: (c) => c.blockchain.data.getMarketTickers(['90', '80']),
    request: { method: 'GET', path: `${D}/market/tickers/90,80` },
    response: {
      body: [
        { id: '90', symbol: 'BTC', name: 'Bitcoin', price_usd: '64420.92' },
        { id: '80', symbol: 'ETH', name: 'Ethereum', price_usd: '1912.50' },
      ],
    },
  },
  {
    operationId: 'market.movers',
    sdkMethod: 'blockchain.data.getMarketMovers',
    call: (c) => c.blockchain.data.getMarketMovers({ sort: '24h' }),
    request: { method: 'GET', path: `${D}/market/movers`, query: { sort: '24h' } },
    response: {
      body: {
        data: {
          winners: [{ id: '184771', symbol: 'BPX', name: 'Black Phoenix', price_usd: '2.81', percent_change_24h: '22504260.24' }],
          losers: [{ id: '44735', symbol: 'KTON', price_usd: '0.348423', percent_change_24h: '-72.13' }],
        },
      },
    },
  },
  {
    operationId: 'market.coin.info',
    sdkMethod: 'blockchain.data.getCoinInfo',
    call: (c) => c.blockchain.data.getCoinInfo('90'),
    request: { method: 'GET', path: `${D}/market/coin/90/info` },
    response: { body: [{ id: '90', symbol: 'BTC', name: 'Bitcoin', ath: 126020.77458949, startdate: null, platform: null }] },
  },
  {
    operationId: 'market.coin.ohlcv',
    sdkMethod: 'blockchain.data.getCoinOhlcv',
    call: (c) => c.blockchain.data.getCoinOhlcv('90'),
    request: { method: 'GET', path: `${D}/market/coin/90/ohlcv` },
    response: {
      body: [
        [1367136917, 135.3, 135.98, 132.1, 134.21, 0],
        [1367223317, 134.44, 147.49, 134, 144.54, 0],
      ],
    },
  },
  {
    operationId: 'market.coin.markets',
    sdkMethod: 'blockchain.data.getCoinMarkets',
    call: (c) => c.blockchain.data.getCoinMarkets('90'),
    request: { method: 'GET', path: `${D}/market/coin/90/markets` },
    response: {
      body: [{ name: 'Coinone', base: 'BTC', quote: 'KRW', price: 106110000, price_usd: 150301672340.13, volume: 115.02812156, time: 1788363542 }],
    },
  },
  {
    operationId: 'market.coin.social',
    sdkMethod: 'blockchain.data.getCoinSocial',
    call: (c) => c.blockchain.data.getCoinSocial('90'),
    request: { method: 'GET', path: `${D}/market/coin/90/social` },
    response: { body: { reddit: { avg_active_users: null, subscribers: 8124337 }, twitter: { followers_count: null, status_count: null } } },
  },
  {
    operationId: 'market.exchanges',
    sdkMethod: 'blockchain.data.listExchanges',
    call: (c) => c.blockchain.data.listExchanges(),
    request: { method: 'GET', path: `${D}/market/exchanges` },
    response: {
      body: { '5': { id: '5', name: 'Binance', name_id: 'binance', volume_usd: 7216670230.514728, active_pairs: 914, url: 'https://www.binance.com', country: 'Japan' } },
    },
  },
  {
    operationId: 'market.exchanges.single',
    sdkMethod: 'blockchain.data.getExchange',
    call: (c) => c.blockchain.data.getExchange('5'),
    request: { method: 'GET', path: `${D}/market/exchanges/5` },
    response: {
      body: {
        '0': { name: 'Binance', date_live: null, url: 'https://www.binance.com' },
        pairs: [{ base: 'BTC', quote: 'USDT', volume: 1087137239.3136, price: 77328, price_usd: 77328, time: 1788363439 }],
      },
    },
  },
];

export const blockchainOperationsCases: EndpointCase[] = [
  {
    operationId: 'tx.send',
    sdkMethod: 'blockchain.operations.send',
    label: 'EVM body',
    call: (c) =>
      c.blockchain.operations.send('ETH', {
        currency: 'ETH',
        amount: '0.001',
        to: '0x5041F19dC1659E33848cc0f77cbF7447de562917',
        fee: { gasLimit: '21000', gasPrice: '50' },
        nonce: 0,
        fromPrivateKey: 'SENDER_ADDRESS_PRIVATE_KEY',
      }),
    request: {
      method: 'POST',
      path: '/api/v1/blockchain/operations/transaction/ETH/send',
      body: {
        currency: 'ETH',
        amount: '0.001',
        to: '0x5041F19dC1659E33848cc0f77cbF7447de562917',
        fee: { gasLimit: '21000', gasPrice: '50' },
        nonce: 0,
        fromPrivateKey: 'SENDER_ADDRESS_PRIVATE_KEY',
      },
    },
    response: { body: TX },
  },
  {
    operationId: 'tx.send',
    sdkMethod: 'blockchain.operations.send',
    label: 'UTXO body',
    call: (c) =>
      c.blockchain.operations.send('BTC', {
        fromUTXO: [{ txHash: '3eb2c7a8eba726e442bea738a008d9f8ba4576d4946f18040a143193eeff6824', index: 24, privateKey: 'WIF_KEY' }],
        to: [{ address: BTC_ADDR, value: 0.0001 }],
        changeAddress: '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo',
      }),
    request: {
      method: 'POST',
      path: '/api/v1/blockchain/operations/transaction/BTC/send',
      body: {
        fromUTXO: [{ txHash: '3eb2c7a8eba726e442bea738a008d9f8ba4576d4946f18040a143193eeff6824', index: 24, privateKey: 'WIF_KEY' }],
        to: [{ address: BTC_ADDR, value: 0.0001 }],
        changeAddress: '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo',
      },
    },
    response: { body: { txId: 'c83f8818db43d9ba4accfe454aa44fc33123d47a4f89d47b314d6748eb0e9bc9' } },
  },
  {
    operationId: 'tx.broadcast',
    sdkMethod: 'blockchain.operations.broadcast',
    call: (c) => c.blockchain.operations.broadcast('BTC', { txData: '62BD544D1B9031EFC330A3E855CC3A0D51CA5131455C1AB3BCAC6D243F65460D' }),
    request: {
      method: 'POST',
      path: '/api/v1/blockchain/operations/transaction/BTC/broadcast',
      body: { txData: '62BD544D1B9031EFC330A3E855CC3A0D51CA5131455C1AB3BCAC6D243F65460D' },
    },
    response: { body: { txId: 'c83f8818db43d9ba4accfe454aa44fc33123d47a4f89d47b314d6748eb0e9bc9' } },
  },
  {
    operationId: 'rpc.gateway',
    sdkMethod: 'blockchain.operations.rpc',
    call: (c) =>
      c.blockchain.operations.rpc('SOL', {
        id: 1,
        method: 'getSignaturesForAddress',
        params: ['SoLExampleAddress1111111111111111111111111', { limit: 10 }],
      }),
    request: {
      method: 'POST',
      path: '/api/v1/blockchain/operations/rpc/SOL',
      body: {
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: ['SoLExampleAddress1111111111111111111111111', { limit: 10 }],
      },
    },
    response: { body: { jsonrpc: '2.0', id: 1, result: [{ signature: 'sigExample', slot: 123 }] } },
  },
];

export const blockchainWalletCases: EndpointCase[] = [
  {
    operationId: 'wallet.generate',
    sdkMethod: 'blockchain.wallet.generate',
    call: (c) => c.blockchain.wallet.generate('BTC'),
    request: { method: 'GET', path: '/api/v1/blockchain/wallet/BTC' },
    response: { body: { mnemonic: MNEMONIC, xpub: XPUB } },
  },
  {
    operationId: 'wallet.generate',
    sdkMethod: 'blockchain.wallet.generate',
    label: 'recover from mnemonic',
    call: (c) => c.blockchain.wallet.generate('ETH', { mnemonic: MNEMONIC }),
    request: { method: 'GET', path: '/api/v1/blockchain/wallet/ETH', query: { mnemonic: MNEMONIC } },
    response: { body: { mnemonic: MNEMONIC, xpub: XPUB } },
  },
  {
    operationId: 'address.derive',
    sdkMethod: 'blockchain.wallet.deriveAddress',
    call: (c) => c.blockchain.wallet.deriveAddress('BTC', XPUB, 0),
    request: { method: 'GET', path: `/api/v1/blockchain/wallet/BTC/address/${XPUB}/0` },
    response: { body: { address: 'bc1qderivedaddressexample000000000000' } },
  },
  {
    operationId: 'address.derive',
    sdkMethod: 'blockchain.wallet.deriveAddress',
    label: 'EGLD segment is percent-encoded',
    call: (c) => c.blockchain.wallet.deriveAddress('EGLD', 'word one two', 3),
    request: { method: 'GET', path: '/api/v1/blockchain/wallet/EGLD/address/word%20one%20two/3' },
    response: { body: { address: 'erd1example' } },
  },
  {
    operationId: 'privatekey.derive',
    sdkMethod: 'blockchain.wallet.derivePrivateKey',
    call: (c) => c.blockchain.wallet.derivePrivateKey('ETH', { mnemonic: MNEMONIC, index: 0 }),
    request: { method: 'POST', path: '/api/v1/blockchain/key/ETH/derive', body: { mnemonic: MNEMONIC, index: 0 } },
    response: { body: { key: '0xprivatekeytest123' } },
  },
];

export const blockchainContractsCases: EndpointCase[] = [
  {
    operationId: 'contract.token.deploy',
    sdkMethod: 'blockchain.contracts.deployToken',
    call: (c) =>
      c.blockchain.contracts.deployToken({
        chain: 'BSC',
        symbol: 'MTK',
        name: 'My Token',
        supply: '1000000',
        digits: 18,
        address: EVM_ADDR,
        fromPrivateKey: 'PK',
      }),
    request: {
      method: 'POST',
      path: '/api/v1/blockchain/operations/contract/token/deploy',
      body: { chain: 'BSC', symbol: 'MTK', name: 'My Token', supply: '1000000', digits: 18, address: EVM_ADDR, fromPrivateKey: 'PK' },
    },
    response: { body: TX },
  },
  {
    operationId: 'contract.token.mint',
    sdkMethod: 'blockchain.contracts.mintToken',
    call: (c) =>
      c.blockchain.contracts.mintToken({ chain: 'ETH', contractAddress: '0xtoken', amount: '100', to: EVM_ADDR, fromPrivateKey: 'PK' }),
    request: {
      method: 'POST',
      path: '/api/v1/blockchain/operations/contract/token/mint',
      body: { chain: 'ETH', contractAddress: '0xtoken', amount: '100', to: EVM_ADDR, fromPrivateKey: 'PK' },
    },
    response: { body: TX },
  },
  {
    operationId: 'contract.token.burn',
    sdkMethod: 'blockchain.contracts.burnToken',
    call: (c) => c.blockchain.contracts.burnToken({ chain: 'ALGO', contractAddress: '12345', amount: '5', fromPrivateKey: 'PK' }),
    request: {
      method: 'POST',
      path: '/api/v1/blockchain/operations/contract/token/burn',
      body: { chain: 'ALGO', contractAddress: '12345', amount: '5', fromPrivateKey: 'PK' },
    },
    response: { body: TX },
  },
];

export const blockchainFeeCases: EndpointCase[] = [
  {
    operationId: 'fee.get',
    sdkMethod: 'blockchain.fee.getRecommended',
    call: (c) => c.blockchain.fee.getRecommended('BTC'),
    request: { method: 'GET', path: `${D}/fee/BTC` },
    response: { body: { fast: 1.452, medium: 1.193, slow: 1.1, block: 965924, time: '2026-09-07T11:55:47.916Z' } },
  },
  {
    operationId: 'fee.gas',
    sdkMethod: 'blockchain.fee.estimateGas',
    call: (c) =>
      c.blockchain.fee.estimateGas('BNB', {
        from: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
        to: '0x000000000000000000000000000000000000dEaD',
        amount: '0.01',
      }),
    request: {
      method: 'POST',
      path: `${D}/fee/gas/BNB`,
      body: { from: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', to: '0x000000000000000000000000000000000000dEaD', amount: '0.01' },
    },
    response: { body: { gasLimit: '21000', gasPrice: '50000000' } },
  },
];

export const blockchainLookupsCases: EndpointCase[] = [
  {
    operationId: 'tx.hash',
    sdkMethod: 'blockchain.lookups.getTransaction',
    call: (c) => c.blockchain.lookups.getTransaction('ETH', '0xd49f8d6544f2822522886a02f4787a56ea93bbd636bfdf81d6795a10553d7118'),
    request: { method: 'GET', path: `${D}/tx/ETH/0xd49f8d6544f2822522886a02f4787a56ea93bbd636bfdf81d6795a10553d7118` },
    response: {
      body: [
        {
          chain: 'ethereum-mainnet',
          hash: '0xd49f8d6544f2822522886a02f4787a56ea93bbd636bfdf81d6795a10553d7118',
          address: '0x47405b78a7f381842c4f3d6b2d630dc390f3de9f',
          blockNumber: 16410533,
          transactionType: 'native',
          transactionSubtype: 'outgoing',
          amount: '-3.9e-17',
          timestamp: 1673765531000,
        },
      ],
    },
  },
  {
    operationId: 'block.get',
    sdkMethod: 'blockchain.lookups.getBlock',
    call: (c) => c.blockchain.lookups.getBlock('BTC', 937061),
    request: { method: 'GET', path: `${D}/block/BTC/937061` },
    response: {
      body: { hash: '00000000000000000001b29653de48d09ac74976734681c9aa660136a35d348b', height: 937061, merkleRoot: '17589be1f8c5e103e2cbb0' },
    },
  },
  {
    operationId: 'block.latest',
    sdkMethod: 'blockchain.lookups.getLatestBlock',
    call: (c) => c.blockchain.lookups.getLatestBlock(),
    request: { method: 'GET', path: `${D}/block/TRON/latest` },
    response: {
      body: {
        blockID: '00000000052131e47d87e9657a7c0b10e9d014739b63f9a2d24529911cbdbc8d',
        block_header: { raw_data: { timestamp: 1788856416000, number: 86058853, version: 36 } },
        transactions: [],
      },
    },
  },
  {
    operationId: 'tokens.get',
    sdkMethod: 'blockchain.lookups.getToken',
    call: (c) => c.blockchain.lookups.getToken('ETH', '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d', { tokenId: '1' }),
    request: { method: 'GET', path: `${D}/tokens/ETH/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d`, query: { tokenId: '1' } },
    response: { body: { symbol: 'BAYC', name: 'BoredApeYachtClub', tokenType: 'nonfungible', metadataURI: 'ipfs://QmExample/1' } },
  },
  {
    operationId: 'utxo.list',
    sdkMethod: 'blockchain.lookups.listUtxos',
    call: (c) => c.blockchain.lookups.listUtxos('BTC', '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo', { totalValue: 0.001 }),
    request: { method: 'GET', path: `${D}/utxo/BTC/34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo`, query: { totalValue: '0.001' } },
    response: {
      body: [
        {
          chain: 'bitcoin-mainnet',
          address: '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo',
          txHash: '3eb2c7a8eba726e442bea738a008d9f8ba4576d4946f18040a143193eeff6824',
          index: 24,
          value: 0.00012313,
          valueAsString: '0.00012313',
        },
      ],
    },
  },
  {
    operationId: 'utxo.batch',
    sdkMethod: 'blockchain.lookups.getUtxoBatch',
    call: (c) =>
      c.blockchain.lookups.getUtxoBatch({
        addresses: ['34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo', 'bc1qmfp2r68cde646jv5ns7x2qvah8v5qtfw8gznj2'],
        totalValue: 0.001,
        chain: 'bitcoin-mainnet',
      }),
    request: {
      method: 'POST',
      path: `${D}/utxo/batch`,
      body: {
        addresses: ['34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo', 'bc1qmfp2r68cde646jv5ns7x2qvah8v5qtfw8gznj2'],
        totalValue: 0.001,
        chain: 'bitcoin-mainnet',
      },
    },
    response: {
      body: [
        { address: '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo', utxos: [{ txHash: 'abc', index: 24, value: 0.00012313 }], transactionPossible: true },
        { address: 'bc1qmfp2r68cde646jv5ns7x2qvah8v5qtfw8gznj2', utxos: [], transactionPossible: false },
      ],
    },
  },
];

export const blockchainNftCases: EndpointCase[] = [
  {
    operationId: 'nft.collection.get',
    sdkMethod: 'blockchain.nft.listCollection',
    call: (c) =>
      c.blockchain.nft.listCollection('ETH', '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d', { excludeMetadata: true, pageSize: 10, offset: 20 }),
    request: {
      method: 'GET',
      path: `${D}/nft/collection/ETH/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d`,
      query: { excludeMetadata: 'true', pageSize: '10', offset: '20' },
    },
    response: {
      body: [{ chain: 'ethereum-mainnet', tokenId: '1', tokenAddress: '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d', tokenType: 'nonfungible' }],
    },
  },
  {
    operationId: 'nft.owner.get',
    sdkMethod: 'blockchain.nft.getOwners',
    call: (c) => c.blockchain.nft.getOwners('ETH', '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d', '1'),
    request: { method: 'GET', path: `${D}/nft/owner/ETH/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/1` },
    response: { body: ['0x1234567890abcdef1234567890abcdef12345678'] },
  },
];

export const blockchainStorageCases: EndpointCase[] = [
  {
    operationId: 'storage.ipfs.upload',
    sdkMethod: 'blockchain.storage.uploadToIpfs',
    call: (c) => c.blockchain.storage.uploadToIpfs(new TextEncoder().encode('hello ipfs'), { filename: 'hello.txt', contentType: 'text/plain' }),
    request: {
      method: 'POST',
      path: '/api/v1/blockchain/storage/ipfs',
      assert: async (req) => {
        // fetch sets the multipart boundary itself; the SDK must not force JSON.
        expect(req.headers.get('content-type')).toBeNull();
        expect(req.rawBody).toBeInstanceOf(FormData);
        const file = (req.rawBody as FormData).get('file');
        expect(file).toBeInstanceOf(Blob);
        expect((file as File).name).toBe('hello.txt');
        expect((file as Blob).type).toBe('text/plain');
        expect(await (file as Blob).text()).toBe('hello ipfs');
      },
    },
    response: { status: 201, body: { ipfsHash: 'bafkreifps7p33l5cl6cbepea3nrvhs46bratq3qglfe6rdc6kusddspwfa' } },
  },
];

export const blockchainCases: EndpointCase[] = [
  ...blockchainDataCases,
  ...blockchainOperationsCases,
  ...blockchainWalletCases,
  ...blockchainContractsCases,
  ...blockchainFeeCases,
  ...blockchainLookupsCases,
  ...blockchainNftCases,
  ...blockchainStorageCases,
];

