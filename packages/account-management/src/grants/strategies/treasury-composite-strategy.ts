/**
 * Composite Treasury Strategy
 * Tries multiple strategies in order until one succeeds
 * Implements the Strategy pattern with fallback behavior
 *
 * Based on dashboard's src/treasury-strategies/composite-treasury-strategy.ts
 */

import type { TreasuryStrategy, TreasuryConfig } from "../../types/treasury";
import type { ContractQueryClient } from "../discovery";

export interface CompositeTreasuryStrategyOptions {
  /**
   * When true, all strategies are fired in parallel using Promise.any().
   * The first to resolve wins; if all reject, an AggregateError is thrown.
   * When false (default), strategies are tried sequentially with fallback.
   */
  racing?: boolean;
}

/**
 * Composite Treasury Strategy
 * Tries multiple treasury strategies either sequentially (fallback) or in parallel (racing).
 */
export class CompositeTreasuryStrategy implements TreasuryStrategy {
  private readonly strategies: TreasuryStrategy[];
  private readonly racing: boolean;

  constructor(
    strategies: TreasuryStrategy[],
    options?: CompositeTreasuryStrategyOptions,
  ) {
    if (strategies.length === 0) {
      throw new Error(
        "CompositeTreasuryStrategy requires at least one strategy",
      );
    }
    this.strategies = strategies;
    this.racing = options?.racing ?? false;
  }

  async fetchTreasuryConfig(
    treasuryAddress: string,
    client: ContractQueryClient,
  ): Promise<TreasuryConfig> {
    if (this.racing) {
      return this.fetchRacing(treasuryAddress, client);
    }
    return this.fetchSequential(treasuryAddress, client);
  }

  private async fetchRacing(
    treasuryAddress: string,
    client: ContractQueryClient,
  ): Promise<TreasuryConfig> {
    try {
      return await Promise.any(
        this.strategies.map((strategy) =>
          strategy.fetchTreasuryConfig(treasuryAddress, client),
        ),
      );
    } catch (error) {
      if (error instanceof AggregateError) {
        const errorMessages = error.errors
          .map((e: Error, i: number) => {
            const strategyName = this.strategies[i].constructor.name;
            return `${strategyName}: ${e.message}`;
          })
          .join("; ");
        throw new Error(
          `All treasury strategies failed for ${treasuryAddress}: ${errorMessages}`,
        );
      }
      throw error;
    }
  }

  private async fetchSequential(
    treasuryAddress: string,
    client: ContractQueryClient,
  ): Promise<TreasuryConfig> {
    const errors: Array<{ strategy: string; error: Error }> = [];

    for (let i = 0; i < this.strategies.length; i++) {
      const strategy = this.strategies[i];
      const strategyName = strategy.constructor.name;

      try {
        const result = await strategy.fetchTreasuryConfig(
          treasuryAddress,
          client,
        );

        // Return the first successful result
        return result;
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
    const errorMessages = errors
      .map((e) => `${e.strategy}: ${e.error.message}`)
      .join("; ");
    throw new Error(
      `All treasury strategies failed for ${treasuryAddress}: ${errorMessages}`,
    );
  }
}
