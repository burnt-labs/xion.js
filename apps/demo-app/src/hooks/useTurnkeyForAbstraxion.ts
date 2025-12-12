/**
 * Unified Turnkey integration hook for Abstraxion
 * Allows selection between different signing methods
 */

import { useTurnkeyViem } from "./useTurnkeyViem";
import { useTurnkeyRawAPI } from "./useTurnkeyRawAPI";

export type TurnkeySigningMethod = "viem" | "raw-api";

export function useTurnkeyForAbstraxion(method: TurnkeySigningMethod = "viem") {
  switch (method) {
    case "viem":
      return useTurnkeyViem();
    case "raw-api":
      return useTurnkeyRawAPI();
    default:
      throw new Error(`Unknown Turnkey signing method: ${method}`);
  }
}
