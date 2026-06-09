/**
 * Vitest setup file for integration tests
 * Runs before all integration tests
 */

import { vi } from "vitest";

// Mock @github/webauthn-json/browser-ponyfill globally
// This allows passkey-related code to be imported in test environments (Node.js)
// without failing on the browser-only webauthn dependency
vi.mock("@github/webauthn-json/browser-ponyfill", () => ({
  create: vi.fn(),
  get: vi.fn(),
  supported: vi.fn(() => false),
  parseCreationOptionsFromJSON: vi.fn(),
  parseRequestOptionsFromJSON: vi.fn(),
}));

// Mock browser globals if needed
if (typeof window === "undefined") {
  (global as any).window = {
    location: {
      href: "http://localhost:3000",
      search: "",
      assign: vi.fn(),
      replace: vi.fn(),
    },
  };
}

// Mock StorageEvent if not available
if (typeof StorageEvent === "undefined") {
  (global as any).StorageEvent = class StorageEvent extends Event {
    key: string | null;
    newValue: string | null;
    oldValue: string | null;
    storageArea: Storage | null;
    url: string;

    constructor(type: string, init?: any) {
      super(type);
      this.key = init?.key || null;
      this.newValue = init?.newValue || null;
      this.oldValue = init?.oldValue || null;
      this.storageArea = init?.storageArea || null;
      this.url = init?.url || "";
    }
  };
}
