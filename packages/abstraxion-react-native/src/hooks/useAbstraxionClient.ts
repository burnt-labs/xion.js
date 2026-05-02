import { useContext, useEffect, useState } from "react";
import {
  CosmWasmClient,
  testnetChainInfo,
} from "@burnt-labs/abstraxion-js";
import { AbstraxionContext } from "../components/AbstraxionContext";

export const useAbstraxionClient = (): {
  readonly client: CosmWasmClient | undefined;
  readonly error: Error | undefined;
} => {
  const { rpcUrl, runtime } = useContext(AbstraxionContext);

  const [abstractClient, setAbstractClient] = useState<
    CosmWasmClient | undefined
  >(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function getClient(): Promise<void> {
      try {
        setError(undefined);
        const client = runtime
          ? await runtime.createReadClient()
          : await CosmWasmClient.connect(rpcUrl || testnetChainInfo.rpc);
        if (!cancelled) setAbstractClient(client);
      } catch (err) {
        if (cancelled) return;
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(
          new Error(
            `Failed to connect to RPC: ${errorMessage}. Please check your network connection and RPC URL.`,
          ),
        );
        setAbstractClient(undefined);
      }
    }

    void getClient();
    return () => {
      cancelled = true;
    };
  }, [rpcUrl, runtime]);

  return {
    client: abstractClient,
    error,
  } as const;
};
