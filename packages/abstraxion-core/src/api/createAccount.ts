/**
 * Account creation utilities
 * High-level functions for creating smart accounts via AA API
 */

import { Buffer } from 'buffer';
import { callPrepareEndpoint, callCreateEndpoint } from './client';
import type { CreateAccountResponse } from './types';

/**
 * Create account via AA API for EthWallet type
 * Handles the full flow: prepare → sign → create
 */
export async function createEthWalletAccount(
  aaApiUrl: string,
  ethereumAddress: string,
  signMessageFn: (hexMessage: string) => Promise<string>,
  logPrefix: string = '[aaApi]'
): Promise<CreateAccountResponse> {
  console.log(`${logPrefix} 🆕 Creating new account for Ethereum address:`, ethereumAddress);

  // Step 1: Prepare
  console.log(`${logPrefix} → Calling AA API /prepare endpoint`);
  const { message_to_sign, salt, metadata } = await callPrepareEndpoint(aaApiUrl, {
    wallet_type: 'EthWallet',
    address: ethereumAddress,
  });

  // Step 2: Sign
  console.log(`${logPrefix} → Requesting signature from wallet`);
  console.log(`${logPrefix} → Message to sign:`, message_to_sign);

  // Convert plain text address to hex for personal_sign
  const messageHex = '0x' + Buffer.from(message_to_sign, 'utf8').toString('hex');
  const signature = await signMessageFn(messageHex);

  console.log(`${logPrefix} → Signature received (length: ${signature.length} chars)`);

  // Step 3: Create
  console.log(`${logPrefix} → Calling AA API /create endpoint`);
  const result = await callCreateEndpoint(aaApiUrl, {
    wallet_type: 'EthWallet',
    address: ethereumAddress,
    signature: signature.replace(/^0x/, ''), // Remove 0x prefix if present
    salt,
    message: JSON.stringify(metadata),
  });

  console.log(`${logPrefix} ✅ Successfully created account:`, result.account_address);

  return result;
}

/**
 * Create account via AA API for Secp256K1 type (Cosmos wallets)
 * Handles the full flow: prepare → sign → create
 */
export async function createSecp256k1Account(
  aaApiUrl: string,
  pubkeyHex: string,
  signMessageFn: (message: string) => Promise<string>,
  logPrefix: string = '[aaApi]'
): Promise<CreateAccountResponse> {
  console.log(`${logPrefix} 🆕 Creating new account for Secp256K1 pubkey`);

  // Step 1: Prepare
  console.log(`${logPrefix} → Calling AA API /prepare endpoint`);
  const { message_to_sign, salt, metadata } = await callPrepareEndpoint(aaApiUrl, {
    wallet_type: 'Secp256K1',
    pubkey: pubkeyHex,
  });

  // Step 2: Sign
  console.log(`${logPrefix} → Requesting signature from wallet`);
  const signatureResponse = await signMessageFn(message_to_sign);

  // Handle both string and object responses
  const signatureBase64 = typeof signatureResponse === 'string'
    ? signatureResponse
    : Buffer.from(signatureResponse as any).toString('base64');

  const signatureBytes = Buffer.from(signatureBase64, 'base64');
  const signatureHex = signatureBytes.toString('hex');

  console.log(`${logPrefix} → Signature received (length: ${signatureHex.length} chars)`);

  // Step 3: Create
  console.log(`${logPrefix} → Calling AA API /create endpoint`);
  const result = await callCreateEndpoint(aaApiUrl, {
    wallet_type: 'Secp256K1',
    pubkey: pubkeyHex,
    signature: signatureHex,
    salt,
    message: JSON.stringify(metadata),
  });

  console.log(`${logPrefix} ✅ Successfully created account:`, result.account_address);

  return result;
}

