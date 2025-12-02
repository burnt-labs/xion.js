/**
 * External signer connector
 * Wraps external authentication providers (Turnkey, Privy, Web3Auth, etc.)
 * Also functional to support web wallets through a modal connector.
 *
 * - TODO: Passkey, Ed25519 full support/validation
 */

import type {
  Connector,
  ConnectorConnectionResult,
  ConnectorMetadata,
  SignerConfig,
} from "./types";
import { ConnectorType } from "./types";
import {
  AUTHENTICATOR_TYPE,
  type AuthenticatorType,
  formatEthSignature,
  formatSecp256k1Signature,
} from "@burnt-labs/signers";

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
      const normalizedAuthenticator =
        signerConfig.authenticatorType === AUTHENTICATOR_TYPE.EthWallet
          ? signerConfig.authenticator.toLowerCase()
          : signerConfig.authenticator;

      // Create signMessage wrapper that validates and formats signatures
      const signMessage = async (message: string): Promise<string> => {
        if (!this.signerConfig) {
          throw new Error("Signer not connected");
        }

        const authenticatorType = this.signerConfig.authenticatorType;

        if (authenticatorType === AUTHENTICATOR_TYPE.EthWallet) {
          // EthWallet: signMessage expects hex-encoded message (with 0x prefix)
          // The message is already hex-encoded by the caller (createEthWalletAccount converts bech32 to hex)
          const signature = await this.signerConfig.signMessage(message);

          // Format and validate signature: Returns signature with "0x" prefix and validates length (132 chars = 0x + 130 hex)
          return formatEthSignature(signature);
        } else if (authenticatorType === AUTHENTICATOR_TYPE.Secp256K1) {
          // Secp256K1: signMessage expects hex-encoded message (with 0x prefix)
          // The message is already hex-encoded by the caller (createSecp256k1Account converts bech32 to hex)
          const signature = await this.signerConfig.signMessage(message);

          // Format signature (convert base64 to hex if needed, ensure no 0x prefix)
          const formattedSignature = formatSecp256k1Signature(signature);

          // Validate signature format: should be 128 hex chars (64 bytes)
          if (formattedSignature.length !== 128) {
            throw new Error(
              `Invalid Secp256K1 signature format: expected 128 hex characters (64 bytes), got ${formattedSignature.length}`,
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
      const displayAddress =
        signerConfig.authenticatorType === AUTHENTICATOR_TYPE.EthWallet
          ? signerConfig.authenticator
          : normalizedAuthenticator;

      return {
        authenticator: normalizedAuthenticator,
        displayAddress,
        signMessage,
        metadata: {
          authenticatorType: signerConfig.authenticatorType,
          ...(signerConfig.authenticatorType ===
            AUTHENTICATOR_TYPE.EthWallet && {
            ethereumAddress: signerConfig.authenticator,
          }),
          connectionType: "signer",
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to ${this.config.name}: ${message}`);
    }
  }

  async disconnect(): Promise<void> {
    this.signerConfig = null;
  }
}
