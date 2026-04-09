/**
 * Transaction payload utilities for SDK ↔ Dashboard transport.
 *
 * Shared by both sides:
 *  - xion.js controllers use `validateTxPayload` before sending
 *  - Dashboard uses `normalizeMessages` after receiving
 */
export * from "./types";
export * from "./normalize";
export * from "./validate";
