import { RpcStatusResponse } from "./types";

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
    low: 0.01,
    average: 0.025,
    high: 0.03,
  },
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

export const testnetChainInfo: ChainInfo = {
  ...commonInfo,
  rpc: "https://testnet-rpc.xion-api.com:443",
  rest: "https://testnet-api.xion-api.com:443",
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
  "xion-mainnet-1": "https://dashboard.burnt.com",
  "xion-testnet-1": "https://testnet.dashboard.burnt.com",
};

export async function fetchConfig(rpcUrl: string): Promise<string> {
  try {
    const fetchReq = await fetch(`${rpcUrl}/status`);
    if (!fetchReq.ok) {
      throw new Error("Something went wrong querying RPC");
    }

    const data: RpcStatusResponse = await fetchReq.json();
    const lookup = data.result.node_info.network;
    const returnUrl = DASHBOARD_URLS[lookup as keyof typeof DASHBOARD_URLS];
    if (!returnUrl) throw new Error("Network not found.");
    return returnUrl;
  } catch (error) {
    throw error;
  }
}
