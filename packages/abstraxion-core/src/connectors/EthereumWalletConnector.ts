/**
 * Ethereum wallet connector
 * Supports MetaMask and other EIP-1193 compatible wallets
 */

import type { Connector, ConnectorConnectionResult, ConnectorMetadata } from './types';

export interface EthereumWalletConnectorConfig {
  /** Wallet ID (e.g., 'metamask') */
  id: string;
  /** Display name */
  name: string;
  /** Window object key (default: 'ethereum') */
  windowKey?: string;
}

/**
 * Connector for Ethereum wallets (MetaMask, etc.)
 */
export class EthereumWalletConnector implements Connector {
  public metadata: ConnectorMetadata;
  private config: EthereumWalletConnectorConfig;
  private ethereumProvider: any = null;
  private ethereumAddress: string | null = null;

  constructor(config: EthereumWalletConnectorConfig) {
    this.config = config;
    this.metadata = {
      id: config.id,
      name: config.name,
      type: 'ethereum-wallet',
    };
  }

  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }

    const windowKey = this.config.windowKey || 'ethereum';
    return !!(window as any)[windowKey];
  }

  async connect(chainId?: string): Promise<ConnectorConnectionResult> {
    const windowKey = this.config.windowKey || 'ethereum';
    const ethereum = (window as any)[windowKey];

    if (!ethereum) {
      throw new Error(`${this.config.name} wallet not found`);
    }

    try {
      // Request account access
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in wallet');
      }

      const address = accounts[0];
      this.ethereumProvider = ethereum;
      this.ethereumAddress = address;

      // Create personal_sign function
      const signMessage = async (hexMessage: string): Promise<string> => {
        if (!this.ethereumProvider || !this.ethereumAddress) {
          throw new Error('Wallet not connected');
        }

        // AA API sends plain text, but createEthWalletAccount converts it to hex
        // So hexMessage here is already hex-encoded
        // MetaMask's personal_sign expects hex string
        const signature = await this.ethereumProvider.request({
          method: 'personal_sign',
          params: [hexMessage, this.ethereumAddress],
        });

        // Remove 0x prefix if present (AA API expects signature without prefix)
        return signature.replace(/^0x/, '');
      };

      return {
        authenticator: address.toLowerCase(),
        displayAddress: address,
        signMessage,
        metadata: {
          ethereumAddress: address,
          connectionType: 'metamask',
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to connect to ${this.config.name}: ${error.message || error}`);
    }
  }

  async disconnect(): Promise<void> {
    // Ethereum wallets don't have explicit disconnect, but we can clear state and pretend disconnect
    this.ethereumProvider = null;
    this.ethereumAddress = null;
  }
}

