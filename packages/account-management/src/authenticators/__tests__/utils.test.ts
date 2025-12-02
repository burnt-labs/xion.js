import { describe, it, expect } from "vitest";
import {
  isDuplicateAuthenticator,
  deduplicateAccountsById,
  findBestMatchingAuthenticator,
  validateNewAuthenticator,
} from "../utils";
import { createJwtAuthenticatorIdentifier } from "../jwt";
import type { Authenticator, SmartAccountWithCodeId } from "../../types/authenticator";

describe("authenticator-utils", () => {
  describe("isDuplicateAuthenticator", () => {
    const mockAuthenticators: Authenticator[] = [
      {
        id: "account-0",
        authenticator: "project.user123",
        authenticatorIndex: 0,
        type: "Jwt",
      },
      {
        id: "account-1",
        authenticator: "0x1234567890",
        authenticatorIndex: 1,
        type: "EthWallet",
      },
    ];

    it("should return true when duplicate JWT authenticator exists", () => {
      const result = isDuplicateAuthenticator(
        mockAuthenticators,
        "project.user123",
        "Jwt",
      );
      expect(result).toBe(true);
    });

    it("should return false when authenticator does not exist", () => {
      const result = isDuplicateAuthenticator(
        mockAuthenticators,
        "project.user456",
        "Jwt",
      );
      expect(result).toBe(false);
    });

    it("should return false when identifier matches but type differs", () => {
      const result = isDuplicateAuthenticator(
        mockAuthenticators,
        "project.user123",
        "OAuth",
      );
      expect(result).toBe(false);
    });

    it("should handle empty authenticators array", () => {
      const result = isDuplicateAuthenticator([], "any.identifier", "Jwt");
      expect(result).toBe(false);
    });
  });

  describe("deduplicateAccountsById", () => {
    const createMockAccount = (id: string): SmartAccountWithCodeId => ({
      id,
      codeId: 1,
      authenticators: [],
    });

    it("should remove duplicate accounts with same ID", () => {
      const accounts = [
        createMockAccount("account1"),
        createMockAccount("account2"),
        createMockAccount("account1"), // duplicate
        createMockAccount("account3"),
      ];

      const result = deduplicateAccountsById(accounts);
      expect(result).toHaveLength(3);
      expect(result.map((a) => a.id)).toEqual([
        "account1",
        "account2",
        "account3",
      ]);
    });

    it("should preserve order of first occurrence", () => {
      const accounts = [
        createMockAccount("account2"),
        createMockAccount("account1"),
        createMockAccount("account2"), // duplicate
      ];

      const result = deduplicateAccountsById(accounts);
      expect(result.map((a) => a.id)).toEqual(["account2", "account1"]);
    });

    it("should handle undefined input", () => {
      const result = deduplicateAccountsById(undefined);
      expect(result).toEqual([]);
    });

    it("should handle empty array", () => {
      const result = deduplicateAccountsById([]);
      expect(result).toEqual([]);
    });

    it("should return same array when no duplicates", () => {
      const accounts = [
        createMockAccount("account1"),
        createMockAccount("account2"),
        createMockAccount("account3"),
      ];

      const result = deduplicateAccountsById(accounts);
      expect(result).toEqual(accounts);
    });
  });

  describe("findBestMatchingAuthenticator", () => {
    it("should return authenticator with lowest index when multiple matches", () => {
      const authenticators: Authenticator[] = [
        {
          id: "account-2",
          authenticator: "project.user123",
          authenticatorIndex: 2,
          type: "Jwt",
        },
        {
          id: "account-0",
          authenticator: "project.user123",
          authenticatorIndex: 0,
          type: "Jwt",
        },
        {
          id: "account-1",
          authenticator: "project.user123",
          authenticatorIndex: 1,
          type: "Jwt",
        },
      ];

      const result = findBestMatchingAuthenticator(
        authenticators,
        "project.user123",
      );
      expect(result?.authenticatorIndex).toBe(0);
    });

    it("should return single matching authenticator", () => {
      const authenticators: Authenticator[] = [
        {
          id: "account-0",
          authenticator: "project.user123",
          authenticatorIndex: 0,
          type: "Jwt",
        },
        {
          id: "account-1",
          authenticator: "project.user456",
          authenticatorIndex: 1,
          type: "Jwt",
        },
      ];

      const result = findBestMatchingAuthenticator(
        authenticators,
        "project.user456",
      );
      expect(result?.authenticatorIndex).toBe(1);
    });

    it("should return null when no matches found", () => {
      const authenticators: Authenticator[] = [
        {
          id: "account-0",
          authenticator: "project.user123",
          authenticatorIndex: 0,
          type: "Jwt",
        },
      ];

      const result = findBestMatchingAuthenticator(
        authenticators,
        "project.user999",
      );
      expect(result).toBeNull();
    });

    it("should handle empty authenticators array", () => {
      const result = findBestMatchingAuthenticator([], "any.identifier");
      expect(result).toBeNull();
    });
  });

  describe("createJwtAuthenticatorIdentifier", () => {
    it("should format single audience with subject", () => {
      const result = createJwtAuthenticatorIdentifier("project-id", "user123");
      expect(result).toBe("project-id.user123");
    });

    it("should use first audience when array provided", () => {
      const result = createJwtAuthenticatorIdentifier(
        ["project-id", "other-id"],
        "user123",
      );
      expect(result).toBe("project-id.user123");
    });

    it("should handle undefined values", () => {
      const result = createJwtAuthenticatorIdentifier(undefined, undefined);
      expect(result).toBe("undefined.undefined");
    });

    it("should handle empty array audience", () => {
      const result = createJwtAuthenticatorIdentifier([], "user123");
      expect(result).toBe("undefined.user123");
    });
  });

  describe("validateNewAuthenticator", () => {
    const mockAuthenticators: Authenticator[] = [
      {
        id: "account-0",
        authenticator: "project.user123",
        authenticatorIndex: 0,
        type: "Jwt",
      },
    ];

    it("should return valid when authenticator does not exist", () => {
      const result = validateNewAuthenticator(
        mockAuthenticators,
        "project.user456",
        "Jwt",
      );
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it("should return invalid with JWT error message for duplicate JWT", () => {
      const result = validateNewAuthenticator(
        mockAuthenticators,
        "project.user123",
        "Jwt",
      );
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe(
        "This email is already added as an authenticator",
      );
    });

    it("should return invalid with generic error for non-JWT duplicate", () => {
      const authenticators: Authenticator[] = [
        {
          id: "account-0",
          authenticator: "0x1234567890",
          authenticatorIndex: 0,
          type: "EthWallet",
        },
      ];

      const result = validateNewAuthenticator(
        authenticators,
        "0x1234567890",
        "EthWallet",
      );
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe(
        "This authenticator is already added to your account",
      );
    });

    it("should handle empty authenticators array", () => {
      const result = validateNewAuthenticator([], "any.identifier", "Jwt");
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });
  });
});
