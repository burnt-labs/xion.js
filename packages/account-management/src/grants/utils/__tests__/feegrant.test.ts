/**
 * Grant Utilities Tests - feegrant.ts
 * 
 * Focus: Network errors, malformed API responses, allowance validation edge cases
 * Goal: Ensure fee grant validation handles all failure scenarios gracefully
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  validateFeeGrant,
  validateActions,
  FeeGrantValidationError,
  InvalidAllowanceError,
} from "../feegrant";
import type { Allowance } from "../../../types/grants";
import { AllowedMsgAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/feegrant";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("feegrant.test.ts - Breaking Things", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("validateFeeGrant() - Network & API Edge Cases", () => {
    const mockRestUrl = "https://api.testnet.com";
    // Valid bech32 addresses: xion1 + 38+ alphanumeric chars (lowercase)
    const mockFeeGranter = "xion1feegranter123456789abcdefghijklmnopqrstuv";
    const mockGranter = "xion1granter123456789abcdefghijklmnopqrstuvwxyz";
    const mockRequestedActions = ["/cosmos.bank.v1beta1.MsgSend"];

    describe("Invalid Inputs", () => {
      it("should throw error for empty restUrl", async () => {
        await expect(
          validateFeeGrant("", mockFeeGranter, mockGranter, mockRequestedActions)
        ).rejects.toThrow(FeeGrantValidationError);
      });

      it("should return invalid result for empty feeGranter", async () => {
        const result = await validateFeeGrant(mockRestUrl, "", mockGranter, mockRequestedActions);
        expect(result.valid).toBe(false);
        expect(result.error).toBeInstanceOf(FeeGrantValidationError);
        expect(result.error.message).toContain("Fee granter and granter addresses must be non-empty strings");
      });

      it("should return invalid result for empty granter", async () => {
        const result = await validateFeeGrant(mockRestUrl, mockFeeGranter, "", mockRequestedActions);
        expect(result.valid).toBe(false);
        expect(result.error).toBeInstanceOf(FeeGrantValidationError);
        expect(result.error.message).toContain("Fee granter and granter addresses must be non-empty strings");
      });

      it("should throw error for empty requestedActions", async () => {
        await expect(
          validateFeeGrant(mockRestUrl, mockFeeGranter, mockGranter, [])
        ).rejects.toThrow(FeeGrantValidationError);
      });

      it("should throw network error for invalid URL", async () => {
        mockFetch.mockRejectedValue(new Error("Invalid URL"));
        await expect(
          validateFeeGrant(
            "not-a-url",
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          )
        ).rejects.toThrow(FeeGrantValidationError);
      });

      it("should handle empty feeGranter", async () => {
        const result = await validateFeeGrant(
          mockRestUrl,
          "",
          mockGranter,
          mockRequestedActions
        );
        expect(result.valid).toBe(false);
        expect(result.error).toBeInstanceOf(FeeGrantValidationError);
      });

      it("should handle empty granter", async () => {
        const result = await validateFeeGrant(
          mockRestUrl,
          mockFeeGranter,
          "",
          mockRequestedActions
        );
        expect(result.valid).toBe(false);
        expect(result.error).toBeInstanceOf(FeeGrantValidationError);
      });

      // Empty requestedActions is now validated and throws error

      // Invalid action types are filtered by TypeScript, but runtime behavior is tested in validateActions
    });

    describe("Network Error Scenarios", () => {
      it("should throw network error with proper error type", async () => {
        mockFetch.mockRejectedValue(new Error("NetworkError"));
        await expect(
          validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          )
        ).rejects.toThrow(FeeGrantValidationError);
        
        try {
          await validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          );
        } catch (error) {
          expect(error).toBeInstanceOf(FeeGrantValidationError);
          expect((error as FeeGrantValidationError).code).toBe("NETWORK_ERROR");
        }
      });

      it("should throw network error for timeout", async () => {
        mockFetch.mockImplementation(
          () =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), 100)
            )
        );
        await expect(
          validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          )
        ).rejects.toThrow(FeeGrantValidationError);
      });

      it("should throw network error for DNS failure", async () => {
        mockFetch.mockRejectedValue(new Error("ENOTFOUND"));
        await expect(
          validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          )
        ).rejects.toThrow(FeeGrantValidationError);
      });

      it("should throw network error for connection refused", async () => {
        mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));
        await expect(
          validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          )
        ).rejects.toThrow(FeeGrantValidationError);
      });
    });

    describe("HTTP Error Responses", () => {
      it("should throw HTTP error for 404 Not Found with proper error details", async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 404,
          statusText: "Not Found",
        });
        
        try {
          await validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          );
          expect.fail("Should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(FeeGrantValidationError);
          expect((error as FeeGrantValidationError).code).toBe("HTTP_ERROR");
          expect((error as FeeGrantValidationError).statusCode).toBe(404);
          expect((error as FeeGrantValidationError).message).toContain("404");
        }
      });

      it("should throw HTTP error for 500 Internal Server Error", async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        });
        await expect(
          validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          )
        ).rejects.toThrow(FeeGrantValidationError);
      });

      it("should throw HTTP error for 403 Forbidden", async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 403,
          statusText: "Forbidden",
        });
        await expect(
          validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          )
        ).rejects.toThrow(FeeGrantValidationError);
      });

      it("should throw HTTP error for 401 Unauthorized", async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
        });
        await expect(
          validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          )
        ).rejects.toThrow(FeeGrantValidationError);
      });

      it("should throw HTTP error for 429 Too Many Requests", async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
        });
        await expect(
          validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          )
        ).rejects.toThrow(FeeGrantValidationError);
      });

      it("should throw HTTP error for 503 Service Unavailable", async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
        });
        await expect(
          validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          )
        ).rejects.toThrow(FeeGrantValidationError);
      });
    });

    describe("Malformed JSON Responses", () => {
      it("should throw error for invalid JSON", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => {
            throw new Error("Invalid JSON");
          },
        });
        await expect(
          validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          )
        ).rejects.toThrow(FeeGrantValidationError);
      });

      it("should throw error for empty response", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({}),
        });
        await expect(
          validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          )
        ).rejects.toThrow(FeeGrantValidationError);
      });

      it("should throw error for missing allowance property", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ otherProperty: "value" }),
        });
        await expect(
          validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          )
        ).rejects.toThrow(FeeGrantValidationError);
      });

      it("should throw error for allowance as null", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ allowance: null }),
        });
        await expect(
          validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          )
        ).rejects.toThrow(FeeGrantValidationError);
      });

      it("should throw error for missing allowance.allowance", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({
            allowance: {
              granter: mockFeeGranter,
              grantee: mockGranter,
            },
          }),
        });
        await expect(
          validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          )
        ).rejects.toThrow(FeeGrantValidationError);
      });

      it("should throw error for allowance.allowance as null", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({
            allowance: {
              granter: mockFeeGranter,
              grantee: mockGranter,
              allowance: null,
            },
          }),
        });
        await expect(
          validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          )
        ).rejects.toThrow(FeeGrantValidationError);
      });

      it("should throw error for malformed allowance structure", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({
            allowance: {
              granter: mockFeeGranter,
              grantee: mockGranter,
              allowance: "string instead of object",
            },
          }),
        });
        await expect(
          validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          )
        ).rejects.toThrow(FeeGrantValidationError);
      });
    });

    describe("Exception Handling", () => {
      it("should throw network error for exception in fetch", async () => {
        mockFetch.mockImplementation(() => {
          throw new Error("Fetch exception");
        });
        await expect(
          validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          )
        ).rejects.toThrow(FeeGrantValidationError);
      });

      it("should throw error for exception in response.json()", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => {
            throw new Error("JSON parse exception");
          },
        });
        await expect(
          validateFeeGrant(
            mockRestUrl,
            mockFeeGranter,
            mockGranter,
            mockRequestedActions
          )
        ).rejects.toThrow(FeeGrantValidationError);
      });
    });

    describe("Successful Validation", () => {
      it("should return valid result when actions are permitted", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({
            allowance: {
              granter: mockFeeGranter,
              grantee: mockGranter,
              allowance: {
                "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
                allowedMessages: mockRequestedActions,
              },
            },
          }),
        });
        const result = await validateFeeGrant(
          mockRestUrl,
          mockFeeGranter,
          mockGranter,
          mockRequestedActions
        );
        expect(result).toEqual({ valid: true });
      });

      it("should return invalid result with error when actions are not permitted", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({
            allowance: {
              granter: mockFeeGranter,
              grantee: mockGranter,
              allowance: {
                "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
                allowedMessages: ["/cosmos.staking.v1beta1.MsgDelegate"],
              },
            },
          }),
        });
        const result = await validateFeeGrant(
          mockRestUrl,
          mockFeeGranter,
          mockGranter,
          mockRequestedActions
        );
        expect(result).toEqual({
          valid: false,
          error: expect.any(FeeGrantValidationError),
        });
        expect(result.valid).toBe(false);
        expect(result.error.code).toBe("INVALID_ALLOWANCE");
      });
    });
  });

  describe("validateActions() - Allowance Type Edge Cases", () => {
    const mockActions = ["/cosmos.bank.v1beta1.MsgSend"];
    // Valid bech32 address
    const mockUserAddress = "xion1user123456789abcdefghijklmnopqrstuvwxyz";

    describe("Invalid Inputs", () => {
      it("should handle empty actions", () => {
        const allowance: Allowance = {
          "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
          allowedMessages: ["/cosmos.bank.v1beta1.MsgSend"],
        };
        const result = validateActions([], allowance);
        // Empty actions should return true (all actions allowed if none requested?)
        expect(result).toBe(true);
      });

      it("should throw InvalidAllowanceError for null allowance", () => {
        // @ts-expect-error - Testing runtime behavior
        expect(() => validateActions(mockActions, null)).toThrow(
          InvalidAllowanceError
        );
      });

      it("should throw InvalidAllowanceError for undefined allowance", () => {
        // @ts-expect-error - Testing runtime behavior
        expect(() => validateActions(mockActions, undefined)).toThrow(
          InvalidAllowanceError
        );
      });

      it("should handle empty allowance", () => {
        const allowance: any = {};
        const result = validateActions(mockActions, allowance);
        expect(result).toBe(false);
      });
    });

    describe("AllowedMsgAllowance Edge Cases", () => {
      it("should throw InvalidAllowanceError for missing allowedMessages", () => {
        const allowance: any = {
          "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
        };
        expect(() => validateActions(mockActions, allowance)).toThrow(
          InvalidAllowanceError
        );
      });

      it("should handle empty allowedMessages", () => {
        const allowance: Allowance = {
          "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
          allowedMessages: [],
        };
        const result = validateActions(mockActions, allowance);
        expect(result).toBe(false);
      });

      it("should handle allowedMessages as not array", () => {
        const allowance: any = {
          "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
          allowedMessages: "string",
        };
        expect(() => validateActions(mockActions, allowance)).toThrow();
      });

      it("should handle action not in allowedMessages", () => {
        const allowance: Allowance = {
          "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
          allowedMessages: ["/cosmos.staking.v1beta1.MsgDelegate"],
        };
        const result = validateActions(
          ["/cosmos.bank.v1beta1.MsgSend"],
          allowance
        );
        expect(result).toBe(false);
      });

      it("should handle partial match - some actions allowed, some not", () => {
        const allowance: Allowance = {
          "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
          allowedMessages: ["/cosmos.bank.v1beta1.MsgSend"],
        };
        const result = validateActions(
          [
            "/cosmos.bank.v1beta1.MsgSend",
            "/cosmos.staking.v1beta1.MsgDelegate",
          ],
          allowance
        );
        expect(result).toBe(false);
      });

      it("should be case-sensitive for message type URLs (protocol buffer convention)", () => {
        const allowance: Allowance = {
          "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
          allowedMessages: ["/cosmos.bank.v1beta1.MsgSend"],
        };
        // Message type URLs are case-sensitive (protocol buffer type URLs)
        const result = validateActions(
          ["/Cosmos.Bank.V1Beta1.MsgSend"], // Different case
          allowance
        );
        expect(result).toBe(false);
        
        // Same case should work
        const result2 = validateActions(
          ["/cosmos.bank.v1beta1.MsgSend"], // Same case
          allowance
        );
        expect(result2).toBe(true);
      });

      it("should handle very long action list", () => {
        const allowance: Allowance = {
          "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
          allowedMessages: Array(1000).fill("/cosmos.bank.v1beta1.MsgSend"),
        };
        const result = validateActions(
          Array(1000).fill("/cosmos.bank.v1beta1.MsgSend"),
          allowance
        );
        expect(result).toBe(true);
      });
    });

    describe("ContractsAllowance Edge Cases", () => {
      it("should handle missing allowance property", () => {
        const allowance: any = {
          "@type": "/xion.v1.ContractsAllowance",
          contractAddresses: [],
        };
        expect(() => validateActions(mockActions, allowance)).toThrow();
      });

      it("should handle missing contractAddresses", () => {
        const allowance: any = {
          "@type": "/xion.v1.ContractsAllowance",
          allowance: {
            "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
            allowedMessages: mockActions,
          },
        };
        expect(() => validateActions(mockActions, allowance)).toThrow();
      });

      it("should handle empty contractAddresses", () => {
        const allowance: any = {
          "@type": "/xion.v1.ContractsAllowance",
          allowance: {
            "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
            allowedMessages: mockActions,
          },
          contractAddresses: [],
        };
        const result = validateActions(mockActions, allowance, mockUserAddress);
        expect(result).toBe(false);
      });

      it("CRITICAL: should return false when userAddress not in contractAddresses", () => {
        const allowance: any = {
          "@type": "/xion.v1.ContractsAllowance",
          allowance: {
            "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
            allowedMessages: mockActions,
          },
          contractAddresses: ["xion1othercontract123456789abcdefghijklmnopqrstuv"],
        };
        const result = validateActions(mockActions, allowance, mockUserAddress);
        expect(result).toBe(false);
      });

      it("CRITICAL: should return true when userAddress in contractAddresses (case-insensitive)", () => {
        const allowance: any = {
          "@type": "/xion.v1.ContractsAllowance",
          allowance: {
            "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
            allowedMessages: mockActions,
          },
          contractAddresses: [mockUserAddress.toUpperCase()], // Different case
        };
        // Should be case-insensitive for bech32 addresses
        const result = validateActions(mockActions, allowance, mockUserAddress);
        expect(result).toBe(true);
      });

      it("CRITICAL: should handle userAddress not provided but required", () => {
        const allowance: any = {
          "@type": "/xion.v1.ContractsAllowance",
          allowance: {
            "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
            allowedMessages: mockActions,
          },
          contractAddresses: ["xion1contract"],
        };
        // Without userAddress, should still validate nested allowance
        const result = validateActions(mockActions, allowance);
        expect(result).toBe(true);
      });

      it("should handle nested allowance as malformed", () => {
        const allowance: any = {
          "@type": "/xion.v1.ContractsAllowance",
          allowance: { invalid: "structure" },
          contractAddresses: [mockUserAddress],
        };
        // Malformed nested allowance (missing @type) returns false, doesn't throw
        const result = validateActions(mockActions, allowance, mockUserAddress);
        expect(result).toBe(false);
      });

      it("should handle nested allowance as null", () => {
        const allowance: any = {
          "@type": "/xion.v1.ContractsAllowance",
          allowance: null,
          contractAddresses: [mockUserAddress],
        };
        expect(() => validateActions(mockActions, allowance, mockUserAddress)).toThrow();
      });

      it("should handle recursive ContractsAllowance", () => {
        const allowance: any = {
          "@type": "/xion.v1.ContractsAllowance",
          allowance: {
            "@type": "/xion.v1.ContractsAllowance",
            allowance: {
              "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
              allowedMessages: mockActions,
            },
            contractAddresses: [mockUserAddress],
          },
          contractAddresses: [mockUserAddress],
        };
        const result = validateActions(mockActions, allowance, mockUserAddress);
        expect(result).toBe(true);
      });
    });

    describe("MultiAnyAllowance Edge Cases", () => {
      it("should throw InvalidAllowanceError for missing allowances", () => {
        const allowance: any = {
          "@type": "/xion.v1.MultiAnyAllowance",
        };
        expect(() => validateActions(mockActions, allowance)).toThrow(
          InvalidAllowanceError
        );
      });

      it("should return false for empty allowances", () => {
        const allowance: any = {
          "@type": "/xion.v1.MultiAnyAllowance",
          allowances: [],
        };
        const result = validateActions(mockActions, allowance);
        expect(result).toBe(false);
      });

      it("should handle allowances as not array", () => {
        const allowance: any = {
          "@type": "/xion.v1.MultiAnyAllowance",
          allowances: "string",
        };
        expect(() => validateActions(mockActions, allowance)).toThrow();
      });

      it("CRITICAL: should return true when first child allows", () => {
        const allowance: any = {
          "@type": "/xion.v1.MultiAnyAllowance",
          allowances: [
            {
              "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
              allowedMessages: mockActions,
            },
            {
              "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
              allowedMessages: [],
            },
          ],
        };
        const result = validateActions(mockActions, allowance);
        expect(result).toBe(true);
      });

      it("CRITICAL: should return false when all children deny", () => {
        const allowance: any = {
          "@type": "/xion.v1.MultiAnyAllowance",
          allowances: [
            {
              "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
              allowedMessages: [],
            },
            {
              "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
              allowedMessages: [],
            },
          ],
        };
        const result = validateActions(mockActions, allowance);
        expect(result).toBe(false);
      });

      it("CRITICAL: should return true when one child allows, others malformed", () => {
        const allowance: any = {
          "@type": "/xion.v1.MultiAnyAllowance",
          allowances: [
            {
              "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
              allowedMessages: mockActions,
            },
            null,
            {
              "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
              allowedMessages: [],
            },
          ],
        };
        // Should handle null gracefully and return true if first allows
        const result = validateActions(mockActions, allowance);
        expect(result).toBe(true);
      });

      it("should handle nested MultiAnyAllowance", () => {
        const allowance: any = {
          "@type": "/xion.v1.MultiAnyAllowance",
          allowances: [
            {
              "@type": "/xion.v1.MultiAnyAllowance",
              allowances: [
                {
                  "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
                  allowedMessages: mockActions,
                },
              ],
            },
          ],
        };
        const result = validateActions(mockActions, allowance);
        expect(result).toBe(true);
      });

      it("should handle mixed allowance types in allowances", () => {
        const allowance: any = {
          "@type": "/xion.v1.MultiAnyAllowance",
          allowances: [
            {
              "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
              allowedMessages: [],
            },
            {
              "@type": "/xion.v1.ContractsAllowance",
              allowance: {
                "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
                allowedMessages: mockActions,
              },
              contractAddresses: [mockUserAddress],
            },
          ],
        };
        const result = validateActions(mockActions, allowance, mockUserAddress);
        expect(result).toBe(true);
      });
    });

    describe("Unknown Allowance Type", () => {
      it("should return false for unknown @type", () => {
        const allowance: any = {
          "@type": "/unknown/type",
        };
        const result = validateActions(mockActions, allowance);
        expect(result).toBe(false);
      });

      it("should return false for missing @type", () => {
        const allowance: any = {
          allowedMessages: mockActions,
        };
        const result = validateActions(mockActions, allowance);
        expect(result).toBe(false);
      });

      it("should return false for @type as null", () => {
        const allowance: any = {
          "@type": null,
        };
        const result = validateActions(mockActions, allowance);
        expect(result).toBe(false);
      });

      it("should return false for @type as number", () => {
        const allowance: any = {
          "@type": 123,
        };
        const result = validateActions(mockActions, allowance);
        expect(result).toBe(false);
      });
    });

    describe("Combination Tests", () => {
      it("should handle userAddress provided but not needed", () => {
        const allowance: Allowance = {
          "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
          allowedMessages: mockActions,
        };
        const result = validateActions(mockActions, allowance, mockUserAddress);
        expect(result).toBe(true);
      });

      it("should handle userAddress not provided but needed", () => {
        const allowance: any = {
          "@type": "/xion.v1.ContractsAllowance",
          allowance: {
            "@type": "/cosmos.feegrant.v1beta1.AllowedMsgAllowance",
            allowedMessages: mockActions,
          },
          contractAddresses: [mockUserAddress],
        };
        // Should still validate nested allowance
        const result = validateActions(mockActions, allowance);
        expect(result).toBe(true);
      });
    });
  });
});

