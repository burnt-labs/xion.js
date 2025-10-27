import type { WalletDefinition } from "./types";

/**
 * Built-in wallet definitions for common browser wallets
 * These can be used directly or as a starting point for custom configurations
 */
export const BUILT_IN_WALLETS: Record<string, WalletDefinition> = {
  keplr: {
    id: "keplr",
    name: "Keplr",
    windowKey: "keplr",
    signingMethod: "cosmos",
  },

  leap: {
    id: "leap",
    name: "Leap",
    windowKey: "leap",
    signingMethod: "cosmos",
  },

  okx: {
    id: "okx",
    name: "OKX Wallet",
    windowKey: "okxwallet.keplr",
    signingMethod: "cosmos",
  },

  metamask: {
    id: "metamask",
    name: "MetaMask",
    windowKey: "ethereum",
    signingMethod: "ethereum",
  },
};

/**
 * Preset wallet configurations for common use cases
 */
export const WALLET_PRESETS = {
  /** All Cosmos wallets (Keplr, Leap, OKX) */
  cosmos: [BUILT_IN_WALLETS.keplr, BUILT_IN_WALLETS.leap, BUILT_IN_WALLETS.okx],

  /** All Ethereum wallets (MetaMask) */
  ethereum: [BUILT_IN_WALLETS.metamask],

  /** All supported wallets */
  all: Object.values(BUILT_IN_WALLETS),
};
