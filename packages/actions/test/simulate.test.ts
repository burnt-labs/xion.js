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

describe("simulate with abstact account", () => {
  const encoder = new TextEncoder();
  const beforeCodeID = 1;
  const beforeChecksum =
    "5E0F49F9686FAD66C132031EC6A43EC63AD84A2B6C8A35C555542AC84FC03708";

  let aliceBaseAccountClient: BaseAccountClient;
  let aliceAccountData: AccountData;
  let aliceSignArbFn: SignArbitraryFn;
  let aliceOfflineDirectSigner: OfflineDirectSigner;

  const privateKey =
    process.env.PRIVATE_KEY ||
    "86abec7503c6fc9bc5b954347035e548a88385ea1c2cccfb92119a4cd0e518b5";

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

    console.log("aliceAccountData", aliceAccountData.address);

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
      authenticator: {
        Secp256K1: {
          id: 0,
          pubkey: publicKey,
          signature: signature,
        },
      },
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
        amount: [{ amount: "112500", denom: "uxion" }],
        gas: "500000",
      },
    );

    console.log("result", result);

    // await sleep(1500);

    // Send tokens for gas
    await aliceBaseAccountClient.sendTokens(
      aliceAccountData.address,
      addy,
      coins(1000000, "uxion"),
      {
        amount: [{ amount: "112500", denom: "uxion" }],
        gas: "500000",
      },
    );

    const [client] = await buildSignArbAbstractAccountClient(
      aliceOfflineDirectSigner,
      addy,
      0,
      aliceSignArbFn,
    );

    const txBodyFields = [
      {
        typeUrl: "/cosmos.bank.v1beta1.MsgSend",
        value: {
          fromAddress: addy,
          toAddress: aliceAccountData.address,
          amount: coins(100000, "uxion"),
        },
      },
    ];

    const simResult = await client.simulate(addy, txBodyFields, "hello");
    console.log("simResult", simResult);

    const tokenSendResponse = await client.sendTokens(
      addy,
      aliceAccountData.address,
      coins(1, "uxion"),
      {
        amount: [{ amount: "112500", denom: "uxion" }],
        gas: "500000",
      },
    );
  });
});
