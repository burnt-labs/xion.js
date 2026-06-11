/**
 * DaoDao Treasury Indexer Strategy
 * Fetches treasury configurations from the DaoDao indexer API
 * This is the fastest approach when the indexer is available
 *
 * How it works:
 * 1. Queries DaoDao indexer API at /{chainId}/contract/{address}/xion/treasury/all
 * 2. Transforms indexer response to standard TreasuryConfig format
 * 3. Validates all data for security (URLs, structure)
 *
 * Based on dashboard's src/treasury-strategies/daodao-treasury-strategy.ts
 */

import type {
  TreasuryStrategy,
  TreasuryConfig,
  GrantConfigByTypeUrl,
  TreasuryParams,
} from "../../types/treasury";
import type { ContractQueryClient } from "../discovery";
import {
  CacheManager,
  fetchFromDaoDaoIndexer,
} from "@burnt-labs/abstraxion-core";
import type {
  DaoDaoIndexerGrantConfig,
  DaoDaoIndexerTreasuryAllResponse,
} from "@burnt-labs/signers";
import { getTreasuryParamsMetadata } from "@burnt-labs/signers";

// Helper to validate URLs for security
function isUrlSafe(url?: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export interface DaoDaoTreasuryStrategyConfig {
  /** DaoDao indexer base URL (e.g., "https://daodaoindexer.burnt.com") */
  indexerUrl: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * DaoDao Treasury Indexer Strategy
 * Queries DaoDao indexer API for treasury configurations (fast, requires indexer)
 *
 */
export class DaoDaoTreasuryStrategy implements TreasuryStrategy {
  private config: DaoDaoTreasuryStrategyConfig;
  private cache: CacheManager<TreasuryConfig>;

  constructor(config: DaoDaoTreasuryStrategyConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      ...config,
    };
    this.cache = new CacheManager<TreasuryConfig>({
      ttl: 10 * 60 * 1000, // 10 minutes
      debugLabel: "daodao-treasury",
    });
  }

  async fetchTreasuryConfig(
    treasuryAddress: string,
    client: ContractQueryClient,
  ): Promise<TreasuryConfig> {
    const chainId = await client.getChainId();
    const cacheKey = `${treasuryAddress}:${chainId}`;

    // Note: We don't cache null results (empty treasury configs)
    return await this.cache.get(cacheKey, async () => {
      const result = await this.fetchFromIndexer(treasuryAddress, chainId);
      if (!result) {
        throw new Error("Treasury config not found");
      }
      return result;
    });
  }

  private async fetchFromIndexer(
    treasuryAddress: string,
    chainId: string,
  ): Promise<TreasuryConfig | null> {
    try {
      // Use shared low-level indexer fetcher from abstraxion-core
      const data =
        await fetchFromDaoDaoIndexer<DaoDaoIndexerTreasuryAllResponse>(
          treasuryAddress,
          chainId,
          "all",
          {
            indexerUrl: this.config.indexerUrl,
            timeout: this.config.timeout,
          },
        );

      const validatedData = this.validateAllResponse(data);

      // Transform grant configs from the response
      const grantConfigs = this.transformAllResponseGrants(
        validatedData.grantConfigs,
      );

      const metadataValue = getTreasuryParamsMetadata(validatedData.params);
      const params: TreasuryParams = {
        redirect_url: isUrlSafe(validatedData.params.redirect_url)
          ? validatedData.params.redirect_url || ""
          : "",
        icon_url: isUrlSafe(validatedData.params.icon_url)
          ? validatedData.params.icon_url || ""
          : "",
        // metadata is a JSON string containing structured data (e.g., {"is_oauth2_app": true})
        // DO NOT validate as URL - contract validates as valid JSON
        metadata: metadataValue,
      };

      return {
        grantConfigs,
        params,
      };
    } catch (error) {
      // Re-throw errors instead of returning null
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`DaoDao treasury strategy failed: ${errorMessage}`);
    }
  }

  /**
   * Validates the /all endpoint response structure
   */
  private validateAllResponse(data: unknown): DaoDaoIndexerTreasuryAllResponse {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid indexer response: not an object");
    }

    // Safe to cast to Record after checking typeof === "object"
    // TODO: Consider adding end-to-end typing with zod or io-ts for full runtime validation
    const response = data as Record<string, unknown>;

    // Reject the indexer's all-defaults placeholder. For a contract it hasn't
    // indexed, the DaoDao indexer returns `{ admin: null, grantConfigs: {}, … }`
    // rather than a 404 — which would otherwise pass the structural checks
    // below as a "successful" empty treasury.
    //
    // We treat a null/absent/blank admin as "no usable data". Strictly,
    // admin=null *could* be a legitimate response, but in practice it's an
    // indication of an empty treasury — typically something the indexer was
    // asked about but never actually indexed. We also reject an empty/blank
    // string: a placeholder admin of `""` is no more usable than `null`, and a
    // real treasury always has a bech32 admin. Because we can't tell a
    // placeholder apart from a real empty result, we don't surface it as one: a
    // partial/placeholder config would silently degrade the caller (e.g. to
    // "Read access only") instead of letting the authoritative on-chain query
    // answer.
    //
    // Throwing here (rather than returning empty) makes the strategy *reject*,
    // which is the routing signal we want:
    //  - In a `CompositeTreasuryStrategy` with `DirectQueryTreasuryStrategy`
    //    (the default fallback) — both sequential and racing modes treat the
    //    rejection as "use the other strategy", so the authoritative on-chain
    //    query wins instead of this placeholder silently degrading the caller
    //    to "Read access only".
    //  - Used standalone (no chain fallback) — the rejection surfaces as an
    //    error, which is correct: we can't be sure the placeholder is valid.
    if (
      response.admin == null ||
      (typeof response.admin === "string" && response.admin.trim() === "")
    ) {
      throw new Error(
        "DaoDao indexer has no data for this treasury (admin is null)",
      );
    }

    // Validate the top-level structure
    if (!response.grantConfigs || typeof response.grantConfigs !== "object") {
      throw new Error("Invalid indexer response: missing grantConfigs");
    }

    if (!response.params || typeof response.params !== "object") {
      throw new Error("Invalid indexer response: missing params");
    }

    // Validate each grant config
    // Safe to cast after validation above
    const grantConfigs = response.grantConfigs as Record<string, unknown>;
    for (const [typeUrl, config] of Object.entries(grantConfigs)) {
      if (!config || typeof config !== "object") {
        throw new Error(`Invalid grant config for ${typeUrl}`);
      }

      // Safe to cast after typeof check
      const grantConfig = config as Record<string, unknown>;

      // Check required fields
      if (
        !grantConfig.authorization ||
        typeof grantConfig.authorization !== "object"
      ) {
        throw new Error(`Missing authorization for ${typeUrl}`);
      }

      // Safe to cast after typeof check
      const auth = grantConfig.authorization as Record<string, unknown>;
      if (typeof auth.type_url !== "string" || typeof auth.value !== "string") {
        throw new Error(`Invalid authorization format for ${typeUrl}`);
      }

      if (typeof grantConfig.description !== "string") {
        throw new Error(`Missing description for ${typeUrl}`);
      }
    }

    // We've validated the structure, so we can safely return it
    return data as DaoDaoIndexerTreasuryAllResponse;
  }

  /**
   * Transform grant configs from /all response to standard format
   */
  private transformAllResponseGrants(
    grantConfigs: Record<string, DaoDaoIndexerGrantConfig>,
  ): GrantConfigByTypeUrl[] {
    const result: GrantConfigByTypeUrl[] = [];

    for (const config of Object.values(grantConfigs)) {
      result.push({
        authorization: config.authorization,
        description: config.description,
        optional: config.optional ?? false, // Default to false if not provided
      });
    }

    return result;
  }
}
