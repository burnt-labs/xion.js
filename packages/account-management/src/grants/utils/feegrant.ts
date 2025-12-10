import camelcaseKeys from "camelcase-keys";
import { AllowedMsgAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/feegrant";
import {
  Allowance,
  AllowanceResponse,
  ContractsAllowance,
  MultiAnyAllowance,
} from "../../types/grants";

function isAllowedMsgAllowance(
  allowance: Allowance,
): allowance is AllowedMsgAllowance {
  return (
    (allowance as any)["@type"] ===
    "/cosmos.feegrant.v1beta1.AllowedMsgAllowance"
  );
}

function isContractsAllowance(
  allowance: Allowance,
): allowance is ContractsAllowance {
  return (allowance as any)["@type"] === "/xion.v1.ContractsAllowance";
}

function isMultiAnyAllowance(
  allowance: Allowance,
): allowance is MultiAnyAllowance {
  return (allowance as any)["@type"] === "/xion.v1.MultiAnyAllowance";
}

/**
 * Error types for fee grant validation
 */
export class FeeGrantValidationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NETWORK_ERROR"
      | "HTTP_ERROR"
      | "INVALID_RESPONSE"
      | "NO_ALLOWANCE"
      | "INVALID_ALLOWANCE",
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "FeeGrantValidationError";
  }
}

/**
 * Result type for fee grant validation
 */
export type FeeGrantValidationResult =
  | { valid: true }
  | { valid: false; error: FeeGrantValidationError };

/**
 * Validates if a requested set of actions are permitted under a fee grant between a granter and grantee.
 *
 * @async
 * @function
 * @param {string} restUrl - The base URL of the Cosmos REST API.
 * @param {string} feeGranter - The address of the fee granter (the account providing the allowance).
 * @param {string} granter - The address of the grantee (the account receiving the allowance).
 * @param {string[]} requestedActions - The array of specific actions to validate, e.g., ["/cosmos.authz.v1beta1.MsgGrant", ...].
 * @param {string} [userAddress] - (Optional) The user's smart contract account address to validate against `ContractsAllowance`.
 * @returns {Promise<FeeGrantValidationResult>} - Result indicating if actions are permitted, with detailed error if not.
 *
 * @throws {FeeGrantValidationError} - For network errors, HTTP errors, or invalid responses.
 */
export async function validateFeeGrant(
  restUrl: string,
  feeGranter: string,
  granter: string,
  requestedActions: string[],
  userAddress?: string,
): Promise<FeeGrantValidationResult> {
  if (!requestedActions || requestedActions.length === 0) {
    throw new FeeGrantValidationError(
      "At least one requested action is required",
      "INVALID_RESPONSE",
    );
  }

  // Validate inputs before making HTTP request
  if (
    !feeGranter ||
    !granter ||
    feeGranter.trim() === "" ||
    granter.trim() === ""
  ) {
    return {
      valid: false,
      error: new FeeGrantValidationError(
        "Fee granter and granter addresses must be non-empty strings",
        "INVALID_RESPONSE",
      ),
    };
  }

  const baseUrl = `${restUrl}/cosmos/feegrant/v1beta1/allowance/${feeGranter}/${granter}`;

  let response: Response;
  try {
    response = await fetch(baseUrl, { cache: "no-store" });

    if (!response.ok) {
      throw new FeeGrantValidationError(
        `HTTP ${response.status} ${response.statusText}: Failed to fetch fee grant allowance`,
        "HTTP_ERROR",
        response.status,
      );
    }
  } catch (error) {
    // Handle both network errors and HTTP errors
    if (error instanceof FeeGrantValidationError) {
      throw error; // Re-throw HTTP errors
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new FeeGrantValidationError(
      `Network error while fetching fee grant: ${message}`,
      "NETWORK_ERROR",
    );
  }

  let data: any;
  try {
    data = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new FeeGrantValidationError(
      `Invalid JSON response from fee grant API: ${message}`,
      "INVALID_RESPONSE",
    );
  }

  let camelCasedData: AllowanceResponse;
  try {
    camelCasedData = camelcaseKeys(data, {
      deep: true,
    }) as AllowanceResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new FeeGrantValidationError(
      `Failed to parse fee grant response: ${message}`,
      "INVALID_RESPONSE",
    );
  }

  if (!camelCasedData.allowance?.allowance) {
    throw new FeeGrantValidationError(
      "Fee grant response missing allowance data",
      "NO_ALLOWANCE",
    );
  }

  const { allowance } = camelCasedData.allowance;

  // Validate that allowance is an object (not a string, number, null, etc.)
  if (
    typeof allowance !== "object" ||
    allowance === null ||
    Array.isArray(allowance)
  ) {
    throw new FeeGrantValidationError(
      "Fee grant allowance has malformed structure: allowance must be an object",
      "INVALID_RESPONSE",
    );
  }

  try {
    const isValid = validateActions(requestedActions, allowance, userAddress);

    if (isValid) {
      return { valid: true };
    }

    return {
      valid: false,
      error: new FeeGrantValidationError(
        `Requested actions are not permitted by the fee grant allowance`,
        "INVALID_ALLOWANCE",
      ),
    };
  } catch (error) {
    // Re-throw InvalidAllowanceError as FeeGrantValidationError
    if (error instanceof InvalidAllowanceError) {
      throw new FeeGrantValidationError(
        `Invalid allowance structure: ${error.message}`,
        "INVALID_RESPONSE",
      );
    }
    throw error; // Re-throw other errors
  }
}

/**
 * Error for invalid allowance structure
 */
export class InvalidAllowanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAllowanceError";
  }
}

