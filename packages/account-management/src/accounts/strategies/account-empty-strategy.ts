/**
 * Empty Indexer Strategy
 * Returns an empty array, indicating no existing accounts found
 * This is the fallback strategy when no indexer is available
 *
 * When this strategy is used, the system will create a new smart account
 * instead of trying to find an existing one.
 */

import type {
  IndexerStrategy,
  SmartAccountWithCodeId,
} from "../../types/indexer";
import type { AuthenticatorType } from "@burnt-labs/signers";

/**
 * Empty Indexer Strategy
 * Always returns an empty array (no accounts found)
 *
 * Use this as a fallback when:
 * - No indexer is configured
 * - Indexer is unavailable
 * - You want to force creation of a new account
 */
export class EmptyAccountStrategy implements IndexerStrategy {
  async fetchSmartAccounts(
    _loginAuthenticator: string,
    _authenticatorType: AuthenticatorType, // Required by interface but not used - always returns empty
  ): Promise<SmartAccountWithCodeId[]> {
    return [];
  }
}
