/**
 * AA API utilities for account creation
 * 
 * @deprecated This file is kept for backward compatibility.
 * Please import from @burnt-labs/abstraxion-core instead:
 * - import { createEthWalletAccount, createSecp256k1Account, checkAccountExists } from '@burnt-labs/abstraxion-core'
 * - import type { CreateAccountResponse, AccountExistenceResult } from '@burnt-labs/abstraxion-core'
 * 
 * Note: The prepare endpoint has been removed in v2 API.
 * Address calculation is now done locally using @burnt-labs/signers crypto utilities.
 */

// Re-export from core for backward compatibility
export {
  createEthWalletAccount,
  createSecp256k1Account,
  type CreateAccountResponse,
} from '@burnt-labs/abstraxion-core';

// checkAccountExists moved to account-management
export {
  checkAccountExists,
  type AccountExistenceResult,
} from '@burnt-labs/account-management';
