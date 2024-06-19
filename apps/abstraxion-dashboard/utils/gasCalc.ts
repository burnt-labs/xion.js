import { xionGasValues } from "@burnt-labs/constants";
import { GasPrice, StdFee, calculateFee } from "@cosmjs/stargate";

export function getGasCalculation(simmedGas: number, chainId: string): StdFee {
  const gasPriceString = process.env.GAS_PRICE || xionGasValues.gasPrice;
  const gasAdjustment = process.env.GAS_ADJUSTMENT
    ? parseFloat(process.env.GAS_ADJUSTMENT)
    : xionGasValues.gasAdjustment;
  const gasAdjustmentMargin = process.env.GAS_ADJUSTMENT_MARGIN
    ? parseInt(process.env.GAS_ADJUSTMENT_MARGIN, 10)
    : xionGasValues.gasAdjustmentMargin;

  const gasPrice = GasPrice.fromString(gasPriceString);
  const calculatedFee: StdFee = calculateFee(simmedGas, gasPrice);

  let fee: StdFee;
  let gas = (
    parseInt(calculatedFee.gas) * gasAdjustment +
    gasAdjustmentMargin
  ).toString();

  if (/testnet/.test(chainId)) {
    fee = { amount: [{ amount: "0", denom: "uxion" }], gas };
  } else {
    fee = { amount: calculatedFee.amount, gas };
  }

  return fee;
}
