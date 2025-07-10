import { fetchConfig as fetchConfigFromConstants } from "@burnt-labs/constants";
import { CacheManager } from "./cache/CacheManager";

export interface ConfigResponse {
  dashboardUrl: string;
  restUrl: string;
  networkId: string;
}

const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Create a singleton cache manager for configs
const configCacheManager = new CacheManager<ConfigResponse>({
  ttl: CONFIG_CACHE_TTL,
});

/**
 * Memoized version of fetchConfig that caches results by RPC URL with TTL
 *
 * @param {string} rpcUrl - The RPC URL to fetch configuration for
 * @returns {Promise<ConfigResponse>} - A promise that resolves to the configuration
 */
export const fetchConfig = async (rpcUrl: string): Promise<ConfigResponse> => {
  return configCacheManager.get(rpcUrl, () => fetchConfigFromConstants(rpcUrl));
};

/**
 * Manually clear the config cache
 */
export const clearConfigCache = (): void => {
  configCacheManager.clear();
};

/**
 * Get the cache manager instance (useful for testing)
 */
export function getConfigCacheManager(): CacheManager<ConfigResponse> {
  return configCacheManager;
}
