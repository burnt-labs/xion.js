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
  return (allowance as any)["@type"] === "/cosmos.feegrant.v1beta1.AllowedMsgAllowance";
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
 * Validates if a requested set of actions are permitted under a fee grant between a granter and grantee.
 *
 * @async
 * @function
 * @param {string} restUrl - The base URL of the Cosmos REST API.
 * @param {string} feeGranter - The address of the fee granter (the account providing the allowance).
 * @param {string} granter - The address of the grantee (the account receiving the allowance).
 * @param {string[]} requestedActions - The array of specific actions to validate, e.g., ["/cosmos.authz.v1beta1.MsgGrant", ...].
 * @param {string} [userAddress] - (Optional) The user's smart contract account address to validate against `ContractsAllowance`.
 * @returns {Promise<boolean>} - A promise that resolves to `true` if all actions are permitted under the fee grant, otherwise `false`.
 *
 * @throws {Error} - If the API request fails or an unexpected error occurs.
 */
export async function validateFeeGrant(
  restUrl: string,
  feeGranter: string,
  granter: string,
  requestedActions: string[],
  userAddress?: string,
): Promise<boolean> {
  const baseUrl = `${restUrl}/cosmos/feegrant/v1beta1/allowance/${feeGranter}/${granter}`;
  try {
    const response = await fetch(baseUrl, { cache: "no-store" });
    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    const camelCasedData = camelcaseKeys(data, {
      deep: true,
    }) as AllowanceResponse;

    const { allowance } = camelCasedData.allowance;
    return validateActions(requestedActions, allowance, userAddress);
  } catch (error) {
    console.error("Error validating fee grant:", error);
    return false;
  }
}

export function validateActions(
  actions: string[],
  allowance: Allowance,
  userAddress?: string,
): boolean {
  if (isAllowedMsgAllowance(allowance)) {
    return actions.every((action) =>
      allowance.allowedMessages.includes(action),
    );
  }

  if (isContractsAllowance(allowance)) {
    if (userAddress && !allowance.contractAddresses.includes(userAddress)) {
      return false;
    }
    return validateActions(actions, allowance.allowance, userAddress);
  }

  if (isMultiAnyAllowance(allowance)) {
    for (const subAllowance of allowance.allowances) {
      if (validateActions(actions, subAllowance, userAddress)) {
        return true; // Grant is true if ANY child grant is true
      }
    }
    return false;
  }

  return false;
}
