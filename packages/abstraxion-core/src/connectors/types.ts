/**
 * Connector interface for unified wallet/signer connections
 * Abstracts away differences between Cosmos wallets, Ethereum wallets, and external signers
 */

import type { AuthenticatorType } from '@burnt-labs/signers';

/**
 * Configuration for a session signer
 * Provides authenticator information and signing capability
 */
export interface SignerConfig {
  /**
   * Authenticator type - always known from the signer provider
   * Examples: 'EthWallet' for Ethereum signers, 'Passkey' for WebAuthn, etc.
   * 
   * @see AUTHENTICATOR_TYPE for available types
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
   * - Secp256K1: Base64-encoded signature (standard Cosmos format) or hex string
   *
   * @param message - Message to sign (format depends on authenticatorType)
   * @returns Signature (format depends on authenticatorType)
   */
  signMessage: (message: string) => Promise<string>;
}

/**
 * Connector type enum
 * Defines the different types of connectors supported
 */
export enum ConnectorType {
  /** Cosmos wallet connector (Keplr, Leap, OKX, etc.) */
  COSMOS_WALLET = 'cosmos-wallet',
  /** Ethereum wallet connector (MetaMask, etc.) */
  ETHEREUM_WALLET = 'ethereum-wallet',
  /** External signer connector (Turnkey, Privy, Web3Auth, etc.) */
  EXTERNAL_SIGNER = 'external-signer',
}

/**
 * Metadata about a connector
 */
export interface ConnectorMetadata {
  /** Unique identifier (e.g., 'keplr', 'metamask', 'turnkey') */
  id: string;
  /** Display name */
  name: string;
  /** Connector type */
  type: ConnectorType;
  /** Optional icon or logo */
  icon?: string;
}

/**
 * Result of connecting a connector
 * Provides the authenticator string and signing capability
 */
export interface ConnectorConnectionResult {
  /**
   * Authenticator string used for smart account creation/lookup
   * - For Ethereum wallets/signers: lowercase Ethereum address (0x...)
   * - For Cosmos wallets: base64-encoded pubkey
   */
  authenticator: string;

  /**
   * Display address - authenticator/wallet address (NOT the smart account address)
   * This is the address of the authenticator/wallet used for connection:
   * - Ethereum wallets: 0x... Ethereum address
   * - Cosmos wallets: bech32 wallet address
   * - External signers: authenticator identifier
   * 
   * Note: This is different from the smart account address (granter address) which is
   * discovered/created during account connection. The smart account address is returned
   * separately in ConnectionResult.smartAccountAddress.
   */
  displayAddress?: string;

  /**
   * Signing function for messages
   * @param hexMessage - Message to sign (hex string, with or without 0x prefix)
   * @returns Signature as hex string
   */
  signMessage: (hexMessage: string) => Promise<string>;

  /**
   * Additional metadata specific to the connection
   */
  metadata?: {
    /** Authenticator type (EthWallet, Secp256K1, Passkey, JWT, etc.) */
    authenticatorType?: string;
    /** Wallet name (for Cosmos wallets: 'keplr', 'leap', 'okx') */
    walletName?: string;
    /** Ethereum address (for EthWallet and SignerEth types) */
    ethereumAddress?: string;
    /** Public key (for Cosmos wallets) */
    pubkey?: string;
    /** 
     * @deprecated Use `connector.metadata.type` (ConnectorType enum) and `connector.metadata.id` instead.
     * This field is kept for backward compatibility with legacy dashboard code.
     * Connection type for grant creation (legacy naming: 'shuttle' = Cosmos wallets, 'okx' = OKX wallet, 'metamask' = MetaMask, 'signer' = external signers)
     */
    connectionType?: 'metamask' | 'shuttle' | 'okx' | 'signer';
    /** 
     * Authenticator index in the smart account (set during account discovery/creation)
     * Indicates which authenticator in the smart account is being used
     */
    authenticatorIndex?: number;
    /** 
     * Code ID of the smart account contract (set during account creation)
     * Only present for newly created accounts
     */
    codeId?: number;
  };
}

/**
 * Base connector interface
 */
export interface Connector {
  /** Connector metadata */
  metadata: ConnectorMetadata;

  /**
   * Check if this connector is available
   * @returns Promise resolving to true if available, false otherwise
   */
  isAvailable(): Promise<boolean>;

  /**
   * Connect to the wallet/signer
   * @param chainId - Optional chain ID (required for Cosmos wallets, not used by external signers)
   * @returns Promise resolving to connection result
   */
  connect(chainId?: string): Promise<ConnectorConnectionResult>;

  /**
   * Disconnect from the wallet/signer
   * @returns Promise resolving when disconnected
   */
  disconnect(): Promise<void>;
}

/**
 * Configuration for a connector
 */
export interface ConnectorConfig {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Connector type */
  type: ConnectorType;
  /** Additional configuration based on type */
  config?: Record<string, any>;
}

