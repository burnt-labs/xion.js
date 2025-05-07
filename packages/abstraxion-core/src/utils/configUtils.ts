import { fetchConfig as originalFetchConfig } from "@burnt-labs/constants";

// Cache for fetchConfig results to avoid redundant network requests
const configCache: Record<
  string,
  Promise<{ dashboardUrl: string; restUrl: string; networkId: string }>
> = {};

/**
 * Memoized version of fetchConfig that caches results by RPC URL
 *
 * @param {string} rpcUrl - The RPC URL to fetch configuration for
 * @returns {Promise<{ dashboardUrl: string; restUrl: string; networkId: string }>} - A promise that resolves to the configuration
 */
export const fetchConfig = async (rpcUrl: string) => {
  // Return cached result if available
  if (Object.prototype.hasOwnProperty.call(configCache, rpcUrl)) {
    return configCache[rpcUrl];
  }

  // Create a promise for the fetch operation and store it in the cache
  // This prevents multiple simultaneous requests for the same RPC URL
  const fetchPromise = originalFetchConfig(rpcUrl);

  // Store the promise in the cache
  configCache[rpcUrl] = fetchPromise;

  // Return the promise
  return fetchPromise;
};
