import type { NextApiRequest, NextApiResponse } from "next";
import { verifyADR36Amino } from "@keplr-wallet/cosmos";

// This import will need to change based on the chain you are confirming against.
import { testnetChainInfo } from "@burnt-labs/constants";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { Pubkey } from "@cosmjs/amino";

interface GrantsResponse {
  grants: Grant[];
  pagination: Pagination;
}

interface Grant {
  granter: string;
  grantee: string;
  authorization: Authorization;
  expiration: string;
}

interface Authorization {
  "@type": string;
  grants: GrantAuthorization[];
}

interface GrantAuthorization {
  contract: string;
  limit: Limit;
  filter: Filter;
}

interface Limit {
  "@type": string;
  remaining: string;
}

interface Filter {
  "@type": string;
}

interface Pagination {
  next_key: null | string;
  total: string;
}

function isString(test: any): test is string {
  return typeof test === "string";
}

async function checkGrants(granter: string, grantee: string): Promise<Boolean> {
  const res = await fetch(
    `${testnetChainInfo.rest}/cosmos/authz/v1beta1/grants/grantee/${granter}`,
    {
      cache: "no-store",
    },
  );
  const data = (await res.json()) as GrantsResponse;
  return data.grants.map((grant) => grant.grantee).includes(grantee);
}

function checkSignature(
  address: string,
  pubKey: Pubkey,
  messageString: string,
  signature: string,
): boolean {
  const msg = Buffer.from(messageString, "hex").toString();

  const signatureBuffer = Buffer.from(signature, "base64");

  const uint8Signature = new Uint8Array(signatureBuffer); // Convert the buffer to an Uint8Array

  const pubKeyValueBuffer = Buffer.from(pubKey, "base64"); // Decode the base64 encoded value

  const pubKeyUint8Array = new Uint8Array(pubKeyValueBuffer); // Convert the buffer to an Uint8Array

  return verifyADR36Amino(
    testnetChainInfo.bech32Config.bech32PrefixAccAddr,
    address,
    msg,
    pubKeyUint8Array,
    uint8Signature,
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { query, method } = req;
  const client = await CosmWasmClient.connect(testnetChainInfo.rpc);

  if (method === "GET") {
    const { userSessionAddress, metaAccountAddress, message, signature } =
      query;

    const errors: string[] = [];
    if (!userSessionAddress) {
      errors.push("userSessionAddress is required");
    }

    if (!metaAccountAddress && typeof metaAccountAddress === "string") {
      errors.push("itemId is required");
    }

    if (!message && typeof message === "string") {
      errors.push("message is required");
    }

    if (!signature && typeof signature === "string") {
      errors.push("signature is required");
    }

    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    // These aid TS type inference. You can pull in a more complex validation package to handle this like io-ts
    if (!isString(userSessionAddress)) {
      res
        .status(400)
        .json({ errors: ["userSessionAddress is required to be a string"] });
      return;
    }

    if (!isString(metaAccountAddress)) {
      res
        .status(400)
        .json({ errors: ["metaAccountAddress is required to be a string"] });
      return;
    }

    if (!isString(message)) {
      res.status(400).json({ errors: ["message is required to be a string"] });
      return;
    }

    if (!isString(signature)) {
      res
        .status(400)
        .json({ errors: ["signature is required to be a string"] });
      return;
    }

    /*
     * Confirming account "ownership" is a three-step process
     * 1. Confirm the signature passed is valid for the temporary userSessionAddress
     * 2. Pull any grant bestowed to the userSessionAddress on chain
     * 3. Check that AT LEAST one grant exists of any type exists between the userSessionAddress and the metaAccountAddress
     **/
    // Need to get the pub key from the chain.
    const account = await client.getAccount(userSessionAddress);
    if (!account) {
      res.status(404).json({
        errors: ["account not found"],
      });
      return;
    }
    const { pubkey } = account;
    if (!pubkey) {
      res.status(404).json({
        errors: ["public key not found"],
      });
      return;
    }

    const isValid = checkSignature(
      userSessionAddress,
      pubkey.value,
      message,
      signature,
    );
    if (!isValid) {
      res.status(400).json({
        errors: ["invalid signature"],
      });
      return;
    }

    // handle GET request
    res.status(200).json({
      valid: await checkGrants(metaAccountAddress, userSessionAddress),
    });
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}
