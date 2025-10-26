/**
 * Generate grant messages from treasury contract
 * Builds MsgGrant messages directly from treasury authorization configs
 * Based on dashboard's utils/generate-treasury-grants.ts
 */

import { MsgGrant } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import { EncodeObject } from "@cosmjs/proto-signing";
import type { GrantConfigByTypeUrl } from "../types/treasury";
import type { TreasuryStrategy } from "../types/treasury";

/**
 * Construct a single authz grant message from treasury grant config
 * Uses the raw authorization value (base64-encoded protobuf) from the treasury
 */
function constructGrantMessage(
  grantConfig: GrantConfigByTypeUrl,
  granter: string,
  grantee: string,
  expiration: bigint,
): EncodeObject {
  // Convert base64 authorization value to Uint8Array
  const authorizationByteArray = new Uint8Array(
    Buffer.from(grantConfig.authorization.value, "base64"),
  );

  const authorization = {
    typeUrl: grantConfig.authorization.type_url,
    value: authorizationByteArray,
  };

  return {
    typeUrl: MsgGrant.typeUrl,
    value: MsgGrant.fromPartial({
      grant: {
        authorization,
        expiration: {
          seconds: expiration,
          nanos: 0,
        },
      },
      grantee,
      granter,
    }),
  };
}

/**
 * Generate authz grant messages from treasury contract using strategy
 *
 * @param contractAddress - The address for the deployed treasury contract instance
 * @param client - Client to query RPC (must have queryContractSmart method)
 * @param granter - The granter address (smart account)
 * @param grantee - The grantee address (temp keypair or user wallet)
 * @param strategy - Treasury strategy to use for fetching configs
 * @param expiration - Grant expiration timestamp (default: 3 months from now)
 * @returns Array of authz grant messages to pass into transaction
 */
export async function generateTreasuryGrants(
  contractAddress: string,
  client: any, // AAClient from @burnt-labs/signers
  granter: string,
  grantee: string,
  strategy: TreasuryStrategy,
  expiration?: bigint,
): Promise<EncodeObject[]> {
  if (!contractAddress) {
    throw new Error("Missing contract address");
  }

  if (!client) {
    throw new Error("Missing client");
  }

  if (!granter) {
    throw new Error("Missing granter address");
  }

  if (!grantee) {
    throw new Error("Missing grantee address");
  }

  if (!strategy) {
    throw new Error("Missing treasury strategy");
  }

  // Default expiration: 3 months from now
  const expirationTime = expiration || BigInt(
    Math.floor(
      new Date(new Date().setMonth(new Date().getMonth() + 3)).getTime() / 1000,
    ),
  );

  // Fetch treasury configuration using strategy
  const treasuryConfig = await strategy.fetchTreasuryConfig(
    contractAddress,
    client,
  );

  if (!treasuryConfig) {
    throw new Error(
      "Something went wrong querying the treasury contract for grants",
    );
  }

  if (!treasuryConfig.grantConfigs || treasuryConfig.grantConfigs.length === 0) {
    throw new Error("No grant configs found in treasury contract");
  }

  // Build grant messages from raw authorization values
  const grantMessages = treasuryConfig.grantConfigs.map((grantConfig) => {
    return constructGrantMessage(grantConfig, granter, grantee, expirationTime);
  });

  return grantMessages;
}
