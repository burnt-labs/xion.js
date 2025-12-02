/**
 * Contract address validation utilities
 * Uses @burnt-labs/signers crypto utilities for consistent address validation
 */

import { validateBech32Address } from "@burnt-labs/signers";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import type { ContractGrantDescription } from "../../types/grants";

export interface AddressValidationError {
  index: number;
  address: string;
  error: string;
}

export interface ContractValidationResult {
  valid: boolean;
  errors: AddressValidationError[];
}

/**
 * Extracts address from contract grant description
 * 
 * @returns The contract address, or undefined if missing (for object form without address)
 */
export function getContractAddress(contract: ContractGrantDescription): string | undefined {
  if (typeof contract === "string") {
    return contract;
  }
  // For object form, return address if present, undefined if missing
  // This allows validateContractAddressFormat to provide a clearer error message
  return contract.address;
}

/**
 * Checks if a contract address is self-referential (same as granter address)
 * Uses case-insensitive comparison for bech32 addresses
 * 
 * @param contractAddress - The contract address to check
 * @param granterAddress - The granter address (smart account)
 * @returns true if addresses match (self-referential), false otherwise
 */
export function isSelfReferentialGrant(
  contractAddress: string,
  granterAddress: string,
): boolean {
  return contractAddress.toLowerCase() === granterAddress.toLowerCase();
}

/**
 * Validates a single contract address format
 *
 * @param address - Contract address to validate
 * @param expectedPrefix - Expected bech32 prefix (e.g., "xion")
 * @returns Error message if invalid, undefined if valid
 */
export function validateContractAddressFormat(
  address: string,
  expectedPrefix: string,
): string | undefined {
  if (!address) {
    return "Contract address cannot be empty";
  }

  try {
    // Use signers package validation (wraps CosmJS with better errors)
    validateBech32Address(address, "contract address", expectedPrefix);
    return undefined; // Valid
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * Verifies a contract exists on-chain
 *
 * @param address - Contract address to verify
 * @param rpcUrl - RPC URL for chain queries
 * @returns Error message if contract doesn't exist, undefined if valid
 */
export async function verifyContractExists(
  address: string,
  rpcUrl: string,
): Promise<string | undefined> {
  try {
    const client = await CosmWasmClient.connect(rpcUrl);
    const contract = await client.getContract(address);

    if (!contract) {
      return `Contract not found at address ${address}`;
    }

    // Verify contract has code deployed
    if (contract.codeId === 0) {
      return `Contract at ${address} has no code deployed (codeId: 0)`;
    }

    return undefined; // Valid
  } catch (error) {
    // Network errors vs. contract not found
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("not found") || message.includes("does not exist")) {
      return `Contract not found at ${address}`;
    }

    // Other errors (network issues, etc.)
    return `Failed to verify contract at ${address}: ${message}`;
  }
}

/**
 * Validates array of contract grant descriptions
 *
 * Performs the following validations:
 * 1. Bech32 format and prefix validation
 * 2. Contract address != granter address
 * 3. Contract exists on-chain (if rpcUrl provided)
 *
 * @param contracts - Array of contract grant descriptions
 * @param granterAddress - The granter address (smart account)
 * @param options - Validation options
 * @returns Validation result with all errors
 */
export async function validateContractGrants(
  contracts: ContractGrantDescription[],
  granterAddress: string,
  options: {
    expectedPrefix: string;
    rpcUrl?: string;
    skipOnChainVerification?: boolean;
  },
): Promise<ContractValidationResult> {
  const errors: AddressValidationError[] = [];

  for (const [index, contract] of contracts.entries()) {
    const address = getContractAddress(contract);

    // Handle missing address explicitly
    if (address === undefined || address === null) {
      errors.push({
        index,
        address: address ?? "",
        error: "Contract address is missing",
      });
      continue; // Skip further validation if address is missing
    }

    // 1. Validate bech32 format and prefix
    const formatError = validateContractAddressFormat(
      address,
      options.expectedPrefix,
    );
    if (formatError) {
      errors.push({
        index,
        address,
        error: formatError,
      });
      continue; // Skip further validation if format is wrong
    }

    // 2. Ensure contract address != granter address (case-insensitive comparison for bech32)
    if (isSelfReferentialGrant(address, granterAddress)) {
      errors.push({
        index,
        address,
        error:
          "Contract address cannot be the same as the granter account. " +
          "Granting permissions to yourself creates a self-referential grant that has no effect.",
      });
      continue;
    }

    // 3. Verify contract exists on-chain (optional)
    if (options.rpcUrl && !options.skipOnChainVerification) {
      const existenceError = await verifyContractExists(address, options.rpcUrl);
      if (existenceError) {
        errors.push({
          index,
          address,
          error: existenceError,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Formats validation errors into a human-readable message
 *
 * @param errors - Array of validation errors
 * @returns Formatted error message
 */
export function formatValidationErrors(
  errors: AddressValidationError[],
): string {
  if (errors.length === 0) {
    return "No errors";
  }

  const errorMessages = errors.map(
    (err) => `  • Contract ${err.index + 1} (${err.address}): ${err.error}`,
  );

  return (
    `Invalid contract grant configuration (${errors.length} error${errors.length > 1 ? "s" : ""}):\n` +
    errorMessages.join("\n")
  );
}

/**
 * Validates contracts and throws with formatted error message if invalid
 *
 * Convenience function for use in grant creation flow.
 *
 * @throws {Error} If validation fails
 */
export async function validateContractGrantsOrThrow(
  contracts: ContractGrantDescription[],
  granterAddress: string,
  options: {
    expectedPrefix: string;
    rpcUrl?: string;
    skipOnChainVerification?: boolean;
  },
): Promise<void> {
  const result = await validateContractGrants(contracts, granterAddress, options);

  if (!result.valid) {
    throw new Error(formatValidationErrors(result.errors));
  }
}
