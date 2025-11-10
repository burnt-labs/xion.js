/**
 * External signer connector
 * Wraps external authentication providers (Turnkey, Privy, Web3Auth, etc.)
 * 
 * Validates and formats messages and signatures for supported authenticator types:
 * - EthWallet: Formats hex messages (adds 0x prefix) and validates signatures (0x prefix, 130 chars)
 * - Secp256K1: Validates Cosmos signatures (hex without 0x prefix)
 * - Passkey, Ed25519: Pass-through (TODO: full support pending)
 */

import type { Connector, ConnectorConnectionResult, ConnectorMetadata, SignerConfig } from './types';
import { ConnectorType } from './types';
import { AUTHENTICATOR_TYPE, type AuthenticatorType, formatEthSignature, formatHexMessage, formatSecp256k1Signature } from '@burnt-labs/signers';

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
      type: ConnectorType.EXTERNAL_SIGNER,
    };
  }

  async isAvailable(): Promise<boolean> {
    if (this.config.isReady) {
      return await this.config.isReady();
    }
    // If no isReady function, assume available (will fail on connect if not)
    return true;
  }

  async connect(_chainId?: string): Promise<ConnectorConnectionResult> {
    try {
      // Get signer config from developer's function
      const signerConfig = await this.config.getSignerConfig();
      this.signerConfig = signerConfig;

      // EthWallet: addresses must be lowercase for consistency with smart account lookup
      // Other types: pass through as-is (Passkey, JWT, Secp256K1 use their native formats)
      const normalizedAuthenticator = signerConfig.authenticatorType === AUTHENTICATOR_TYPE.EthWallet
        ? signerConfig.authenticator.toLowerCase()
        : signerConfig.authenticator;

      // Create signMessage wrapper that validates and formats signatures
      const signMessage = async (message: string): Promise<string> => {
        if (!this.signerConfig) {
          throw new Error('Signer not connected');
        }

        const authenticatorType = this.signerConfig.authenticatorType;

        if (authenticatorType === AUTHENTICATOR_TYPE.EthWallet) {
          // EthWallet: Format message (ensure 0x prefix) and validate signature format
          const formattedMessage = formatHexMessage(message);
          const signature = await this.signerConfig.signMessage(formattedMessage);

          // Validate signature format: should be 130 chars (0x + 64 hex chars = 65 bytes)
          const formattedSignature = formatEthSignature(signature);
          if (formattedSignature.length !== 130) {
            throw new Error(
              `Invalid Ethereum signature format: expected 130 characters (0x + 64 hex), got ${formattedSignature.length}`
            );
          }
          
          return formattedSignature;
        } else if (authenticatorType === AUTHENTICATOR_TYPE.Secp256K1) {
          // Secp256K1: Pass message as-is, format and validate signature (hex without 0x prefix)
          const signature = await this.signerConfig.signMessage(message);
          
          // Format signature (convert base64 to hex if needed, ensure no 0x prefix)
          const formattedSignature = formatSecp256k1Signature(signature);
          
          // Validate signature format: should be 128 hex chars (64 bytes)
          if (formattedSignature.length !== 128) {
            throw new Error(
              `Invalid Secp256K1 signature format: expected 128 hex characters (64 bytes), got ${formattedSignature.length}`
            );
          }
          
          return formattedSignature;
        } else {
          // Passkey, Ed25519: Pass through as-is (TODO: full validation support and creation support.)
        return await this.signerConfig.signMessage(message);
        }
      };

      // Get display address
      // EthWallet: Use the Ethereum address (0x...) for display
      // Other types: Use the normalized identifier (Passkey credential, JWT identifier, Secp256K1 pubkey)
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

