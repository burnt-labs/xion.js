import { useContext } from "react";
import {
  GranteeSignerClient,
} from "@burnt-labs/abstraxion-core";
import { AbstraxionContext } from "@/src/components/AbstraxionContext";

export const useAbstraxionSigningClient = (): {
  readonly client: GranteeSignerClient | undefined;
  readonly signArb:
    | ((signerAddress: string, message: string | Uint8Array) => Promise<string>)
    | undefined;
  readonly rpcUrl: string;
} => {
  const {
    abstraxionAccount,
    rpcUrl,
    signingClient: signingClientFromState, // From state machine (controller-based)
  } = useContext(AbstraxionContext);

  return {
    client: signingClientFromState,
    signArb: abstraxionAccount?.signArb,
    rpcUrl,
  } as const;
};
