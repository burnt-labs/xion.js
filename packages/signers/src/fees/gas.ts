import { xionGasValues, type ChainInfo } from "@burnt-labs/constants";
import { calculateFee, GasPrice, StdFee } from "@cosmjs/stargate";

/**
 * Formats a GasPrice from ChainInfo configuration
 * @param chainInfo - Chain configuration containing fee currencies
 * @returns Formatted GasPrice for the chain's primary fee currency
 */
export function formatGasPrice(chainInfo: ChainInfo): GasPrice {
  const feeCurrency = chainInfo.feeCurrencies[0];
  const gasPrice = feeCurrency.gasPriceStep.low;
  return GasPrice.fromString(`${gasPrice}${feeCurrency.coinMinimalDenom}`);
}

/**
 * Configuration for gas calculation
 */
export interface GasCalculationConfig {
  /**
   * Gas adjustment multiplier (default from xionGasValues.gasAdjustment)
   */
  gasAdjustment?: number;

  /**
   * Gas adjustment margin added after multiplication (default from xionGasValues.gasAdjustmentMargin)
   */
  gasAdjustmentMargin?: number;
}

/**
 * Calculates StdFee from simulated gas with adjustments
 *
 * @param simmedGas - Gas amount from simulation
 * @param chainInfo - Chain configuration
 * @param config - Optional gas adjustment configuration
 * @returns StdFee with adjusted gas and calculated fee amount
 *
 */
export function getGasCalculation(
  simmedGas: number,
  chainInfo: ChainInfo,
  config?: GasCalculationConfig,
): StdFee {
  const gasPrice = formatGasPrice(chainInfo);

  const gasAdjustment = config?.gasAdjustment ?? xionGasValues.gasAdjustment;
  const gasAdjustmentMargin =
    config?.gasAdjustmentMargin ?? xionGasValues.gasAdjustmentMargin;

  const adjustedGas = Math.ceil(
    simmedGas * gasAdjustment + gasAdjustmentMargin,
  );

  return calculateFee(adjustedGas, gasPrice);
}
