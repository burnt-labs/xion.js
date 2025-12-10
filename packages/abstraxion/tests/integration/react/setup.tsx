/**
 * React Integration Test Setup
 * Runs before each React integration test to ensure clean state
 */

import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
  // Clear localStorage to prevent test pollution
  if (typeof localStorage !== "undefined") {
    localStorage.clear();
  }
  // Clear sessionStorage as well
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.clear();
  }
});

// Setup before each test
beforeEach(() => {
  // Reset location to default
  if (typeof window !== "undefined" && window.location) {
    // Mock location.href to avoid navigation issues in tests
    Object.defineProperty(window, "location", {
      value: {
        href: "http://localhost:3000",
        search: "",
        pathname: "/",
        assign: vi.fn(),
        replace: vi.fn(),
        reload: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  }
});
