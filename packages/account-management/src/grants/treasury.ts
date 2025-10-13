import { MsgGrant } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import type {
  GeneratedAuthzGrantMessage,
  GrantConfigByTypeUrl,
  GrantConfigTypeUrlsResponse,
} from "../types/treasury-types";
import type { AAClient } from "../signers";

/**
 * Utility function to construct authz grant message
 * @param {GrantConfigByTypeUrl} grantConfig - The grant config from the treasury contract
 * @param {string} granter - The granter address
 * @param {string} grantee - The grantee address
 * @returns {GeneratedAuthzGrantMessage} - The constructed authz grant message
 */
const constructGrantMessage = (
  grantConfig: GrantConfigByTypeUrl,
  granter: string,
  grantee: string,
): GeneratedAuthzGrantMessage => {
  const authorizationByteArray = new Uint8Array(
    Buffer.from(grantConfig.authorization.value, "base64"),
  );
  const authorization = {
    typeUrl: grantConfig.authorization.type_url,
    value: authorizationByteArray,
  };

  const grantValue = MsgGrant.fromPartial({
    grant: {
      authorization,
      expiration: {
        seconds: BigInt(
          Math.floor(
            new Date(new Date().setMonth(new Date().getMonth() + 3)).getTime() /
              1000,
          ),
        ),
        nanos: 0,
      },
    },
    grantee,
    granter,
  });

  return {
    typeUrl: MsgGrant.typeUrl,
    value: grantValue,
  };
};

/**
 * Queries the DAPP treasury contract to construct authz grant messages
 * @param {string} contractAddress - The address for the deployed treasury contract instance
 * @param {AAClient} client - Client to query RPC
 * @param {string} granter - The granter address
 * @param {string} grantee - The grantee address
 * @returns {GeneratedAuthzGrantMessage[]} - Array of authz grant messages to pass into tx
 */
export const generateTreasuryGrants = async (
  contractAddress: string,
  client: AAClient,
  granter: string,
  grantee: string,
): Promise<GeneratedAuthzGrantMessage[]> => {
  if (!contractAddress) {
    throw new Error("Missing contract address");
  }

  if (!client) {
    throw new Error("Missing client");
  }

  const queryTreasuryContractMsg = {
    grant_config_type_urls: {},
  };

  const queryResponse: GrantConfigTypeUrlsResponse =
    await client.queryContractSmart(contractAddress, queryTreasuryContractMsg);

  if (!queryResponse) {
    throw new Error(
      "Something went wrong querying the treasury contract for grants",
    );
  }

  const grantMsgs: GeneratedAuthzGrantMessage[] = await Promise.all(
    queryResponse.map(async (grant) => {
      const queryByMsg = {
        grant_config_by_type_url: {
          msg_type_url: grant,
        },
      };

      const queryByResponse: GrantConfigByTypeUrl =
        await client.queryContractSmart(contractAddress, queryByMsg);

      if (!queryByResponse || !queryByResponse.description) {
        throw new Error(
          "Something went wrong querying the treasury contract by type url",
        );
      }

      return constructGrantMessage(queryByResponse, granter, grantee);
    }),
  );

  return grantMsgs;
};
