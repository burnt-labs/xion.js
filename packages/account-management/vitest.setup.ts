/**
 * Vitest setup file
 * Runs before all tests
 */

import { vi } from "vitest";

// Mock @github/webauthn-json/browser-ponyfill to avoid module resolution issues
// This is needed because @burnt-labs/signers imports this module which isn't available in Node.js environment
vi.mock("@github/webauthn-json/browser-ponyfill", () => ({
  create: vi.fn(),
  get: vi.fn(),
  supported: vi.fn(() => false),
  parseCreationOptionsFromJSON: vi.fn(),
  parseRequestOptionsFromJSON: vi.fn(),
}));
