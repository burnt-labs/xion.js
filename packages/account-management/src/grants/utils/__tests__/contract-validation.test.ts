/**
 * Tests for contract address validation utilities
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateContractAddressFormat,
  verifyContractExists,
  validateContractGrants,
  formatValidationErrors,
  validateContractGrantsOrThrow,
} from "../contract-validation";
import type { ContractGrantDescription } from "../../../types/grants";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";

// Mock @burnt-labs/signers
vi.mock("@burnt-labs/signers", () => ({
  validateBech32Address: vi.fn(
    (address: string, context: string, prefix: string) => {
      // Simple mock validation
      if (!address) {
        throw new Error(`Invalid ${context}: cannot be empty`);
      }
      if (!address.startsWith(prefix + "1")) {
        throw new Error(
          `Invalid ${context}: expected prefix "${prefix}", got "${address.split("1")[0]}"`,
        );
      }
      if (address.length < 10) {
        throw new Error(`Invalid ${context}: address too short`);
      }
    },
  ),
}));

// Mock CosmWasmClient
vi.mock("@cosmjs/cosmwasm-stargate", () => ({
  CosmWasmClient: {
    connect: vi.fn(),
  },
}));

describe("contract-validation", () => {
  describe("validateContractAddressFormat", () => {
    it("should return undefined for valid address", () => {
      const error = validateContractAddressFormat(
        "xion1contractaddress123",
        "xion",
      );
      expect(error).toBeUndefined();
    });

    it("should return error for empty address", () => {
      const error = validateContractAddressFormat("", "xion");
      expect(error).toBe("Contract address cannot be empty");
    });

    it("should return error for wrong prefix", () => {
      const error = validateContractAddressFormat("cosmos1abc123", "xion");
      expect(error).toContain('expected prefix "xion"');
    });

    it("should return error for invalid format", () => {
      const error = validateContractAddressFormat("xion1", "xion");
      expect(error).toContain("address too short");
    });
  });

  describe("verifyContractExists", () => {
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        getContract: vi.fn(),
      };
      vi.mocked(CosmWasmClient.connect).mockResolvedValue(mockClient);
    });

    it("should return undefined for existing contract", async () => {
      mockClient.getContract.mockResolvedValue({
        address: "xion1contract",
        codeId: 123,
      });

      const error = await verifyContractExists(
        "xion1contract",
        "https://rpc.xion-testnet-1.burnt.com",
      );
      expect(error).toBeUndefined();
    });

    it("should return error for non-existent contract", async () => {
      mockClient.getContract.mockResolvedValue(null);

      const error = await verifyContractExists(
        "xion1nonexistent",
        "https://rpc.xion-testnet-1.burnt.com",
      );
      expect(error).toContain("Contract not found");
    });

    it("should return error for contract with no code", async () => {
      mockClient.getContract.mockResolvedValue({
        address: "xion1contract",
        codeId: 0,
      });

      const error = await verifyContractExists(
        "xion1contract",
        "https://rpc.xion-testnet-1.burnt.com",
      );
      expect(error).toContain("has no code deployed");
    });

    it("should handle network errors", async () => {
      mockClient.getContract.mockRejectedValue(new Error("Network timeout"));

      const error = await verifyContractExists(
        "xion1contract",
        "https://rpc.xion-testnet-1.burnt.com",
      );
      expect(error).toContain("Failed to verify contract");
      expect(error).toContain("Network timeout");
    });

    it("should detect contract not found errors", async () => {
      mockClient.getContract.mockRejectedValue(
        new Error("contract not found on chain"),
      );

      const error = await verifyContractExists(
        "xion1contract",
        "https://rpc.xion-testnet-1.burnt.com",
      );
      expect(error).toContain("Contract not found");
    });
  });

  describe("validateContractGrants", () => {
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        getContract: vi.fn().mockResolvedValue({
          address: "xion1contract",
          codeId: 123,
        }),
      };
      vi.mocked(CosmWasmClient.connect).mockResolvedValue(mockClient);
    });

    it("should validate array of valid contracts", async () => {
      const contracts: ContractGrantDescription[] = [
        "xion1contract1234567890",
        "xion1contract0987654321",
      ];

      const result = await validateContractGrants(
        contracts,
        "xion1granter123",
        {
          expectedPrefix: "xion",
          skipOnChainVerification: true,
        },
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid address format", async () => {
      const contracts: ContractGrantDescription[] = [
        "xion1valid123456789",
        "cosmos1wrongprefix", // Wrong prefix
      ];

      const result = await validateContractGrants(
        contracts,
        "xion1granter123",
        {
          expectedPrefix: "xion",
          skipOnChainVerification: true,
        },
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].index).toBe(1);
      expect(result.errors[0].address).toBe("cosmos1wrongprefix");
      expect(result.errors[0].error).toContain('expected prefix "xion"');
    });

    it("should detect self-referential grants", async () => {
      const granterAddress = "xion1granter123456";
      const contracts: ContractGrantDescription[] = [
        "xion1contract12345",
        granterAddress, // Same as granter!
      ];

      const result = await validateContractGrants(contracts, granterAddress, {
        expectedPrefix: "xion",
        skipOnChainVerification: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].index).toBe(1);
      expect(result.errors[0].error).toContain(
        "cannot be the same as the granter",
      );
    });

    it("should verify contracts exist on-chain when rpcUrl provided", async () => {
      mockClient.getContract
        .mockResolvedValueOnce({ codeId: 123 }) // First contract exists
        .mockResolvedValueOnce(null); // Second contract doesn't exist

      const contracts: ContractGrantDescription[] = [
        "xion1contract1exists",
        "xion1contract2missing",
      ];

      const result = await validateContractGrants(
        contracts,
        "xion1granter123",
        {
          expectedPrefix: "xion",
          rpcUrl: "https://rpc.xion-testnet-1.burnt.com",
        },
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].index).toBe(1);
      expect(result.errors[0].error).toContain("Contract not found");
    });

    it("should skip on-chain verification when skipOnChainVerification=true", async () => {
      const contracts: ContractGrantDescription[] = ["xion1contract123456"];

      const result = await validateContractGrants(
        contracts,
        "xion1granter123",
        {
          expectedPrefix: "xion",
          rpcUrl: "https://rpc.xion-testnet-1.burnt.com",
          skipOnChainVerification: true,
        },
      );

      expect(result.valid).toBe(true);
      expect(mockClient.getContract).not.toHaveBeenCalled();
    });

    it("should handle ContractGrantDescription objects", async () => {
      const contracts: ContractGrantDescription[] = [
        {
          address: "xion1contract12345",
          amounts: [{ denom: "uxion", amount: "1000" }],
        },
      ];

      const result = await validateContractGrants(
        contracts,
        "xion1granter123",
        {
          expectedPrefix: "xion",
          skipOnChainVerification: true,
        },
      );

      expect(result.valid).toBe(true);
    });

    it("should accumulate multiple errors", async () => {
      const contracts: ContractGrantDescription[] = [
        "", // Empty
        "cosmos1wrongprefix", // Wrong prefix
        "xion1granter123", // Self-referential
      ];

      const result = await validateContractGrants(
        contracts,
        "xion1granter123",
        {
          expectedPrefix: "xion",
          skipOnChainVerification: true,
        },
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors[0].error).toContain("cannot be empty");
      expect(result.errors[1].error).toContain("expected prefix");
      expect(result.errors[2].error).toContain("same as the granter");
    });

    it("should stop further validation if format is invalid", async () => {
      mockClient.getContract.mockResolvedValue({ codeId: 123 });

      const contracts: ContractGrantDescription[] = [
        "invalid", // Invalid format - should not check on-chain
      ];

      const result = await validateContractGrants(
        contracts,
        "xion1granter123",
        {
          expectedPrefix: "xion",
          rpcUrl: "https://rpc.xion-testnet-1.burnt.com",
        },
      );

      expect(result.valid).toBe(false);
      // Should not have attempted on-chain verification for invalid address
      expect(mockClient.getContract).not.toHaveBeenCalled();
    });
  });

  describe("formatValidationErrors", () => {
    it("should format single error", () => {
      const errors = [
        {
          index: 0,
          address: "xion1bad",
          error: "Invalid address format",
        },
      ];

      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain(
        "Invalid contract grant configuration (1 error)",
      );
      expect(formatted).toContain("Contract 1 (xion1bad)");
      expect(formatted).toContain("Invalid address format");
    });

    it("should format multiple errors", () => {
      const errors = [
        {
          index: 0,
          address: "xion1bad1",
          error: "Error 1",
        },
        {
          index: 1,
          address: "xion1bad2",
          error: "Error 2",
        },
      ];

      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain(
        "Invalid contract grant configuration (2 errors)",
      );
      expect(formatted).toContain("Contract 1 (xion1bad1): Error 1");
      expect(formatted).toContain("Contract 2 (xion1bad2): Error 2");
    });

    it("should handle no errors", () => {
      const formatted = formatValidationErrors([]);
      expect(formatted).toBe("No errors");
    });
  });

  describe("validateContractGrantsOrThrow", () => {
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        getContract: vi.fn().mockResolvedValue({ codeId: 123 }),
      };
      vi.mocked(CosmWasmClient.connect).mockResolvedValue(mockClient);
    });

    it("should not throw for valid contracts", async () => {
      const contracts: ContractGrantDescription[] = ["xion1contract123456"];

      await expect(
        validateContractGrantsOrThrow(contracts, "xion1granter123", {
          expectedPrefix: "xion",
          skipOnChainVerification: true,
        }),
      ).resolves.not.toThrow();
    });

    it("should throw with formatted error for invalid contracts", async () => {
      const contracts: ContractGrantDescription[] = ["cosmos1wrongprefix"];

      await expect(
        validateContractGrantsOrThrow(contracts, "xion1granter123", {
          expectedPrefix: "xion",
          skipOnChainVerification: true,
        }),
      ).rejects.toThrow(/Invalid contract grant configuration/);
    });

    it("should include all errors in thrown message", async () => {
      const contracts: ContractGrantDescription[] = ["", "cosmos1wrong"];

      await expect(
        validateContractGrantsOrThrow(contracts, "xion1granter123", {
          expectedPrefix: "xion",
          skipOnChainVerification: true,
        }),
      ).rejects.toThrow(/Contract 1.*cannot be empty/);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty contracts array", async () => {
      const result = await validateContractGrants([], "xion1granter123", {
        expectedPrefix: "xion",
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle network failures gracefully", async () => {
      const mockClient = {
        getContract: vi.fn().mockRejectedValue(new Error("Connection refused")),
      };
      vi.mocked(CosmWasmClient.connect).mockResolvedValue(mockClient);

      const contracts: ContractGrantDescription[] = ["xion1contract123456"];

      const result = await validateContractGrants(
        contracts,
        "xion1granter123",
        {
          expectedPrefix: "xion",
          rpcUrl: "https://rpc.xion-testnet-1.burnt.com",
        },
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0].error).toContain("Failed to verify contract");
    });
  });
});
