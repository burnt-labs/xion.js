/**
 * AA API utilities for account creation
 * Shared between different authentication modes (browser wallets, signers)
 */

import { Buffer } from "buffer";
import type { CompositeAccountStrategy, Authenticator } from "@burnt-labs/account-management";

/**
 * Response from AA API /prepare endpoint
 */
export interface PrepareResponse {
  message_to_sign: string;
  salt: string;
  metadata: any;
}

/**
 * Response from AA API /create endpoint
 */
export interface CreateAccountResponse {
  account_address: string;
  code_id: number;
  transaction_hash: string;
}

/**
 * Request for AA API /prepare endpoint
 */
export interface PrepareRequest {
  wallet_type: 'EthWallet' | 'Secp256K1';
  address?: string; // For EthWallet
  pubkey?: string;  // For Secp256K1
}

/**
 * Request for AA API /create endpoint
 */
export interface CreateAccountRequest {
  wallet_type: 'EthWallet' | 'Secp256K1';
  address?: string; // For EthWallet
  pubkey?: string;  // For Secp256K1
  signature: string;
  salt: string;
  message: string;
}

/**
 * Result of account existence check
 */
export interface AccountExistenceResult {
  exists: boolean;
  accounts: any[];
  smartAccountAddress?: string;
  codeId?: number;
  authenticatorIndex?: number;
}

/**
 * Call AA API /prepare endpoint
 * Gets the message to sign and salt for account creation
 */
export async function callPrepareEndpoint(
  aaApiUrl: string,
  request: PrepareRequest
): Promise<PrepareResponse> {
  const response = await fetch(`${aaApiUrl}/api/v1/wallet-accounts/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `AA API /prepare failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * Call AA API /create endpoint
 * Creates the smart account on-chain
 */
export async function callCreateEndpoint(
  aaApiUrl: string,
  request: CreateAccountRequest
): Promise<CreateAccountResponse> {
  const response = await fetch(`${aaApiUrl}/api/v1/wallet-accounts/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `AA API /create failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * Check if account exists using the account strategy
 * Returns account details if found
 */
export async function checkAccountExists(
  accountStrategy: CompositeAccountStrategy,
  authenticator: string,
  logPrefix: string = '[aaApi]'
): Promise<AccountExistenceResult> {
  try {
    const accounts = await accountStrategy.fetchSmartAccounts(authenticator);

    if (accounts.length === 0) {
      return {
        exists: false,
        accounts: [],
      };
    }

    const existingAccount = accounts[0];

    // Find the matching authenticator index
    const matchingAuthenticator = existingAccount.authenticators.find(
      (auth: Authenticator) => {
        // For EthWallet, compare lowercase addresses
        // For Secp256K1, compare base64 pubkeys
        return auth.authenticator.toLowerCase() === authenticator.toLowerCase();
      }
    );

    const authenticatorIndex = matchingAuthenticator?.authenticatorIndex ?? 0;

    console.log(`${logPrefix} ✅ Found existing account:`, {
      smartAccount: existingAccount.id,
      codeId: existingAccount.codeId,
      authenticators: existingAccount.authenticators.length,
      authenticatorIndex,
    });

    return {
      exists: true,
      accounts,
      smartAccountAddress: existingAccount.id,
      codeId: existingAccount.codeId,
      authenticatorIndex,
    };
  } catch (error) {
    console.warn(`${logPrefix} Error checking account exists:`, error);
    return {
      exists: false,
      accounts: [],
    };
  }
}

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
