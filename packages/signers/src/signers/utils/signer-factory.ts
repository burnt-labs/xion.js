/**
 * Signer factory utilities
 * Creates AASigner instances from signing functions
 * Simplifies signer creation logic
 */

import { Buffer } from "buffer";
import { OfflineDirectSigner } from "@cosmjs/proto-signing";
import { AAEthSigner, PersonalSignFn } from "../eth-signer";
import { AADirectSigner, SignArbitraryFn } from "../direct-signer";
import { AUTHENTICATOR_TYPE, type AuthenticatorType } from "../../types/account";
import { normalizeHexPrefix, fromHex } from "../../crypto/hex-validation";

/**
 * Parameters for creating a signer from a signing function
 */
export interface CreateSignerParams {
  /** The abstract account address (granter) */
  smartAccountAddress: string;

  /** Index of the authenticator in the smart account */
  authenticatorIndex: number;

  /** Authenticator type (EthWallet, Secp256K1, etc.) */
  authenticatorType: AuthenticatorType;

  /**
   * Signing function that takes hex message and returns hex signature
   * This is the unified interface from connectors
   *
   * @param hexMessage - Hex-encoded message (with 0x prefix).
   *                    For string messages (e.g., bech32 addresses), this should be hex-encoded UTF-8 bytes.
   *                    For transaction signing, this should be hex-encoded transaction bytes.
   *                    Callers are responsible for converting strings to hex before calling this function.
   */
  signMessage: (hexMessage: string) => Promise<string>;
}

/**
 * Create an AASigner from a signing function
 * Automatically selects the appropriate signer type based on authenticator type
 *
 * @param params - Parameters for signer creation
 * @returns AASigner instance (AAEthSigner or AADirectSigner)
 */
export function createSignerFromSigningFunction(
  params: CreateSignerParams,
): AAEthSigner | AADirectSigner {
  const {
    smartAccountAddress,
    authenticatorIndex,
    authenticatorType,
    signMessage,
  } = params;

  if (authenticatorType === AUTHENTICATOR_TYPE.EthWallet) {
    return createEthSigner(
      smartAccountAddress,
      authenticatorIndex,
      signMessage,
    );
  } else {
    return createDirectSigner(
      smartAccountAddress,
      authenticatorIndex,
      signMessage,
    );
  }
}

/**
 * Create AAEthSigner from signing function
 */
function createEthSigner(
  smartAccountAddress: string,
  authenticatorIndex: number,
  signMessage: (hexMessage: string) => Promise<string>,
): AAEthSigner {
  // AAEthSigner expects hex with 0x prefix
  const personalSign: PersonalSignFn = async (message: string) => {
    // Ensure message has 0x prefix
    const hexMessage = message.startsWith("0x") ? message : `0x${message}`;
    return await signMessage(hexMessage);
  };

  return new AAEthSigner(smartAccountAddress, authenticatorIndex, personalSign);
}

/**
 * Create AADirectSigner from signing function
 */
function createDirectSigner(
  smartAccountAddress: string,
  authenticatorIndex: number,
  signMessage: (hexMessage: string) => Promise<string>,
): AADirectSigner {
  // Create minimal offline signer for getAccounts()
  const minimalSigner: Pick<OfflineDirectSigner, "getAccounts"> = {
    getAccounts: async () => {
      return [
        {
          address: smartAccountAddress,
          algo: "secp256k1" as const,
          pubkey: new Uint8Array(),
        },
      ];
    },
  };

  // Create SignArbitraryFn that uses the signing function
  const signArbitrary: SignArbitraryFn = async (
    chainId: string,
    signerAddr: string,
    data: string | Uint8Array,
  ) => {
    // Convert data to hex with 0x prefix (as expected by signMessage)
    const hexMessage =
      typeof data === "string"
        ? `0x${Buffer.from(data, "utf8").toString("hex")}`
        : `0x${Buffer.from(data).toString("hex")}`;

    // Use signing function (returns hex signature, may or may not have 0x prefix)
    const signatureHex = await signMessage(hexMessage);

    // Convert hex signature to StdSignature format
    // Use proper utility to remove 0x prefix (handles duplicates and edge cases)
    const signatureHexWithoutPrefix = normalizeHexPrefix(signatureHex);
    // Use CosmJS fromHex to decode (validates hex format)
    const signatureBytes = fromHex(signatureHexWithoutPrefix);
    return {
      pub_key: {
        type: "tendermint/PubKeySecp256k1",
        value: "",
      },
      signature: Buffer.from(signatureBytes).toString("base64"),
    };
  };

  return new AADirectSigner(
    minimalSigner,
    smartAccountAddress,
    authenticatorIndex,
    signArbitrary,
  );
}
