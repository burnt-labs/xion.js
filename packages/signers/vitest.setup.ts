/**
 * Vitest setup file for @burnt-labs/signers
 * Runs before all tests
 */

import { vi } from "vitest";

// Mock @github/webauthn-json/browser-ponyfill globally
// This allows the package to be imported in test environments (Node.js)
// without failing on the browser-only webauthn dependency
vi.mock("@github/webauthn-json/browser-ponyfill", () => ({
  create: vi.fn(),
  get: vi.fn(),
  supported: vi.fn(() => false),
  parseCreationOptionsFromJSON: vi.fn(),
  parseRequestOptionsFromJSON: vi.fn(),
}));
