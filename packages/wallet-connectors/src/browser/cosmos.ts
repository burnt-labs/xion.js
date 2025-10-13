/**
 * Cosmos wallet (Keplr/Leap/OKX) connection and signing utilities
 * Extracted from dashboard utils/wallet-utils.ts
 */

import { Buffer } from "buffer";
import { WalletAccountError, getErrorMessageForUI } from "./errors/WalletAccountError";

/**
 * Gets Secp256k1 public key from Cosmos wallets (Keplr/Leap/OKX)
 *
 * This function connects to the specified wallet and retrieves
 * the public key and bech32 address for the given chain.
 *
 * @param chainId - The chain ID to connect to (e.g., "xion-testnet-1")
 * @param walletName - Which wallet to use: "keplr", "leap", or "okx"
 * @returns Promise resolving to pubkey (hex) and bech32 address
 * @throws WalletAccountError if wallet is not installed or connection fails
 */
export async function getSecp256k1Pubkey(
  chainId: string,
  walletName: "keplr" | "leap" | "okx" = "keplr",
): Promise<{ pubkeyHex: string; address: string }> {
  try {
    let wallet: NonNullable<Window["keplr"]>;

    switch (walletName) {
      case "keplr":
        if (!window.keplr) {
          throw new WalletAccountError(
            "Keplr not installed",
            "Keplr wallet not found. Please install Keplr and try again.",
          );
        }
        wallet = window.keplr;
        break;
      case "leap":
        if (!window.leap) {
          throw new WalletAccountError(
            "Leap not installed",
            "Leap wallet not found. Please install Leap and try again.",
          );
        }
        wallet = window.leap;
        break;
      case "okx":
        if (!window.okxwallet) {
          throw new WalletAccountError(
            "OKX not installed",
            "OKX wallet not found. Please install OKX Wallet and try again.",
          );
        }
        if (window.okxwallet?.keplr) {
          await window.okxwallet.keplr.enable(chainId);
          wallet = window.okxwallet.keplr;
        } else {
          throw new WalletAccountError(
            "OKX Keplr integration not found",
            "OKX Wallet configuration error. Please try again.",
          );
        }
        break;
    }

    const key = await wallet.getKey(chainId);

    if (!key || !key.pubKey) {
      throw new WalletAccountError(
        "No public key found",
        "Could not get wallet public key. Please try again.",
      );
    }

    // Convert Uint8Array to hex string
    const pubkeyHex = Array.from(key.pubKey as Uint8Array)
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("");

    return {
      pubkeyHex,
      address: key.bech32Address,
    };
  } catch (error) {
    if (error instanceof WalletAccountError) {
      throw error;
    }
    throw new WalletAccountError(
      "Failed to get public key",
      getErrorMessageForUI(error),
      error,
    );
  }
}

/**
 * Signs a message with Cosmos wallet (Keplr/Leap/OKX)
 *
 * Uses the wallet's signArbitrary method for signing.
 * The signature is returned as a hex string for compatibility with smart contracts.
 *
 * @param message - The message to sign
 * @param chainId - The chain ID (e.g., "xion-testnet-1")
 * @param userAddress - The bech32 address to sign with
 * @param walletName - Which wallet to use: "keplr", "leap", or "okx"
 * @returns Promise resolving to the signature (hex string)
 * @throws WalletAccountError if signing fails or is rejected
 */
export async function signWithSecp256k1Wallet(
  message: string,
  chainId: string,
  userAddress: string,
  walletName: "keplr" | "leap" | "okx" = "keplr",
): Promise<string> {
  try {
    let wallet: NonNullable<Window["keplr"]>;

    switch (walletName) {
      case "keplr":
        if (!window.keplr) {
          throw new WalletAccountError(
            "Keplr not installed",
            "Keplr wallet not found.",
          );
        }
        wallet = window.keplr;
        break;
      case "leap":
        if (!window.leap) {
          throw new WalletAccountError(
            "Leap not installed",
            "Leap wallet not found.",
          );
        }
        wallet = window.leap;
        break;
      case "okx":
        if (!window.okxwallet?.keplr) {
          throw new WalletAccountError(
            "OKX not installed",
            "OKX wallet not found.",
          );
        }
        wallet = window.okxwallet.keplr;
        break;
    }

    const response = await wallet.signArbitrary(chainId, userAddress, message);

    if (!response || !response.signature) {
      throw new WalletAccountError(
        "No signature returned",
        "Failed to get signature from wallet.",
      );
    }

    // Convert signature to hex (response.signature is a Uint8Array)
    const signatureHex = Array.from(response.signature as Uint8Array)
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("");

    return signatureHex;
  } catch (error) {
    if (error instanceof WalletAccountError) {
      throw error;
    }
    throw new WalletAccountError(
      "Failed to sign with Cosmos wallet",
      getErrorMessageForUI(error),
      error,
    );
  }
}
