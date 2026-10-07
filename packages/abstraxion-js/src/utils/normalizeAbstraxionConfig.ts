import type {
  AbstraxionConfig,
  NormalizedAbstraxionConfig,
  SignerAuthentication,
} from "../types";
import { resolveAutoAuth } from "./resolveAutoAuth";
import {
  getAaApiUrl,
  getAddressPrefix,
  getChainIdForNetwork,
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
 * Resolve the chain ID from `network` and/or `chainId`.
 *
 * @throws if `network` is not "mainnet" or "testnet", or if `network` and
 * `chainId` name different chains
 */
function resolveChainId(config: AbstraxionConfig): string | undefined {
  // An empty network (e.g. an unset env var) counts as not set
  const networkChainId = config.network
    ? getChainIdForNetwork(config.network)
    : undefined;

  if (networkChainId && config.chainId && config.chainId !== networkChainId) {
    throw new Error(
      `network "${config.network}" is chain ${networkChainId}, but chainId is "${config.chainId}". ` +
        `Set only network, or a chainId that matches it.`,
    );
  }

  return config.chainId || networkChainId;
}

/**
 * Normalize AbstraxionConfig by filling in defaults from the network - Synchronous!!
 *
 * `network` ("mainnet" | "testnet") or a known `chainId` is enough: chain ID,
 * RPC, REST, gas price, fee granter, iframe URL and (in signer mode) the AA
 * API URL come from @burnt-labs/constants. Explicit values override them.
 *
 * @param config - Config (at minimum `network` or `chainId`)
 * @returns Normalized config with all required fields filled in
 * @throws Error if `network` is invalid or conflicts with `chainId`, or (in a
 * browser) if no chain is given or the chain is unknown and RPC/REST URLs are
 * missing
 */
export function normalizeAbstraxionConfig(
  config: AbstraxionConfig,
): NormalizedAbstraxionConfig {
  // Resolve "auto" → "popup" or "redirect" based on device before anything else
  const resolvedAuthentication = resolveAutoAuth(config.authentication);
  if (resolvedAuthentication !== config.authentication) {
    config = { ...config, authentication: resolvedAuthentication };
  }

  const chainId = resolveChainId(config) || "";

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

  // Set AA API URL default if using signer authentication (avoid mutating input)
  if (config.authentication?.type === "signer") {
    const aaApiUrl = config.authentication.aaApiUrl || getAaApiUrl(chainId);
    if (aaApiUrl) {
      config = {
        ...config,
        authentication: { ...config.authentication, aaApiUrl },
      };
    }
  }

  // Validate required fields (browser only — during SSR/prerendering env vars may not be set)
  if (typeof window !== "undefined") {
    if (!chainId) {
      throw new Error(
        `network is required: set network to "mainnet" or "testnet" (or chainId for a custom chain)`,
      );
    }

    if (!rpcUrl) {
      throw new Error(
        `RPC URL is required. Either provide rpcUrl in config or use a known network (${chainId} not found in constants)`,
      );
    }

    if (!restUrl) {
      throw new Error(
        `REST URL is required. Either provide restUrl in config or use a known network (${chainId} not found in constants)`,
      );
    }
  }

  return {
    ...config,
    chainId,
    rpcUrl: rpcUrl || "",
    restUrl: restUrl || "",
    gasPrice,
    feeGranter: feeGranter || undefined,
  };
}

/** AA API URL for signer mode: the explicit override, else the chain's default. */
function resolveAaApiUrl(
  config: NormalizedAbstraxionConfig,
  signerAuth: SignerAuthentication,
): string | undefined {
  return signerAuth.aaApiUrl || getAaApiUrl(config.chainId);
}

/** Smart-account address prefix: the explicit override, else the chain's bech32 prefix. */
function resolveAddressPrefix(
  config: NormalizedAbstraxionConfig,
  signerAuth: SignerAuthentication,
): string | undefined {
  return (
    signerAuth.smartAccountContract?.addressPrefix ||
    getAddressPrefix(config.chainId)
  );
}

/**
 * Create account strategy from normalized config
 *
 * When an AA API is configured (by default, the network's), discovery uses
 * ONLY the AA API v2 strategy: GET /api/v2/account/check/{type}/{id}, then
 * on-chain verification via rpcUrl. No indexer, local-derivation or empty
 * fallback is added, so an AA API or RPC failure surfaces as a discovery error
 * instead of permitting account creation. `smartAccountContract.checksum` and
 * `codeId` are ignored.
 *
 * A chain with no AA API (no default, no `aaApiUrl`) and no
 * `smartAccountContract` gets indexer-only discovery, with no account creation.
 */
export function createAccountStrategyFromConfig(
  config: NormalizedAbstraxionConfig,
  signerAuth: SignerAuthentication,
): CompositeAccountStrategy {
  const aaApiUrl = resolveAaApiUrl(config, signerAuth);

  if (!aaApiUrl) {
    if (!signerAuth.smartAccountContract && signerAuth.indexer) {
      // Discovery-only configuration (no account creation possible)
      return createCompositeAccountStrategy({
        indexer: convertIndexerConfig(signerAuth.indexer, undefined),
      });
    }

    throw new Error(
      `aaApiUrl is required in signer authentication: smart-account addresses come from the AA API, ` +
        `and chain "${config.chainId}" has no default. Set network to "mainnet" or "testnet", or pass aaApiUrl.`,
    );
  }

  const addressPrefix = resolveAddressPrefix(config, signerAuth);
  if (!addressPrefix) {
    throw new Error(
      `smartAccountContract.addressPrefix is required: chain "${config.chainId}" has no default address prefix. ` +
        `Set network to "mainnet" or "testnet", or pass smartAccountContract.addressPrefix.`,
    );
  }

  return createCompositeAccountStrategy({
    aaApi: {
      baseURL: aaApiUrl,
      version: "v2",
      rpcUrl: config.rpcUrl,
      addressPrefix,
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
 *
 * Returns a config whenever an AA API URL and an address prefix resolve (by
 * default, from the network). The AA API selects the address and pays for the
 * account with its own fee granter, so no checksum, code ID or fee granter is
 * needed. Returns undefined when accounts can't be created (no AA API).
 */
export function createAccountCreationConfigFromConfig(
  config: NormalizedAbstraxionConfig,
  signerAuth: SignerAuthentication,
): AccountCreationConfig | undefined {
  const aaApiUrl = resolveAaApiUrl(config, signerAuth);
  const addressPrefix = resolveAddressPrefix(config, signerAuth);

  if (!aaApiUrl || !addressPrefix) {
    return undefined;
  }

  return {
    aaApiUrl,
    smartAccountContract: { addressPrefix },
    feeGranter: config.feeGranter,
  };
}
