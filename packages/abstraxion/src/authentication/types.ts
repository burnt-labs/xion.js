import type { ReactNode } from "react";
import type { AuthenticatorType } from "@burnt-labs/account-management";

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
 * Provides authenticator information and signing capability
 */
export interface SignerConfig {
  /**
   * Authenticator type - always known from the signer provider
   * Examples: 'EthWallet' for Ethereum signers, 'Passkey' for WebAuthn, etc.
   * 
   * You can use string literals directly (e.g., 'EthWallet') or import AUTHENTICATOR_TYPE
   * from @burnt-labs/abstraxion for type-safe constants.
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
