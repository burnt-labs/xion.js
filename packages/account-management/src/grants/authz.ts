import { SelectedSmartAccount } from "../indexer-strategies/types";
import { ContractGrantDescription } from "../components/AbstraxionGrant/generateContractGrant";

/**
 * Checks if any of the contract grant configurations are the current smart account (granter)
 *
 * @param {ContractGrantDescription[]} contracts - An array of contract descriptions.
 * @param {SelectedSmartAccount} account - The selected smart account (granter in this case)
 * @returns {boolean} - Returns `true` if none of the contracts are the selected smart account, otherwise `false`.
 */
export const isContractGrantConfigValid = (
  contracts: ContractGrantDescription[],
  account: SelectedSmartAccount,
): boolean => {
  try {
    for (const contract of contracts) {
      const contractAddress =
        typeof contract === "string" ? contract : contract.address;

      if (!contractAddress) {
        return false;
      }

      if (contractAddress === account.id) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
};
