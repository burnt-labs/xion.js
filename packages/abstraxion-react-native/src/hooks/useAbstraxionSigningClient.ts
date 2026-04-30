import { useContext } from "react";
import type { GranteeSignerClient } from "@burnt-labs/abstraxion-js";
import { AbstraxionContext } from "../components/AbstraxionContext";

export const useAbstraxionSigningClient = (): {
  readonly client: GranteeSignerClient | undefined;
  readonly signArb:
    | ((signerAddress: string, message: string | Uint8Array) => Promise<string>)
    | undefined;
} => {
  const { abstraxionAccount, signingClient } = useContext(AbstraxionContext);

  return {
    client: signingClient,
    signArb: abstraxionAccount?.signArb,
  } as const;
};
