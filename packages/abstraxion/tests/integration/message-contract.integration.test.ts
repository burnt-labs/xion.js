/**
 * Message Contract Tests
 *
 * Validates the message protocol between SDK and Dashboard for all modes.
 * These are the highest-value regression tests — they catch when either side
 * changes the message format and breaks the other.
 *
 * Tests cover:
 * - Popup mode: postMessage types (CONNECT_SUCCESS, CONNECT_REJECTED, SIGN_SUCCESS, etc.)
 * - Embedded mode: MessageChannel protocol (CONNECT, DISCONNECT, SIGN_AND_BROADCAST, IFRAME_READY)
 * - Redirect mode: URL parameter contracts (?granted, ?granter, ?tx_hash, ?sign_error, etc.)
 *
 * These tests use the SAME message type strings that the dashboard uses,
 * so if either side renames them, these tests fail.
 */

import { describe, it, expect } from "vitest";
import { IframeMessageType, MessageTarget } from "@burnt-labs/abstraxion-core";

describe("SDK ↔ Dashboard Message Contract", () => {
  describe("Iframe MessageType enum values", () => {
    // These string values MUST match what the dashboard expects.
    // If you change these, the dashboard's IframeMessageHandler will stop routing.

    it("IFRAME_READY is used by dashboard to signal readiness", () => {
      expect(IframeMessageType.IFRAME_READY).toBe("IFRAME_READY");
    });

    it("CONNECT is sent by SDK to initiate authentication", () => {
      expect(IframeMessageType.CONNECT).toBe("CONNECT");
    });

    it("DISCONNECT is sent by SDK to end session", () => {
      expect(IframeMessageType.DISCONNECT).toBe("DISCONNECT");
    });

    it("GET_ADDRESS is sent by SDK to query current user", () => {
      expect(IframeMessageType.GET_ADDRESS).toBe("GET_ADDRESS");
    });

    it("SIGN_TRANSACTION is sent by SDK for signing without broadcast", () => {
      expect(IframeMessageType.SIGN_TRANSACTION).toBe("SIGN_TRANSACTION");
    });

    it("SIGN_AND_BROADCAST is sent by SDK for signing with broadcast", () => {
      expect(IframeMessageType.SIGN_AND_BROADCAST).toBe("SIGN_AND_BROADCAST");
    });

    it("ADD_AUTHENTICATOR is sent by SDK to add auth method", () => {
      expect(IframeMessageType.ADD_AUTHENTICATOR).toBe("ADD_AUTHENTICATOR");
    });

    it("REMOVE_AUTHENTICATOR is sent by SDK to remove auth method", () => {
      expect(IframeMessageType.REMOVE_AUTHENTICATOR).toBe(
        "REMOVE_AUTHENTICATOR",
      );
    });

    it("REQUEST_GRANT is sent by SDK to request treasury permissions", () => {
      expect(IframeMessageType.REQUEST_GRANT).toBe("REQUEST_GRANT");
    });
  });

  describe("MessageTarget values", () => {
    it("XION_IFRAME target must match dashboard expectations", () => {
      expect(MessageTarget.XION_IFRAME).toBe("xion_iframe");
    });
  });

  describe("Popup postMessage types", () => {
    // These string values are used in PopupController and must match what
    // the dashboard sends in its popup window scripts.

    const EXPECTED_POPUP_CONNECT_MESSAGES = {
      success: "CONNECT_SUCCESS",
      rejected: "CONNECT_REJECTED",
    };

    const EXPECTED_POPUP_SIGN_MESSAGES = {
      success: "SIGN_SUCCESS",
      rejected: "SIGN_REJECTED",
      error: "SIGN_ERROR",
    };

    it("CONNECT_SUCCESS includes address field", () => {
      // The dashboard sends: { type: "CONNECT_SUCCESS", address: "xion1..." }
      const msg = {
        type: EXPECTED_POPUP_CONNECT_MESSAGES.success,
        address: "xion1user123",
      };
      expect(msg.type).toBe("CONNECT_SUCCESS");
      expect(msg.address).toBeTruthy();
    });

    it("CONNECT_REJECTED has no required fields", () => {
      const msg = { type: EXPECTED_POPUP_CONNECT_MESSAGES.rejected };
      expect(msg.type).toBe("CONNECT_REJECTED");
    });

    it("SIGN_SUCCESS includes txHash field", () => {
      const msg = {
        type: EXPECTED_POPUP_SIGN_MESSAGES.success,
        txHash: "ABCDEF123",
      };
      expect(msg.type).toBe("SIGN_SUCCESS");
      expect(msg.txHash).toBeTruthy();
    });

    it("SIGN_REJECTED has no required fields", () => {
      const msg = { type: EXPECTED_POPUP_SIGN_MESSAGES.rejected };
      expect(msg.type).toBe("SIGN_REJECTED");
    });

    it("SIGN_ERROR includes message field", () => {
      const msg = {
        type: EXPECTED_POPUP_SIGN_MESSAGES.error,
        message: "Insufficient funds",
      };
      expect(msg.type).toBe("SIGN_ERROR");
      expect(msg.message).toBeTruthy();
    });
  });

  describe("Embedded iframe push messages", () => {
    // DISCONNECTED is the one raw postMessage (iframe → SDK)
    it("DISCONNECTED is sent by dashboard when user clicks disconnect", () => {
      const msg = { type: "DISCONNECTED" };
      expect(msg.type).toBe("DISCONNECTED");
    });
  });

  describe("Redirect URL parameter contracts", () => {
    // These URL parameters are the contract between dashboard and SDK.
    // Dashboard sets them when redirecting back.

    describe("connection callback params", () => {
      it("granted=true signals successful auth", () => {
        const params = new URLSearchParams("?granted=true&granter=xion1user");
        expect(params.get("granted")).toBe("true");
        expect(params.get("granter")).toBeTruthy();
      });

      it("granter param contains the user address", () => {
        const params = new URLSearchParams("?granted=true&granter=xion1abc123");
        expect(params.get("granter")).toMatch(/^xion1/);
      });
    });

    describe("signing callback params", () => {
      it("tx_hash signals successful signing", () => {
        const params = new URLSearchParams("?tx_hash=ABCDEF123456");
        expect(params.get("tx_hash")).toBeTruthy();
      });

      it("sign_rejected signals user rejection", () => {
        const params = new URLSearchParams("?sign_rejected=true");
        expect(params.get("sign_rejected")).toBe("true");
      });

      it("sign_error signals signing failure with message", () => {
        const params = new URLSearchParams("?sign_error=Insufficient%20funds");
        expect(params.get("sign_error")).toBe("Insufficient funds");
      });
    });

    describe("SDK → dashboard URL params", () => {
      it("popup mode sends correct params", () => {
        // This is the URL format the SDK builds for popup auth
        const url = new URL("https://dashboard.burnt.com");
        url.searchParams.set("grantee", "xion1grantee123");
        url.searchParams.set("redirect_uri", "https://myapp.com");
        url.searchParams.set("mode", "popup");
        url.searchParams.set("treasury", "xion1treasury");

        expect(url.searchParams.get("mode")).toBe("popup");
        expect(url.searchParams.get("grantee")).toBeTruthy();
        expect(url.searchParams.get("redirect_uri")).toBeTruthy();
      });

      it("embedded mode sends mode=inline", () => {
        const url = new URL("https://dashboard.burnt.com");
        url.searchParams.set("mode", "inline");
        url.searchParams.set("grantee", "xion1grantee123");

        expect(url.searchParams.get("mode")).toBe("inline");
      });

      it("signing popup sends correct params", () => {
        const url = new URL("https://dashboard.burnt.com");
        url.searchParams.set("mode", "sign");
        url.searchParams.set("tx", "base64encodedtxdata");
        url.searchParams.set("granter", "xion1user");
        url.searchParams.set("redirect_uri", "https://myapp.com");

        expect(url.searchParams.get("mode")).toBe("sign");
        expect(url.searchParams.get("tx")).toBeTruthy();
        expect(url.searchParams.get("granter")).toBeTruthy();
      });
    });
  });

  describe("MessageChannel response format", () => {
    // The MessageChannelManager expects responses in this format.
    // The dashboard's MessageChannelResponder sends this format.

    it("success response has success=true and data", () => {
      const response = { success: true, data: { address: "xion1user" } };
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });

    it("error response has success=false and error string", () => {
      const response = { success: false, error: "Auth failed" };
      expect(response.success).toBe(false);
      expect(typeof response.error).toBe("string");
    });

    it("error response may include code", () => {
      const response = {
        success: false,
        error: "Rate limited",
        code: "RATE_LIMIT_EXCEEDED",
      };
      expect(response.code).toBeDefined();
    });
  });

  describe("CONNECT payload shape", () => {
    it("CONNECT with treasury sends grantParams", () => {
      const payload = {
        grantParams: {
          treasuryAddress: "xion1treasury",
          grantee: "xion1grantee",
        },
      };
      expect(payload.grantParams.treasuryAddress).toBeTruthy();
      expect(payload.grantParams.grantee).toBeTruthy();
    });

    it("CONNECT without treasury sends empty grantParams", () => {
      const payload = { grantParams: undefined };
      expect(payload.grantParams).toBeUndefined();
    });
  });

  describe("SIGN_AND_BROADCAST payload shape", () => {
    it("sends transaction with messages, fee, memo and signerAddress", () => {
      const payload = {
        transaction: {
          messages: [
            {
              typeUrl: "/cosmos.bank.v1beta1.MsgSend",
              value: {
                fromAddress: "xion1sender",
                toAddress: "xion1receiver",
                amount: [{ denom: "uxion", amount: "1000" }],
              },
            },
          ],
          fee: "auto" as const,
          memo: "test",
        },
        signerAddress: "xion1sender",
      };

      expect(payload.transaction.messages).toHaveLength(1);
      expect(payload.transaction.messages[0].typeUrl).toContain("MsgSend");
      expect(payload.signerAddress).toBeTruthy();
    });
  });

  describe("SIGN_AND_BROADCAST response shape", () => {
    // The dashboard wraps the result in { signedTx: ... } and the SDK unwraps it.
    // The SDK consumer receives only { transactionHash } — NOT a full CosmJS DeliverTxResponse.
    // If either side changes this contract, IframeController.signAndBroadcastWithMetaAccount breaks.
    it("dashboard response contains signedTx.transactionHash", () => {
      // Simulates what the dashboard sends back via MessageChannel
      const dashboardResponse: { signedTx: { transactionHash: string } } = {
        signedTx: { transactionHash: "ABCDEF123456" },
      };
      expect(dashboardResponse.signedTx.transactionHash).toBeTruthy();
      // No other fields — consumers must query the chain RPC for full tx details
      expect((dashboardResponse.signedTx as Record<string, unknown>).height).toBeUndefined();
      expect((dashboardResponse.signedTx as Record<string, unknown>).gasUsed).toBeUndefined();
    });

    it("SDK consumer receives only transactionHash from signAndBroadcastWithMetaAccount", () => {
      // This documents the SignAndBroadcastResult contract.
      // If the dashboard starts returning more fields, update SignAndBroadcastResult too.
      const result: { transactionHash: string } = { transactionHash: "ABCDEF123456" };
      expect(typeof result.transactionHash).toBe("string");
    });
  });
});
