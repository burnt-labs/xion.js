/**
 * Browser wallet connection workflows
 *
 * These functions handle:
 * 1. Connect to wallet (MetaMask, Keplr, Leap, OKX)
 * 2. Get credentials (address/pubkey)
 * 3. Sign messages with the wallet
 *
 * IMPORTANT: These workflows use browser-specific wallet connections (window.ethereum, window.keplr).
 * For non-browser environments, use @burnt-labs/signers crypto utilities directly.
 *
 * These workflows return prepared data - the consuming app (dashboard, abstraxion)
 * decides whether to:
 * - Call the AA API to create the account
 * - Build and broadcast transactions directly using crypto utilities from @burnt-labs/signers
 */

import { Buffer } from "buffer";
import { getEthWalletAddress, signWithEthWallet } from "./ethereum";
import { getSecp256k1Pubkey, signWithSecp256k1Wallet } from "./cosmos";
import type { WalletConnectionInfo } from "../types";

/**
 * Connect to MetaMask and prepare signature data
 *
 * This function:
 * - Connects to MetaMask and gets the Ethereum address
 * - Signs a provided message with MetaMask
 *
 * The consuming app should:
 * 1. Call prepareSignatureMessage() from @burnt-labs/signers to get the message to sign
 * 2. Call this function to get the signature
 * 3. Either call AA API or use buildEthWalletAccountMessages() from @burnt-labs/signers
 *
 * @param messageToSign - The message to sign (from prepareSignatureMessage)
 * @returns Ethereum address, signature (hex), and wallet info
 */
export async function connectMetaMaskAndSign(messageToSign: string): Promise<{
  address: string;
  signatureHex: string;
  walletInfo: WalletConnectionInfo;
}> {
  // 1. Get Ethereum address
  const ethAddress = await getEthWalletAddress();

  // 2. Get user signature
  const signatureHex = await signWithEthWallet(messageToSign, ethAddress);

  return {
    address: ethAddress,
    signatureHex,
    walletInfo: {
      type: "EthWallet",
      address: ethAddress,
      identifier: ethAddress,
    },
  };
}

/**
 * Connect to Cosmos wallet (Keplr/Leap/OKX) and prepare signature data
 *
 * This function:
 * - Connects to the specified Cosmos wallet and gets the public key
 * - Signs a provided message with the wallet
 *
 * The consuming app should:
 * 1. Call prepareSignatureMessage() from @burnt-labs/signers to get the message to sign
 * 2. Call this function to get the signature
 * 3. Either call AA API or use buildSecp256k1AccountMessages() from @burnt-labs/signers
 *
 * @param messageToSign - The message to sign (from prepareSignatureMessage)
 * @param chainId - Chain ID to connect to (e.g., "xion-testnet-1")
 * @param walletName - Which wallet to use: "keplr", "leap", or "okx"
 * @returns Public key (hex), signature (hex), wallet address, and wallet info
 */
export async function connectCosmosWalletAndSign(
  messageToSign: string,
  chainId: string,
  walletName: "keplr" | "leap" | "okx",
): Promise<{
  pubkeyHex: string;
  signatureHex: string;
  address: string;
  walletInfo: WalletConnectionInfo;
}> {
  // 1. Get public key
  const { pubkeyHex, address: walletAddress } = await getSecp256k1Pubkey(
    chainId,
    walletName,
  );

  // 2. Get user signature
  const signatureHex = await signWithSecp256k1Wallet(
    messageToSign,
    chainId,
    walletAddress,
    walletName,
  );

  // Convert hex pubkey to base64 for authenticator identifier (matches on-chain format)
  const pubkeyBase64 = Buffer.from(pubkeyHex, "hex").toString("base64");

  return {
    pubkeyHex,
    signatureHex,
    address: walletAddress,
    walletInfo: {
      type: "Secp256K1",
      address: walletAddress,
      pubkey: pubkeyHex,
      identifier: pubkeyBase64, // Use base64 pubkey for indexer queries
    },
  };
}
