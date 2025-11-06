/**
 * Built-in connector presets
 * Pre-configured connectors for common wallets and signers
 */

import { CosmosWalletConnector } from './CosmosWalletConnector';
import { EthereumWalletConnector } from './EthereumWalletConnector';
import type { Connector } from './types';

/**
 * Built-in Cosmos wallet connectors
 */
export const BUILT_IN_COSMOS_CONNECTORS = {
  keplr: new CosmosWalletConnector({
    id: 'keplr',
    name: 'Keplr',
    windowKey: 'keplr',
  }),

  leap: new CosmosWalletConnector({
    id: 'leap',
    name: 'Leap',
    windowKey: 'leap',
  }),

  okx: new CosmosWalletConnector({
    id: 'okx',
    name: 'OKX Wallet',
    windowKey: 'okxwallet.keplr',
  }),
};

/**
 * Built-in Ethereum wallet connectors
 */
export const BUILT_IN_ETHEREUM_CONNECTORS = {
  metamask: new EthereumWalletConnector({
    id: 'metamask',
    name: 'MetaMask',
    windowKey: 'ethereum',
  }),
};

/**
 * All built-in connectors
 */
export const BUILT_IN_CONNECTORS: Record<string, Connector> = {
  ...BUILT_IN_COSMOS_CONNECTORS,
  ...BUILT_IN_ETHEREUM_CONNECTORS,
};

/**
 * Connector presets for common use cases
 */
export const CONNECTOR_PRESETS = {
  /** All Cosmos wallets (Keplr, Leap, OKX) */
  cosmos: [
    BUILT_IN_COSMOS_CONNECTORS.keplr,
    BUILT_IN_COSMOS_CONNECTORS.leap,
    BUILT_IN_COSMOS_CONNECTORS.okx,
  ],

  /** All Ethereum wallets (MetaMask) */
  ethereum: [BUILT_IN_ETHEREUM_CONNECTORS.metamask],

  /** All supported wallets */
  all: Object.values(BUILT_IN_CONNECTORS),
};

