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
  rpc: "https://rpc.xion-testnet-2.burnt.com:443",
  rest: "https://api.xion-testnet-2.burnt.com:443",
  chainId: "xion-testnet-2",
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
  "xion-testnet-2": "https://auth.testnet.burnt.com",
};

const REST_URLS = {
  "xion-mainnet-1": "https://api.xion-mainnet-1.burnt.com:443",
  "xion-testnet-1": "https://api.xion-testnet-1.burnt.com:443",
  "xion-testnet-2": "https://api.xion-testnet-2.burnt.com:443",
};

const FEE_GRANTERS: Record<string, string> = {
  "xion-mainnet-1": "xion12q9q752mta5fvwjj2uevqpuku9y60j33j9rll0",
  "xion-testnet-1": "",
  "xion-testnet-2": "xion1xrqz2wpt4rw8rtdvrc4n4yn5h54jm0nn4evn2x",
};

const DAODAO_INDEXER_URLS: Record<string, string> = {
  "xion-mainnet-1": "https://daodaoindexer.burnt.com",
  "xion-testnet-1": "https://daodaoindexer.burnt.com",
  "xion-testnet-2": "https://daodaoindexer.burnt.com",
};

// Synchronous alternatives to fetchConfig() - use these when you already know the chain ID
export function getChainInfo(chainId: string): ChainInfo | undefined {
  if (chainId === mainnetChainInfo.chainId) return mainnetChainInfo;
  if (chainId === testnetChainInfo.chainId) return testnetChainInfo;
  if (chainId === testChainInfo.chainId) return testChainInfo;
  return undefined;
}

export function getFeeGranter(chainId: string): string {
  return FEE_GRANTERS[chainId] || "";
}

export function getDaoDaoIndexerUrl(chainId: string): string {
  return DAODAO_INDEXER_URLS[chainId] || "https://daodaoindexer.burnt.com";
}

export function getRpcUrl(chainId: string): string | undefined {
  const chainInfo = getChainInfo(chainId);
  return chainInfo?.rpc;
}

export function getRestUrl(chainId: string): string | undefined {
  const chainInfo = getChainInfo(chainId);
  return chainInfo?.rest;
}

export async function fetchConfig(rpcUrl: string): Promise<{
  dashboardUrl: string;
  restUrl: string;
  networkId: string;
  feeGranter: string;
}> {
  const fetchReq = await fetch(`${rpcUrl}/status`);
  if (!fetchReq.ok) {
    throw new Error("Something went wrong querying RPC");
  }

  const data = (await fetchReq.json()) as RpcStatusResponse;
  const networkId = data.result.node_info.network;

  const dashboardUrl = DASHBOARD_URLS[networkId as keyof typeof DASHBOARD_URLS];
  const restUrl = REST_URLS[networkId as keyof typeof REST_URLS];
  const feeGranter = FEE_GRANTERS[networkId] || "";

  if (!dashboardUrl || !restUrl) throw new Error("Network not found.");
  return { dashboardUrl, restUrl, networkId, feeGranter };
}
