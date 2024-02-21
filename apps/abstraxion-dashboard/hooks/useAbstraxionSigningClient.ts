import { useContext, useEffect, useState } from "react";
import { useStytch } from "@stytch/nextjs";
import { useCosmWasmSigningClient } from "graz";
import { AAClient, AbstractAccountJWTSigner } from "@burnt-labs/signers";
import { testnetChainInfo } from "@burnt-labs/constants";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "@/components/AbstraxionContext";
import { GasPrice } from "@cosmjs/stargate";

export const useAbstraxionSigningClient = () => {
  const {
    connectionType,
    abstractAccount,
    rpcUrl = testnetChainInfo.rpc,
  } = useContext(AbstraxionContext) as AbstraxionContextProps;

  const stytch = useStytch();
  const sessionToken = stytch.session.getTokens()?.session_token;
  const { data: grazClient } = useCosmWasmSigningClient();

  const [abstractClient, setAbstractClient] = useState<AAClient | undefined>(
    undefined,
  );

  useEffect(() => {
    async function getStytchSigner() {
      const jwtSigner = new AbstractAccountJWTSigner(
        abstractAccount.bech32Address,
        sessionToken,
      );

      const jwtClient = await AAClient.connectWithSigner(
        // Should be set in the context but defaulting here just in case.
        rpcUrl || testnetChainInfo.rpc,
        jwtSigner,
        {
        gasPrice: GasPrice.fromString("0uxion"),
      });

      setAbstractClient(jwtClient);
    }

    if (connectionType === "stytch" && abstractAccount) {
      getStytchSigner();
    }
  }, [sessionToken, abstractAccount, connectionType]);

  switch (connectionType) {
    case "stytch":
      return { client: abstractClient };
    case "graz":
      return { client: grazClient };
    default:
      return { client: undefined };
  }
};
