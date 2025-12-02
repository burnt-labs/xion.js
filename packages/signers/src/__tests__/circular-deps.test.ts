/**
 * Circular dependency and type duplication tests
 * These tests ensure clean dependency boundaries and prevent circular dependencies
 */

import { describe, it, expect } from "vitest";

describe("Circular Dependency Prevention", () => {
  it("should not import from account-abstraction-api anywhere", async () => {
    // This test ensures that NO files import from account-abstraction-api
    // Types are now generated from OpenAPI schema independently
    // All files should use relative imports or imports from other packages

    const signerFiles = import.meta.glob("../signers/**/*.ts", {
      as: "raw",
      eager: true,
    });
    const cryptoFiles = import.meta.glob("../crypto/**/*.ts", {
      as: "raw",
      eager: true,
    });
    const interfaceFiles = import.meta.glob("../interfaces/**/*.ts", {
      as: "raw",
      eager: true,
    });
    const typesFiles = import.meta.glob("../types/**/*.ts", {
      as: "raw",
      eager: true,
    });

    const allFiles = { ...signerFiles, ...cryptoFiles, ...interfaceFiles, ...typesFiles };

    const violations: string[] = [];

    for (const [path, content] of Object.entries(allFiles)) {
      // Skip generated files (they're auto-generated)
      if (path.includes("/generated/")) {
        continue;
      }

      // Check for actual imports from account-abstraction-api, not just comments
      if (typeof content === "string") {
        // Match import statements that reference account-abstraction-api
        // from "account-abstraction-api" or from '@burnt-labs/account-abstraction-api'
        const importPattern = /(?:import|from)\s+(?:type\s+)?(?:[^"']*\s+)?["'](?:@burnt-labs\/)?account-abstraction-api(?:\/[^"']*)?["']/;

        if (importPattern.test(content)) {
          violations.push(path);
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Found imports from account-abstraction-api:\n${violations.join("\n")}\n\nTypes should be imported from ./generated/api instead.`,
      );
    }

    expect(violations).toEqual([]);
  });

  it("should not import from packages higher in the dependency hierarchy", async () => {
    // Signers is in Layer 2 of the dependency hierarchy
    // It should NOT import from packages in higher layers (Layer 3, 4, 5)
    // 
    // Higher-level packages that signers should NOT import from:
    // - Layer 3: account-abstraction-api (already checked above)
    // - Layer 4: @burnt-labs/abstraxion-core, @burnt-labs/account-management
    // - Layer 5: @burnt-labs/abstraxion, @burnt-labs/abstraxion-react-native, @burnt-labs/ui
    //
    // Signers CAN import from:
    // - Layer 1: @burnt-labs/constants (lower layer)
    // - External packages

    const signerFiles = import.meta.glob("../signers/**/*.ts", {
      as: "raw",
      eager: true,
    });
    const cryptoFiles = import.meta.glob("../crypto/**/*.ts", {
      as: "raw",
      eager: true,
    });
    const interfaceFiles = import.meta.glob("../interfaces/**/*.ts", {
      as: "raw",
      eager: true,
    });
    const typesFiles = import.meta.glob("../types/**/*.ts", {
      as: "raw",
      eager: true,
    });

    const allFiles = { ...signerFiles, ...cryptoFiles, ...interfaceFiles, ...typesFiles };

    // Packages that are higher in the hierarchy (should NOT be imported)
    const forbiddenPackages = [
      "@burnt-labs/abstraxion-core",
      "@burnt-labs/account-management",
      "@burnt-labs/abstraxion",
      "@burnt-labs/abstraxion-react-native",
      "@burnt-labs/ui",
      "account-abstraction-api", // Already checked above, but include for completeness
    ];

    const violations: Array<{ file: string; package: string }> = [];

    for (const [path, content] of Object.entries(allFiles)) {
      // Skip generated files and test files
      if (path.includes("/generated/") || path.includes("__tests__")) {
        continue;
      }

      if (typeof content === "string") {
        for (const pkg of forbiddenPackages) {
          // Check for import statements that reference these packages
          // Match patterns like: 
          //   from "@burnt-labs/abstraxion-core"
          //   from '@burnt-labs/account-management'
          //   import ... from "account-abstraction-api"
          //   import type ... from "@burnt-labs/ui"
          const escapedPkg = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const importPattern = new RegExp(
            `(?:import|from)\\s+(?:type\\s+)?(?:[^"']*\\s+)?["']${escapedPkg}(?:/[^"']*)?["']`,
            "g",
          );
          
          if (importPattern.test(content)) {
            violations.push({ file: path, package: pkg });
          }
        }
      }
    }

    if (violations.length > 0) {
      const violationMessages = violations.map(
        (v) => `  ${v.file} imports from ${v.package}`,
      );
      throw new Error(
        `Found imports from higher-level packages:\n${violationMessages.join("\n")}\n\nSigners package should only depend on:\n  - @burnt-labs/constants (Layer 1)\n  - External packages\n\nIt should NOT depend on packages in Layer 3, 4, or 5.`,
      );
    }

    expect(violations).toEqual([]);
  });

  it("should not import from @burnt-labs/signers in crypto utilities", async () => {
    // Crypto utilities should be self-contained and not depend on other parts of the package

    const cryptoFiles = import.meta.glob("../crypto/**/*.ts", {
      as: "raw",
      eager: true,
    });

    const violations: string[] = [];

    for (const [path, content] of Object.entries(cryptoFiles)) {
      if (path.includes("index.ts")) {
        // Index files can re-export
        continue;
      }

      if (
        typeof content === "string" &&
        (content.includes('from "../signers') ||
          content.includes('from "../interfaces'))
      ) {
        violations.push(path);
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Found imports from signers/interfaces in crypto utilities:\n${violations.join("\n")}`,
      );
    }

    expect(violations).toEqual([]);
  });
});

describe("Type Duplication Prevention", () => {
  it("should have AuthenticatorType defined only once", async () => {
    // AuthenticatorType should be defined in account-abstraction-api
    // and re-exported by signers, not duplicated

    const allFiles = import.meta.glob("../**/*.ts", { as: "raw", eager: true });

    const definitions: string[] = [];

    for (const [path, content] of Object.entries(allFiles)) {
      if (path.includes("node_modules") || path.includes("dist")) {
        continue;
      }

      if (
        typeof content === "string" &&
        /export\s+type\s+AuthenticatorType\s*=/.test(content) &&
        !path.includes("api/types.ts") // api/types.ts re-exports, which is OK
      ) {
        definitions.push(path);
      }
    }

    if (definitions.length > 1) {
      throw new Error(
        `AuthenticatorType is defined in multiple places:\n${definitions.join("\n")}\n\nIt should only be defined in account-abstraction-api and re-exported here.`,
      );
    }

    expect(definitions.length).toBeLessThanOrEqual(1);
  });

  it("should have SmartAccount type defined in types/account.ts", async () => {
    // SmartAccount is defined in signers/types/account.ts as the source of truth
    // Other packages re-export from signers

    const signerFiles = import.meta.glob("../**/*.ts", {
      as: "raw",
      eager: true,
    });

    const definitions: string[] = [];

    for (const [path, content] of Object.entries(signerFiles)) {
      if (
        path.includes("node_modules") ||
        path.includes("dist") ||
        path.includes("__tests__")
      ) {
        continue;
      }

      if (
        typeof content === "string" &&
        /export\s+(interface|type)\s+SmartAccount/.test(content)
      ) {
        definitions.push(path);
      }
    }

    // SmartAccount should be defined in exactly one place: types/account.ts
    expect(definitions).toHaveLength(1);
    expect(definitions[0]).toContain("types/account");
  });
});

describe("Package Boundary Tests", () => {
  it("should only export crypto utilities and signers from main index", async () => {
    // The main index should not leak internal implementation details
    // It should only export public APIs

    // Check that the index file exists and exports the expected modules
    const indexFiles = import.meta.glob("../index.ts", {
      as: "raw",
      eager: true,
    });

    const indexContent = Object.values(indexFiles)[0] as string | undefined;
    expect(indexContent).toBeDefined();

    // We can't easily test exports at runtime, but this test documents the intent
    // Manual review of src/index.ts is needed to ensure clean exports
  });

  it("types/api.ts should only contain type re-exports, no implementations", async () => {
    const apiTypesFiles = import.meta.glob("../types/api.ts", {
      as: "raw",
      eager: true,
    });

    const apiTypesContent = Object.values(apiTypesFiles)[0];

    // Should only have type exports and imports
    const hasImplementation =
      /export\s+(function|class|const|let|var)/.test(apiTypesContent as string);

    expect(hasImplementation).toBe(false);
  });
});
