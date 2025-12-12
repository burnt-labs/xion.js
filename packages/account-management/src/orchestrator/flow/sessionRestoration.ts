/**
 * Session restoration logic
 * Extracted from AbstraxionContext restoreDirectModeSession function
 */

import type { SignArbSecp256k1HdWallet } from "@burnt-labs/abstraxion-core";
import { GranteeSignerClient } from "@burnt-labs/abstraxion-core";
import { GasPrice } from "@cosmjs/stargate";
import type { SessionManager, SessionRestorationResult } from "../types";

/**
 * Configuration for creating a signing client during session restoration
 */
export interface SigningClientConfig {
  rpcUrl: string;
  gasPrice: string;
  treasuryAddress?: string;
}

/**
 * Restore an existing session if valid
 * Checks for stored keypair and granter, then verifies grants on-chain
 * Optionally creates a signing client if config is provided
 *
 * @param sessionManager - Session management interface
 * @param signingClientConfig - Optional config for creating signing client
 * @returns Session restoration result with `restored: false` if no valid session exists,
 *          or `restored: true` with `keypair`, `granterAddress`, and optionally `signingClient` if session was restored successfully
 */
export async function restoreSession(
  sessionManager: SessionManager,
  signingClientConfig?: SigningClientConfig,
): Promise<SessionRestorationResult> {
  try {
    // Check if session keypair exists
    const storedKeypair = await sessionManager.getLocalKeypair();
    const storedGranter = await sessionManager.getGranter();

    // No session to restore - this is normal on first visit
    if (!storedKeypair || !storedGranter) {
      return { restored: false };
    }

    // Verify grants still exist on-chain via authenticate
    await sessionManager.authenticate();

    // If we get here, grants are valid so Get grantee address from keypair
    const accounts = await storedKeypair.getAccounts();
    //TODO: fix this to allow multiple accounts long term
    const granteeAddress = accounts[0].address;

    const result: SessionRestorationResult = {
      restored: true,
      keypair: storedKeypair,
      granterAddress: storedGranter,
      granteeAddress,
    };

    // Optionally create signing client if config provided
    if (signingClientConfig) {
      result.signingClient = await createSigningClient(
        storedKeypair,
        storedGranter,
        signingClientConfig,
      );
    }

    return result;
  } catch (error) {
    // Session expired or invalid - clear it and return error
    // This distinguishes "no session exists" (normal) from "session exists but invalid" (error)
    await sessionManager.logout();
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Session expired or grants no longer valid. Please reconnect.";
    return {
      restored: false,
      error: errorMessage,
    };
  }
}

/**
 * Create signing client for restored session
 * Used for both redirect and signer flows when restoring authenticated sessions
 */
async function createSigningClient(
  keypair: SignArbSecp256k1HdWallet,
  granterAddress: string,
  config: SigningClientConfig,
): Promise<GranteeSignerClient> {
  const accounts = await keypair.getAccounts();
  const granteeAddress = accounts[0].address;

  return GranteeSignerClient.connectWithSigner(config.rpcUrl, keypair, {
    gasPrice: GasPrice.fromString(config.gasPrice),
    granterAddress,
    granteeAddress,
    treasuryAddress: config.treasuryAddress,
  });
}
