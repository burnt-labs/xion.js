/**
 * TODO: WebAuthn/Passkey Integration Tests
 *
 * These tests are currently blocked due to WebAuthn ponyfill import issues in Node.js environment.
 * The @burnt-labs/signers package imports browser-specific WebAuthn APIs before mocks can be applied.
 *
 * Status: Tests written and structured, but cannot run until WebAuthn environment issue is resolved.
 * The passkey utilities themselves are already quite solid and will be tested separately later.
 *
 * Priority: Focus on integration tests for actual flows (grant creation, account discovery, etc.)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { restoreSession } from "../sessionRestoration";
import type { SessionManager, SigningClientConfig } from "../../types";

// Mock dependencies - no need to mock @burnt-labs/signers, just what we use
vi.mock("@burnt-labs/abstraxion-core", async () => {
  const actual = await vi.importActual("@burnt-labs/abstraxion-core");
  return {
    ...actual,
    GranteeSignerClient: {
      connectWithSigner: vi.fn(),
    },
  };
});

describe("sessionRestoration.ts - Session Restoration Flow", () => {
  let mockSessionManager: SessionManager;
  let mockKeypair: any;
  let mockSigningClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup mock keypair
    mockKeypair = {
      getAccounts: vi.fn().mockResolvedValue([{ address: "xion1grantee" }]),
    };

    // Setup mock signing client
    mockSigningClient = {
      simulate: vi.fn(),
      signAndBroadcast: vi.fn(),
    };

    // Setup mock session manager
    mockSessionManager = {
      getLocalKeypair: vi.fn(),
      generateAndStoreTempAccount: vi.fn(),
      getGranter: vi.fn(),
      setGranter: vi.fn(),
      authenticate: vi.fn(),
      logout: vi.fn(),
    } as unknown as SessionManager;

    const { GranteeSignerClient } = await import("@burnt-labs/abstraxion-core");
    GranteeSignerClient.connectWithSigner.mockResolvedValue(mockSigningClient);
  });

  describe("🔴 CRITICAL: restoreSession()", () => {
    it("should restore keypair and granter from storage", async () => {
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockResolvedValue();

      const result = await restoreSession(mockSessionManager);

      expect(result.restored).toBe(true);
      if (result.restored) {
        expect(result.keypair).toBe(mockKeypair);
        expect(result.granterAddress).toBe("xion1granter");
        expect(result.granteeAddress).toBe("xion1grantee");
      }
    });

    it("should return not restored when no keypair exists", async () => {
      mockSessionManager.getLocalKeypair.mockResolvedValue(undefined);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");

      const result = await restoreSession(mockSessionManager);

      expect(result.restored).toBe(false);
      expect(mockSessionManager.authenticate).not.toHaveBeenCalled();
    });

    it("should return not restored when no granter exists", async () => {
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue(undefined);

      const result = await restoreSession(mockSessionManager);

      expect(result.restored).toBe(false);
      expect(mockSessionManager.authenticate).not.toHaveBeenCalled();
    });

    it("should validate session by calling authenticate", async () => {
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockResolvedValue();

      const result = await restoreSession(mockSessionManager);

      expect(mockSessionManager.authenticate).toHaveBeenCalled();
      expect(result.restored).toBe(true);
    });

    it("should clear invalid session when authenticate fails", async () => {
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockRejectedValue(
        new Error("Grants no longer valid"),
      );

      const result = await restoreSession(mockSessionManager);

      expect(mockSessionManager.logout).toHaveBeenCalled();
      expect(result.restored).toBe(false);
      if (!result.restored) {
        expect(result.error).toContain("Grants no longer valid");
      }
    });

    it("should create signing client when config provided", async () => {
      const { GranteeSignerClient } = await import(
        "@burnt-labs/abstraxion-core"
      );
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockResolvedValue();

      const signingClientConfig: SigningClientConfig = {
        rpcUrl: "https://rpc.xion.com",
        gasPrice: "0.001uxion",
      };

      const result = await restoreSession(
        mockSessionManager,
        signingClientConfig,
      );

      expect(GranteeSignerClient.connectWithSigner).toHaveBeenCalledWith(
        "https://rpc.xion.com",
        mockKeypair,
        expect.objectContaining({
          granterAddress: "xion1granter",
          granteeAddress: "xion1grantee",
        }),
      );
      expect(result.restored).toBe(true);
      if (result.restored) {
        expect(result.signingClient).toBe(mockSigningClient);
      }
    });

    it("should include treasury address in signing client config", async () => {
      const { GranteeSignerClient } = await import(
        "@burnt-labs/abstraxion-core"
      );
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockResolvedValue();

      const signingClientConfig: SigningClientConfig = {
        rpcUrl: "https://rpc.xion.com",
        gasPrice: "0.001uxion",
        treasuryAddress: "xion1treasury",
      };

      await restoreSession(mockSessionManager, signingClientConfig);

      expect(GranteeSignerClient.connectWithSigner).toHaveBeenCalledWith(
        "https://rpc.xion.com",
        mockKeypair,
        expect.objectContaining({
          treasuryAddress: "xion1treasury",
        }),
      );
    });

    it("should not create signing client when config not provided", async () => {
      const { GranteeSignerClient } = await import(
        "@burnt-labs/abstraxion-core"
      );
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockResolvedValue();

      const result = await restoreSession(mockSessionManager);

      expect(GranteeSignerClient.connectWithSigner).not.toHaveBeenCalled();
      expect(result.restored).toBe(true);
      if (result.restored) {
        expect(result.signingClient).toBeUndefined();
      }
    });

    it("should emit error state when grants expired", async () => {
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockRejectedValue(
        new Error("Session expired"),
      );

      const result = await restoreSession(mockSessionManager);

      expect(result.restored).toBe(false);
      if (!result.restored) {
        expect(result.error).toBeDefined();
        expect(result.error).toContain("Session expired");
      }
    });

    it("should handle non-Error exceptions during authentication", async () => {
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockRejectedValue("String error");

      const result = await restoreSession(mockSessionManager);

      expect(result.restored).toBe(false);
      if (!result.restored) {
        expect(result.error).toContain(
          "Session expired or grants no longer valid",
        );
      }
    });

    it("should extract grantee address from keypair accounts", async () => {
      const customKeypair = {
        getAccounts: vi
          .fn()
          .mockResolvedValue([{ address: "xion1customgrantee" }]),
      };

      mockSessionManager.getLocalKeypair.mockResolvedValue(customKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockResolvedValue();

      const result = await restoreSession(mockSessionManager);

      expect(customKeypair.getAccounts).toHaveBeenCalled();
      expect(result.restored).toBe(true);
      if (result.restored) {
        expect(result.granteeAddress).toBe("xion1customgrantee");
      }
    });

    it("should return success when grants validation passes", async () => {
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockResolvedValue();

      const result = await restoreSession(mockSessionManager);

      expect(result.restored).toBe(true);
      if (!result.restored) {
        expect(result.error).toBeUndefined();
      }
    });

    it("should handle missing both keypair and granter gracefully", async () => {
      mockSessionManager.getLocalKeypair.mockResolvedValue(undefined);
      mockSessionManager.getGranter.mockResolvedValue(undefined);

      const result = await restoreSession(mockSessionManager);

      expect(result.restored).toBe(false);
      expect(mockSessionManager.authenticate).not.toHaveBeenCalled();
      expect(mockSessionManager.logout).not.toHaveBeenCalled();
    });
  });

  describe("🔴 CRITICAL: Session Validation Edge Cases", () => {
    it("should handle authenticate throwing network error", async () => {
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockRejectedValue(
        new Error("Network error: Failed to fetch"),
      );

      const result = await restoreSession(mockSessionManager);

      expect(mockSessionManager.logout).toHaveBeenCalled();
      expect(result.restored).toBe(false);
      if (!result.restored) {
        expect(result.error).toContain("Network error");
      }
    });

    it("should handle authenticate throwing RPC error", async () => {
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockRejectedValue(
        new Error("RPC error: node unavailable"),
      );

      const result = await restoreSession(mockSessionManager);

      expect(result.restored).toBe(false);
      if (!result.restored) {
        expect(result.error).toContain("RPC error");
      }
    });

    it("should handle getAccounts throwing error", async () => {
      const brokenKeypair = {
        getAccounts: vi.fn().mockRejectedValue(new Error("Invalid keypair")),
      };

      mockSessionManager.getLocalKeypair.mockResolvedValue(brokenKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockResolvedValue();

      const result = await restoreSession(mockSessionManager);

      expect(mockSessionManager.logout).toHaveBeenCalled();
      expect(result.restored).toBe(false);
      if (!result.restored) {
        expect(result.error).toContain("Invalid keypair");
      }
    });

    it("should preserve error context when session invalid", async () => {
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockRejectedValue(
        new Error("Grant revoked by user"),
      );

      const result = await restoreSession(mockSessionManager);

      expect(result.restored).toBe(false);
      if (!result.restored) {
        expect(result.error).toBe("Grant revoked by user");
      }
    });

    it("should handle signing client creation failure", async () => {
      const { GranteeSignerClient } = await import(
        "@burnt-labs/abstraxion-core"
      );
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockResolvedValue();
      vi.mocked(GranteeSignerClient.connectWithSigner).mockRejectedValue(
        new Error("Failed to connect to RPC"),
      );

      const signingClientConfig: SigningClientConfig = {
        rpcUrl: "https://rpc.xion.com",
        gasPrice: "0.001uxion",
      };

      const result = await restoreSession(
        mockSessionManager,
        signingClientConfig,
      );

      expect(mockSessionManager.logout).toHaveBeenCalled();
      expect(result.restored).toBe(false);
      if (!result.restored) {
        expect(result.error).toContain("Failed to connect to RPC");
      }
    });

    it("should differentiate no session vs invalid session", async () => {
      // No session case (normal)
      mockSessionManager.getLocalKeypair.mockResolvedValue(undefined);
      mockSessionManager.getGranter.mockResolvedValue(undefined);

      const noSessionResult = await restoreSession(mockSessionManager);
      expect(noSessionResult.restored).toBe(false);
      if (!noSessionResult.restored) {
        expect(noSessionResult.error).toBeUndefined();
      }
      expect(mockSessionManager.logout).not.toHaveBeenCalled();

      // Invalid session case (error)
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockRejectedValue(
        new Error("Invalid session"),
      );

      const invalidSessionResult = await restoreSession(mockSessionManager);
      expect(invalidSessionResult.restored).toBe(false);
      if (!invalidSessionResult.restored) {
        expect(invalidSessionResult.error).toBeDefined();
      }
      expect(mockSessionManager.logout).toHaveBeenCalled();
    });
  });

  describe("🔴 CRITICAL: Grant Consistency Scenarios", () => {
    it("should handle authenticate verifying on-chain grants", async () => {
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");

      // Simulate authenticate checking on-chain state
      let authenticateCalled = false;
      mockSessionManager.authenticate.mockImplementation(async () => {
        authenticateCalled = true;
        // If authenticate completes, grants are valid
      });

      const result = await restoreSession(mockSessionManager);

      expect(authenticateCalled).toBe(true);
      expect(result.restored).toBe(true);
    });

    it("should handle authenticate detecting expired grants", async () => {
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockRejectedValue(
        new Error("Grants expired"),
      );

      const result = await restoreSession(mockSessionManager);

      expect(mockSessionManager.logout).toHaveBeenCalled();
      expect(result.restored).toBe(false);
      if (!result.restored) {
        expect(result.error).toContain("Grants expired");
      }
    });

    it("should handle authenticate detecting revoked grants", async () => {
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockRejectedValue(
        new Error("Grant not found"),
      );

      const result = await restoreSession(mockSessionManager);

      expect(mockSessionManager.logout).toHaveBeenCalled();
      expect(result.restored).toBe(false);
      if (!result.restored) {
        expect(result.error).toContain("Grant not found");
      }
    });

    it("should handle authenticate detecting insufficient permissions", async () => {
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockRejectedValue(
        new Error("Insufficient authorization"),
      );

      const result = await restoreSession(mockSessionManager);

      expect(result.restored).toBe(false);
      if (!result.restored) {
        expect(result.error).toContain("Insufficient authorization");
      }
    });

    it("should complete full restoration flow successfully", async () => {
      // Setup successful restoration scenario
      mockSessionManager.getLocalKeypair.mockResolvedValue(mockKeypair);
      mockSessionManager.getGranter.mockResolvedValue("xion1granter");
      mockSessionManager.authenticate.mockResolvedValue();

      const signingClientConfig: SigningClientConfig = {
        rpcUrl: "https://rpc.xion.com",
        gasPrice: "0.001uxion",
        treasuryAddress: "xion1treasury",
      };

      const result = await restoreSession(
        mockSessionManager,
        signingClientConfig,
      );

      // Verify full flow
      expect(mockSessionManager.getLocalKeypair).toHaveBeenCalled();
      expect(mockSessionManager.getGranter).toHaveBeenCalled();
      expect(mockSessionManager.authenticate).toHaveBeenCalled();
      expect(mockKeypair.getAccounts).toHaveBeenCalled();
      expect(mockSessionManager.logout).not.toHaveBeenCalled();

      expect(result.restored).toBe(true);
      if (result.restored) {
        expect(result.keypair).toBe(mockKeypair);
        expect(result.granterAddress).toBe("xion1granter");
        expect(result.granteeAddress).toBe("xion1grantee");
        expect(result.signingClient).toBe(mockSigningClient);
      }
    });
  });
});
