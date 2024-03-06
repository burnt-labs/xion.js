export interface Coin {
  coinDenom: string;
  coinMinimalDenom: string;
  coinDecimals: number;
  gasPriceStep: {
    low: number;
    average: number;
    high: number;
  };
}

interface Bech32Config {
  bech32PrefixAccAddr: string;
  bech32PrefixValAddr: string;
  bech32PrefixValPub: string;
  bech32PrefixAccPub: string;
  bech32PrefixConsAddr: string;
  bech32PrefixConsPub: string;
}

interface Bip44 {
  coinType: number;
}

export interface ChainInfo {
  rpc: string;
  rest: string;
  chainId: string;
  stakeCurrency: Coin;
  chainName: string;
  bip44: Bip44;
  bech32Config: Bech32Config;
  currencies: Coin[];
  feeCurrencies: Coin[];
  features: string[];
}

// Interface for rpc status response
export interface RpcStatusResponse {
  jsonrpc: string;
  id: number;
  result: RpcStatusResult;
}

export interface RpcStatusResult {
  node_info: RpcStatusResultNodeInfo;
  sync_info: RpcStatusResultSyncInfo;
}

export interface RpcStatusResultNodeInfo {
  protocol_version: any;
  id: string;
  network: string;
  version: string;
  channels: string;
  moniker: string;
  other: any;
}

export interface RpcStatusResultSyncInfo {
  latest_block_hash: string;
  latest_app_hash: string;
  latest_block_height: string;
  latest_block_time: string;
  earliest_block_hash: string;
  earliest_app_hash: string;
  earliest_block_height: string;
  earliest_block_time: string;
  catching_up: boolean;
}
