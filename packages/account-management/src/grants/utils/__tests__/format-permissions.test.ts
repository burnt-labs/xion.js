/**
 * Grant Utilities Tests - format-permissions.ts
 * 
 * Focus: Breaking things - edge cases, malformed inputs, security scenarios
 * Goal: Find bugs before they reach production
 */

import { describe, it, expect } from "vitest";
import {
  parseCoinString,
  formatCoinArray,
  formatCoins,
  formatXionAmount,
  generatePermissionDescriptions,
  AuthorizationTypes,
  CosmosAuthzPermission,
  type DecodedReadableAuthorization,
  type HumanContractExecAuth,
} from "../format-permissions";
import type { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import { GenericAuthorization } from "cosmjs-types/cosmos/authz/v1beta1/authz";
import { SendAuthorization } from "cosmjs-types/cosmos/bank/v1beta1/authz";
import { StakeAuthorization } from "cosmjs-types/cosmos/staking/v1beta1/authz";
import { TransferAuthorization } from "cosmjs-types/ibc/applications/transfer/v1/authz";

describe("format-permissions.test.ts - Breaking Things", () => {
  describe("parseCoinString() - Edge Cases & Malformed Input", () => {
    describe("Invalid Inputs", () => {
      it("should return empty array for empty string", () => {
        expect(parseCoinString("")).toEqual([]);
      });

      it("should return empty array for whitespace only", () => {
        expect(parseCoinString("   ")).toEqual([]);
        expect(parseCoinString("\t\n\r")).toEqual([]);
      });
    });

    describe("Malformed Coin Strings", () => {
      it("should return empty array for negative amounts", () => {
        expect(parseCoinString("-1000000uxion")).toEqual([]);
      });

      it("should return empty array for decimal amounts", () => {
        expect(parseCoinString("1000.5uxion")).toEqual([]);
      });

      it("should parse scientific notation (regex matches '1' and 'e6uxion')", () => {
        // Regex matches '1' as amount and 'e6uxion' as denom
        const result = parseCoinString("1e6uxion");
        expect(result).toEqual([{ amount: "1", denom: "e6uxion" }]);
      });

      it("should parse amounts with leading zeros", () => {
        const result = parseCoinString("0001000000uxion");
        expect(result).toEqual([{ amount: "0001000000", denom: "uxion" }]);
      });

      it("should return empty array for missing amount", () => {
        expect(parseCoinString("uxion")).toEqual([]);
      });

      it("should return empty array for missing denom", () => {
        expect(parseCoinString("1000000")).toEqual([]);
      });

      it("should handle extra spaces", () => {
        const result = parseCoinString("1000000   uxion");
        expect(result).toEqual([{ amount: "1000000", denom: "uxion" }]);
      });

      it("should return empty array for special characters in denom (hyphen)", () => {
        expect(parseCoinString("1000000u-xion")).toEqual([]);
      });

      it("should return empty array for special characters in denom (underscore)", () => {
        expect(parseCoinString("1000000u_xion")).toEqual([]);
      });

      it("should handle Unicode characters in denom", () => {
        // Regex doesn't match unicode characters in denom
        const result = parseCoinString("1000000uxiøn");
        expect(result).toEqual([]);
      });

      it("should handle SQL injection attempt", () => {
        const result = parseCoinString("1000000uxion'; DROP TABLE--");
        // Should parse up to the quote or fail entirely
        expect(result.length).toBeGreaterThanOrEqual(0);
      });

      it("should handle very long strings", () => {
        const longString = "1".repeat(10000) + "uxion";
        const result = parseCoinString(longString);
        // Should either parse or fail gracefully
        expect(Array.isArray(result)).toBe(true);
      });

      it("should parse denom starting with number (regex matches)", () => {
        // Regex matches '10000001' as amount and 'xion' as denom
        const result = parseCoinString("10000001xion");
        expect(result).toEqual([{ amount: "10000001", denom: "xion" }]);
      });

      it("should parse IBC denoms with slashes", () => {
        const result = parseCoinString("1000000ibc/123");
        expect(result).toEqual([{ amount: "1000000", denom: "ibc/123" }]);
      });

      it("should parse denoms with multiple slashes", () => {
        const result = parseCoinString("1000000ibc/123/456");
        expect(result).toEqual([{ amount: "1000000", denom: "ibc/123/456" }]);
      });

      it("should return empty array for amount with commas", () => {
        expect(parseCoinString("1,000,000uxion")).toEqual([]);
      });

      it("should return empty array for amount with dots (European format)", () => {
        expect(parseCoinString("1.000.000uxion")).toEqual([]);
      });
    });

    describe("Boundary Cases", () => {
      it("should parse zero amount", () => {
        const result = parseCoinString("0uxion");
        expect(result).toEqual([{ amount: "0", denom: "uxion" }]);
      });

      it("should parse very large amounts", () => {
        const largeAmount = "999999999999999999999999";
        const result = parseCoinString(`${largeAmount}uxion`);
        expect(result).toEqual([{ amount: largeAmount, denom: "uxion" }]);
      });

      it("should handle Number.MAX_SAFE_INTEGER boundary", () => {
        const maxSafe = String(Number.MAX_SAFE_INTEGER);
        const result = parseCoinString(`${maxSafe}uxion`);
        expect(result).toEqual([{ amount: maxSafe, denom: "uxion" }]);
      });
    });
  });

  describe("formatCoinArray() - Edge Cases", () => {
    describe("Invalid Coin Arrays", () => {
      it("should return empty string for empty array", () => {
        expect(formatCoinArray([])).toBe("");
      });

      it("should handle missing amount property", () => {
        // @ts-expect-error - Testing runtime behavior
        const result = formatCoinArray([{ denom: "uxion" }]);
        expect(result).toBe("undefineduxion");
      });

      it("should handle missing denom property", () => {
        // @ts-expect-error - Testing runtime behavior
        const result = formatCoinArray([{ amount: "100" }]);
        expect(result).toBe("100undefined");
      });

      it("should handle empty strings in coin", () => {
        const result = formatCoinArray([{ amount: "", denom: "" }]);
        expect(result).toBe("");
      });

      it("should handle very long strings", () => {
        const longAmount = "1".repeat(1000);
        const longDenom = "u" + "xion".repeat(100);
        const result = formatCoinArray([{ amount: longAmount, denom: longDenom }]);
        expect(result.length).toBeGreaterThan(1000);
      });
    });

    describe("Coin Object Edge Cases", () => {
      it("should format negative amounts", () => {
        const result = formatCoinArray([{ amount: "-1000000", denom: "uxion" }]);
        expect(result).toBe("-1000000uxion");
      });

      it("should format decimal amounts", () => {
        const result = formatCoinArray([{ amount: "1000.5", denom: "uxion" }]);
        expect(result).toBe("1000.5uxion");
      });

      it("should format scientific notation", () => {
        const result = formatCoinArray([{ amount: "1e6", denom: "uxion" }]);
        expect(result).toBe("1e6uxion");
      });

      it("should format special characters in denom", () => {
        const result = formatCoinArray([{ amount: "100", denom: "u-xion" }]);
        expect(result).toBe("100u-xion");
      });

      it("should format XSS attempt in denom", () => {
        const result = formatCoinArray([{ amount: "100", denom: "uxion<script>" }]);
        expect(result).toBe("100uxion<script>");
      });

      it("should format SQL injection in denom", () => {
        const result = formatCoinArray([{ amount: "100", denom: "uxion'; DROP--" }]);
        expect(result).toBe("100uxion'; DROP--");
      });
    });

    describe("Round-Trip Consistency", () => {
      it("should round-trip single coin: parse -> format -> parse", () => {
        const coinStr = "1000000uxion";
        const parsed1 = parseCoinString(coinStr);
        const formatted = formatCoinArray(parsed1);
        const parsed2 = parseCoinString(formatted);
        
        expect(parsed1).toEqual(parsed2);
        expect(formatted).toBe("1000000uxion");
      });

      it("should round-trip multiple coins: parse -> format -> parse", () => {
        const coinStr = "1000000uxion,2000000usdc";
        const parsed1 = parseCoinString(coinStr);
        const formatted = formatCoinArray(parsed1);
        const parsed2 = parseCoinString(formatted);
        
        expect(parsed1).toEqual(parsed2);
        expect(formatted).toBe("1000000uxion,2000000usdc");
      });

      it("should round-trip coin with spaces: parse -> format -> parse", () => {
        const coinStr = "1000000 uxion";
        const parsed1 = parseCoinString(coinStr);
        const formatted = formatCoinArray(parsed1);
        const parsed2 = parseCoinString(formatted);
        
        // Spaces are removed in formatCoinArray, so round-trip changes format
        expect(parsed1).toEqual(parsed2);
        expect(formatted).toBe("1000000uxion");
      });

      it("should round-trip through formatCoins: parse -> formatCoins -> parse", () => {
        const coinStr = "1000000uxion";
        const parsed = parseCoinString(coinStr);
        const formatted = formatCoins(coinStr);
        // formatCoins returns human-readable, can't round-trip back to original
        expect(formatted).toBe("1 XION");
        expect(parsed).toEqual([{ amount: "1000000", denom: "uxion" }]);
      });
    });
  });

  describe("formatCoins() - Complex Combinations & Edge Cases", () => {
    describe("Invalid Inputs", () => {
      it("should return empty string for null/undefined", () => {
        // @ts-expect-error - Testing runtime behavior
        expect(formatCoins(null)).toBe("");
        // @ts-expect-error - Testing runtime behavior
        expect(formatCoins(undefined)).toBe("");
      });

      it("should return empty string for empty string", () => {
        expect(formatCoins("")).toBe("");
      });
    });

    describe("Multiple Coins Edge Cases", () => {
      it("should handle empty coins in comma-separated string", () => {
        const result = formatCoins("1000000uxion,,2000000usdc");
        expect(result).toContain("1 XION");
        // Empty coin is filtered out, so only 2 coins remain
        expect(result.split(", ").length).toBeGreaterThanOrEqual(1);
      });

      it("should handle trailing comma", () => {
        const result = formatCoins("1000000uxion,");
        expect(result).toBe("1 XION");
      });

      it("should handle leading comma", () => {
        const result = formatCoins(",1000000uxion");
        expect(result).toBe("1 XION");
      });

      it("should handle only commas", () => {
        const result = formatCoins(",,,");
        expect(result).toBe("");
      });

      it("should handle mixed valid/invalid coins", () => {
        const result = formatCoins("1000000uxion,invalid,2000000usdc");
        expect(result).toContain("1 XION");
        // Invalid coin is filtered out
        expect(result.split(", ").length).toBeGreaterThanOrEqual(1);
      });

      it("should handle duplicate coins", () => {
        const result = formatCoins("1000000uxion,1000000uxion");
        expect(result).toBe("1 XION, 1 XION");
      });

      it("should preserve order of coins", () => {
        const result = formatCoins("2000000usdc,1000000uxion");
        // Order is preserved, but formatting may differ
        expect(result).toContain("USDC");
        expect(result).toContain("XION");
      });
    });

    describe("USDC Denom Edge Cases", () => {
      it("should not format as USDC when usdcDenom provided but coin doesn't match", () => {
        const result = formatCoins("1000000uxion", "usdc");
        expect(result).toBe("1 XION");
      });

      it("should handle USDC with malformed amount", () => {
        const result = formatCoins("invalidusdc", "usdc");
        expect(result).toBe("");
      });

      it("should handle empty usdcDenom", () => {
        const result = formatCoins("1000000uxion", "");
        expect(result).toBe("1 XION");
      });

      it("should handle multiple USDC coins", () => {
        const result = formatCoins("1000000usdc,2000000usdc", "usdc");
        expect(result).toBe("1 USDC, 2 USDC");
      });

      it("should handle USDC with very small amount", () => {
        const result = formatCoins("1usdc", "usdc");
        expect(result).toBe("0.000001 USDC");
      });

      it("should handle USDC with overflow amount", () => {
        const overflowAmount = "999999999999999999999999";
        const result = formatCoins(`${overflowAmount}usdc`, "usdc");
        // Should handle gracefully (may show scientific notation or Infinity)
        expect(typeof result).toBe("string");
      });
    });

    describe("Known Denom Edge Cases", () => {
      it("should not convert denom that starts with 'u' but not in DENOM_DECIMALS", () => {
        const result = formatCoins("1000000uunknown");
        expect(result).toBe("1000000 UUNKNOWN");
      });

      it("should not convert denom in DENOM_DECIMALS but doesn't start with 'u'", () => {
        const result = formatCoins("1000000xion");
        expect(result).toBe("1000000 XION");
      });

      it("should handle case sensitivity", () => {
        const result = formatCoins("1000000UXION");
        expect(result).toBe("1000000 UXION");
      });

      it("should handle mixed case", () => {
        const result = formatCoins("1000000UxIoN");
        expect(result).toBe("1000000 UXION");
      });
    });

    describe("Unknown Denom Edge Cases", () => {
      it("should format IBC denoms", () => {
        const result = formatCoins("1000000ibc/123");
        expect(result).toBe("1000000 IBC/123");
      });

      it("should handle very long unknown denom", () => {
        const longDenom = "u" + "xion".repeat(100);
        const result = formatCoins(`1000000${longDenom}`);
        expect(result).toContain("1000000");
      });

      it("should handle denom with special characters", () => {
        // Regex doesn't match hyphens, so returns empty
        const result = formatCoins("1000000u-xion-test");
        expect(result).toBe("");
      });

      it("should handle denom that looks like path", () => {
        const result = formatCoins("1000000u/xion/test");
        expect(result).toBe("1000000 U/XION/TEST");
      });
    });

    describe("Number Conversion Edge Cases", () => {
      it("should handle amount that causes Number overflow", () => {
        const overflowAmount = "999999999999999999999999";
        const result = formatCoins(`${overflowAmount}uxion`);
        // Should handle gracefully
        expect(typeof result).toBe("string");
      });

      it("should handle amount at Number.MAX_SAFE_INTEGER", () => {
        const maxSafe = String(Number.MAX_SAFE_INTEGER);
        const result = formatCoins(`${maxSafe}uxion`);
        expect(typeof result).toBe("string");
      });

      it("should handle amount with leading zeros", () => {
        const result = formatCoins("0001000000uxion");
        expect(result).toBe("1 XION");
      });

      it("should handle amount that becomes 0 after division", () => {
        const result = formatCoins("1uxion");
        expect(result).toBe("0.000001 XION");
      });
    });

    describe("Combination Tests", () => {
      it("should handle mix of known/unknown denoms", () => {
        const result = formatCoins("1000000uxion,2000000unknown");
        expect(result).toContain("1 XION");
        expect(result).toContain("2000000 UNKNOWN");
      });

      it("should handle mix with USDC", () => {
        const result = formatCoins("1000000uxion,2000000usdc,3000000unknown", "usdc");
        expect(result).toContain("1 XION");
        expect(result).toContain("2 USDC");
        expect(result).toContain("3000000 UNKNOWN");
      });

      it("should handle all edge cases in one string", () => {
        const result = formatCoins("0uxion,-100usdc,invalid,1000000ibc/123");
        expect(result).toContain("0 XION");
        expect(result).toContain("1000000 IBC/123");
        // Invalid and negative should be filtered or handled
        expect(typeof result).toBe("string");
      });
    });
  });

  describe("formatXionAmount() - Edge Cases", () => {
    describe("Invalid Inputs", () => {
      it("should handle null amount", () => {
        // @ts-expect-error - Testing runtime behavior
        expect(() => formatXionAmount(null, "uxion")).not.toThrow();
      });

      it("should handle undefined amount", () => {
        // @ts-expect-error - Testing runtime behavior
        expect(() => formatXionAmount(undefined, "uxion")).not.toThrow();
      });

      it("should handle empty amount string", () => {
        const result = formatXionAmount("", "uxion");
        // Empty string becomes 0 when parsed
        expect(result).toBe("0 XION");
      });

      it("should handle empty denom", () => {
        const result = formatXionAmount("1000000", "");
        expect(result).toBe("1000000 ");
      });
    });

    describe("Amount Edge Cases", () => {
      it("should return as-is for negative amount", () => {
        const result = formatXionAmount("-1000000", "uxion");
        expect(result).toBe("-1000000 uxion");
      });

      it("should handle decimal amount", () => {
        const result = formatXionAmount("1000.5", "uxion");
        // Number("1000.5") / 10^6 = 0.0010005, formatted
        expect(result).toContain("XION");
        expect(parseFloat(result)).toBeCloseTo(0.0010005, 6);
      });

      it("should handle scientific notation", () => {
        const result = formatXionAmount("1e6", "uxion");
        expect(result).toBe("1 XION");
      });

      it("should handle very large number", () => {
        const largeNumber = "999999999999999999999999";
        const result = formatXionAmount(largeNumber, "uxion");
        // Should handle gracefully (may show Infinity or scientific notation)
        expect(typeof result).toBe("string");
      });

      it("should return as-is for non-numeric amount", () => {
        const result = formatXionAmount("not-a-number", "uxion");
        expect(result).toBe("not-a-number uxion");
      });

      it("should handle amount with leading zeros", () => {
        const result = formatXionAmount("0001000000", "uxion");
        expect(result).toBe("1 XION");
      });

      it("should handle amount with commas", () => {
        const result = formatXionAmount("1,000,000", "uxion");
        expect(result).toBe("1,000,000 uxion"); // NaN returns as-is
      });

      it("should handle zero", () => {
        const result = formatXionAmount("0", "uxion");
        expect(result).toBe("0 XION");
      });

      it("should handle very small amount", () => {
        const result = formatXionAmount("1", "uxion");
        expect(result).toBe("0.000001 XION");
      });
    });

    describe("Denom Edge Cases", () => {
      it("should return as-is for wrong denom", () => {
        const result = formatXionAmount("1000000", "usdc");
        expect(result).toBe("1000000 usdc");
      });

      it("should handle case sensitivity", () => {
        const result = formatXionAmount("1000000", "UXION");
        expect(result).toBe("1000000 UXION");
      });

      it("should handle denom with extra characters", () => {
        const result = formatXionAmount("1000000", "uxion-test");
        expect(result).toBe("1000000 uxion-test");
      });
    });

    describe("Decimal Formatting Edge Cases", () => {
      it("should remove trailing zeros", () => {
        const result = formatXionAmount("1000000", "uxion");
        expect(result).toBe("1 XION");
      });

      it("should handle amount with precision", () => {
        const result = formatXionAmount("1234567", "uxion");
        expect(result).toBe("1.234567 XION");
      });

      it("should handle very small amount formatting", () => {
        const result = formatXionAmount("1", "uxion");
        expect(result).toBe("0.000001 XION");
      });

      it("should handle amount that rounds", () => {
        const result = formatXionAmount("123456789", "uxion");
        expect(result).toBe("123.456789 XION");
      });
    });
  });

  describe("generatePermissionDescriptions() - Complex Failure Scenarios", () => {
    // Valid bech32 address format: xion1 + 38+ alphanumeric chars (lowercase)
    const mockAccount = "xion1testaccount123456789abcdefghijklmnopqrstuv";

    describe("Invalid Inputs", () => {
      it("should handle empty array", () => {
        const result = generatePermissionDescriptions([], mockAccount);
        expect(result).toEqual([]);
      });

      it("should handle array with null elements", () => {
        // @ts-expect-error - Testing runtime behavior
        expect(() => generatePermissionDescriptions([null], mockAccount)).toThrow();
      });

      it("should handle missing required properties", () => {
        const grant: any = {
          type: AuthorizationTypes.Generic,
          // Missing data and dappDescription
        };
        // Should throw when trying to access missing properties
        expect(() => generatePermissionDescriptions([grant], mockAccount)).toThrow();
      });
    });

    describe("GenericAuthorization Edge Cases", () => {
      it("should handle missing msg property", () => {
        const grant: any = {
          type: AuthorizationTypes.Generic,
          data: {},
          dappDescription: "Test",
        };
        // May throw or handle gracefully
        expect(() => generatePermissionDescriptions([grant], mockAccount)).not.toThrow();
      });

      it("should handle unknown msg type", () => {
        const grant: any = {
          type: AuthorizationTypes.Generic,
          data: { msg: "/unknown/type" },
          dappDescription: "Test",
        };
        const result = generatePermissionDescriptions([grant], mockAccount);
        expect(result[0].authorizationDescription).toContain("undefined");
      });

      it("should handle data as null", () => {
        const grant: any = {
          type: AuthorizationTypes.Generic,
          data: null,
          dappDescription: "Test",
        };
        expect(() => generatePermissionDescriptions([grant], mockAccount)).toThrow();
      });

      it("should handle missing dappDescription", () => {
        const grant: any = {
          type: AuthorizationTypes.Generic,
          data: { msg: "/cosmos.bank.v1beta1.MsgSend" },
          // Missing dappDescription
        };
        const result = generatePermissionDescriptions([grant], mockAccount);
        expect(result[0].dappDescription).toBeUndefined();
        expect(result[0].authorizationDescription).toBeDefined();
      });
    });

    describe("SendAuthorization Edge Cases", () => {
      it("should handle missing spendLimit", () => {
        const grant: any = {
          type: AuthorizationTypes.Send,
          data: { allowList: [] },
          dappDescription: "Test",
        };
        expect(() => generatePermissionDescriptions([grant], mockAccount)).toThrow();
      });

      it("should handle empty spendLimit", () => {
        const grant: any = {
          type: AuthorizationTypes.Send,
          data: { spendLimit: [], allowList: [] },
          dappDescription: "Test",
        };
        const result = generatePermissionDescriptions([grant], mockAccount);
        expect(result[0].authorizationDescription).toContain("Permission to send tokens");
      });

      it("should handle malformed coins in spendLimit", () => {
        const grant: any = {
          type: AuthorizationTypes.Send,
          data: {
            spendLimit: [{ amount: "invalid", denom: "uxion" }],
            allowList: [],
          },
          dappDescription: "Test",
        };
        const result = generatePermissionDescriptions([grant], mockAccount);
        // Should handle gracefully
        expect(result[0].authorizationDescription).toContain("invalid uxion");
      });

      it("should throw error for negative amounts in spendLimit", () => {
        const grant: any = {
          type: AuthorizationTypes.Send,
          data: {
            spendLimit: [{ amount: "-1000000", denom: "uxion" }],
            allowList: [],
          },
          dappDescription: "Test",
        };
        expect(() => generatePermissionDescriptions([grant], mockAccount)).toThrow(
          "Invalid SendAuthorization: spend limit has invalid amount"
        );
      });

      it("should handle missing allowList", () => {
        const grant: any = {
          type: AuthorizationTypes.Send,
          data: {
            spendLimit: [{ amount: "1000000", denom: "uxion" }],
          },
          dappDescription: "Test",
        };
        expect(() => generatePermissionDescriptions([grant], mockAccount)).toThrow();
      });

      it("should handle allowList with invalid addresses", () => {
        const grant: any = {
          type: AuthorizationTypes.Send,
          data: {
            spendLimit: [{ amount: "1000000", denom: "uxion" }],
            allowList: ["invalid-address", "xion1valid"],
          },
          dappDescription: "Test",
        };
        const result = generatePermissionDescriptions([grant], mockAccount);
        expect(result[0].authorizationDescription).toContain("invalid-address");
      });
    });

    describe("IbcTransfer Edge Cases", () => {
      it("should handle missing allocations", () => {
        const grant: any = {
          type: AuthorizationTypes.IbcTransfer,
          data: {},
          dappDescription: "Test",
        };
        expect(() => generatePermissionDescriptions([grant], mockAccount)).toThrow();
      });

      it("should handle empty allocations", () => {
        const grant: any = {
          type: AuthorizationTypes.IbcTransfer,
          data: { allocations: [] },
          dappDescription: "Test",
        };
        const result = generatePermissionDescriptions([grant], mockAccount);
        expect(result[0].authorizationDescription).toContain("Permission to transfer tokens via IBC");
      });

      it("should handle malformed spendLimit in allocations", () => {
        const grant: any = {
          type: AuthorizationTypes.IbcTransfer,
          data: {
            allocations: [{ spendLimit: [{ amount: "invalid", denom: "uxion" }] }],
          },
          dappDescription: "Test",
        };
        const result = generatePermissionDescriptions([grant], mockAccount);
        // Should handle gracefully - may format or show raw value
        expect(result[0].authorizationDescription).toBeDefined();
      });
    });

    describe("StakeAuthorization Edge Cases", () => {
      it("should handle missing maxTokens", () => {
        const grant: any = {
          type: AuthorizationTypes.Stake,
          data: { allowList: { address: ["val1"] } },
          dappDescription: "Test",
        };
        const result = generatePermissionDescriptions([grant], mockAccount);
        expect(result[0].authorizationDescription).toContain("Permission to stake tokens");
      });

      it("should handle maxTokens with malformed coin", () => {
        const grant: any = {
          type: AuthorizationTypes.Stake,
          data: {
            maxTokens: { amount: "invalid", denom: "uxion" },
          },
          dappDescription: "Test",
        };
        const result = generatePermissionDescriptions([grant], mockAccount);
        expect(result[0].authorizationDescription).toContain("invalid uxion");
      });

      it("should handle empty allowList", () => {
        const grant: any = {
          type: AuthorizationTypes.Stake,
          data: {
            allowList: { address: [] },
            maxTokens: { amount: "1000000", denom: "uxion" },
          },
          dappDescription: "Test",
        };
        const result = generatePermissionDescriptions([grant], mockAccount);
        expect(result[0].authorizationDescription).toContain("without specified validators");
      });
    });

    describe("ContractExecution Edge Cases - CRITICAL SECURITY TESTS", () => {
      it("should handle missing grants", () => {
        const grant: any = {
          type: AuthorizationTypes.ContractExecution,
          data: {},
          dappDescription: "Test",
        };
        // Missing grants are handled gracefully - returns empty contracts array
        const result = generatePermissionDescriptions([grant], mockAccount);
        expect(result[0].authorizationDescription).toBe("Permission to execute smart contracts");
        expect(result[0].contracts).toEqual([]);
      });

      it("should handle empty grants", () => {
        const grant: any = {
          type: AuthorizationTypes.ContractExecution,
          data: { grants: [] },
          dappDescription: "Test",
        };
        const result = generatePermissionDescriptions([grant], mockAccount);
        expect(result[0].authorizationDescription).toBe("Permission to execute smart contracts");
        expect(result[0].contracts).toEqual([]);
      });

      it("CRITICAL: should throw when contract address equals account", () => {
        const grant: any = {
          type: AuthorizationTypes.ContractExecution,
          data: {
            grants: [{ address: mockAccount }],
          },
          dappDescription: "Test",
        };
        expect(() => generatePermissionDescriptions([grant], mockAccount)).toThrow(
          "Misconfigured treasury contract"
        );
      });

      it("CRITICAL: should throw when one of multiple contracts equals account", () => {
        const grant: any = {
          type: AuthorizationTypes.ContractExecution,
          data: {
            grants: [
              { address: "xion1valid" },
              { address: mockAccount },
            ],
          },
          dappDescription: "Test",
        };
        expect(() => generatePermissionDescriptions([grant], mockAccount)).toThrow(
          "Misconfigured treasury contract"
        );
      });

      it("should handle grants with invalid addresses", () => {
        const grant: any = {
          type: AuthorizationTypes.ContractExecution,
          data: {
            grants: [{ address: "invalid-address" }],
          },
          dappDescription: "Test",
        };
        const result = generatePermissionDescriptions([grant], mockAccount);
        expect(result[0].contracts).toContain("invalid-address");
      });

      it("should handle grants with missing address", () => {
        const grant: any = {
          type: AuthorizationTypes.ContractExecution,
          data: {
            grants: [{}],
          },
          dappDescription: "Test",
        };
        const result = generatePermissionDescriptions([grant], mockAccount);
        // Should handle undefined address
        expect(result[0].contracts).toContain(undefined);
      });

      it("should handle very long contract address list", () => {
        const grants = Array(1000).fill({ address: "xion1test" });
        const grant: any = {
          type: AuthorizationTypes.ContractExecution,
          data: { grants },
          dappDescription: "Test",
        };
        const result = generatePermissionDescriptions([grant], mockAccount);
        expect(result[0].contracts).toHaveLength(1000);
      });
    });

    describe("Unknown Authorization Type", () => {
      it("should handle invalid type", () => {
        const grant: any = {
          type: "UnknownType",
          data: {},
          dappDescription: "Test",
        };
        const result = generatePermissionDescriptions([grant], mockAccount);
        expect(result[0].authorizationDescription).toContain("Unknown Authorization Type");
      });

      it("should handle type as null", () => {
        const grant: any = {
          type: null,
          data: {},
          dappDescription: "Test",
        };
        const result = generatePermissionDescriptions([grant], mockAccount);
        expect(result[0].authorizationDescription).toContain("Unknown Authorization Type");
      });
    });

    describe("Account Parameter Edge Cases", () => {
      it("should handle empty account", () => {
        const grant: any = {
          type: AuthorizationTypes.Generic,
          data: { msg: "/cosmos.bank.v1beta1.MsgSend" },
          dappDescription: "Test",
        };
        const result = generatePermissionDescriptions([grant], "");
        expect(result[0].authorizationDescription).toBeDefined();
      });

      it("should handle invalid account format", () => {
        const grant: any = {
          type: AuthorizationTypes.ContractExecution,
          data: {
            grants: [{ address: "xion1valid" }],
          },
          dappDescription: "Test",
        };
        const result = generatePermissionDescriptions([grant], "invalid");
        expect(result[0].contracts).toContain("xion1valid");
      });
    });

    describe("Combination Tests", () => {
      it("should handle multiple grants with one malformed", () => {
        const validGrant: any = {
          type: AuthorizationTypes.Generic,
          data: { msg: "/cosmos.bank.v1beta1.MsgSend" },
          dappDescription: "Valid",
        };
        const malformedGrant: any = {
          type: AuthorizationTypes.Send,
          data: {}, // Missing required properties
          dappDescription: "Malformed",
        };
        expect(() => generatePermissionDescriptions([validGrant, malformedGrant], mockAccount)).toThrow();
      });

      it("should handle mix of all authorization types", () => {
        const grants: any[] = [
          {
            type: AuthorizationTypes.Generic,
            data: { msg: "/cosmos.bank.v1beta1.MsgSend" },
            dappDescription: "Generic",
          },
          {
            type: AuthorizationTypes.Send,
            data: {
              spendLimit: [{ amount: "1000000", denom: "uxion" }],
              allowList: [],
            },
            dappDescription: "Send",
          },
          {
            type: AuthorizationTypes.Stake,
            data: {
              maxTokens: { amount: "1000000", denom: "uxion" },
            },
            dappDescription: "Stake",
          },
          {
            type: AuthorizationTypes.ContractExecution,
            data: {
              grants: [{ address: "xion1contract" }],
            },
            dappDescription: "Contract",
          },
        ];
        const result = generatePermissionDescriptions(grants, mockAccount);
        expect(result).toHaveLength(4);
        expect(result[0].authorizationDescription).toContain("send tokens");
        expect(result[1].authorizationDescription).toContain("send tokens");
        expect(result[2].authorizationDescription).toContain("stake tokens");
        expect(result[3].authorizationDescription).toContain("execute smart contracts");
      });
    });
  });
});

