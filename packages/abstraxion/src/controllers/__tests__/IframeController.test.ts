/**
 * Unit tests for IframeController signWithMetaAccount
 */

import { describe, it, expect, vi } from "vitest";

// Mock the external dependencies before importing the controller
vi.mock("@burnt-labs/abstraxion-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@burnt-labs/abstraxion-core")>();
  return {
    ...actual,
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
  const actual = await importOriginal<typeof import("@burnt-labs/account-management")>();
  return {
    ...actual,
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
        type: "iframe",
        iframeUrl: "https://dashboard.xion.burnt.com/iframe",
      },
      storageStrategy: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    };

    return new IframeController(config);
  };

  describe("signWithMetaAccount", () => {
    it("should throw 'not yet implemented' error", async () => {
      const controller = createController();

      await expect(
        controller.signWithMetaAccount(
          "xion1abc123",
          [{ typeUrl: "/cosmos.bank.v1beta1.MsgSend", value: {} }],
          "auto",
        ),
      ).rejects.toThrow(
        "Iframe direct signing is not yet implemented. Coming in Phase 2.",
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
        expect((error as Error).message).toContain("signer mode");
        expect((error as Error).message).toContain("requireAuth");
      }
    });
  });
});
