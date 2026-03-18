/**
 * DaoDAO Indexer API - typed path accessors
 *
 * Wraps daodao-indexer-api.generated.ts with convenient path constants and type exports.
 *
 * NOTE: The DaoDAO Indexer OpenAPI spec does not currently define response body schemas,
 * so response types are manually maintained in signers/src/types/generated/daodao-indexer.ts
 * Once the indexer adds response schemas they will automatically appear in the generated file.
 */

export type { paths as DaoDaoIndexerPaths, DaoDaoIndexerPath, DaoDaoIndexerXionTreasuryPath } from "./daodao-indexer-api.generated";

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
