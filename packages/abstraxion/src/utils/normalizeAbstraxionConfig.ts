import type {
  AbstraxionConfig,
  NormalizedAbstraxionConfig,
  SignerAuthentication,
} from "../types";
import {
  getFeeGranter,
  getRpcUrl,
  getRestUrl,
  xionGasValues,
} from "@burnt-labs/constants";
import type {
  GrantConfig,
  AccountCreationConfig,
  CompositeAccountStrategy,
} from "@burnt-labs/account-management";
import {
  createCompositeAccountStrategy,
  convertIndexerConfig,
} from "@burnt-labs/account-management";

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

/**
 * Create account strategy from normalized config
 * Handles indexer and RPC strategy configuration for smart account discovery
 */
export function createAccountStrategyFromConfig(
  config: NormalizedAbstraxionConfig,
  signerAuth: SignerAuthentication,
): CompositeAccountStrategy {
  const smartAccountContract = signerAuth.smartAccountContract;

  return createCompositeAccountStrategy({
    indexer: convertIndexerConfig(signerAuth.indexer, smartAccountContract),
    rpc: smartAccountContract
      ? {
          rpcUrl: config.rpcUrl,
          checksum: smartAccountContract.checksum,
          creator: config.feeGranter || "",
          prefix: smartAccountContract.addressPrefix,
          codeId: smartAccountContract.codeId,
        }
      : undefined,
  });
}

/**
 * Create grant config from normalized config
 * Extracts grant-related fields and adds treasury indexer URL
 */
export function createGrantConfigFromConfig(
  config: NormalizedAbstraxionConfig,
  signerAuth: SignerAuthentication,
): GrantConfig | undefined {
  if (
    !config.treasury &&
    !config.contracts &&
    !config.bank &&
    !config.stake
  ) {
    return undefined;
  }

  return {
    treasury: config.treasury,
    contracts: config.contracts,
    bank: config.bank,
    stake: config.stake,
    feeGranter: config.feeGranter,
    daodaoIndexerUrl: signerAuth.treasuryIndexer?.url,
  };
}

/**
 * Create account creation config from normalized config
 * Handles smart account contract configuration for account creation
 */
export function createAccountCreationConfigFromConfig(
  config: NormalizedAbstraxionConfig,
  signerAuth: SignerAuthentication,
): AccountCreationConfig | undefined {
  const smartAccountContract = signerAuth.smartAccountContract;

  if (!smartAccountContract || !config.feeGranter) {
    return undefined;
  }

  return {
    aaApiUrl: signerAuth.aaApiUrl || "",
    smartAccountContract: {
      codeId: smartAccountContract.codeId,
      checksum: smartAccountContract.checksum,
      addressPrefix: smartAccountContract.addressPrefix,
    },
    feeGranter: config.feeGranter,
  };
}
