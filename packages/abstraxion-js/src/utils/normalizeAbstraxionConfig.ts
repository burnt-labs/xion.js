import type {
  AbstraxionConfig,
  NormalizedAbstraxionConfig,
  SignerAuthentication,
} from "../types";
import { resolveAutoAuth } from "./resolveAutoAuth";
import {
  getFeeGranter,
  getRpcUrl,
  getRestUrl,
  getDaoDaoIndexerUrl,
  getIframeUrl,
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
  // Resolve "auto" → "popup" or "redirect" based on device before anything else
  const resolvedAuthentication = resolveAutoAuth(config.authentication);
  if (resolvedAuthentication !== config.authentication) {
    config = { ...config, authentication: resolvedAuthentication };
  }

  const { chainId } = config;

  // Get defaults from constants based on chainId
  const defaultRpcUrl = getRpcUrl(chainId);
  const defaultRestUrl = getRestUrl(chainId);
  const defaultFeeGranter = getFeeGranter(chainId);
  const defaultIframeUrl = getIframeUrl(chainId);

  // Use provided values or defaults
  const rpcUrl = config.rpcUrl || defaultRpcUrl;
  const restUrl = config.restUrl || defaultRestUrl;
  const gasPrice = config.gasPrice || xionGasValues.gasPrice;
  const feeGranter = config.feeGranter || defaultFeeGranter;

  // Set iframe URL default if using embedded authentication (avoid mutating input)
  if (config.authentication?.type === "embedded") {
    config = {
      ...config,
      authentication: {
        ...config.authentication,
        iframeUrl: config.authentication.iframeUrl || defaultIframeUrl,
      },
    };
  }

  // Validate required fields (browser only — during SSR/prerendering env vars may not be set)
  if (typeof window !== "undefined") {
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
  }

  return {
    ...config,
    rpcUrl: rpcUrl || "",
    restUrl: restUrl || "",
    gasPrice,
    feeGranter: feeGranter || undefined,
  };
}

/**
 * Create account strategy from normalized config
 *
 * With a smart account contract configured, discovery uses ONLY the AA API v2
 * strategy: GET /api/v2/account/check/{type}/{id}, then on-chain verification
 * via rpcUrl. No indexer, local-derivation or empty fallback is added, so an
 * AA API or RPC failure surfaces as a discovery error instead of permitting
 * account creation. `smartAccountContract.checksum` is ignored.
 */
export function createAccountStrategyFromConfig(
  config: NormalizedAbstraxionConfig,
  signerAuth: SignerAuthentication,
): CompositeAccountStrategy {
  const smartAccountContract = signerAuth.smartAccountContract;

  if (!smartAccountContract) {
    // Discovery-only configuration (no account creation possible)
    return createCompositeAccountStrategy({
      indexer: convertIndexerConfig(signerAuth.indexer, smartAccountContract),
    });
  }

  if (!signerAuth.aaApiUrl) {
    throw new Error(
      "aaApiUrl is required in signer authentication: smart-account addresses come from the AA API",
    );
  }

  return createCompositeAccountStrategy({
    aaApi: {
      baseURL: signerAuth.aaApiUrl,
      version: "v2",
      rpcUrl: config.rpcUrl,
      addressPrefix: smartAccountContract.addressPrefix,
    },
  });
}

/**
 * Create grant config from normalized config
 * Extracts grant-related fields and adds treasury indexer URL
 * If treasuryIndexer is not provided, uses default based on chainId
 */
export function createGrantConfigFromConfig(
  config: NormalizedAbstraxionConfig,
  signerAuth: SignerAuthentication,
): GrantConfig | undefined {
  if (!config.treasury && !config.contracts && !config.bank && !config.stake) {
    return undefined;
  }

  // Use provided treasury indexer URL or default to chainId-based URL
  const daodaoIndexerUrl =
    signerAuth.treasuryIndexer?.url || getDaoDaoIndexerUrl(config.chainId);

  return {
    treasury: config.treasury,
    contracts: config.contracts,
    bank: config.bank,
    stake: config.stake,
    feeGranter: config.feeGranter,
    daodaoIndexerUrl,
  };
}

/**
 * Create account creation config from normalized config
 * Handles smart account contract configuration for account creation.
 * The AA API selects the address, so no checksum is needed or passed on.
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
      addressPrefix: smartAccountContract.addressPrefix,
    },
    feeGranter: config.feeGranter,
  };
}
