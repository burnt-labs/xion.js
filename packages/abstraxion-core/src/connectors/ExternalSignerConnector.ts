/**
 * External signer connector
 * Wraps external authentication providers (Turnkey, Privy, Web3Auth, etc.)
 * Note: This connector doesn't use Buffer, but importing for consistency
 */

import type { Connector, ConnectorConnectionResult, ConnectorMetadata } from './types';
import { AUTHENTICATOR_TYPE, type AuthenticatorType } from '@burnt-labs/signers';

/**
 * Signer configuration from external provider
 * Matches the SignerConfig interface from @burnt-labs/abstraxion
 */
export interface SignerConfig {
  /**
   * Authenticator type - always known from the signer provider
   * Examples: 'EthWallet' for Ethereum signers, 'Passkey' for WebAuthn, etc.
   */
  authenticatorType: AuthenticatorType;

  /**
   * Authenticator identifier:
   * - EthWallet: Ethereum address (0x...)
   * - Passkey: Base64-encoded credential
   * - JWT: JWT token or identifier (aud.sub format)
   * - Secp256K1: Base64-encoded public key
   */
  authenticator: string;

  /**
   * Function that signs messages
   * Signature format depends on authenticatorType:
   * - EthWallet: hex signature (65 bytes: r + s + v)
   * - Passkey: WebAuthn signature
   * - Secp256K1: Cosmos signature format
   *
   * @param message - Message to sign (format depends on authenticatorType)
   * @returns Signature (format depends on authenticatorType)
   */
  signMessage: (message: string) => Promise<string>;
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

      // Normalize authenticator identifier (lowercase for addresses)
      const normalizedAuthenticator = signerConfig.authenticatorType === AUTHENTICATOR_TYPE.EthWallet
        ? signerConfig.authenticator.toLowerCase()
        : signerConfig.authenticator;

      // Create signMessage wrapper that ensures proper format
      const signMessage = async (message: string): Promise<string> => {
        if (!this.signerConfig) {
          throw new Error('Signer not connected');
        }

        // For EthWallet, ensure hex message has 0x prefix for consistency
        if (this.signerConfig.authenticatorType === AUTHENTICATOR_TYPE.EthWallet) {
          const normalizedMessage = message.startsWith('0x')
            ? message
            : `0x${message}`;

          const signature = await this.signerConfig.signMessage(normalizedMessage);

          // Remove 0x prefix if present (AA API expects signature without prefix)
          return signature.replace(/^0x/, '');
        }

        // For other types, pass message as-is
        return await this.signerConfig.signMessage(message);
      };

      // Get display address (for EthWallet, use the address; for others, use identifier)
      const displayAddress = signerConfig.authenticatorType === AUTHENTICATOR_TYPE.EthWallet
        ? signerConfig.authenticator
        : normalizedAuthenticator;

      return {
        authenticator: normalizedAuthenticator,
        displayAddress,
        signMessage,
        metadata: {
          authenticatorType: signerConfig.authenticatorType,
          ...(signerConfig.authenticatorType === AUTHENTICATOR_TYPE.EthWallet && {
            ethereumAddress: signerConfig.authenticator,
          }),
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

