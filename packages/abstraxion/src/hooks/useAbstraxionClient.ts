import { useContext, useEffect, useState } from "react";
import { testnetChainInfo } from "@burnt-labs/constants";
import { AbstraxionContext } from "@/src/components/AbstraxionContext";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";

export const useAbstraxionClient = (): {
  readonly client: CosmWasmClient | undefined;
} => {
  const { rpcUrl } = useContext(AbstraxionContext);

  const [abstractClient, setAbstractClient] = useState<
    CosmWasmClient | undefined
  >(undefined);

  useEffect(() => {
    async function getClient() {
      try {
        const client = await CosmWasmClient.connect(
          // Should be set in the context but defaulting here just in case
          rpcUrl || testnetChainInfo.rpc,
        );

        setAbstractClient(client);
      } catch (error) {
        setAbstractClient(undefined);
      }
    }

    getClient();
  }, [rpcUrl]);

  return {
    client: abstractClient,
  } as const;
};
