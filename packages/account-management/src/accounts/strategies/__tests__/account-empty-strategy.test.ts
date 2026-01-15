/**
 * Unit tests for EmptyAccountStrategy
 */

import { describe, it, expect } from "vitest";
import { EmptyAccountStrategy } from "../account-empty-strategy";
import { AUTHENTICATOR_TYPE } from "@burnt-labs/signers";

describe("EmptyAccountStrategy", () => {
  const strategy = new EmptyAccountStrategy();

  describe("fetchSmartAccounts", () => {
    it("should always return empty array", async () => {
      const result = await strategy.fetchSmartAccounts(
        "test-authenticator",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it("should return empty array for Secp256k1 authenticator", async () => {
      const result = await strategy.fetchSmartAccounts(
        "03a34b99f22c790c4e36b2b3c2c35a36db06226e41c692fc82b8b56ac1c540c5e5",
        AUTHENTICATOR_TYPE.Secp256K1,
      );

      expect(result).toEqual([]);
    });

    it("should return empty array for EthWallet authenticator", async () => {
      const result = await strategy.fetchSmartAccounts(
        "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
        AUTHENTICATOR_TYPE.EthWallet,
      );

      expect(result).toEqual([]);
    });

    it("should return empty array for JWT authenticator", async () => {
      const result = await strategy.fetchSmartAccounts(
        "google-oauth2|1234567890",
        AUTHENTICATOR_TYPE.JWT,
      );

      expect(result).toEqual([]);
    });

    it("should return empty array for Passkey authenticator", async () => {
      const result = await strategy.fetchSmartAccounts(
        "passkey_credential_id",
        AUTHENTICATOR_TYPE.Passkey,
      );

      expect(result).toEqual([]);
    });

    it("should never throw errors", async () => {
      await expect(
        strategy.fetchSmartAccounts("", AUTHENTICATOR_TYPE.Secp256K1),
      ).resolves.toEqual([]);

      await expect(
        strategy.fetchSmartAccounts("invalid", AUTHENTICATOR_TYPE.EthWallet),
      ).resolves.toEqual([]);

      await expect(
        strategy.fetchSmartAccounts(
          "very-long-authenticator-string-that-might-cause-issues",
          AUTHENTICATOR_TYPE.JWT,
        ),
      ).resolves.toEqual([]);
    });

    it("should handle concurrent calls correctly", async () => {
      const promises = [
        strategy.fetchSmartAccounts("auth1", AUTHENTICATOR_TYPE.Secp256K1),
        strategy.fetchSmartAccounts("auth2", AUTHENTICATOR_TYPE.EthWallet),
        strategy.fetchSmartAccounts("auth3", AUTHENTICATOR_TYPE.JWT),
      ];

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result).toEqual([]);
      });
    });
  });
});
