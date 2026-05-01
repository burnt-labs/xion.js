/**
 * Shared base config read from VITE_* env vars.
 * Each route layers its own `authentication` block on top.
 */
export const baseConfig = {
  chainId: import.meta.env.VITE_CHAIN_ID as string,
  treasury: import.meta.env.VITE_TREASURY_ADDRESS as string | undefined,
  rpcUrl: import.meta.env.VITE_RPC_URL as string | undefined,
  restUrl: import.meta.env.VITE_REST_URL as string | undefined,
  gasPrice: import.meta.env.VITE_GAS_PRICE as string | undefined,
};

export const authAppUrl = import.meta.env.VITE_AUTH_APP_URL as string | undefined;
export const iframeUrl = import.meta.env.VITE_IFRAME_URL as string | undefined;
