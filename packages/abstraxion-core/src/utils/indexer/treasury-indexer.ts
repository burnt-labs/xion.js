/**
 * Low-level DaoDao treasury indexer utilities
 * Shared by both AbstraxionAuth and account-management strategies
 */

export interface TreasuryIndexerConfig {
  /** Indexer base URL (required, should come from environment config) */
  indexerUrl: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Low-level DaoDao treasury indexer fetcher
 * Fetches from the DaoDao indexer API with timeout and error handling
 *
 * @param treasuryAddress - Treasury contract address
 * @param chainId - Network/chain ID
 * @param endpoint - Indexer endpoint path (e.g., 'grantConfigs' or 'all')
 * @param config - Configuration (indexerUrl is required)
 * @returns Promise resolving to the raw JSON response from the indexer
 */
export async function fetchFromDaoDaoIndexer<T = unknown>(
  treasuryAddress: string,
  chainId: string,
  endpoint: string,
  config: TreasuryIndexerConfig,
): Promise<T> {
  const indexerUrl = `${config.indexerUrl}/${chainId}/contract/${treasuryAddress}/xion/treasury/${endpoint}`;
  const timeout = config.timeout || 30000;

  // Add timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    if (typeof fetch === "undefined") {
      throw new Error("Fetch API not available");
    }

    const response = await fetch(indexerUrl, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(
        `DaoDao indexer responded with ${response.status}: ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data as T;
  } finally {
    clearTimeout(timeoutId);
  }
}
