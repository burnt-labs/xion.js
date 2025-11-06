/**
 * AA API utilities for account creation
 * 
 * @deprecated This file is kept for backward compatibility.
 * Please import from @burnt-labs/abstraxion-core instead:
 * - import { createEthWalletAccount, createSecp256k1Account, checkAccountExists } from '@burnt-labs/abstraxion-core'
 * - import type { CreateAccountResponse, AccountExistenceResult } from '@burnt-labs/abstraxion-core'
 */

// Re-export from core for backward compatibility
export {
  callPrepareEndpoint,
  callCreateEndpoint,
  createEthWalletAccount,
  createSecp256k1Account,
  type PrepareResponse,
  type CreateAccountResponse,
  type PrepareRequest,
  type CreateAccountRequest,
} from '@burnt-labs/abstraxion-core';

// checkAccountExists moved to account-management
export {
  checkAccountExists,
  type AccountExistenceResult,
} from '@burnt-labs/account-management';
