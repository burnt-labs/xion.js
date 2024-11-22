import type { RpcStatusResponse } from "./types";

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

export const xionCoin: Coin = {
  coinDenom: "XION",
  coinMinimalDenom: "uxion",
  coinDecimals: 6,
  gasPriceStep: {
    low: 0.0005,
    average: 0.001,
    high: 0.01,
  },
};

export const xionGasValues = {
  gasPrice: "0.001uxion",
  gasAdjustment: 1.4,
  gasAdjustmentMargin: 5000,
};

const commonInfo: ChainInfo = {
  rpc: "undefined",
  rest: "undefined",
  chainId: "base",
  chainName: "XION Testnet",
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: "xion",
    bech32PrefixValAddr: "xionvaloper",
    bech32PrefixValPub: "xionvaloperpub",
    bech32PrefixAccPub: "xionpub",
    bech32PrefixConsAddr: "xionvalcons",
    bech32PrefixConsPub: "xionvalconspub",
  },
  stakeCurrency: xionCoin,
  currencies: [xionCoin],
  feeCurrencies: [xionCoin],
  features: ["cosmwasm"],
};

export const mainnetChainInfo: ChainInfo = {
  ...commonInfo,
  rpc: "https://rpc.xion-mainnet-1.burnt.com:443",
  rest: "https://api.xion-mainnet-1.burnt.com:443",
  chainId: "xion-mainnet-1",
  chainName: "XION Mainnet",
};

export const testnetChainInfo: ChainInfo = {
  ...commonInfo,
  rpc: "https://rpc.xion-testnet-1.burnt.com:443",
  rest: "https://api.xion-testnet-1.burnt.com:443",
  chainId: "xion-testnet-1",
  chainName: "XION Testnet",
};

export const testChainInfo: ChainInfo = {
  ...commonInfo,
  rpc: "http://localhost:26657",
  rest: "http://localhost:26656",
  chainId: "xion-local-testnet-1",
  chainName: "XION Testnet Local",
};

// If mainnet chain-id/network changes be sure to update here.
const DASHBOARD_URLS = {
  "xion-mainnet-1": "https://settings.mainnet.burnt.com",
  "xion-testnet-1": "https://settings.testnet.burnt.com",
};

const REST_URLS = {
  "xion-mainnet-1": "https://api.xion-mainnet-1.burnt.com:443",
  "xion-testnet-1": "https://api.xion-testnet-1.burnt.com:443",
};

export async function fetchConfig(rpcUrl: string) {
  try {
    const fetchReq = await fetch(`${rpcUrl}/status`);
    if (!fetchReq.ok) {
      throw new Error("Something went wrong querying RPC");
    }

    const data: RpcStatusResponse = await fetchReq.json();
    const lookup = data.result.node_info.network;
    const dashboardUrl = DASHBOARD_URLS[lookup as keyof typeof DASHBOARD_URLS];
    const restUrl = REST_URLS[lookup as keyof typeof REST_URLS];
    if (!dashboardUrl || !restUrl) throw new Error("Network not found.");
    return { dashboardUrl, restUrl };
  } catch (error) {
    throw error;
  }
}
