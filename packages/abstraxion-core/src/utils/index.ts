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

export { customAccountFromAny } from "@burnt-labs/signers";
export { getRpcClient } from "./rpcClient";
export { fetchConfig, clearConfigCache } from "./configUtils";
// NOTE: simulate helpers are intentionally NOT re-exported here. `./simulate`
// imports `wait` from this barrel, so re-exporting it back would form an
// import cycle that is brittle across bundlers/TS emit targets. The package
// root (`src/index.ts`) already exposes them via `export * from "./utils/simulate"`.
