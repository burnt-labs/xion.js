/**
 * Composite Indexer Strategy
 * Tries multiple indexer strategies in order until one succeeds
 * Implements the Strategy pattern with fallback behavior
 */

import type {
  IndexerStrategy,
  SmartAccountWithCodeId,
} from "../../types/indexer";
import type { AuthenticatorType } from "@burnt-labs/signers";

/**
 * Composite Indexer Strategy
 * Tries multiple indexer strategies in order, returning the first successful result
 */
export class CompositeAccountStrategy implements IndexerStrategy {
  private readonly strategies: IndexerStrategy[];

  constructor(...strategies: IndexerStrategy[]) {
    if (strategies.length === 0) {
      throw new Error(
        "CompositeAccountStrategy requires at least one strategy",
      );
    }
    // Fail-fast validation: surface mis-construction at create time instead
    // of at query time. The constructor uses rest params (not an array
    // param), so `new CompositeAccountStrategy([s1, s2])` accidentally
    // wraps the array into `[[s1, s2]]` — without this check, the bug only
    // manifests later when iteration tries to call `.fetchSmartAccounts` on
    // the inner Array and the error gets swallowed by callers like
    // `checkAccountExists` (which catches it and returns `{exists: false}`).
    strategies.forEach((s, i) => {
      if (!s || typeof s.fetchSmartAccounts !== "function") {
        throw new TypeError(
          `CompositeAccountStrategy: strategy at index ${i} does not implement IndexerStrategy ` +
            `(missing or non-function fetchSmartAccounts). ` +
            `Did you pass an array? Use \`new CompositeAccountStrategy(s1, s2)\`, not \`new CompositeAccountStrategy([s1, s2])\`.`,
        );
      }
    });
    this.strategies = strategies;
  }

  async fetchSmartAccounts(
    loginAuthenticator: string,
    authenticatorType: AuthenticatorType,
  ): Promise<SmartAccountWithCodeId[]> {
    const errors: Array<{ strategy: string; error: Error }> = [];

    for (let i = 0; i < this.strategies.length; i++) {
      const strategy = this.strategies[i];
      const strategyName = strategy.constructor.name;

      try {
        const result = await strategy.fetchSmartAccounts(
          loginAuthenticator,
          authenticatorType,
        );

        if (result && result.length > 0) {
          return result;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({
          strategy: strategyName,
          error: error instanceof Error ? error : new Error(errorMessage),
        });
        // Continue to next strategy on error
      }
    }

    // If all strategies failed, throw aggregated error
    if (errors.length === this.strategies.length) {
      const errorMessages = errors
        .map((e) => `${e.strategy}: ${e.error.message}`)
        .join("; ");
      throw new Error(
        `All account discovery strategies failed: ${errorMessages}`,
      );
    }

    // No accounts found (some strategies succeeded but returned empty)
    return [];
  }
}
