import { AminoSignDoc } from "@/types";

export function wait(ms = 1000) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function makeADR36AminoSignDoc(
  signer: string,
  message: string | Uint8Array,
): AminoSignDoc {
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

export { customAccountFromAny } from "./accountParser";
export { getRpcClient } from "./rpcClient";
