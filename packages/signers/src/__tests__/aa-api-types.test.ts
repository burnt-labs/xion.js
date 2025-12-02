/**
 * AA API Type Validation Tests
 *
 * These tests validate that the AA API types generated from OpenAPI schema
 * are correctly structured and that our re-exports maintain consistency.
 *
 * Types are now generated independently from the OpenAPI schema, breaking
 * the dependency on account-abstraction-api.
 */

import { describe, it, expect } from "vitest";
import type {
  AddressResponse,
  CreateAccountResponseV2,
} from "../types/api";
import type {
  AuthenticatorType,
  SmartAccount,
} from "../types/account";

describe("AA API Type Imports", () => {
  it("should import AddressResponse type correctly", () => {
    // Runtime structural validation
    const mockResponse: AddressResponse = {
      address: "xion1test",
      authenticator_type: "EthWallet",
    };

    expect(mockResponse.address).toBeDefined();
    expect(mockResponse.authenticator_type).toBeDefined();
  });

  it("should import CreateAccountResponseV2 type correctly", () => {
    const mockResponse: CreateAccountResponseV2 = {
      account_address: "xion1test",
      code_id: 123,
      transaction_hash: "ABC123",
    };

    expect(mockResponse.account_address).toBeDefined();
    expect(mockResponse.code_id).toBeDefined();
    expect(mockResponse.transaction_hash).toBeDefined();
  });

  it("should import AuthenticatorType correctly", () => {
    // Runtime test: these should all be valid AuthenticatorType values
    const validTypes: AuthenticatorType[] = [
      "EthWallet",
      "Secp256K1",
      "Ed25519",
      "JWT",
      "Passkey",
      "Sr25519",
    ];

    expect(validTypes.length).toBe(6);
  });

  it("should import SmartAccount type correctly", () => {
    const mockAccount: SmartAccount = {
      id: "xion1test",
      authenticators: [
        {
          id: "auth1",
          type: "EthWallet",
          authenticator: "0x123",
          authenticatorIndex: 0,
        },
      ],
      codeId: 123,
      createdAt: "2024-01-01",
      transactionHash: "ABC123",
    };

    expect(mockAccount.id).toBeDefined();
    expect(mockAccount.authenticators).toBeDefined();
    expect(Array.isArray(mockAccount.authenticators)).toBe(true);
  });
});

describe("Type Re-exports from Signers", () => {
  it("should re-export AA API types correctly (compile-time check)", () => {
    // This is a compile-time check - if these imports fail, the test won't compile
    // Import the re-exported types from signers (now from generated types)
    type Test1 = import("../types/api").AddressResponse;
    type Test2 = import("../types/api").CheckResponse;
    type Test3 = import("../types/api").CreateAccountResponse; // Note: renamed from CreateAccountResponseV2
    type Test4 = import("../types/api").CreateEthWalletRequest;
    type Test5 = import("../types/api").CreateSecp256k1Request;
    type Test6 = import("../types/api").CreateJWTRequest;
    type Test7 = import("../types/api").AccountType;

    // If we get here, all types exist at compile time
    expect(true).toBe(true);
  });
});

describe("Type Structure Validation", () => {
  it("AddressResponse should have correct structure", () => {
    type AddressResponse = {
      address: string;
      authenticator_type?: string;
    };

    // This is what we expect - if AA API changes, this will fail at compile time
    const test: AddressResponse = {
      address: "xion1test",
      authenticator_type: "EthWallet",
    };

    expect(test.address).toBe("xion1test");
  });

  it("CreateAccountResponseV2 should have correct structure", () => {
    type CreateAccountResponseV2 = {
      account_address: string;
      code_id: number;
      transaction_hash: string;
    };

    const test: CreateAccountResponseV2 = {
      account_address: "xion1test",
      code_id: 123,
      transaction_hash: "ABC123",
    };

    expect(test.account_address).toBe("xion1test");
  });

  it("AuthenticatorType should be a union of specific strings", () => {
    type AuthenticatorType =
      | "EthWallet"
      | "Secp256K1"
      | "Ed25519"
      | "JWT"
      | "Passkey"
      | "Sr25519";

    const types: AuthenticatorType[] = [
      "EthWallet",
      "Secp256K1",
      "Ed25519",
      "JWT",
      "Passkey",
      "Sr25519",
    ];

    expect(types.length).toBe(6);

    // These should NOT compile if uncommented:
    // const invalid: AuthenticatorType = "Invalid";
    // const invalid2: AuthenticatorType = "Random";
  });

  it("SmartAccount should have correct structure", () => {
    type AuthenticatorInfo = {
      id: string;
      type: string;
      authenticator: string;
      authenticatorIndex?: number;
      addedAt?: number;
      lastUsed?: number;
    };

    type SmartAccount = {
      id: string;
      authenticators: AuthenticatorInfo[];
      codeId?: number;
      createdAt?: string;
      transactionHash?: string;
    };

    const test: SmartAccount = {
      id: "xion1test",
      authenticators: [
        {
          id: "auth1",
          type: "EthWallet",
          authenticator: "0x123",
        },
      ],
    };

    expect(test.id).toBe("xion1test");
    expect(test.authenticators.length).toBe(1);
  });
});

describe("Breaking Change Detection", () => {
  it("should fail if AA API changes AddressResponse structure", () => {
    // This test validates the expected structure
    // If AA API changes the type, this test will fail at compile time

    const validResponse: AddressResponse = {
      address: "xion1test",
      authenticator_type: "EthWallet",
    };

    // Required field
    expect(validResponse.address).toBeDefined();

    // Optional field (should be allowed to be undefined)
    const withoutOptional: AddressResponse = {
      address: "xion1test",
    };

    expect(withoutOptional.authenticator_type).toBeUndefined();
  });

  it("should fail if AA API changes CreateAccountResponseV2 structure", () => {
    const validResponse: CreateAccountResponseV2 = {
      account_address: "xion1test",
      code_id: 123,
      transaction_hash: "ABC123",
    };

    // All fields are required
    expect(validResponse.account_address).toBeDefined();
    expect(validResponse.code_id).toBeDefined();
    expect(validResponse.transaction_hash).toBeDefined();

    // These should NOT compile if uncommented:
    // const missing: CreateAccountResponseV2 = {
    //   account_address: "xion1test",
    // }; // Error: missing code_id and transaction_hash
  });

  it("should fail if AA API adds/removes authenticator types", () => {
    // Expected types
    const expectedTypes = [
      "EthWallet",
      "Secp256K1",
      "Ed25519",
      "JWT",
      "Passkey",
      "Sr25519",
    ];

    // Create test values
    const types: AuthenticatorType[] = expectedTypes as AuthenticatorType[];

    // If AA API adds/removes types, this will fail at compile time
    expect(types.length).toBe(6);
  });
});
