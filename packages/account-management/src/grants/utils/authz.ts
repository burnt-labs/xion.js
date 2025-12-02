import { SelectedSmartAccount } from "../../types/authenticator";
import { ContractGrantDescription } from "../../types/grants";
import {
  getContractAddress,
  isSelfReferentialGrant,
} from "./contract-validation";

/**
 * Error for invalid contract grant configuration
 */
export class InvalidContractGrantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidContractGrantError";
  }
}

/**
 * Checks if any of the contract grant configurations are the current smart account (granter)
 * Address comparison is case-insensitive (bech32 addresses are case-insensitive in encoding).
 *
 * @param {ContractGrantDescription[]} contracts - An array of contract descriptions.
 * @param {SelectedSmartAccount} account - The selected smart account (granter in this case)
 * @returns {boolean} - Returns `true` if none of the contracts are the selected smart account, otherwise `false`.
 * @throws {InvalidContractGrantError} - For malformed contract grant data
 */
export const isContractGrantConfigValid = (
  contracts: ContractGrantDescription[],
  account: SelectedSmartAccount,
): boolean => {
  // Validate account has id property (must check even for empty contracts)
  try {
    if (!account || typeof account !== 'object' || !('id' in account)) {
      throw new InvalidContractGrantError(
        "Account must have an 'id' property"
      );
    }
    // Check account.id value (may throw if id is a getter)
    if (!account.id) {
      throw new InvalidContractGrantError(
        "Account must have an 'id' property"
      );
    }
  } catch (error) {
    // Re-throw InvalidContractGrantError
    if (error instanceof InvalidContractGrantError) {
      throw error;
    }
    // Exception accessing account.id (e.g., getter throws) - return false gracefully
    return false;
  }

  if (!contracts || contracts.length === 0) {
    return true; // No contracts means valid
  }

  try {
    // Wrap address comparison in try-catch to handle exceptions
    let normalizedAccountId: string;
    try {
      normalizedAccountId = account.id.toLowerCase();
    } catch (error) {
      // Exception accessing account.id (e.g., getter throws)
      return false;
    }

    for (const contract of contracts) {
      // Handle null/undefined contracts - throw error (expected behavior per tests)
      if (contract === null || contract === undefined) {
        throw new InvalidContractGrantError(
          "Contract grant description cannot be null or undefined"
        );
      }

      // Handle wrong types (number, boolean, array) - return false without throwing
      // But allow strings and objects (valid ContractGrantDescription types)
      if (typeof contract !== 'string' && (typeof contract !== 'object' || Array.isArray(contract))) {
        return false;
      }

      // Extract contract address using shared utility
      let contractAddress: string | null | undefined;
      try {
        contractAddress = getContractAddress(contract);
        
        // Handle missing address - check if empty object vs object with wrong shape
        if (contractAddress === undefined) {
          // Only objects can have undefined address (strings always return a value)
          if (typeof contract === 'object' && !Array.isArray(contract)) {
            // Check if address property exists but is undefined vs doesn't exist at all
            if ('address' in contract) {
              // Address property exists but is undefined/null - return false
              return false;
            }
            // Address property doesn't exist - check if object has other properties
            const hasProperties = Object.keys(contract).length > 0;
            if (hasProperties) {
              // Object has properties but missing address property - wrong shape
              throw new InvalidContractGrantError(
                "Contract grant description missing address"
              );
            }
            // Empty object - return false
            return false;
          }
        }
      } catch (error) {
        // Re-throw InvalidContractGrantError
        if (error instanceof InvalidContractGrantError) {
          throw error;
        }
        // Exception accessing contract.address (e.g., getter throws)
        return false;
      }

      // Validate address - return false for invalid addresses (don't throw)
      if (!contractAddress || 
          contractAddress === null || 
          contractAddress === undefined || 
          typeof contractAddress !== 'string' ||
          contractAddress.trim() === '') {
        return false;
      }

      // Check for self-referential grant using shared utility
      // Note: We don't validate bech32 format here - that's handled by validateContractGrants()
      try {
        if (isSelfReferentialGrant(contractAddress, normalizedAccountId)) {
          return false; // Contract equals account - invalid!
        }
      } catch (error) {
        // Exception during address comparison
        return false;
      }
    }

    return true;
  } catch (error) {
    // Re-throw InvalidContractGrantError
    if (error instanceof InvalidContractGrantError) {
      throw error;
    }
    // Return false for unexpected exceptions (getter errors, etc.)
    return false;
  }
};
