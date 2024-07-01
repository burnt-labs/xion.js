import {
  AccountData,
  DirectSecp256k1Wallet,
  OfflineDirectSigner,
} from "@cosmjs/proto-signing";
import { fromHex } from "@cosmjs/encoding";
import { makeADR36AminoSignDoc, serializeSignDoc } from "@keplr-wallet/cosmos";
import { Hash, PrivKeySecp256k1 } from "@keplr-wallet/crypto";
import {
  AAClient,
  AADirectLocalSigner,
  BaseAccountClient,
  BaseAccountSigningCosmWasmClient,
  SignArbitraryFn,
} from "@burnt-labs/signers";
import { testChainInfo } from "@burnt-labs/constants";
import { StdSignature } from "@cosmjs/amino";

const rpc = testChainInfo.rpc;

function signArbFn(privateKey: string) {
  const cryptoPrivKey = new PrivKeySecp256k1(fromHex(privateKey));
  return async (
    chainId: string,
    signer: string,
    data: string | Uint8Array,
  ): Promise<StdSignature> => {
    const signDoc = makeADR36AminoSignDoc(signer, data);
    const serializedSignDoc = serializeSignDoc(signDoc);
    const digest = Hash.sha256(serializedSignDoc);

    const signature = cryptoPrivKey.signDigest32(digest);
    return {
      pub_key: {
        type: "not_important",
        value: signature,
      },
      signature: Buffer.from(
        new Uint8Array([...signature.r, ...signature.s]),
      ).toString("base64"),
    };
  };
}

export async function buildBaseAccountClient(
  key: string,
): Promise<
  [BaseAccountClient, AccountData, SignArbitraryFn, OfflineDirectSigner]
> {
  const signer: OfflineDirectSigner = await DirectSecp256k1Wallet.fromKey(
    fromHex(key),
    testChainInfo.bech32Config.bech32PrefixAccAddr,
  );

  const [accountData] = await signer.getAccounts();
  const client = await BaseAccountClient.connectWithSigner(rpc, signer);

  const signArb = signArbFn(key);

  // Unsure if the signer is will ever be needed directly, but it's here if needed.
  return [client, accountData, signArb, signer];
}

export async function buildBaseAccountSigningCosmWasmClientClient(
  key: string,
): Promise<
  [BaseAccountSigningCosmWasmClient, AccountData, OfflineDirectSigner]
> {
  const signer: OfflineDirectSigner = await DirectSecp256k1Wallet.fromKey(
    fromHex(key),
    testChainInfo.bech32Config.bech32PrefixAccAddr,
  );

  const [accountData] = await signer.getAccounts();
  const client = await BaseAccountSigningCosmWasmClient.connectWithSigner(
    rpc,
    signer,
  );

  return [client, accountData, signer];
}

export async function buildSignArbAbstractAccountClient(
  offlineSigner: OfflineDirectSigner,
  abstractAccountAddress: string,
  authenticatorID: number,
  signArb: SignArbitraryFn,
): Promise<[AAClient, AccountData, OfflineDirectSigner]> {
  if (!abstractAccountAddress) {
    throw new Error("Abstract account must be defined.");
  }

  const [account] = await offlineSigner.getAccounts();

  const signer = new AADirectLocalSigner(
    offlineSigner,
    abstractAccountAddress,
    // Will probably need to pass this in eventually
    0,
    signArb,
    {
      address: abstractAccountAddress,
      authenticatorId: authenticatorID,
      accountAddress: account.address,
      algo: "secp256k1",
      pubkey: account.pubkey,
    },
  );

  const [accountData] = await signer.getAccounts();
  const client = await AAClient.connectWithSigner(rpc, signer);

  return [client, accountData, signer];
}
