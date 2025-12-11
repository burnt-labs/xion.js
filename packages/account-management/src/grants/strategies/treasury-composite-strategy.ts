/**
 * Composite Treasury Strategy
 * Tries multiple strategies in order until one succeeds
 * Implements the Strategy pattern with fallback behavior
 *
 * Based on dashboard's src/treasury-strategies/composite-treasury-strategy.ts
 */

import type { TreasuryStrategy, TreasuryConfig } from "../../types/treasury";
import type { ContractQueryClient } from "../discovery";

/**
 * Composite Treasury Strategy
 * Tries multiple treasury strategies in order, returning the first successful result
 *
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
    client: ContractQueryClient,
  ): Promise<TreasuryConfig | null> {
    const errors: Array<{ strategy: string; error: Error }> = [];

    for (let i = 0; i < this.strategies.length; i++) {
      const strategy = this.strategies[i];
      const strategyName = strategy.constructor.name;

      try {
        const result = await strategy.fetchTreasuryConfig(
          treasuryAddress,
          client,
        );

        if (result) {
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
        `All treasury strategies failed for ${treasuryAddress}: ${errorMessages}`,
      );
    }

    // Some strategies succeeded but returned null (treasury not found)
    return null;
  }
}
