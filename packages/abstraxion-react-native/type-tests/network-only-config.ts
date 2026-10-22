import type { AbstraxionConfig as RNConfig } from "../dist/index";
import type { AbstraxionConfig as JSConfig } from "../../abstraxion-js/dist/index";

declare const getSignerConfig: Extract<
  NonNullable<JSConfig["authentication"]>,
  { type: "signer" }
>["getSignerConfig"];

// The network is the only chain setting a signer-mode app needs.
const rnConfig: RNConfig = {
  network: "mainnet",
  treasury: "xion1treasury",
  authentication: { type: "signer", getSignerConfig },
};
const jsConfig: JSConfig = {
  network: "testnet",
  authentication: { type: "signer", getSignerConfig },
};

// @ts-expect-error only "mainnet" and "testnet" are networks
const badNetwork: JSConfig = { network: "devnet" };

void rnConfig;
void jsConfig;
void badNetwork;
