/**
 * Connector interface for unified wallet/signer connections
 * Abstracts away differences between Cosmos wallets, Ethereum wallets, and external signers
 */

/**
 * Metadata about a connector
 */
export interface ConnectorMetadata {
  /** Unique identifier (e.g., 'keplr', 'metamask', 'turnkey') */
  id: string;
  /** Display name */
  name: string;
  /** Connector type */
  type: 'cosmos-wallet' | 'ethereum-wallet' | 'external-signer';
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
   * Display address (formatted for UI)
   * - Ethereum: 0x... address
   * - Cosmos: bech32 address
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
    /** Connection type for grant creation */
    connectionType?: 'metamask' | 'shuttle' | 'okx' | 'signer';
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
   * @param chainId - Optional chain ID (required for Cosmos wallets)
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
  type: 'cosmos-wallet' | 'ethereum-wallet' | 'external-signer';
  /** Additional configuration based on type */
  config?: Record<string, any>;
}

