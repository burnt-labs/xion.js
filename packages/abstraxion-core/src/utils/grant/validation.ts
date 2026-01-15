import type { TreasuryGrantConfig } from "@/types";
import { TreasuryValidationError } from "./errors";

/**
 * Validates a single TreasuryGrantConfig object
 */
export const validateTreasuryGrantConfig = (
  data: unknown,
): data is TreasuryGrantConfig => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }

  const config = data as Record<string, unknown>;

  // Check required fields
  if (
    !config.authorization ||
    typeof config.authorization !== "object" ||
    Array.isArray(config.authorization)
  ) {
    return false;
  }

  const auth = config.authorization as Record<string, unknown>;
  if (typeof auth.type_url !== "string" || !auth.type_url) {
    return false;
  }

  // Value should be a Uint8Array or base64 string
  if (!auth.value) {
    return false;
  }

  return true;
};

/**
 * Validates the treasury indexer response
 */
export const validateTreasuryIndexerResponse = (
  data: unknown,
): Record<string, TreasuryGrantConfig> => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new TreasuryValidationError(
      "Invalid indexer response: expected object",
      data,
    );
  }

  // Type-safe iteration through response object
  // TODO: Consider adding end-to-end typing with zod (or something else) for treasury indexer responses
  const response = data as Record<string, unknown>;
  const validatedResponse: Record<string, TreasuryGrantConfig> = {};

  for (const [typeUrl, config] of Object.entries(response)) {
    if (!validateTreasuryGrantConfig(config)) {
      console.warn(
        `Invalid treasury grant config for type URL ${typeUrl}`,
        config,
      );
      continue; // Skip invalid configs instead of throwing
    }
    validatedResponse[typeUrl] = config as TreasuryGrantConfig;
  }

  return validatedResponse;
};