/**
 * Validates if requested actions are permitted by an allowance.
 * Message type URLs are case-sensitive (protocol buffer type URLs).
 *
 * @param actions - Array of action type URLs to validate
 * @param allowance - The allowance to check against
 * @param userAddress - Optional user address for ContractsAllowance validation
 * @returns true if all actions are permitted, false if actions are not permitted
 * @throws {InvalidAllowanceError} - For malformed allowance structures
 */
export function validateActions(
  actions: string[],
  allowance: Allowance,
  userAddress?: string,
): boolean {
  if (!actions || actions.length === 0) {
    return true; // No actions requested means all are allowed
  }

  if (!allowance) {
    throw new InvalidAllowanceError("Allowance is required");
  }

  if (isAllowedMsgAllowance(allowance)) {
    if (!allowance.allowedMessages) {
      throw new InvalidAllowanceError(
        "AllowedMsgAllowance missing allowedMessages property",
      );
    }
    if (!Array.isArray(allowance.allowedMessages)) {
      throw new InvalidAllowanceError(
        "AllowedMsgAllowance.allowedMessages must be an array",
      );
    }
    if (allowance.allowedMessages.length === 0) {
      return false; // No allowed messages means nothing is permitted
    }
    // Message type URLs are case-sensitive (protocol buffer convention)
    return actions.every((action) =>
      allowance.allowedMessages.includes(action),
    );
  }

  if (isContractsAllowance(allowance)) {
    if (!allowance.allowance) {
      throw new InvalidAllowanceError(
        "ContractsAllowance missing allowance property",
      );
    }
    if (!allowance.contractAddresses) {
      throw new InvalidAllowanceError(
        "ContractsAllowance missing contractAddresses property",
      );
    }
    if (!Array.isArray(allowance.contractAddresses)) {
      throw new InvalidAllowanceError(
        "ContractsAllowance.contractAddresses must be an array",
      );
    }
    // Validate nested allowance structure
    if (
      typeof allowance.allowance !== "object" ||
      allowance.allowance === null ||
      Array.isArray(allowance.allowance)
    ) {
      throw new InvalidAllowanceError(
        "Nested allowance in ContractsAllowance is malformed",
      );
    }
    // If userAddress is provided and contractAddresses is empty, return false
    if (userAddress && allowance.contractAddresses.length === 0) {
      return false;
    }
    if (userAddress && allowance.contractAddresses.length > 0) {
      // Address comparison should be case-insensitive (bech32 addresses)
      const normalizedUserAddress = userAddress.toLowerCase();
      const normalizedContractAddresses = allowance.contractAddresses.map(
        (addr) => addr.toLowerCase(),
      );
      if (!normalizedContractAddresses.includes(normalizedUserAddress)) {
        return false;
      }
    }
    return validateActions(actions, allowance.allowance, userAddress);
  }

  if (isMultiAnyAllowance(allowance)) {
    if (!allowance.allowances) {
      throw new InvalidAllowanceError(
        "MultiAnyAllowance missing allowances property",
      );
    }
    if (!Array.isArray(allowance.allowances)) {
      throw new InvalidAllowanceError(
        "MultiAnyAllowance.allowances must be an array",
      );
    }
    if (allowance.allowances.length === 0) {
      return false; // No child allowances means nothing is permitted
    }
    for (const subAllowance of allowance.allowances) {
      if (!subAllowance) {
        throw new InvalidAllowanceError(
          "MultiAnyAllowance contains null or undefined allowance",
        );
      }
      if (validateActions(actions, subAllowance, userAddress)) {
        return true; // Grant is true if ANY child grant is true
      }
    }
    return false;
  }

  return false; // Unknown allowance type (not an error - just not supported)
}
