import { SessionKeyInfo, Permissions, SessionState } from "../types";

/**
 * Validate session key info object
 */
export function validateSessionKeyInfo(
  sessionKeyInfo: SessionKeyInfo,
): boolean {
  if (!sessionKeyInfo.userId || typeof sessionKeyInfo.userId !== "string") {
    return false;
  }

  if (
    !sessionKeyInfo.sessionKeyAddress ||
    typeof sessionKeyInfo.sessionKeyAddress !== "string"
  ) {
    return false;
  }

  if (
    !sessionKeyInfo.sessionKeyMaterial ||
    typeof sessionKeyInfo.sessionKeyMaterial !== "string"
  ) {
    return false;
  }

  if (
    typeof sessionKeyInfo.sessionKeyExpiry !== "number" ||
    sessionKeyInfo.sessionKeyExpiry <= 0
  ) {
    return false;
  }

  if (!Array.isArray(sessionKeyInfo.sessionPermissions)) {
    return false;
  }

  if (!Object.values(SessionState).includes(sessionKeyInfo.sessionState)) {
    return false;
  }

  if (
    !sessionKeyInfo.metaAccountAddress ||
    typeof sessionKeyInfo.metaAccountAddress !== "string"
  ) {
    return false;
  }

  return true;
}

/**
 * Validate permissions object
 */
export function validatePermissions(permissions: Permissions): boolean {
  if (permissions.contracts && !Array.isArray(permissions.contracts)) {
    return false;
  }

  if (permissions.bank && !Array.isArray(permissions.bank)) {
    return false;
  }

  if (permissions.stake && typeof permissions.stake !== "boolean") {
    return false;
  }

  if (permissions.treasury && typeof permissions.treasury !== "string") {
    return false;
  }

  if (
    permissions.expiry &&
    (typeof permissions.expiry !== "number" || permissions.expiry <= 0)
  ) {
    return false;
  }

  return true;
}

/**
 * Validate user ID format
 */
export function validateUserId(userId: string): boolean {
  if (!userId || typeof userId !== "string") {
    return false;
  }

  // Basic validation - can be extended based on your user ID format
  if (userId.length < 1 || userId.length > 255) {
    return false;
  }

  // Check for valid characters (alphanumeric, hyphens, underscores)
  const validUserIdRegex = /^[a-zA-Z0-9_-]+$/;
  return validUserIdRegex.test(userId);
}

/**
 * Validate session key address format
 */
export function validateSessionKeyAddress(address: string): boolean {
  if (!address || typeof address !== "string") {
    return false;
  }

  // Basic XION address validation
  // XION addresses typically start with 'xion1' and are 39-45 characters long
  const xionAddressRegex = /^xion1[a-z0-9]{38,44}$/;
  return xionAddressRegex.test(address);
}

/**
 * Validate meta account address format
 */
export function validateMetaAccountAddress(address: string): boolean {
  return validateSessionKeyAddress(address); // Same format as session key address
}

/**
 * Validate state parameter for OAuth flow
 */
export function validateState(state: string): boolean {
  if (!state || typeof state !== "string") {
    return false;
  }

  // State should be a hex string (32 bytes = 64 hex characters)
  const hexRegex = /^[a-f0-9]{64}$/;
  return hexRegex.test(state);
}

/**
 * Validate authorization code
 */
export function validateAuthorizationCode(code: string): boolean {
  if (!code || typeof code !== "string") {
    return false;
  }

  // Basic validation - can be extended based on your OAuth provider
  if (code.length < 10 || code.length > 1000) {
    return false;
  }

  return true;
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  // Remove potentially dangerous characters
  return input
    .replace(/[<>\"'&]/g, "") // Remove HTML/XML characters
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .trim();
}

/**
 * Validate timestamp
 */
export function validateTimestamp(timestamp: number): boolean {
  if (typeof timestamp !== "number") {
    return false;
  }

  // Check if timestamp is reasonable (not too far in past or future)
  const now = Date.now();
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
  const oneYearFromNow = now + 365 * 24 * 60 * 60 * 1000;

  return timestamp >= oneYearAgo && timestamp <= oneYearFromNow;
}
