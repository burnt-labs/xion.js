/**
 * Example Keplr connector implementation
 * Demonstrates how to create a custom connector for browser wallets
 * 
 * This is an example implementation - developers can use this as a reference
 * for creating their own connectors for any wallet provider.
 */

import { Buffer } from 'buffer';
import type { Connector, ConnectorConnectionResult, ConnectorMetadata } from '@burnt-labs/abstraxion-core';
import { ConnectorType } from '@burnt-labs/abstraxion-core';
import { AUTHENTICATOR_TYPE } from '@burnt-labs/abstraxion';

/**
 * Connector for Keplr wallet
 * Example implementation showing how to integrate Cosmos wallets
 */
export class KeplrConnector implements Connector {
  public metadata: ConnectorMetadata;
  private wallet: any = null;

  constructor() {
    this.metadata = {
      id: 'keplr',
      name: 'Keplr',
      type: ConnectorType.COSMOS_WALLET,
      icon: '🔑',
    };
  }

  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }
    return !!(window as any).keplr;
  }

  async connect(chainId: string): Promise<ConnectorConnectionResult> {
    if (!chainId) {
      throw new Error('Chain ID is required for Keplr');
    }

    const keplr = (window as any).keplr;
    if (!keplr) {
      throw new Error('Keplr wallet not found');
    }

    await keplr.enable(chainId);
    const offlineSigner = await keplr.getOfflineSignerAuto(chainId);
    const accounts = await offlineSigner.getAccounts();

    if (accounts.length === 0) {
      throw new Error('No accounts found in Keplr');
    }

    const account = accounts[0];
    const pubkey = account.pubkey;
    const pubkeyHex = Buffer.from(pubkey).toString('hex');
    const pubkeyBase64 = Buffer.from(pubkey).toString('base64');
    this.wallet = keplr;

    const signMessage = async (hexMessage: string): Promise<string> => {
      if (!this.wallet) {
        throw new Error('Wallet not connected');
      }
      const plainText = Buffer.from(hexMessage.replace('0x', ''), 'hex').toString('utf8');
      const signature = await this.wallet.signArbitrary(chainId, account.address, plainText);
      
      if (typeof signature === 'string') {
        const sigBytes = Buffer.from(signature, 'base64');
        return sigBytes.toString('hex');
      } else {
        const sigBytes = Buffer.from((signature as any).signature, 'base64');
        return sigBytes.toString('hex');
      }
    };

    return {
      authenticator: pubkeyBase64,
      displayAddress: account.address,
      signMessage,
      metadata: {
        authenticatorType: AUTHENTICATOR_TYPE.Secp256K1,
        walletName: 'keplr',
        pubkey: pubkeyHex,
        connectionType: 'shuttle',
      },
    };
  }

  async disconnect(): Promise<void> {
    this.wallet = null;
  }
}

