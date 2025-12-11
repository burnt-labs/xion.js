/**
 * 🔴 CRITICAL: Account Parser Tests
 *
 * Tests for customAccountFromAny - critical for proper account decoding
 * This function handles both standard Cosmos accounts and AbstractAccount types
 */

import { describe, it, expect } from "vitest";
import { customAccountFromAny } from "../../src/utils/accountParser";
import { Any } from "cosmjs-types/google/protobuf/any";
import { BaseAccount } from "cosmjs-types/cosmos/auth/v1beta1/auth";

describe("accountParser - customAccountFromAny", () => {
  describe("🔴 CRITICAL: Standard Cosmos Account Types", () => {
    it("should decode BaseAccount via accountFromAny fallback", () => {
      // Create a standard Cosmos BaseAccount
      const baseAccount = BaseAccount.fromPartial({
        address: "xion1standard",
        pubKey: {
          typeUrl: "/cosmos.crypto.secp256k1.PubKey",
          value: new Uint8Array([
            10, 33, 2, 192, 167, 200, 94, 21, 116, 220, 109, 55, 238, 5, 175,
            196, 69, 207, 45, 83, 190, 237, 78, 92, 30, 108, 215, 118, 95, 50,
            177, 0, 63, 155, 121,
          ]),
        },
        accountNumber: BigInt(5),
        sequence: BigInt(2),
      });

      const input: Any = {
        typeUrl: "/cosmos.auth.v1beta1.BaseAccount",
        value: BaseAccount.encode(baseAccount).finish(),
      };

      const result = customAccountFromAny(input);

      expect(result.address).toBe("xion1standard");
      expect(result.accountNumber).toBe(5);
      expect(result.sequence).toBe(2);
      expect(result.pubkey).not.toBeNull();
    });

    it("should handle unknown account types by delegating to accountFromAny", () => {
      const input: Any = {
        typeUrl: "/unknown.account.Type",
        value: new Uint8Array([1, 2, 3, 4]),
      };

      // Should throw since unknown type can't be decoded
      expect(() => customAccountFromAny(input)).toThrow();
    });

    it("should handle BaseAccount without pubkey", () => {
      const baseAccount = BaseAccount.fromPartial({
        address: "xion1nopubkey",
        pubKey: undefined,
        accountNumber: BigInt(0),
        sequence: BigInt(0),
      });

      const input: Any = {
        typeUrl: "/cosmos.auth.v1beta1.BaseAccount",
        value: BaseAccount.encode(baseAccount).finish(),
      };

      const result = customAccountFromAny(input);

      expect(result.address).toBe("xion1nopubkey");
      expect(result.pubkey).toBeNull();
      expect(result.accountNumber).toBe(0);
      expect(result.sequence).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should properly convert BigInt account numbers to regular numbers", () => {
      const baseAccount = BaseAccount.fromPartial({
        address: "xion1bigint",
        pubKey: undefined,
        accountNumber: BigInt(999),
        sequence: BigInt(888),
      });

      const input: Any = {
        typeUrl: "/cosmos.auth.v1beta1.BaseAccount",
        value: BaseAccount.encode(baseAccount).finish(),
      };

      const result = customAccountFromAny(input);

      expect(typeof result.accountNumber).toBe("number");
      expect(typeof result.sequence).toBe("number");
      expect(result.accountNumber).toBe(999);
      expect(result.sequence).toBe(888);
    });
  });
});
