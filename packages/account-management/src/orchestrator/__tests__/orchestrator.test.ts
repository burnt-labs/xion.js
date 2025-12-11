/**
 * Unit tests for ConnectionOrchestrator
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConnectionOrchestrator } from "../orchestrator";
import type { SessionManager, ConnectionResult } from "../types";
import type { CompositeAccountStrategy } from "../../accounts";
import type {
  Connector,
  ConnectorConnectionResult,
} from "@burnt-labs/abstraxion-core";

// Mock the flow modules
vi.mock("../flow/sessionRestoration", () => ({
  restoreSession: vi.fn(),
}));

vi.mock("../flow/accountConnection", () => ({
  connectAccount: vi.fn(),
}));

vi.mock("../flow/grantCreation", () => ({
  createGrants: vi.fn(),
  checkStorageGrants: vi.fn(),
}));

vi.mock("../flow/redirectFlow", () => ({
  initiateRedirect: vi.fn(),
  completeRedirect: vi.fn(),
}));

vi.mock("@burnt-labs/abstraxion-core", () => ({
  GranteeSignerClient: {
    connectWithSigner: vi.fn(),
  },
  GasPrice: {
    fromString: vi.fn((str) => ({ amount: str })),
  },
}));

describe("ConnectionOrchestrator", () => {
  let mockSessionManager: SessionManager;
  let mockAccountStrategy: CompositeAccountStrategy;
  let mockConnector: Connector;
  let orchestrator: ConnectionOrchestrator;

  const baseConfig = {
    chainId: "xion-testnet-1",
    rpcUrl: "https://rpc.example.com",
    gasPrice: "0.001uxion",
    storageStrategy: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSessionManager = {
      getLocalKeypair: vi.fn(),
      generateAndStoreTempAccount: vi.fn(),
      getGranter: vi.fn(),
      setGranter: vi.fn(),
      authenticate: vi.fn(),
      logout: vi.fn(),
    };

    mockAccountStrategy = {
      fetchSmartAccounts: vi.fn(),
    } as any;

    mockConnector = {
      connect: vi.fn(),
    } as any;
  });

  describe("constructor", () => {
    it("should create orchestrator with minimal config", () => {
      const orch = new ConnectionOrchestrator({
        ...baseConfig,
        sessionManager: mockSessionManager,
      });

      expect(orch).toBeInstanceOf(ConnectionOrchestrator);
    });

    it("should accept full configuration", () => {
      const orch = new ConnectionOrchestrator({
        ...baseConfig,
        sessionManager: mockSessionManager,
        accountStrategy: mockAccountStrategy,
        grantConfig: { treasury: "xion1treasury" },
        dashboardUrl: "https://dashboard.example.com",
      });

      expect(orch).toBeInstanceOf(ConnectionOrchestrator);
    });
  });

  describe("restoreSession", () => {
    beforeEach(() => {
      orchestrator = new ConnectionOrchestrator({
        ...baseConfig,
        sessionManager: mockSessionManager,
      });
    });

    it("should call restoreSession flow", async () => {
      const { restoreSession } = await import("../flow/sessionRestoration");
      (restoreSession as any).mockResolvedValueOnce({ restored: false });

      await orchestrator.restoreSession();

      expect(restoreSession).toHaveBeenCalledWith(
        mockSessionManager,
        undefined,
      );
    });

    it("should pass signing client config when createSigningClient is true", async () => {
      const { restoreSession } = await import("../flow/sessionRestoration");
      (restoreSession as any).mockResolvedValueOnce({ restored: false });

      const orchWithGrants = new ConnectionOrchestrator({
        ...baseConfig,
        sessionManager: mockSessionManager,
        grantConfig: { treasury: "xion1treasury" },
      });

      await orchWithGrants.restoreSession(true);

      expect(restoreSession).toHaveBeenCalledWith(mockSessionManager, {
        rpcUrl: baseConfig.rpcUrl,
        gasPrice: baseConfig.gasPrice,
        treasuryAddress: "xion1treasury",
      });
    });

    it("should not pass signing client config when createSigningClient is false", async () => {
      const { restoreSession } = await import("../flow/sessionRestoration");
      (restoreSession as any).mockResolvedValueOnce({ restored: false });

      await orchestrator.restoreSession(false);

      expect(restoreSession).toHaveBeenCalledWith(
        mockSessionManager,
        undefined,
      );
    });
  });

  describe("connect", () => {
    it("should throw error when accountStrategy not configured", async () => {
      orchestrator = new ConnectionOrchestrator({
        ...baseConfig,
        sessionManager: mockSessionManager,
      });

      await expect(orchestrator.connect(mockConnector)).rejects.toThrow(
        "Account strategy is required",
      );
    });

    it("should call connectAccount flow with correct params", async () => {
      const { connectAccount } = await import("../flow/accountConnection");
      (connectAccount as any).mockResolvedValueOnce({
        smartAccountAddress: "xion1smart",
      });

      orchestrator = new ConnectionOrchestrator({
        ...baseConfig,
        sessionManager: mockSessionManager,
        accountStrategy: mockAccountStrategy,
      });

      await orchestrator.connect(mockConnector);

      expect(connectAccount).toHaveBeenCalledWith({
        connector: mockConnector,
        authenticator: undefined,
        chainId: baseConfig.chainId,
        rpcUrl: baseConfig.rpcUrl,
        accountStrategy: mockAccountStrategy,
        accountCreationConfig: undefined,
        sessionManager: mockSessionManager,
      });
    });

    it("should pass authenticator when provided", async () => {
      const { connectAccount } = await import("../flow/accountConnection");
      (connectAccount as any).mockResolvedValueOnce({
        smartAccountAddress: "xion1smart",
      });

      orchestrator = new ConnectionOrchestrator({
        ...baseConfig,
        sessionManager: mockSessionManager,
        accountStrategy: mockAccountStrategy,
      });

      await orchestrator.connect(mockConnector, "test-auth");

      expect(connectAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          authenticator: "test-auth",
        }),
      );
    });
  });

  describe("createGrants", () => {
    it("should throw error when grantConfig not provided", async () => {
      orchestrator = new ConnectionOrchestrator({
        ...baseConfig,
        sessionManager: mockSessionManager,
      });

      await expect(
        orchestrator.createGrants(
          "xion1smart",
          {} as ConnectorConnectionResult,
          "xion1grantee",
        ),
      ).rejects.toThrow("Grant config is required");
    });

    it("should call createGrants flow with correct params", async () => {
      const { createGrants } = await import("../flow/grantCreation");
      (createGrants as any).mockResolvedValueOnce({ success: true });

      orchestrator = new ConnectionOrchestrator({
        ...baseConfig,
        sessionManager: mockSessionManager,
        grantConfig: { treasury: "xion1treasury" },
      });

      const mockConnectionResult = {} as ConnectorConnectionResult;
      await orchestrator.createGrants(
        "xion1smart",
        mockConnectionResult,
        "xion1grantee",
      );

      expect(createGrants).toHaveBeenCalledWith({
        smartAccountAddress: "xion1smart",
        connectionResult: mockConnectionResult,
        granteeAddress: "xion1grantee",
        grantConfig: { treasury: "xion1treasury" },
        storageStrategy: baseConfig.storageStrategy,
        rpcUrl: baseConfig.rpcUrl,
        gasPrice: baseConfig.gasPrice,
      });
    });
  });

  describe("checkStorageGrants", () => {
    it("should call checkStorageGrants flow", async () => {
      const { checkStorageGrants } = await import("../flow/grantCreation");
      (checkStorageGrants as any).mockResolvedValueOnce({
        grantsExist: true,
        storedGranter: "xion1granter",
        storedTempAccount: null,
      });

      orchestrator = new ConnectionOrchestrator({
        ...baseConfig,
        sessionManager: mockSessionManager,
      });

      await orchestrator.checkStorageGrants("xion1smart");

      expect(checkStorageGrants).toHaveBeenCalledWith(
        "xion1smart",
        baseConfig.storageStrategy,
      );
    });
  });

  describe("initiateRedirect", () => {
    it("should call initiateRedirect flow", async () => {
      const { initiateRedirect } = await import("../flow/redirectFlow");
      (initiateRedirect as any).mockResolvedValueOnce({
        dashboardUrl: "https://dashboard.example.com",
      });

      orchestrator = new ConnectionOrchestrator({
        ...baseConfig,
        sessionManager: mockSessionManager,
      });

      await orchestrator.initiateRedirect();

      expect(initiateRedirect).toHaveBeenCalledWith(
        mockSessionManager,
        baseConfig.rpcUrl,
        undefined,
      );
    });

    it("should pass dashboardUrl when configured", async () => {
      const { initiateRedirect } = await import("../flow/redirectFlow");
      (initiateRedirect as any).mockResolvedValueOnce({
        dashboardUrl: "https://custom.dashboard.com",
      });

      orchestrator = new ConnectionOrchestrator({
        ...baseConfig,
        sessionManager: mockSessionManager,
        dashboardUrl: "https://custom.dashboard.com",
      });

      await orchestrator.initiateRedirect();

      expect(initiateRedirect).toHaveBeenCalledWith(
        mockSessionManager,
        baseConfig.rpcUrl,
        "https://custom.dashboard.com",
      );
    });
  });

  describe("completeRedirect", () => {
    it("should call completeRedirect flow", async () => {
      const { completeRedirect } = await import("../flow/redirectFlow");
      (completeRedirect as any).mockResolvedValueOnce({
        restored: true,
      });

      orchestrator = new ConnectionOrchestrator({
        ...baseConfig,
        sessionManager: mockSessionManager,
      });

      await orchestrator.completeRedirect();

      expect(completeRedirect).toHaveBeenCalledWith(mockSessionManager);
    });
  });

  describe("connectAndSetup", () => {
    it("should throw error when accountStrategy not configured", async () => {
      orchestrator = new ConnectionOrchestrator({
        ...baseConfig,
        sessionManager: mockSessionManager,
      });

      await expect(orchestrator.connectAndSetup(mockConnector)).rejects.toThrow(
        "Account strategy is required",
      );
    });

    it("should connect and skip grants when no grant config", async () => {
      const { connectAccount } = await import("../flow/accountConnection");
      (connectAccount as any).mockResolvedValueOnce({
        smartAccountAddress: "xion1smart",
        granteeAddress: "xion1grantee",
        sessionKeypair: {},
        connectionInfo: {},
      });

      orchestrator = new ConnectionOrchestrator({
        ...baseConfig,
        sessionManager: mockSessionManager,
        accountStrategy: mockAccountStrategy,
      });

      await orchestrator.connectAndSetup(mockConnector);

      expect(mockSessionManager.setGranter).toHaveBeenCalledWith("xion1smart");
    });

    it("should create grants when treasury configured", async () => {
      const { connectAccount } = await import("../flow/accountConnection");
      const { createGrants } = await import("../flow/grantCreation");

      (connectAccount as any).mockResolvedValueOnce({
        smartAccountAddress: "xion1smart",
        granteeAddress: "xion1grantee",
        sessionKeypair: { getAccounts: vi.fn() },
        connectionInfo: {},
      });

      (createGrants as any).mockResolvedValueOnce({ success: true });

      const { GranteeSignerClient } = await import(
        "@burnt-labs/abstraxion-core"
      );
      (GranteeSignerClient.connectWithSigner as any).mockResolvedValueOnce({});

      orchestrator = new ConnectionOrchestrator({
        ...baseConfig,
        sessionManager: mockSessionManager,
        accountStrategy: mockAccountStrategy,
        grantConfig: { treasury: "xion1treasury" },
      });

      await orchestrator.connectAndSetup(mockConnector);

      expect(createGrants).toHaveBeenCalled();
    });

    it("should throw error when grant creation fails", async () => {
      const { connectAccount } = await import("../flow/accountConnection");
      const { createGrants } = await import("../flow/grantCreation");

      (connectAccount as any).mockResolvedValueOnce({
        smartAccountAddress: "xion1smart",
        granteeAddress: "xion1grantee",
        sessionKeypair: {},
        connectionInfo: {},
      });

      (createGrants as any).mockResolvedValueOnce({
        success: false,
        error: "Grant creation failed",
      });

      orchestrator = new ConnectionOrchestrator({
        ...baseConfig,
        sessionManager: mockSessionManager,
        accountStrategy: mockAccountStrategy,
        grantConfig: { treasury: "xion1treasury" },
      });

      await expect(orchestrator.connectAndSetup(mockConnector)).rejects.toThrow(
        "Failed to create grants",
      );
    });
  });

  describe("destroy", () => {
    it("should call destroy without errors", () => {
      orchestrator = new ConnectionOrchestrator({
        ...baseConfig,
        sessionManager: mockSessionManager,
      });

      expect(() => orchestrator.destroy()).not.toThrow();
    });
  });
});
