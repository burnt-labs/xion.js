/**
 * Unit tests for IframeController
 */

import { describe, it, expect, vi } from "vitest";

// Mock the external dependencies before importing the controller
vi.mock("@burnt-labs/abstraxion-core", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@burnt-labs/abstraxion-core")>();
  return {
    ...actual,
    AbstraxionAuth: vi.fn().mockImplementation(() => ({
      configureAbstraxionInstance: vi.fn(),
      getLocalKeypair: vi.fn(),
      getGranter: vi.fn(),
      setGranter: vi.fn(),
      generateAndStoreTempAccount: vi.fn(),
      getKeypairAddress: vi.fn(),
      getSigner: vi.fn(),
      authenticate: vi.fn(),
      logout: vi.fn(),
      abstractAccount: undefined,
    })),
    MessageChannelManager: vi.fn().mockImplementation(() => ({
      sendRequest: vi.fn(),
    })),
    SignArbSecp256k1HdWallet: {
      generate: vi.fn(),
      deserialize: vi.fn(),
    },
    GranteeSignerClient: {
      connectWithSigner: vi.fn(),
    },
    TypedEventEmitter: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      removeAllListeners: vi.fn(),
    })),
  };
});

vi.mock("@cosmjs/stargate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cosmjs/stargate")>();
  return {
    ...actual,
    GasPrice: {
      fromString: vi.fn((str: string) => ({ toString: () => str })),
    },
  };
});

vi.mock("@burnt-labs/account-management", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@burnt-labs/account-management")>();
  return {
    ...actual,
    ConnectionOrchestrator: vi.fn().mockImplementation(() => ({
      restoreSession: vi.fn().mockResolvedValue({ restored: false }),
      destroy: vi.fn(),
    })),
  };
});

vi.mock("@burnt-labs/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@burnt-labs/constants")>();
  return {
    ...actual,
    getDaoDaoIndexerUrl: vi.fn().mockReturnValue("https://indexer.example.com"),
  };
});

import { IframeController } from "../IframeController";
import type { IframeControllerConfig } from "../IframeController";

describe("IframeController", () => {
  const createController = (): IframeController => {
    const config: IframeControllerConfig = {
      chainId: "xion-testnet-1",
      rpcUrl: "https://rpc.xion-testnet-1.burnt.com",
      gasPrice: "0.001uxion",
      iframe: {
        type: "embedded",
        iframeUrl: "https://dashboard.xion.burnt.com",
      },
      storageStrategy: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      redirectStrategy: {
        getCurrentUrl: vi.fn().mockResolvedValue("http://localhost"),
        redirect: vi.fn(),
        getUrlParameter: vi.fn().mockResolvedValue(null),
        cleanUrlParameters: vi.fn(),
      },
    };

    return new IframeController(config);
  };

  describe("signWithMetaAccount", () => {
    it("should throw when iframe is not available", async () => {
      const controller = createController();

      await expect(
        controller.signWithMetaAccount(
          "xion1abc123",
          [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
          "auto",
        ),
      ).rejects.toThrow(
        "Iframe is not available. Ensure the iframe is mounted and the user is connected.",
      );
    });

    it("should include helpful guidance in the error message", async () => {
      const controller = createController();

      try {
        await controller.signWithMetaAccount(
          "xion1abc123",
          [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
          "auto",
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toContain("iframe");
        expect((error as Error).message).toContain("connected");
      }
    });
  });

  describe("connect", () => {
    it("should throw in non-browser environment", async () => {
      const controller = createController();

      // In node environment (no window/document), connect will fail
      await expect(controller.connect()).rejects.toThrow();
    });
  });
});
