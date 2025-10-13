/**
 * Browser-specific wallet interaction utilities
 *
 * IMPORTANT: These functions use window.ethereum, window.keplr, etc.
 * and are ONLY for browser environments.
 *
 * For server-side or non-browser use cases, use the crypto utilities
 * from ../crypto and provide signatures externally.
 */

export * from "./ethereum";
export * from "./cosmos";
export * from "./errors";
export * from "./workflows";
