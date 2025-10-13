/**
 * Ethereum wallet (MetaMask) connection and signing utilities
 * Extracted from dashboard utils/wallet-utils.ts
 */

import { WalletAccountError, getErrorMessageForUI } from "./errors";

/**
 * Gets Ethereum wallet address from MetaMask
 *
 * This function prompts the user to connect their MetaMask wallet
 * and returns the first account address.
 *
 * @returns Promise resolving to the Ethereum address (0x...)
 * @throws WalletAccountError if MetaMask is not installed or connection fails
 */
export async function getEthWalletAddress(): Promise<string> {
  try {
    if (!window.ethereum) {
      throw new WalletAccountError(
        "MetaMask not installed",
        "MetaMask wallet not found. Please install MetaMask and try again.",
      );
    }

    const accounts = (await window.ethereum.request({
      method: "eth_requestAccounts",
    })) as string[];

    if (!accounts || accounts.length === 0) {
      throw new WalletAccountError(
        "No accounts found",
        "No MetaMask accounts found. Please unlock your wallet and try again.",
      );
    }

    return accounts[0];
  } catch (error) {
    if (error instanceof WalletAccountError) {
      throw error;
    }
    throw new WalletAccountError(
      "Failed to get Ethereum address",
      getErrorMessageForUI(error),
      error,
    );
  }
}

/**
 * Signs a message with Ethereum wallet (MetaMask)
 *
 * Uses EIP-191 personal_sign method to sign arbitrary data.
 * The signature can be verified on-chain or off-chain.
 *
 * @param message - The message to sign (will be prefixed with "\x19Ethereum Signed Message:\n")
 * @param userAddress - The Ethereum address to sign with
 * @returns Promise resolving to the signature (hex string)
 * @throws WalletAccountError if signing fails or is rejected
 */
export async function signWithEthWallet(
  message: string,
  userAddress: string,
): Promise<string> {
  try {
    if (!window.ethereum) {
      throw new WalletAccountError(
        "MetaMask not installed",
        "MetaMask wallet not found.",
      );
    }

    const signature = (await window.ethereum.request({
      method: "personal_sign",
      params: [message, userAddress],
    })) as string;

    if (!signature) {
      throw new WalletAccountError(
        "No signature returned",
        "Failed to get signature from wallet.",
      );
    }

    return signature;
  } catch (error) {
    if (error instanceof WalletAccountError) {
      throw error;
    }
    throw new WalletAccountError(
      "Failed to sign with Ethereum wallet",
      getErrorMessageForUI(error),
      error,
    );
  }
}
