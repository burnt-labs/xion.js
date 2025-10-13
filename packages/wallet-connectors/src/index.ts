/**
 * @burnt-labs/wallet-connectors
 *
 * Browser wallet connectors for XION smart accounts
 *
 * Supports:
 * - MetaMask (window.ethereum)
 * - Keplr (window.keplr)
 * - Leap (window.leap)
 * - OKX Wallet (window.okxwallet)
 *
 * This package is BROWSER-ONLY. For platform-agnostic utilities:
 * - Import crypto utilities from @burnt-labs/signers
 * - Use prepareSignatureMessage, buildMessages, etc.
 *
 * Usage:
 * 1. Call prepareSignatureMessage() from @burnt-labs/signers
 * 2. Call connectMetaMaskAndSign() or connectCosmosWalletAndSign() to get signature
 * 3. Either call AA API or use buildEthWalletAccountMessages() from @burnt-labs/signers
 */

// Browser-specific wallet connectors
export * from "./browser";

// Types
export * from "./types";
