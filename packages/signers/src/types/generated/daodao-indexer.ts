/**
 * DaoDAO Indexer response types
 *
 * These are manually maintained because the DaoDAO Indexer OpenAPI spec does not currently
 * define response body schemas. Once it does, these will be replaced by generated types.
 *
 * Validated against: https://daodaoindexer.burnt.com
 * Formula: xion/treasury/all (src/formulas/formulas/contract/xion/treasury.ts in daodao-indexer repo)
 */

/** A serialized protobuf Any value as returned by the DaoDAO indexer */
export interface DaoDaoIndexerAny {
  type_url: string;
  /** Base64-encoded protobuf bytes */
  value: string;
}

/** Single grant config as returned by the DaoDAO indexer xion/treasury formula */
export interface DaoDaoIndexerGrantConfig {
  authorization: DaoDaoIndexerAny;
  description: string;
  optional?: boolean;
  /** Fee allowance (only present on fee-grant-enabled configs) */
  allowance?: DaoDaoIndexerAny;
  /** Max duration in seconds */
  maxDuration?: number;
}

/** Treasury params as returned by the DaoDAO indexer xion/treasury formula */
export interface DaoDaoIndexerTreasuryParams {
  icon_url?: string;
  redirect_url?: string;
  /** JSON string containing structured metadata e.g. {"is_oauth2_app": true} */
  metadata?: string;
  /** Alternative to metadata in some indexer versions */
  display_url?: string;
}

/**
 * Response shape of the DaoDAO indexer /{chainId}/contract/{address}/xion/treasury/all endpoint
 *
 * Path: DAODAO_TREASURY_ALL_PATH
 */
export interface DaoDaoIndexerTreasuryAllResponse {
  grantConfigs: Record<string, DaoDaoIndexerGrantConfig>;
  params: DaoDaoIndexerTreasuryParams;
  feeConfig?: unknown;
  admin?: string;
  pendingAdmin?: string | null;
  balances?: Record<string, unknown>;
}

/**
 * Response shape of the DaoDAO indexer /{chainId}/contract/{address}/xion/treasury/grantConfigs endpoint
 */
export type DaoDaoIndexerTreasuryGrantConfigsResponse = Record<string, DaoDaoIndexerGrantConfig>;

/**
 * Response shape of the DaoDAO indexer /{chainId}/contract/{address}/xion/treasury/params endpoint
 */
export type DaoDaoIndexerTreasuryParamsResponse = DaoDaoIndexerTreasuryParams;

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
export function isDaoDaoIndexerGrantConfig(data: unknown): data is DaoDaoIndexerGrantConfig {
  if (!data || typeof data !== "object") return false;
  const r = data as Record<string, unknown>;
  if (!r.authorization || typeof r.authorization !== "object") return false;
  const auth = r.authorization as Record<string, unknown>;
  return typeof auth.type_url === "string" && typeof auth.value === "string" && typeof r.description === "string";
}

