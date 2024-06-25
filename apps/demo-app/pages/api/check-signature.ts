import type { NextApiRequest, NextApiResponse } from "next";
import { verifyADR36Amino } from "@keplr-wallet/cosmos";

// This import will need to change based on the chain you are confirming against.
import { testnetChainInfo } from "@burnt-labs/constants";
import { QueryGrantsResponse } from "cosmjs-types/cosmos/authz/v1beta1/query";

function isString(test: unknown): test is string {
  return typeof test === "string";
}

/**
 * Verify that the given XION signature corresponds to the given message and address.
 *
 * @param address - The address that is supposed to have signed the message.
 * @param pubKey - The public key associated with the session address base64 encoded.
 * @param messageString - The message that is supposed to have been signed.
 * @param signature - The signature to verify against the message and address.
 * @returns True if the signature is valid, false otherwise.
 */
export function verifyXionSignature(
  address: string,
  pubKey: string,
  messageString: string,
  signature: string,
): boolean {
  const signatureBuffer = Buffer.from(signature, "base64");
  const uint8Signature = new Uint8Array(signatureBuffer); // Convert the buffer to an Uint8Array
  const pubKeyValueBuffer = Buffer.from(pubKey, "base64"); // Decode the base64 encoded value
  const pubKeyUint8Array = new Uint8Array(pubKeyValueBuffer); // Convert the buffer to an Uint8Array

  return verifyADR36Amino(
    "xion",
    address,
    messageString,
    pubKeyUint8Array,
    uint8Signature,
  );
}

/**
 * Verifies the Xion signature and grants for a given address, session address, public key,
 * message string, and signature.
 *
 * @param address - The address to verify the grants for.
 * @param sessionAddress - The session address to verify the grants for.
 * @param pubKey - The public key associated with the session address base64 encoded.
 * @param messageString - The message string to verify the signature against.
 * @param signature - The signature to verify.
 *
 * @returns Promise<boolean> - A promise that resolves to true if the Xion signature and grants are valid,
 *                             or false otherwise.
 */
export async function verifyXionSignatureAndGrants(
  address: string,
  sessionAddress: string,
  pubKey: string,
  messageString: string,
  signature: string,
): Promise<boolean> {
  const isValid = verifyXionSignature(
    sessionAddress,
    pubKey,
    messageString,
    signature,
  );
  if (!isValid) {
    return false;
  }

  return verifyGrants(address, sessionAddress);
}

/**
 * Verifies if grants have been given by a granter to a grantee.
 *
 * @param grantee - The address of the granter.
 * @param granter - The address of the grantee.
 *
 * @returns Promise<boolean> - A promise that resolves to a boolean indicating whether ANY grants have been given.
 */
export async function verifyGrants(
  granter: string,
  grantee: string,
): Promise<boolean> {
  const baseUrl = `${testnetChainInfo.rest}/cosmos/authz/v1beta1/grants`;
  const url = new URL(baseUrl);
  const params = new URLSearchParams({
    grantee,
    granter,
  });
  url.search = params.toString();
  const data = await fetch(url, {
    cache: "no-store",
  })
    .then((response): Promise<QueryGrantsResponse> => response.json())
    .catch((err) => {
      console.error("Could not fetch grants info", err);
    });

  return Boolean(data && data.grants.length > 0);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { query, method } = req;

  if (method === "GET") {
    const {
      userSessionAddress,
      userSessionPubKey,
      metaAccountAddress,
      message,
      signature,
    } = query;

    const errors: string[] = [];
    if (!userSessionAddress) {
      errors.push("userSessionAddress is required");
    }

    if (!userSessionPubKey) {
      errors.push("userSessionPubKey is required");
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

    if (!isString(userSessionPubKey)) {
      res
        .status(400)
        .json({ errors: ["userSessionPubKey is required to be a string"] });
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
     *
     * NOTE: If the userSessionAccount has not submitted a transaction to the chain, the PubKey will be unknown.
     * Therefore it must be passed as a api query parameter (In this example base64 encoded).
     *
     **/

    const isValid = await verifyXionSignatureAndGrants(
      metaAccountAddress,
      userSessionAddress,
      userSessionPubKey,
      message,
      signature,
    );

    res.status(200).json({
      valid: isValid,
    });
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}
