import type { AAClient } from "../signers";
import type { TreasuryConfig, TreasuryStrategy } from "./types";

/**
 * Composite Treasury Strategy
 * Tries multiple strategies in order until one succeeds
 * Implements the Strategy pattern with fallback behavior
 */
export class CompositeTreasuryStrategy implements TreasuryStrategy {
  private readonly strategies: TreasuryStrategy[];

  constructor(...strategies: TreasuryStrategy[]) {
    if (strategies.length === 0) {
      throw new Error(
        "CompositeTreasuryStrategy requires at least one strategy",
      );
    }
    this.strategies = strategies;
  }

  async fetchTreasuryConfig(
    treasuryAddress: string,
    client: AAClient,
  ): Promise<TreasuryConfig | null> {
    for (const strategy of this.strategies) {
      try {
        const result = await strategy.fetchTreasuryConfig(
          treasuryAddress,
          client,
        );

        if (result) {
          return result;
        }
      } catch {
        // Continue to next strategy
      }
    }

    return null;
  }
}
