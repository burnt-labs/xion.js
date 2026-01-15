import { useContext, useEffect, useState } from "react";
import { testnetChainInfo } from "@burnt-labs/constants";
import { AbstraxionContext } from "@/src/AbstraxionProvider";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";

export const useAbstraxionClient = (): {
  readonly client: CosmWasmClient | undefined;
  readonly error: Error | undefined;
} => {
  const { rpcUrl } = useContext(AbstraxionContext);

  const [abstractClient, setAbstractClient] = useState<
    CosmWasmClient | undefined
  >(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    async function getClient() {
      try {
        setError(undefined);
        const client = await CosmWasmClient.connect(
          // Should be set in the context but defaulting here just in case
          rpcUrl || testnetChainInfo.rpc,
        );

        setAbstractClient(client);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(
          new Error(
            `Failed to connect to RPC: ${errorMessage}. Please check your network connection and RPC URL.`,
          ),
        );
        setAbstractClient(undefined);
      }
    }

    getClient();
  }, [rpcUrl]);

  return {
    client: abstractClient,
    error,
  } as const;
};
