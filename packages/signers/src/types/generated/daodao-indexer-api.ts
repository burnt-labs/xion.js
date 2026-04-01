/**
 * DaoDAO Indexer API - typed path accessors and response types
 *
 * Path constants and type aliases derived from daodao-indexer-api.generated.ts.
 */

import type { operations } from "./daodao-indexer-api.generated";

export type { paths as DaoDaoIndexerPaths, operations } from "./daodao-indexer-api.generated";

/** Union of all DaoDAO Indexer path strings */
export type DaoDaoIndexerPath = keyof import("./daodao-indexer-api.generated").paths;

/** Union of the xion/treasury path strings */
export type DaoDaoIndexerXionTreasuryPath = Extract<
  DaoDaoIndexerPath,
  `/${string}/contract/${string}/xion/treasury/${string}`
>;

/** Base path template for xion/treasury formula — fill in chainId and contractAddress */
export const DAODAO_TREASURY_ALL_PATH =
  "/{chainId}/contract/{contractAddress}/xion/treasury/all" as const;

export const DAODAO_TREASURY_GRANT_CONFIGS_PATH =
  "/{chainId}/contract/{contractAddress}/xion/treasury/grantConfigs" as const;

export const DAODAO_TREASURY_PARAMS_PATH =
  "/{chainId}/contract/{contractAddress}/xion/treasury/params" as const;

export const DAODAO_TREASURY_FEE_CONFIG_PATH =
  "/{chainId}/contract/{contractAddress}/xion/treasury/feeConfig" as const;

export const DAODAO_TREASURY_BALANCES_PATH =
  "/{chainId}/contract/{contractAddress}/xion/treasury/balances" as const;

// ── Response type aliases derived from generated operations ──────────────────

type TreasuryAllJson =
  operations["xion_treasury_all_42b12f8"]["responses"][200]["content"]["application/json"];

/** A serialized protobuf Any value as returned by the DaoDAO indexer */
export type DaoDaoIndexerAny =
  TreasuryAllJson["grantConfigs"][string]["authorization"];

/** Single grant config as returned by the DaoDAO indexer xion/treasury formula */
export type DaoDaoIndexerGrantConfig = TreasuryAllJson["grantConfigs"][string];

/** Treasury params as returned by the DaoDAO indexer xion/treasury formula */
export type DaoDaoIndexerTreasuryParams = TreasuryAllJson["params"];

/**
 * Response shape of the DaoDAO indexer /{chainId}/contract/{address}/xion/treasury/all endpoint
 */
export type DaoDaoIndexerTreasuryAllResponse = TreasuryAllJson;

/**
 * Response shape of the DaoDAO indexer /{chainId}/contract/{address}/xion/treasury/grantConfigs endpoint
 */
export type DaoDaoIndexerTreasuryGrantConfigsResponse =
  operations["xion_treasury_grantConfigs_09399cc"]["responses"][200]["content"]["application/json"];

/**
 * Response shape of the DaoDAO indexer /{chainId}/contract/{address}/xion/treasury/params endpoint
 */
export type DaoDaoIndexerTreasuryParamsResponse =
  operations["xion_treasury_params_973187c"]["responses"][200]["content"]["application/json"];

// ── Type guards ───────────────────────────────────────────────────────────────

/** Type guard: validates the /all response structure at runtime */
export function isDaoDaoIndexerTreasuryAllResponse(
  data: unknown,
): data is DaoDaoIndexerTreasuryAllResponse {
  if (!data || typeof data !== "object") return false;
  const r = data as Record<string, unknown>;
  return (
    typeof r.grantConfigs === "object" &&
    r.grantConfigs !== null &&
    typeof r.params === "object" &&
    r.params !== null
  );
}

/** Type guard: validates a single grant config */
export function isDaoDaoIndexerGrantConfig(
  data: unknown,
): data is DaoDaoIndexerGrantConfig {
  if (!data || typeof data !== "object") return false;
  const r = data as Record<string, unknown>;
  if (!r.authorization || typeof r.authorization !== "object") return false;
  const auth = r.authorization as Record<string, unknown>;
  return (
    typeof auth.type_url === "string" &&
    typeof auth.value === "string" &&
    typeof r.description === "string"
  );
}
