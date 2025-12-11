import type { AbstraxionConfig, NormalizedAbstraxionConfig } from "../types";
import {
  getFeeGranter,
  getRpcUrl,
  getRestUrl,
  xionGasValues,
} from "@burnt-labs/constants";

/**
 * Normalize AbstraxionConfig by filling in defaults based on chainId - Synchronous!!
 *
 * @param config - Config (at minimum requires chainId, but can omit rpcUrl, restUrl, gasPrice, feeGranter)
 * @returns Normalized config with all required fields filled in
 * @throws Error if chainId is not recognized and required fields are missing
 */
export function normalizeAbstraxionConfig(
  config: AbstraxionConfig,
): NormalizedAbstraxionConfig {
  const { chainId } = config;

  // Get defaults from constants based on chainId
  const defaultRpcUrl = getRpcUrl(chainId);
  const defaultRestUrl = getRestUrl(chainId);
  const defaultFeeGranter = getFeeGranter(chainId);

  // Use provided values or defaults
  const rpcUrl = config.rpcUrl || defaultRpcUrl;
  const restUrl = config.restUrl || defaultRestUrl;
  const gasPrice = config.gasPrice || xionGasValues.gasPrice;
  const feeGranter = config.feeGranter || defaultFeeGranter;

  // Validate required fields
  if (!rpcUrl) {
    throw new Error(
      `RPC URL is required. Either provide rpcUrl in config or use a known chainId (${chainId} not found in constants)`,
    );
  }

  if (!restUrl) {
    throw new Error(
      `REST URL is required. Either provide restUrl in config or use a known chainId (${chainId} not found in constants)`,
    );
  }

  return {
    ...config,
    rpcUrl,
    restUrl,
    gasPrice,
    feeGranter: feeGranter || undefined,
  };
}
