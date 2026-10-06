import type { AbstraxionConfig as RNConfig } from "../dist/index";
import type { AbstraxionConfig as JSConfig } from "../../abstraxion-js/dist/index";
type RNSigner = Extract<
  NonNullable<RNConfig["authentication"]>,
  { type: "signer" }
>;
type JSSigner = Extract<
  NonNullable<JSConfig["authentication"]>,
  { type: "signer" }
>;
const rnContract: RNSigner["smartAccountContract"] = {
  codeId: 1880,
  addressPrefix: "xion",
};
const jsContract: JSSigner["smartAccountContract"] = {
  codeId: 1880,
  addressPrefix: "xion",
};
void rnContract;
void jsContract;
