/**
 * External signer connector
 * Wraps external authentication providers (Turnkey, Privy, Web3Auth, etc.)
 * Note: This connector doesn't use Buffer, but importing for consistency
 */

import type { Connector, ConnectorConnectionResult, ConnectorMetadata } from './types';

/**
 * Signer configuration from external provider
 */
export interface SignerConfig {
  /**
   * Ethereum address from the signer (0x...)
   * Used as the authenticator for the smart account
   */
  ethereumAddress: string;

  /**
   * Function that signs hex-encoded messages
   * Compatible with personal_sign format
   *
   * @param hexMessage - Message to sign (hex string, with or without 0x prefix)
   * @returns Signature as hex string (65 bytes: r + s + v)
   */
  signMessage: (hexMessage: string) => Promise<string>;
}

export interface ExternalSignerConnectorConfig {
  /** Connector ID (e.g., 'turnkey', 'privy') */
  id: string;
  /** Display name */
  name: string;
  /**
   * Function that returns signer configuration
   * Called when user initiates connection
   * Should wait for external auth provider to be ready
   */
  getSignerConfig: () => Promise<SignerConfig>;
  /**
   * Optional: Check if signer is ready/available
   */
  isReady?: () => Promise<boolean>;
}

/**
 * Connector for external signers (Turnkey, Privy, Web3Auth, etc.)
 */
export class ExternalSignerConnector implements Connector {
  public metadata: ConnectorMetadata;
  private config: ExternalSignerConnectorConfig;
  private signerConfig: SignerConfig | null = null;

  constructor(config: ExternalSignerConnectorConfig) {
    this.config = config;
    this.metadata = {
      id: config.id,
      name: config.name,
      type: 'external-signer',
    };
  }

  async isAvailable(): Promise<boolean> {
    if (this.config.isReady) {
      return await this.config.isReady();
    }
    // If no isReady function, assume available (will fail on connect if not)
    return true;
  }

  async connect(chainId?: string): Promise<ConnectorConnectionResult> {
    try {
      // Get signer config from developer's function
      const signerConfig = await this.config.getSignerConfig();
      this.signerConfig = signerConfig;

      const ethereumAddress = signerConfig.ethereumAddress.toLowerCase();

      // Create signMessage wrapper that ensures proper hex format
      const signMessage = async (hexMessage: string): Promise<string> => {
        if (!this.signerConfig) {
          throw new Error('Signer not connected');
        }

        // Ensure hex message has 0x prefix for consistency
        const normalizedMessage = hexMessage.startsWith('0x')
          ? hexMessage
          : `0x${hexMessage}`;

        // Call the signer's signMessage function
        const signature = await this.signerConfig.signMessage(normalizedMessage);

        // Remove 0x prefix if present (AA API expects signature without prefix)
        return signature.replace(/^0x/, '');
      };

      return {
        authenticator: ethereumAddress,
        displayAddress: signerConfig.ethereumAddress,
        signMessage,
        metadata: {
          ethereumAddress: signerConfig.ethereumAddress,
          connectionType: 'signer',
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to connect to ${this.config.name}: ${error.message || error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.signerConfig = null;
  }
}

