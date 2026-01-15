/**
 * Type guards for controller-related types
 */

import type { SessionManager } from "@burnt-labs/account-management";

/**
 * Type guard to check if an object implements SessionManager interface
 * Validates that all required methods exist
 */
export function isSessionManager(obj: unknown): obj is SessionManager {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  return (
    typeof candidate.getLocalKeypair === "function" &&
    typeof candidate.generateAndStoreTempAccount === "function" &&
    typeof candidate.getGranter === "function" &&
    typeof candidate.setGranter === "function" &&
    typeof candidate.authenticate === "function" &&
    typeof candidate.logout === "function"
  );
}
