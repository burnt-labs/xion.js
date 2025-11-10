/**
 * Example MetaMask connector implementation
 * Demonstrates how to create a custom connector for Ethereum wallets
 * 
 * This is an example implementation - developers can use this as a reference
 * for creating their own connectors for any wallet provider.
 */

import type { Connector, ConnectorConnectionResult, ConnectorMetadata } from '@burnt-labs/abstraxion';
import { ConnectorType } from '@burnt-labs/abstraxion';
import { AUTHENTICATOR_TYPE } from '@burnt-labs/abstraxion';

/**
 * Connector for MetaMask wallet
 * Example implementation showing how to integrate Ethereum wallets
 */
export class MetaMaskConnector implements Connector {
  public metadata: ConnectorMetadata;
  private ethereumProvider: any = null;
  private ethereumAddress: string | null = null;

  constructor() {
    this.metadata = {
      id: 'metamask',
      name: 'MetaMask',
      type: ConnectorType.ETHEREUM_WALLET,
      icon: '🦊',
    };
  }

  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }
    return !!(window as any).ethereum;
  }

  async connect(chainId?: string): Promise<ConnectorConnectionResult> {
    const ethereum = (window as any).ethereum;

    if (!ethereum) {
      throw new Error('MetaMask wallet not found');
    }

    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in MetaMask');
      }

      const address = accounts[0];
      this.ethereumProvider = ethereum;
      this.ethereumAddress = address;

      const signMessage = async (hexMessage: string): Promise<string> => {
        if (!this.ethereumProvider || !this.ethereumAddress) {
          throw new Error('Wallet not connected');
        }
        const signature = await this.ethereumProvider.request({
          method: 'personal_sign',
          params: [hexMessage, this.ethereumAddress],
        });
        return signature.replace(/^0x/, '');
      };

      return {
        authenticator: address.toLowerCase(),
        displayAddress: address,
        signMessage,
        metadata: {
          authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
          ethereumAddress: address,
          connectionType: 'metamask',
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to connect to MetaMask: ${error.message || error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.ethereumProvider = null;
    this.ethereumAddress = null;
  }
}

