import { NextRequest, NextResponse } from "next/server";
import { serializeSignDoc } from "@cosmjs/amino";
import { Secp256k1, Secp256k1Signature, Sha256 } from "@cosmjs/crypto";
import { testnetChainInfo } from "@burnt-labs/constants";
import { QueryGrantsResponse } from "cosmjs-types/cosmos/authz/v1beta1/query";

function isString(test: unknown): test is string {
  return typeof test === "string";
}

function makeADR36AminoSignDoc(
  signer: string,
  message: string | Uint8Array,
): any {
  return {
    chain_id: "",
    account_number: "0",
    sequence: "0",
    fee: {
      amount: [],
      gas: "0",
    },
    msgs: [
      {
        type: "sign/MsgSignData",
        value: {
          signer: signer,
          data:
            typeof message === "string"
              ? Buffer.from(message).toString("base64")
              : Buffer.from(message).toString("base64"),
        },
      },
    ],
    memo: "",
  };
}

async function verifyXionSignature(
  address: string,
  pubKey: string,
  messageString: string,
  signature: string,
): Promise<boolean> {
  const signatureBuffer = Buffer.from(signature, "base64");
  const uint8Signature = new Uint8Array(signatureBuffer);
  const pubKeyValueBuffer = Buffer.from(pubKey, "base64");
  const pubKeyUint8Array = new Uint8Array(pubKeyValueBuffer);

  const signDoc = makeADR36AminoSignDoc(address, messageString);
  const serializedSignDoc = serializeSignDoc(signDoc);

  const messageHash = new Sha256(serializedSignDoc).digest();
  const signatureObject = new Secp256k1Signature(
    uint8Signature.slice(0, 32),
    uint8Signature.slice(32, 64),
  );
  return Secp256k1.verifySignature(
    signatureObject,
    messageHash,
    pubKeyUint8Array,
  );
}

async function verifyXionSignatureAndGrants(
  address: string,
  sessionAddress: string,
  pubKey: string,
  messageString: string,
  signature: string,
): Promise<boolean> {
  const isValid = await verifyXionSignature(
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

async function verifyGrants(
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userSessionAddress = searchParams.get("userSessionAddress");
  const userSessionPubKey = searchParams.get("userSessionPubKey");
  const metaAccountAddress = searchParams.get("metaAccountAddress");
  const message = searchParams.get("message");
  const signature = searchParams.get("signature");

  const errors: string[] = [];
  if (!userSessionAddress) {
    errors.push("userSessionAddress is required");
  }

  if (!userSessionPubKey) {
    errors.push("userSessionPubKey is required");
  }

  if (!metaAccountAddress) {
    errors.push("metaAccountAddress is required");
  }

  if (!message) {
    errors.push("message is required");
  }

  if (!signature) {
    errors.push("signature is required");
  }

  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // These aid TS type inference
  if (!isString(userSessionAddress)) {
    return NextResponse.json(
      { errors: ["userSessionAddress is required to be a string"] },
      { status: 400 },
    );
  }

  if (!isString(userSessionPubKey)) {
    return NextResponse.json(
      { errors: ["userSessionPubKey is required to be a string"] },
      { status: 400 },
    );
  }

  if (!isString(metaAccountAddress)) {
    return NextResponse.json(
      { errors: ["metaAccountAddress is required to be a string"] },
      { status: 400 },
    );
  }

  if (!isString(message)) {
    return NextResponse.json(
      { errors: ["message is required to be a string"] },
      { status: 400 },
    );
  }

  if (!isString(signature)) {
    return NextResponse.json(
      { errors: ["signature is required to be a string"] },
      { status: 400 },
    );
  }

  const isValid = await verifyXionSignatureAndGrants(
    metaAccountAddress,
    userSessionAddress,
    userSessionPubKey,
    message,
    signature,
  );

  return NextResponse.json({ valid: isValid });
}
