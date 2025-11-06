/**
 * Cosmos wallet connector
 * Supports Keplr, Leap, and OKX wallets
 */

import { Buffer } from 'buffer';
import type { Connector, ConnectorConnectionResult, ConnectorMetadata } from './types';

export interface CosmosWalletConnectorConfig {
  /** Wallet ID (e.g., 'keplr', 'leap', 'okx') */
  id: string;
  /** Display name */
  name: string;
  /** Window object key (e.g., 'keplr', 'leap', 'okxwallet.keplr') */
  windowKey: string;
}

/**
 * Connector for Cosmos wallets (Keplr, Leap, OKX)
 */
export class CosmosWalletConnector implements Connector {
  public metadata: ConnectorMetadata;
  private config: CosmosWalletConnectorConfig;
  private wallet: any = null;

  constructor(config: CosmosWalletConnectorConfig) {
    this.config = config;
    this.metadata = {
      id: config.id,
      name: config.name,
      type: 'cosmos-wallet',
    };
  }

  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const wallet = this.getWalletFromWindow();
      return !!wallet;
    } catch {
      return false;
    }
  }

  async connect(chainId: string): Promise<ConnectorConnectionResult> {
    if (!chainId) {
      throw new Error('Chain ID is required for Cosmos wallet connections');
    }

    const wallet = this.getWalletFromWindow();
    if (!wallet) {
      throw new Error(`${this.config.name} wallet not found`);
    }

    // Enable wallet for this chain
    await wallet.enable(chainId);

    // Get offline signer
    const offlineSigner = await wallet.getOfflineSignerAuto(chainId);
    const accounts = await offlineSigner.getAccounts();

    if (accounts.length === 0) {
      throw new Error(`No accounts found in ${this.config.name}`);
    }

    const account = accounts[0];
    const pubkey = account.pubkey;
    const pubkeyHex = Buffer.from(pubkey).toString('hex');
    const pubkeyBase64 = Buffer.from(pubkey).toString('base64');

    // Store wallet reference for disconnect
    this.wallet = wallet;

    // Create signArbitrary function
    const signMessage = async (hexMessage: string): Promise<string> => {
      if (!this.wallet) {
        throw new Error('Wallet not connected');
      }

      // Convert hex message back to plain text (AA API sends plain text)
      const plainText = Buffer.from(hexMessage.replace('0x', ''), 'hex').toString('utf8');

      // Use signArbitrary for Cosmos wallets
      const signature = await this.wallet.signArbitrary(chainId, account.address, plainText);
      
      // Convert signature to hex format
      // Cosmos signatures can be base64 or object, normalize to hex
      if (typeof signature === 'string') {
        const sigBytes = Buffer.from(signature, 'base64');
        return sigBytes.toString('hex');
      } else {
        // Handle StdSignature object
        const sigBytes = Buffer.from((signature as any).signature, 'base64');
        return sigBytes.toString('hex');
      }
    };

    // Map wallet ID to connection type
    const connectionTypeMap: Record<string, 'shuttle' | 'okx'> = {
      keplr: 'shuttle',
      leap: 'shuttle',
      okx: 'okx',
    };

    return {
      authenticator: pubkeyBase64,
      displayAddress: account.address,
      signMessage,
      metadata: {
        walletName: this.config.id,
        pubkey: pubkeyHex,
        connectionType: connectionTypeMap[this.config.id] || 'shuttle',
      },
    };
  }

  async disconnect(): Promise<void> {
    this.wallet = null;
    // Cosmos wallets don't have explicit disconnect, just clear reference and pretend disconnect
  }

  /**
   * Get wallet object from window
   */
  private getWalletFromWindow(): any {
    if (typeof window === 'undefined') {
      return null;
    }

    const keys = this.config.windowKey.split('.');
    let obj: any = window;

    for (const key of keys) {
      obj = obj?.[key];
      if (!obj) {
        return null;
      }
    }

    return obj;
  }
}

