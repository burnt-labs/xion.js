/**
 * Account creation utilities
 * High-level functions for creating smart accounts via AA API v2
 * Uses local address calculation via @burnt-labs/signers crypto utilities
 */

import { Buffer } from 'buffer';
import { calculateSalt, calculateSmartAccountAddress, AUTHENTICATOR_TYPE } from '@burnt-labs/signers';
import { createEthWalletAccountV2, createSecp256k1AccountV2 } from './client';
import type { CreateAccountResponse } from './types';

/**
 * Configuration for local address calculation
 */
export interface AddressCalculationConfig {
  /** Contract checksum as hex string */
  checksum: string;
  /** Fee granter address (creator) */
  feeGranter: string;
  /** Address prefix (e.g., "xion") */
  addressPrefix: string;
}

/**
 * Create account via AA API v2 for EthWallet type
 * Handles the full flow: calculate address → sign → create
 * 
 * Uses local address calculation (no API call needed for prepare step)
 */
export async function createEthWalletAccount(
  aaApiUrl: string,
  ethereumAddress: string,
  signMessageFn: (hexMessage: string) => Promise<string>,
  config: AddressCalculationConfig,
  logPrefix: string = '[aaApi]'
): Promise<CreateAccountResponse> {
  console.log(`${logPrefix} 🆕 Creating new account for Ethereum address:`, ethereumAddress);

  // Step 1: Calculate address locally (using @signers crypto utilities)
  console.log(`${logPrefix} → Calculating deterministic address locally`);
  const salt = calculateSalt(AUTHENTICATOR_TYPE.EthWallet, ethereumAddress);
  const calculatedAddress = calculateSmartAccountAddress({
    checksum: config.checksum,
    creator: config.feeGranter,
    salt,
    prefix: config.addressPrefix,
  });

  console.log(`${logPrefix} → Calculated address:`, calculatedAddress);

  // Step 2: Sign the calculated address
  console.log(`${logPrefix} → Requesting signature from wallet`);
  console.log(`${logPrefix} → Message to sign:`, calculatedAddress);

  // Convert address to hex for personal_sign
  const messageHex = '0x' + Buffer.from(calculatedAddress, 'utf8').toString('hex');
  const signature = await signMessageFn(messageHex);

  console.log(`${logPrefix} → Signature received (length: ${signature.length} chars)`);

  // Step 3: Create account via v2 API
  console.log(`${logPrefix} → Calling AA API v2 /create/ethwallet endpoint`);
  const result = await createEthWalletAccountV2(aaApiUrl, {
    address: ethereumAddress.toLowerCase(),
    signature: signature.replace(/^0x/, ''), // Remove 0x prefix if present
  });

  console.log(`${logPrefix} ✅ Successfully created account:`, result.account_address);

  return result;
}

/**
 * Create account via AA API v2 for Secp256K1 type (Cosmos wallets)
 * Handles the full flow: calculate address → sign → create
 * 
 * Uses local address calculation (no API call needed for prepare step)
 */
export async function createSecp256k1Account(
  aaApiUrl: string,
  pubkeyHex: string,
  signMessageFn: (message: string) => Promise<string>,
  config: AddressCalculationConfig,
  logPrefix: string = '[aaApi]'
): Promise<CreateAccountResponse> {
  console.log(`${logPrefix} 🆕 Creating new account for Secp256K1 pubkey`);

  // Step 1: Calculate address locally (using @signers crypto utilities)
  console.log(`${logPrefix} → Calculating deterministic address locally`);
  const salt = calculateSalt(AUTHENTICATOR_TYPE.Secp256K1, pubkeyHex);
  const calculatedAddress = calculateSmartAccountAddress({
    checksum: config.checksum,
    creator: config.feeGranter,
    salt,
    prefix: config.addressPrefix,
  });

  console.log(`${logPrefix} → Calculated address:`, calculatedAddress);

  // Step 2: Sign the calculated address
  console.log(`${logPrefix} → Requesting signature from wallet`);
  const signatureResponse = await signMessageFn(calculatedAddress);

  // Handle both string and object responses
  // Cosmos wallets typically return base64 signature
  let signatureHex: string;
  if (typeof signatureResponse === 'string') {
    // Check if it's already hex or base64
    if (signatureResponse.length === 128 || signatureResponse.length === 130) {
      // Looks like hex (64 bytes = 128 hex chars, or 130 with 0x)
      signatureHex = signatureResponse.replace(/^0x/, '');
    } else {
      // Assume base64, convert to hex
      const signatureBytes = Buffer.from(signatureResponse, 'base64');
      signatureHex = signatureBytes.toString('hex');
    }
  } else {
    // Object response, convert to base64 then hex
    const signatureBase64 = Buffer.from(signatureResponse as any).toString('base64');
    const signatureBytes = Buffer.from(signatureBase64, 'base64');
    signatureHex = signatureBytes.toString('hex');
  }

  console.log(`${logPrefix} → Signature received (length: ${signatureHex.length} chars)`);

  // Step 3: Create account via v2 API
  console.log(`${logPrefix} → Calling AA API v2 /create/secp256k1 endpoint`);
  const result = await createSecp256k1AccountV2(aaApiUrl, {
    pubkey: pubkeyHex,
    signature: signatureHex,
  });

  console.log(`${logPrefix} ✅ Successfully created account:`, result.account_address);

  return result;
}

