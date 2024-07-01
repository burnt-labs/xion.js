import { beforeEach, describe, test } from "@jest/globals";

import { instantiate2Address } from "@cosmjs/cosmwasm-stargate";
import {
  BaseAccountClient,
  MsgRegisterAccount,
  SignArbitraryFn,
} from "@burnt-labs/signers";
import { AccountData, coin, OfflineDirectSigner } from "@cosmjs/proto-signing";
import {
  buildBaseAccountClient,
  buildSignArbAbstractAccountClient,
} from "../src/index.ts";
import { util } from "protobufjs";
import { coins } from "@cosmjs/amino";
import Long = util.Long;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("migrate account", () => {
  const encoder = new TextEncoder();
  const beforeCodeID = 21;
  const beforeChecksum =
    "8B8F156A0E4BF502C1ED15CB992ED8D92AD8C103CFD1611E7970D4D9FDF44BC4";

  const afterCodeID = 793;

  let aliceBaseAccountClient: BaseAccountClient;
  let aliceAccountData: AccountData;
  let aliceSignArbFn: SignArbitraryFn;
  let aliceOfflineDirectSigner: OfflineDirectSigner;

  const privateKey =
    process.env.PRIVATE_KEY ||
    "0eb1480bd15fc8b36e06db426bd28ab0b317ea920fb16fd392191a0b3154a801";

  beforeEach(async () => {
    [
      aliceBaseAccountClient,
      aliceAccountData,
      aliceSignArbFn,
      aliceOfflineDirectSigner,
    ] = await buildBaseAccountClient(privateKey);
  });

  test("create abstract account", async () => {
    const publicKey = Buffer.from(aliceAccountData.pubkey).toString("base64");

    const str = `Magic: ${Date.now()}`;

    // The default encoding is 'utf-8'
    const salt = encoder.encode(str);
    let byteArray = new Uint8Array(32);
    for (let i = 0; i < beforeChecksum.length; i += 2) {
      byteArray[i / 2] = parseInt(beforeChecksum.substring(i, i + 2), 16);
    }

    // Calculate the resulting contract address
    const addy = instantiate2Address(
      byteArray,
      aliceAccountData.address,
      salt,
      "xion",
    );

    const message = Buffer.from(encoder.encode(addy));
    const { signature } = await aliceSignArbFn(
      "",
      aliceAccountData.address,
      message,
    );

    const initiateContractMsg = {
      id: 0,
      authenticator: {
        Secp256K1: {
          pubkey: publicKey,
        },
      },
      signature,
    };

    const registerAccountMsg: MsgRegisterAccount = {
      sender: aliceAccountData.address,
      codeId: Long.fromNumber(beforeCodeID),
      msg: Buffer.from(JSON.stringify(initiateContractMsg)),
      funds: [coin(1, "uxion")],
      salt: Buffer.from(salt),
    };
    const result = await aliceBaseAccountClient.registerAbstractAccount(
      registerAccountMsg,
      {
        amount: [{ amount: "0", denom: "uxion" }],
        gas: "500000",
      },
    );

    console.log("result", result);

    await sleep(15000);

    const [client, accountData, signer] =
      await buildSignArbAbstractAccountClient(
        aliceOfflineDirectSigner,
        addy,
        0,
        aliceSignArbFn,
      );

    const migrateResult = await client.migrate(
      addy,
      addy,
      afterCodeID,
      {},
      {
        amount: [{ amount: "0", denom: "uxion" }],
        gas: "500000",
      },
    );

    console.log("migrateResult", migrateResult);

    const tokenSendResponse = await client.sendTokens(
      addy,
      aliceAccountData.address,
      coins(1, "uxion"),
      {
        amount: [{ amount: "0", denom: "uxion" }],
        gas: "500000",
      },
    );

    console.log("tokenSendResponse", tokenSendResponse);

    const [
      bobClient,
      bobAccountData,
      bobSignArbitraryFn,
      bobOfflineDirectSigner,
    ] = await buildBaseAccountClient(
      "54b3d5d6ded7ffebdbea4b2fd09deff864209f82718293237af8a745c783e3c6",
    );

    const addAuthMsg = {
      add_auth_method: {
        add_authenticator: {
          Secp256K1: {
            id: 1,
            pubkey: Buffer.from(bobAccountData.pubkey).toString("base64"),
            signature: (
              await bobSignArbitraryFn("", bobAccountData.address, addy)
            ).signature,
          },
        },
      },
    };

    const addAbstractAccountResult =
      await client.addAbstractAccountAuthenticator(addAuthMsg, "", {
        amount: [{ amount: "0", denom: "uxion" }],
        gas: "500000",
      });

    console.log("addAbstractAccountResult", addAbstractAccountResult);

    const removeAuthMsg = {
      remove_auth_method: {
        id: 1,
      },
    };

    const removeAbstractAccountResult =
      await client.removeAbstractAccountAuthenticator(removeAuthMsg, "", {
        amount: [{ amount: "0", denom: "uxion" }],
        gas: "500000",
      });

    console.log("removeAbstractAccountResult", removeAbstractAccountResult);
  });
});
