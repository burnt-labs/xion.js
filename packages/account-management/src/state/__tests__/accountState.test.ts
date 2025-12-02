/**
 * State Machine Tests - accountState.ts
 * 
 * Focus: Breaking state transitions, invalid actions, edge cases
 * Goal: Ensure state machine maintains consistency and rejects invalid transitions
 */

import { describe, it, expect } from "vitest";
import {
  accountStateReducer,
  isValidTransition,
  AccountStateGuards,
  type AccountState,
  type AccountStateAction,
  type AccountInfo,
} from "../accountState";
import type { SignArbSecp256k1HdWallet } from "@burnt-labs/abstraxion-core";
import type { GranteeSignerClient } from "@burnt-labs/abstraxion-core";

// Mock account info for testing
function createMockAccountInfo(): AccountInfo {
  return {
    keypair: {} as SignArbSecp256k1HdWallet,
    granterAddress: "xion1granter123456789abcdefghijklmnopqrstuv",
    granteeAddress: "xion1grantee123456789abcdefghijklmnopqrstuv",
  };
}

function createMockSigningClient(): GranteeSignerClient {
  return {} as GranteeSignerClient;
}

describe("accountState.test.ts - State Machine Breaking Tests", () => {
  describe("🔴 CRITICAL: State Guards", () => {
    describe("isIdle", () => {
      it("should return true for idle state", () => {
        const state: AccountState = { status: "idle" };
        expect(AccountStateGuards.isIdle(state)).toBe(true);
      });

      it("should return false for non-idle states", () => {
        expect(AccountStateGuards.isIdle({ status: "initializing" })).toBe(false);
        expect(AccountStateGuards.isIdle({ status: "redirecting", dashboardUrl: "https://test.com" })).toBe(false);
        expect(AccountStateGuards.isIdle({ status: "connecting" })).toBe(false);
        expect(AccountStateGuards.isIdle({ status: "error", error: "test" })).toBe(false);
      });

      it("should narrow type correctly", () => {
        const state: AccountState = { status: "idle" };
        if (AccountStateGuards.isIdle(state)) {
          // TypeScript should know state is { status: "idle" }
          expect(state.status).toBe("idle");
        }
      });
    });

    describe("isInitializing", () => {
      it("should return true for initializing state", () => {
        const state: AccountState = { status: "initializing" };
        expect(AccountStateGuards.isInitializing(state)).toBe(true);
      });

      it("should return false for non-initializing states", () => {
        expect(AccountStateGuards.isInitializing({ status: "idle" })).toBe(false);
        expect(AccountStateGuards.isInitializing({ status: "connected", account: createMockAccountInfo(), signingClient: createMockSigningClient() })).toBe(false);
      });
    });

    describe("isRedirecting", () => {
      it("should return true for redirecting state with dashboardUrl", () => {
        const state: AccountState = { status: "redirecting", dashboardUrl: "https://test.com" };
        expect(AccountStateGuards.isRedirecting(state)).toBe(true);
      });

      it("should return false for non-redirecting states", () => {
        expect(AccountStateGuards.isRedirecting({ status: "idle" })).toBe(false);
        expect(AccountStateGuards.isRedirecting({ status: "connecting" })).toBe(false);
      });

      it("should narrow type correctly to access dashboardUrl", () => {
        const state: AccountState = { status: "redirecting", dashboardUrl: "https://test.com" };
        if (AccountStateGuards.isRedirecting(state)) {
          expect(state.dashboardUrl).toBe("https://test.com");
        }
      });
    });

    describe("isConnecting", () => {
      it("should return true for connecting state without connectorId", () => {
        const state: AccountState = { status: "connecting" };
        expect(AccountStateGuards.isConnecting(state)).toBe(true);
      });

      it("should return true for connecting state with connectorId", () => {
        const state: AccountState = { status: "connecting", connectorId: "metamask" };
        expect(AccountStateGuards.isConnecting(state)).toBe(true);
      });

      it("should return false for non-connecting states", () => {
        expect(AccountStateGuards.isConnecting({ status: "idle" })).toBe(false);
        expect(AccountStateGuards.isConnecting({ status: "connected", account: createMockAccountInfo(), signingClient: createMockSigningClient() })).toBe(false);
      });
    });

    describe("isConfiguringPermissions", () => {
      it("should return true for configuring-permissions state", () => {
        const state: AccountState = {
          status: "configuring-permissions",
          smartAccountAddress: "xion1account123456789abcdefghijklmnopqrstuv",
        };
        expect(AccountStateGuards.isConfiguringPermissions(state)).toBe(true);
      });

      it("should return false for non-configuring states", () => {
        expect(AccountStateGuards.isConfiguringPermissions({ status: "idle" })).toBe(false);
        expect(AccountStateGuards.isConfiguringPermissions({ status: "connecting" })).toBe(false);
      });

      it("should narrow type correctly to access smartAccountAddress", () => {
        const state: AccountState = {
          status: "configuring-permissions",
          smartAccountAddress: "xion1account123456789abcdefghijklmnopqrstuv",
        };
        if (AccountStateGuards.isConfiguringPermissions(state)) {
          expect(state.smartAccountAddress).toBe("xion1account123456789abcdefghijklmnopqrstuv");
        }
      });
    });

    describe("isConnected", () => {
      it("should return true for connected state", () => {
        const accountInfo = createMockAccountInfo();
        const signingClient = createMockSigningClient();
        const state: AccountState = {
          status: "connected",
          account: accountInfo,
          signingClient,
        };
        expect(AccountStateGuards.isConnected(state)).toBe(true);
      });

      it("should return false for non-connected states", () => {
        expect(AccountStateGuards.isConnected({ status: "idle" })).toBe(false);
        expect(AccountStateGuards.isConnected({ status: "error", error: "test" })).toBe(false);
      });

      it("should narrow type correctly to access account and signingClient", () => {
        const accountInfo = createMockAccountInfo();
        const signingClient = createMockSigningClient();
        const state: AccountState = {
          status: "connected",
          account: accountInfo,
          signingClient,
        };
        if (AccountStateGuards.isConnected(state)) {
          expect(state.account).toBe(accountInfo);
          expect(state.signingClient).toBe(signingClient);
        }
      });
    });

    describe("isError", () => {
      it("should return true for error state", () => {
        const state: AccountState = { status: "error", error: "Something went wrong" };
        expect(AccountStateGuards.isError(state)).toBe(true);
      });

      it("should return false for non-error states", () => {
        expect(AccountStateGuards.isError({ status: "idle" })).toBe(false);
        expect(AccountStateGuards.isError({ status: "connected", account: createMockAccountInfo(), signingClient: createMockSigningClient() })).toBe(false);
      });

      it("should narrow type correctly to access error message", () => {
        const state: AccountState = { status: "error", error: "Network error" };
        if (AccountStateGuards.isError(state)) {
          expect(state.error).toBe("Network error");
        }
      });
    });
  });

  describe("🔴 CRITICAL: State Reducer - Valid Transitions", () => {
    describe("INITIALIZE action", () => {
      it("should transition from idle to initializing", () => {
        const state: AccountState = { status: "idle" };
        const action: AccountStateAction = { type: "INITIALIZE" };
        const newState = accountStateReducer(state, action);
        expect(newState.status).toBe("initializing");
      });

      it("should transition from any state to initializing (reducer doesn't validate)", () => {
        // Note: Reducer doesn't validate transitions - isValidTransition does
        const states: AccountState[] = [
          { status: "idle" },
          { status: "initializing" },
          { status: "redirecting", dashboardUrl: "https://test.com" },
          { status: "connecting" },
          { status: "error", error: "test" },
        ];

        states.forEach((state) => {
          const action: AccountStateAction = { type: "INITIALIZE" };
          const newState = accountStateReducer(state, action);
          expect(newState.status).toBe("initializing");
        });
      });
    });

    describe("START_REDIRECT action", () => {
      it("should transition to redirecting with dashboardUrl", () => {
        const state: AccountState = { status: "initializing" };
        const action: AccountStateAction = {
          type: "START_REDIRECT",
          dashboardUrl: "https://dashboard.test.com",
        };
        const newState = accountStateReducer(state, action);
        expect(newState.status).toBe("redirecting");
        if (newState.status === "redirecting") {
          expect(newState.dashboardUrl).toBe("https://dashboard.test.com");
        }
      });

      it("should handle empty dashboardUrl", () => {
        const state: AccountState = { status: "initializing" };
        const action: AccountStateAction = {
          type: "START_REDIRECT",
          dashboardUrl: "",
        };
        const newState = accountStateReducer(state, action);
        expect(newState.status).toBe("redirecting");
        if (newState.status === "redirecting") {
          expect(newState.dashboardUrl).toBe("");
        }
      });

      it("should handle very long dashboardUrl", () => {
        const longUrl = "https://test.com?" + "a".repeat(10000);
        const state: AccountState = { status: "initializing" };
        const action: AccountStateAction = {
          type: "START_REDIRECT",
          dashboardUrl: longUrl,
        };
        const newState = accountStateReducer(state, action);
        expect(newState.status).toBe("redirecting");
        if (newState.status === "redirecting") {
          expect(newState.dashboardUrl).toBe(longUrl);
        }
      });
    });

    describe("START_CONNECT action", () => {
      it("should transition to connecting without connectorId", () => {
        const state: AccountState = { status: "idle" };
        const action: AccountStateAction = { type: "START_CONNECT" };
        const newState = accountStateReducer(state, action);
        expect(newState.status).toBe("connecting");
        if (newState.status === "connecting") {
          expect(newState.connectorId).toBeUndefined();
        }
      });

      it("should transition to connecting with connectorId", () => {
        const state: AccountState = { status: "idle" };
        const action: AccountStateAction = {
          type: "START_CONNECT",
          connectorId: "metamask",
        };
        const newState = accountStateReducer(state, action);
        expect(newState.status).toBe("connecting");
        if (newState.status === "connecting") {
          expect(newState.connectorId).toBe("metamask");
        }
      });

      it("should handle empty connectorId", () => {
        const state: AccountState = { status: "idle" };
        const action: AccountStateAction = {
          type: "START_CONNECT",
          connectorId: "",
        };
        const newState = accountStateReducer(state, action);
        expect(newState.status).toBe("connecting");
        if (newState.status === "connecting") {
          expect(newState.connectorId).toBe("");
        }
      });
    });

    describe("START_CONFIGURING_PERMISSIONS action", () => {
      it("should transition to configuring-permissions with smartAccountAddress", () => {
        const state: AccountState = { status: "connecting" };
        const action: AccountStateAction = {
          type: "START_CONFIGURING_PERMISSIONS",
          smartAccountAddress: "xion1account123456789abcdefghijklmnopqrstuv",
        };
        const newState = accountStateReducer(state, action);
        expect(newState.status).toBe("configuring-permissions");
        if (newState.status === "configuring-permissions") {
          expect(newState.smartAccountAddress).toBe("xion1account123456789abcdefghijklmnopqrstuv");
        }
      });

      it("should handle empty smartAccountAddress", () => {
        const state: AccountState = { status: "connecting" };
        const action: AccountStateAction = {
          type: "START_CONFIGURING_PERMISSIONS",
          smartAccountAddress: "",
        };
        const newState = accountStateReducer(state, action);
        expect(newState.status).toBe("configuring-permissions");
        if (newState.status === "configuring-permissions") {
          expect(newState.smartAccountAddress).toBe("");
        }
      });

      it("should handle invalid bech32 address format", () => {
        const state: AccountState = { status: "connecting" };
        const action: AccountStateAction = {
          type: "START_CONFIGURING_PERMISSIONS",
          smartAccountAddress: "invalid-address",
        };
        const newState = accountStateReducer(state, action);
        expect(newState.status).toBe("configuring-permissions");
        if (newState.status === "configuring-permissions") {
          expect(newState.smartAccountAddress).toBe("invalid-address");
        }
      });
    });

    describe("SET_CONNECTED action", () => {
      it("should transition to connected with account and signingClient", () => {
        const accountInfo = createMockAccountInfo();
        const signingClient = createMockSigningClient();
        const state: AccountState = {
          status: "configuring-permissions",
          smartAccountAddress: "xion1account123456789abcdefghijklmnopqrstuv",
        };
        const action: AccountStateAction = {
          type: "SET_CONNECTED",
          account: accountInfo,
          signingClient,
        };
        const newState = accountStateReducer(state, action);
        expect(newState.status).toBe("connected");
        if (newState.status === "connected") {
          expect(newState.account).toBe(accountInfo);
          expect(newState.signingClient).toBe(signingClient);
        }
      });

      it("should preserve account data correctly", () => {
        const accountInfo: AccountInfo = {
          keypair: {} as SignArbSecp256k1HdWallet,
          granterAddress: "xion1granter123456789abcdefghijklmnopqrstuv",
          granteeAddress: "xion1grantee123456789abcdefghijklmnopqrstuv",
        };
        const signingClient = createMockSigningClient();
        const state: AccountState = { status: "connecting" };
        const action: AccountStateAction = {
          type: "SET_CONNECTED",
          account: accountInfo,
          signingClient,
        };
        const newState = accountStateReducer(state, action);
        if (newState.status === "connected") {
          expect(newState.account.granterAddress).toBe(accountInfo.granterAddress);
          expect(newState.account.granteeAddress).toBe(accountInfo.granteeAddress);
        }
      });
    });

    describe("SET_ERROR action", () => {
      it("should transition to error state with error message", () => {
        const state: AccountState = { status: "connecting" };
        const action: AccountStateAction = {
          type: "SET_ERROR",
          error: "Connection failed",
        };
        const newState = accountStateReducer(state, action);
        expect(newState.status).toBe("error");
        if (newState.status === "error") {
          expect(newState.error).toBe("Connection failed");
        }
      });

      it("should handle empty error message", () => {
        const state: AccountState = { status: "connecting" };
        const action: AccountStateAction = {
          type: "SET_ERROR",
          error: "",
        };
        const newState = accountStateReducer(state, action);
        expect(newState.status).toBe("error");
        if (newState.status === "error") {
          expect(newState.error).toBe("");
        }
      });

      it("should handle very long error messages", () => {
        const longError = "Error: " + "a".repeat(10000);
        const state: AccountState = { status: "connecting" };
        const action: AccountStateAction = {
          type: "SET_ERROR",
          error: longError,
        };
        const newState = accountStateReducer(state, action);
        expect(newState.status).toBe("error");
        if (newState.status === "error") {
          expect(newState.error).toBe(longError);
        }
      });

      it("should transition from connected to error (reducer allows)", () => {
        // Note: isValidTransition would reject this, but reducer doesn't check
        const accountInfo = createMockAccountInfo();
        const signingClient = createMockSigningClient();
        const state: AccountState = {
          status: "connected",
          account: accountInfo,
          signingClient,
        };
        const action: AccountStateAction = {
          type: "SET_ERROR",
          error: "Post-connection error",
        };
        const newState = accountStateReducer(state, action);
        expect(newState.status).toBe("error");
      });
    });

    describe("RESET action", () => {
      it("should reset from idle to idle", () => {
        const state: AccountState = { status: "idle" };
        const action: AccountStateAction = { type: "RESET" };
        const newState = accountStateReducer(state, action);
        expect(newState.status).toBe("idle");
      });

      it("should reset from connected to idle", () => {
        const accountInfo = createMockAccountInfo();
        const signingClient = createMockSigningClient();
        const state: AccountState = {
          status: "connected",
          account: accountInfo,
          signingClient,
        };
        const action: AccountStateAction = { type: "RESET" };
        const newState = accountStateReducer(state, action);
        expect(newState.status).toBe("idle");
      });

      it("should reset from error to idle", () => {
        const state: AccountState = { status: "error", error: "Some error" };
        const action: AccountStateAction = { type: "RESET" };
        const newState = accountStateReducer(state, action);
        expect(newState.status).toBe("idle");
      });

      it("should reset from any state to idle", () => {
        const states: AccountState[] = [
          { status: "idle" },
          { status: "initializing" },
          { status: "redirecting", dashboardUrl: "https://test.com" },
          { status: "connecting" },
          {
            status: "configuring-permissions",
            smartAccountAddress: "xion1account123456789abcdefghijklmnopqrstuv",
          },
          {
            status: "connected",
            account: createMockAccountInfo(),
            signingClient: createMockSigningClient(),
          },
          { status: "error", error: "test" },
        ];

        states.forEach((state) => {
          const action: AccountStateAction = { type: "RESET" };
          const newState = accountStateReducer(state, action);
          expect(newState.status).toBe("idle");
        });
      });
    });

    describe("Invalid/Unknown Actions", () => {
      it("should return current state for unknown action type", () => {
        const state: AccountState = { status: "idle" };
        const action = { type: "UNKNOWN_ACTION" } as any;
        const newState = accountStateReducer(state, action);
        expect(newState).toBe(state); // Should return same state
      });

      it("should return current state for malformed action", () => {
        const state: AccountState = { status: "connecting" };
        const action = {} as any;
        const newState = accountStateReducer(state, action);
        expect(newState).toBe(state);
      });

      it("should return current state for null action", () => {
        const state: AccountState = { status: "idle" };
        const action = null as any;
        const newState = accountStateReducer(state, action);
        expect(newState).toBe(state);
      });
    });
  });

  describe("🔴 CRITICAL: Transition Validation", () => {
    describe("Valid Transitions", () => {
      it("should allow INITIALIZE from idle", () => {
        const state: AccountState = { status: "idle" };
        expect(isValidTransition(state, "INITIALIZE")).toBe(true);
      });

      it("should allow START_REDIRECT from initializing", () => {
        const state: AccountState = { status: "initializing" };
        expect(isValidTransition(state, "START_REDIRECT")).toBe(true);
      });

      it("should allow START_CONNECT from idle", () => {
        const state: AccountState = { status: "idle" };
        expect(isValidTransition(state, "START_CONNECT")).toBe(true);
      });

      it("should allow START_CONNECT from initializing", () => {
        const state: AccountState = { status: "initializing" };
        expect(isValidTransition(state, "START_CONNECT")).toBe(true);
      });

      it("should allow START_CONFIGURING_PERMISSIONS from connecting", () => {
        const state: AccountState = { status: "connecting" };
        expect(isValidTransition(state, "START_CONFIGURING_PERMISSIONS")).toBe(true);
      });

      it("should allow SET_CONNECTED from configuring-permissions", () => {
        const state: AccountState = {
          status: "configuring-permissions",
          smartAccountAddress: "xion1account123456789abcdefghijklmnopqrstuv",
        };
        expect(isValidTransition(state, "SET_CONNECTED")).toBe(true);
      });

      it("should allow SET_CONNECTED from connecting", () => {
        const state: AccountState = { status: "connecting" };
        expect(isValidTransition(state, "SET_CONNECTED")).toBe(true);
      });

      it("should allow SET_ERROR from non-terminal states", () => {
        const states: AccountState[] = [
          { status: "idle" },
          { status: "initializing" },
          { status: "redirecting", dashboardUrl: "https://test.com" },
          { status: "connecting" },
          {
            status: "configuring-permissions",
            smartAccountAddress: "xion1account123456789abcdefghijklmnopqrstuv",
          },
        ];

        states.forEach((state) => {
          expect(isValidTransition(state, "SET_ERROR")).toBe(true);
        });
      });

      it("should allow RESET from any state", () => {
        const states: AccountState[] = [
          { status: "idle" },
          { status: "initializing" },
          { status: "redirecting", dashboardUrl: "https://test.com" },
          { status: "connecting" },
          {
            status: "configuring-permissions",
            smartAccountAddress: "xion1account123456789abcdefghijklmnopqrstuv",
          },
          {
            status: "connected",
            account: createMockAccountInfo(),
            signingClient: createMockSigningClient(),
          },
          { status: "error", error: "test" },
        ];

        states.forEach((state) => {
          expect(isValidTransition(state, "RESET")).toBe(true);
        });
      });
    });

    describe("Invalid Transitions", () => {
      it("should reject INITIALIZE from non-idle states", () => {
        const states: AccountState[] = [
          { status: "initializing" },
          { status: "redirecting", dashboardUrl: "https://test.com" },
          { status: "connecting" },
          {
            status: "configuring-permissions",
            smartAccountAddress: "xion1account123456789abcdefghijklmnopqrstuv",
          },
          {
            status: "connected",
            account: createMockAccountInfo(),
            signingClient: createMockSigningClient(),
          },
          { status: "error", error: "test" },
        ];

        states.forEach((state) => {
          expect(isValidTransition(state, "INITIALIZE")).toBe(false);
        });
      });

      it("should reject START_REDIRECT from non-initializing states", () => {
        const states: AccountState[] = [
          { status: "idle" },
          { status: "redirecting", dashboardUrl: "https://test.com" },
          { status: "connecting" },
          {
            status: "connected",
            account: createMockAccountInfo(),
            signingClient: createMockSigningClient(),
          },
          { status: "error", error: "test" },
        ];

        states.forEach((state) => {
          expect(isValidTransition(state, "START_REDIRECT")).toBe(false);
        });
      });

      it("should reject START_CONNECT from non-idle/non-initializing states", () => {
        const states: AccountState[] = [
          { status: "redirecting", dashboardUrl: "https://test.com" },
          {
            status: "configuring-permissions",
            smartAccountAddress: "xion1account123456789abcdefghijklmnopqrstuv",
          },
          {
            status: "connected",
            account: createMockAccountInfo(),
            signingClient: createMockSigningClient(),
          },
          { status: "error", error: "test" },
        ];

        states.forEach((state) => {
          expect(isValidTransition(state, "START_CONNECT")).toBe(false);
        });
      });

      it("should reject START_CONFIGURING_PERMISSIONS from non-connecting states", () => {
        const states: AccountState[] = [
          { status: "idle" },
          { status: "initializing" },
          { status: "redirecting", dashboardUrl: "https://test.com" },
          {
            status: "configuring-permissions",
            smartAccountAddress: "xion1account123456789abcdefghijklmnopqrstuv",
          },
          {
            status: "connected",
            account: createMockAccountInfo(),
            signingClient: createMockSigningClient(),
          },
          { status: "error", error: "test" },
        ];

        states.forEach((state) => {
          expect(isValidTransition(state, "START_CONFIGURING_PERMISSIONS")).toBe(false);
        });
      });

      it("should reject SET_CONNECTED from non-connecting/non-configuring states", () => {
        const states: AccountState[] = [
          { status: "idle" },
          { status: "initializing" },
          { status: "redirecting", dashboardUrl: "https://test.com" },
          {
            status: "connected",
            account: createMockAccountInfo(),
            signingClient: createMockSigningClient(),
          },
          { status: "error", error: "test" },
        ];

        states.forEach((state) => {
          expect(isValidTransition(state, "SET_CONNECTED")).toBe(false);
        });
      });

      it("should reject SET_ERROR from terminal states (connected, error)", () => {
        const states: AccountState[] = [
          {
            status: "connected",
            account: createMockAccountInfo(),
            signingClient: createMockSigningClient(),
          },
          { status: "error", error: "test" },
        ];

        states.forEach((state) => {
          expect(isValidTransition(state, "SET_ERROR")).toBe(false);
        });
      });
    });

    describe("Edge Cases", () => {
      it("should handle transition validation with invalid action type", () => {
        const state: AccountState = { status: "idle" };
        // @ts-expect-error - Testing runtime behavior
        expect(isValidTransition(state, "INVALID_ACTION")).toBe(false);
      });

      it("should handle transition validation with empty string action type", () => {
        const state: AccountState = { status: "idle" };
        // @ts-expect-error - Testing runtime behavior
        expect(isValidTransition(state, "")).toBe(false);
      });

      it("should handle transition validation with null action type", () => {
        const state: AccountState = { status: "idle" };
        // @ts-expect-error - Testing runtime behavior
        expect(isValidTransition(state, null)).toBe(false);
      });
    });
  });

  describe("🔴 CRITICAL: State Consistency & Round-Trip", () => {
    it("should maintain state consistency through multiple transitions", () => {
      let state: AccountState = { status: "idle" };

      // idle → initializing
      state = accountStateReducer(state, { type: "INITIALIZE" });
      expect(state.status).toBe("initializing");

      // initializing → connecting
      state = accountStateReducer(state, { type: "START_CONNECT" });
      expect(state.status).toBe("connecting");

      // connecting → configuring-permissions
      state = accountStateReducer(state, {
        type: "START_CONFIGURING_PERMISSIONS",
        smartAccountAddress: "xion1account123456789abcdefghijklmnopqrstuv",
      });
      expect(state.status).toBe("configuring-permissions");

      // configuring-permissions → connected
      const accountInfo = createMockAccountInfo();
      const signingClient = createMockSigningClient();
      state = accountStateReducer(state, {
        type: "SET_CONNECTED",
        account: accountInfo,
        signingClient,
      });
      expect(state.status).toBe("connected");

      // connected → idle (reset)
      state = accountStateReducer(state, { type: "RESET" });
      expect(state.status).toBe("idle");
    });

    it("should handle error recovery flow", () => {
      let state: AccountState = { status: "idle" };

      // idle → initializing
      state = accountStateReducer(state, { type: "INITIALIZE" });
      expect(state.status).toBe("initializing");

      // initializing → connecting
      state = accountStateReducer(state, { type: "START_CONNECT" });
      expect(state.status).toBe("connecting");

      // connecting → error
      state = accountStateReducer(state, {
        type: "SET_ERROR",
        error: "Connection failed",
      });
      expect(state.status).toBe("error");
      if (state.status === "error") {
        expect(state.error).toBe("Connection failed");
      }

      // error → idle (reset)
      state = accountStateReducer(state, { type: "RESET" });
      expect(state.status).toBe("idle");
    });

    it("should handle redirect flow", () => {
      let state: AccountState = { status: "idle" };

      // idle → initializing
      state = accountStateReducer(state, { type: "INITIALIZE" });
      expect(state.status).toBe("initializing");

      // initializing → redirecting
      state = accountStateReducer(state, {
        type: "START_REDIRECT",
        dashboardUrl: "https://dashboard.test.com",
      });
      expect(state.status).toBe("redirecting");
      if (state.status === "redirecting") {
        expect(state.dashboardUrl).toBe("https://dashboard.test.com");
      }

      // redirecting → idle (reset)
      state = accountStateReducer(state, { type: "RESET" });
      expect(state.status).toBe("idle");
    });
  });

  describe("🔴 CRITICAL: Invalid Action Payloads", () => {
    it("should handle START_REDIRECT with missing dashboardUrl", () => {
      const state: AccountState = { status: "initializing" };
      // TypeScript should catch this, but test runtime behavior
      const action = { type: "START_REDIRECT" } as any;
      const newState = accountStateReducer(state, action);
      // Should still transition but dashboardUrl might be undefined
      expect(newState.status).toBe("redirecting");
    });

    it("should handle START_CONFIGURING_PERMISSIONS with missing smartAccountAddress", () => {
      const state: AccountState = { status: "connecting" };
      const action = { type: "START_CONFIGURING_PERMISSIONS" } as any;
      const newState = accountStateReducer(state, action);
      expect(newState.status).toBe("configuring-permissions");
    });

    it("should handle SET_CONNECTED with missing account", () => {
      const state: AccountState = { status: "connecting" };
      const action = { type: "SET_CONNECTED", signingClient: createMockSigningClient() } as any;
      const newState = accountStateReducer(state, action);
      expect(newState.status).toBe("connected");
    });

    it("should handle SET_CONNECTED with missing signingClient", () => {
      const state: AccountState = { status: "connecting" };
      const action = { type: "SET_CONNECTED", account: createMockAccountInfo() } as any;
      const newState = accountStateReducer(state, action);
      expect(newState.status).toBe("connected");
    });

    it("should handle SET_ERROR with missing error", () => {
      const state: AccountState = { status: "connecting" };
      const action = { type: "SET_ERROR" } as any;
      const newState = accountStateReducer(state, action);
      expect(newState.status).toBe("error");
    });
  });

  describe("🔴 CRITICAL: State Immutability", () => {
    it("should not mutate original state", () => {
      const originalState: AccountState = { status: "idle" };
      const action: AccountStateAction = { type: "INITIALIZE" };
      const newState = accountStateReducer(originalState, action);

      expect(originalState.status).toBe("idle");
      expect(newState.status).toBe("initializing");
      expect(newState).not.toBe(originalState);
    });

    it("should create new objects for nested state", () => {
      const accountInfo = createMockAccountInfo();
      const signingClient = createMockSigningClient();
      const originalState: AccountState = {
        status: "connected",
        account: accountInfo,
        signingClient,
      };
      const action: AccountStateAction = { type: "RESET" };
      const newState = accountStateReducer(originalState, action);

      expect(originalState.status).toBe("connected");
      expect(newState.status).toBe("idle");
    });
  });

  describe("🔴 CRITICAL: Terminal States", () => {
    it("should identify connected as terminal state", () => {
      const state: AccountState = {
        status: "connected",
        account: createMockAccountInfo(),
        signingClient: createMockSigningClient(),
      };
      expect(AccountStateGuards.isConnected(state)).toBe(true);
      expect(isValidTransition(state, "SET_ERROR")).toBe(false);
    });

    it("should identify error as terminal state", () => {
      const state: AccountState = { status: "error", error: "test" };
      expect(AccountStateGuards.isError(state)).toBe(true);
      expect(isValidTransition(state, "SET_ERROR")).toBe(false);
    });

    it("should allow RESET from terminal states", () => {
      const states: AccountState[] = [
        {
          status: "connected",
          account: createMockAccountInfo(),
          signingClient: createMockSigningClient(),
        },
        { status: "error", error: "test" },
      ];

      states.forEach((state) => {
        expect(isValidTransition(state, "RESET")).toBe(true);
      });
    });
  });
});

