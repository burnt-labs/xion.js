/**
 * Composite Treasury Strategy
 * Tries multiple strategies in order until one succeeds
 * Implements the Strategy pattern with fallback behavior
 *
 * Based on dashboard's src/treasury-strategies/composite-treasury-strategy.ts
 */

import type { TreasuryStrategy, TreasuryConfig } from "../../types/treasury";

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
    client: any, // AAClient from @burnt-labs/signers
  ): Promise<TreasuryConfig | null> {
    console.log(
      `[CompositeTreasuryStrategy] Trying ${this.strategies.length} strategies for treasury: ${treasuryAddress}`,
    );

    for (let i = 0; i < this.strategies.length; i++) {
      const strategy = this.strategies[i];
      const strategyName = strategy.constructor.name;

      try {
        console.log(
          `[CompositeTreasuryStrategy] Attempting strategy ${i + 1}/${this.strategies.length}: ${strategyName}`,
        );

        const result = await strategy.fetchTreasuryConfig(
          treasuryAddress,
          client,
        );

        if (result) {
          console.log(
            `[CompositeTreasuryStrategy] ✅ Strategy ${strategyName} succeeded`,
          );
          return result;
        }

        console.log(
          `[CompositeTreasuryStrategy] Strategy ${strategyName} returned null, trying next...`,
        );
      } catch (error) {
        console.warn(
          `[CompositeTreasuryStrategy] Strategy ${strategyName} failed:`,
          error,
        );
        // Continue to next strategy
      }
    }

    console.error(
      `[CompositeTreasuryStrategy] ❌ All ${this.strategies.length} strategies failed`,
    );
    return null;
  }
}
