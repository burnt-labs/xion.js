import type { ReactNode } from "react";

/**
 * Redirect authentication (dashboard OAuth flow)
 * This is the default if no authentication config is provided
 */
export interface RedirectAuthentication {
  type: "redirect";
  callbackUrl?: string;
}

/**
 * Browser wallet authentication (Keplr, MetaMask, Leap, etc.)
 * Detects and connects to wallets installed in the browser
 */
export interface BrowserWalletAuthentication {
  type: "browser";
  aaApiUrl?: string;

  /**
   * Auto-connect behavior:
   * - false: Show wallet selection UI
   * - true | 'first-available': Connect to first detected wallet
   */
  autoConnect?: boolean | "first-available";

  /**
   * Which wallets to support
   * Use WALLET_PRESETS for common configurations
   */
  wallets?: WalletDefinition[];

  /**
   * Custom wallet selection UI
   * If not provided, a default UI will be shown
   */
  renderWalletSelection?: (props: WalletSelectionProps) => ReactNode;
}

/**
 * Signer authentication (session signers like Turnkey, Privy, Web3Auth, etc.)
 * Integrates with external authentication providers that handle key management
 */
export interface SignerAuthentication {
  type: "signer";
  aaApiUrl: string;

  /**
   * Function that returns signer configuration
   * Called when user initiates connection
   * Should wait for external auth provider to be ready
   */
  getSignerConfig: () => Promise<SignerConfig>;

  /**
   * Auto-connect behavior:
   * - false (default): Manual login required
   * - true: Auto-connect when signer is ready
   */
  autoConnect?: boolean;
}

/**
 * Configuration for a session signer
 * Provides Ethereum address and signing capability
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

/**
 * Authentication configuration - defines how users authenticate
 * Type-safe union ensures only compatible options can be combined
 */
export type AuthenticationConfig =
  | RedirectAuthentication
  | BrowserWalletAuthentication
  | SignerAuthentication;

/**
 * Wallet definition - describes a browser wallet
 */
export interface WalletDefinition {
  /** Unique identifier (e.g., 'keplr', 'metamask') */
  id: string;

  /** Display name */
  name: string;

  /** Window object key (e.g., 'keplr', 'ethereum', 'okxwallet.keplr') */
  windowKey: string;

  /** Signing method */
  signingMethod: "cosmos" | "ethereum";

  /** Optional icon (emoji, URL, or React element) */
  icon?: string | ReactNode;

  /** Optional custom detection logic */
  detect?: () => Promise<boolean>;
}

/**
 * Props for custom wallet selection UI
 */
export interface WalletSelectionProps {
  /** Available wallets */
  wallets: WalletDefinition[];

  /** Connect to a wallet by ID */
  connect: (walletId: string) => Promise<void>;

  /** Is a connection in progress? */
  isConnecting: boolean;

  /** Connection error, if any */
  error: string | null;
}
