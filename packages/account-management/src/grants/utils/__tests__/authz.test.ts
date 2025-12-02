/**
 * Grant Utilities Tests - authz.ts
 * 
 * Focus: Security-critical contract grant validation
 * Goal: Ensure contract grants cannot be misconfigured (contract === granter)
 */

import { describe, it, expect } from "vitest";
import {
  isContractGrantConfigValid,
  InvalidContractGrantError,
} from "../authz";
import type { SelectedSmartAccount } from "../../../types/authenticator";
import type { ContractGrantDescription } from "../../../types/grants";

describe("authz.test.ts - Security & Edge Cases", () => {
  // Valid bech32 address format: xion1 + 38+ alphanumeric chars (lowercase)
  const mockAccount: SelectedSmartAccount = {
    id: "xion1testaccount123456789abcdefghijklmnopqrstuv",
  };

  describe("isContractGrantConfigValid() - Security Tests", () => {
    describe("Invalid Inputs", () => {
      it("should return true for empty contracts array", () => {
        expect(isContractGrantConfigValid([], mockAccount)).toBe(true);
      });

      it("should throw InvalidContractGrantError for account missing id property", () => {
        const accountWithoutId: any = { otherProperty: "value" };
        expect(() =>
          isContractGrantConfigValid([], accountWithoutId)
        ).toThrow(InvalidContractGrantError);
      });

      it("should throw InvalidContractGrantError for account.id as null", () => {
        const accountWithNullId: any = { id: null };
        expect(() =>
          isContractGrantConfigValid(
            [{ address: "xion1contract123456789abcdefghijklmnopqrstuv" }],
            accountWithNullId
          )
        ).toThrow(InvalidContractGrantError);
      });

      it("should throw InvalidContractGrantError for account.id as undefined", () => {
        const accountWithUndefinedId: any = { id: undefined };
        expect(() =>
          isContractGrantConfigValid(
            [{ address: "xion1contract123456789abcdefghijklmnopqrstuv" }],
            accountWithUndefinedId
          )
        ).toThrow(InvalidContractGrantError);
      });
    });

    describe("CRITICAL: Contract Address Security", () => {
      it("CRITICAL: should return false when contract equals account (object form)", () => {
        const contracts: ContractGrantDescription[] = [
          { address: mockAccount.id },
        ];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(false);
      });

      it("CRITICAL: should return false when contract equals account (string form)", () => {
        const contracts: ContractGrantDescription[] = [mockAccount.id];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(false);
      });

      it("CRITICAL: should return false when one of multiple contracts equals account", () => {
        const contracts: ContractGrantDescription[] = [
          { address: "xion1validcontract" },
          { address: mockAccount.id },
          { address: "xion1anothercontract" },
        ];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(false);
      });

      it("CRITICAL: should return false when all contracts equal account", () => {
        const contracts: ContractGrantDescription[] = [
          { address: mockAccount.id },
          { address: mockAccount.id },
        ];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(false);
      });

      it("CRITICAL: should return false when contract equals account (mixed forms)", () => {
        const contracts: ContractGrantDescription[] = [
          "xion1validcontract",
          { address: mockAccount.id },
        ];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(false);
      });

      it("should return true when no contracts equal account", () => {
        const contracts: ContractGrantDescription[] = [
          { address: "xion1contract1" },
          { address: "xion1contract2" },
        ];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(true);
      });

      it("should return true when contracts are different from account", () => {
        const contracts: ContractGrantDescription[] = [
          "xion1contract1",
          "xion1contract2",
        ];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(true);
      });
    });

    describe("Contract Address Edge Cases", () => {
      it("should return false for contract with missing address", () => {
        const contracts: any[] = [{}];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(false);
      });

      it("should return false for contract with null address", () => {
        const contracts: any[] = [{ address: null }];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(false);
      });

      it("should return false for contract with undefined address", () => {
        const contracts: any[] = [{ address: undefined }];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(false);
      });

      it("should return false for contract with empty address", () => {
        const contracts: ContractGrantDescription[] = [{ address: "" }];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(false);
      });

      it("should return true for contract with different address (format validation not our job)", () => {
        // Format validation is not our job - we just check equality
        const contracts: ContractGrantDescription[] = [
          { address: "xion1differentaddress123456789abcdefghijklmnopqrstuv" },
        ];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(true);
      });

      it("should handle case-insensitive address comparison (bech32 addresses)", () => {
        const contracts: ContractGrantDescription[] = [
          { address: mockAccount.id.toUpperCase() },
        ];
        // Bech32 addresses are case-insensitive in encoding, so comparison should be case-insensitive
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(false);
      });
    });

    describe("String vs Object Contract Forms", () => {
      it("should handle string form", () => {
        const contracts: ContractGrantDescription[] = ["xion1contract"];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(true);
      });

      it("should handle object form", () => {
        const contracts: ContractGrantDescription[] = [
          { address: "xion1contract" },
        ];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(true);
      });

      it("should handle mixed forms", () => {
        const contracts: ContractGrantDescription[] = [
          "xion1contract1",
          { address: "xion1contract2" },
        ];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(true);
      });

      it("should handle string form that equals account", () => {
        const contracts: ContractGrantDescription[] = [mockAccount.id];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(false);
      });

      it("should handle object form that equals account", () => {
        const contracts: ContractGrantDescription[] = [
          { address: mockAccount.id },
        ];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(false);
      });

      it("should handle object form with amounts property", () => {
        const contracts: ContractGrantDescription[] = [
          {
            address: "xion1contract",
            amounts: [{ denom: "uxion", amount: "1000000" }],
          },
        ];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(true);
      });

      it("CRITICAL: should detect account match even with amounts property", () => {
        const contracts: ContractGrantDescription[] = [
          {
            address: mockAccount.id,
            amounts: [{ denom: "uxion", amount: "1000000" }],
          },
        ];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(false);
      });
    });

    describe("Type Safety Edge Cases", () => {
      it("should handle contract as number", () => {
        const contracts: any[] = [123];
        // Function handles gracefully with try-catch, returns false
        expect(() => isContractGrantConfigValid(contracts, mockAccount)).not.toThrow();
      });

      it("should handle contract as boolean", () => {
        const contracts: any[] = [true];
        // Function handles gracefully with try-catch, returns false
        expect(() => isContractGrantConfigValid(contracts, mockAccount)).not.toThrow();
      });

      it("should handle contract as array", () => {
        const contracts: any[] = [[{ address: "xion1contract" }]];
        // Function handles gracefully with try-catch, returns false
        expect(() => isContractGrantConfigValid(contracts, mockAccount)).not.toThrow();
      });

      it("should throw InvalidContractGrantError for contract object with wrong shape (missing address)", () => {
        const contracts: any[] = [{ wrongProperty: "value" }];
        expect(() =>
          isContractGrantConfigValid(contracts, mockAccount)
        ).toThrow(InvalidContractGrantError);
      });

      it("should throw InvalidContractGrantError for null contract in array", () => {
        const contracts: any[] = [null];
        expect(() =>
          isContractGrantConfigValid(contracts, mockAccount)
        ).toThrow(InvalidContractGrantError);
      });

      it("should throw InvalidContractGrantError for undefined contract in array", () => {
        const contracts: any[] = [undefined];
        expect(() =>
          isContractGrantConfigValid(contracts, mockAccount)
        ).toThrow(InvalidContractGrantError);
      });

      it("should handle contract object with both string and address properties", () => {
        const contracts: any[] = [
          { address: "xion1contract", string: "also-a-string" },
        ];
        // Should use address property
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(true);
      });
    });

    describe("Exception Handling", () => {
      it("should return false when exception occurs", () => {
        // Create a contract that will cause an exception
        const contracts: any[] = [
          {
            get address() {
              throw new Error("Exception in getter");
            },
          },
        ];
        // Should catch exception and return false
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(false);
      });

      it("should handle exception mid-loop", () => {
        const contracts: any[] = [
          { address: "xion1valid" },
          {
            get address() {
              throw new Error("Exception");
            },
          },
          { address: "xion1alsoValid" },
        ];
        // Should catch exception and return false
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(false);
      });

      it("should handle exception when comparing addresses", () => {
        const account: any = {
          get id() {
            throw new Error("Exception in account.id");
          },
        };
        const contracts: ContractGrantDescription[] = [
          { address: "xion1contract" },
        ];
        // Should catch exception and return false
        expect(isContractGrantConfigValid(contracts, account)).toBe(false);
      });
    });

    describe("Real-World Scenarios", () => {
      it("should detect treasury contract misconfiguration", () => {
        // Simulate user accidentally setting contract to own account
        const contracts: ContractGrantDescription[] = [
          { address: mockAccount.id },
        ];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(false);
      });

      it("should allow valid contract grants", () => {
        const contracts: ContractGrantDescription[] = [
          { address: "xion1treasurycontract" },
          { address: "xion1anothercontract" },
        ];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(true);
      });

      it("should handle large number of contracts", () => {
        const contracts: ContractGrantDescription[] = Array(1000)
          .fill(null)
          .map((_, i) => ({ address: `xion1contract${i}` }));
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(true);
      });

      it("should detect account match in large array", () => {
        const contracts: ContractGrantDescription[] = [
          ...Array(500)
            .fill(null)
            .map((_, i) => ({ address: `xion1contract${i}` })),
          { address: mockAccount.id },
          ...Array(500)
            .fill(null)
            .map((_, i) => ({ address: `xion1contract${i + 500}` })),
        ];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(false);
      });

      it("should handle contracts with special characters", () => {
        const contracts: ContractGrantDescription[] = [
          { address: "xion1contract-with-special-chars" },
        ];
        // Should handle gracefully (format validation not our job)
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(true);
      });

      it("should handle contract addresses of different lengths", () => {
        // Valid bech32 addresses have specific length, but we don't validate format
        const contracts: ContractGrantDescription[] = [
          { address: "xion1differentaddress123456789abcdefghijklmnopqrstuv" },
        ];
        expect(isContractGrantConfigValid(contracts, mockAccount)).toBe(true);
      });
    });
  });
});

