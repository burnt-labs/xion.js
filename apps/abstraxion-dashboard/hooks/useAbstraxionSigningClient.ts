import { useContext, useEffect, useState } from "react";
import { GasPrice } from "graz/dist/cosmjs";
import { useStytch } from "@stytch/nextjs";
import {
  AAClient,
  AADirectSigner,
  AbstractAccountJWTSigner,
} from "@burnt-labs/signers";
import { testnetChainInfo } from "@burnt-labs/constants";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "@/components/AbstraxionContext";
import { useOfflineSigners } from "graz";

export const useAbstraxionSigningClient = (): {
  client: AAClient | undefined;
} => {
  const { connectionType, abstractAccount } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  const stytch = useStytch();
  const sessionToken = stytch.session.getTokens()?.session_token;

  const { data } = useOfflineSigners();

  const [abstractClient, setAbstractClient] = useState<AAClient | undefined>(
    undefined,
  );

  useEffect(() => {
    async function getSigner() {
      let signer: AbstractAccountJWTSigner | AADirectSigner | undefined =
        undefined;

      switch (connectionType) {
        case "stytch":
          signer = new AbstractAccountJWTSigner(
            abstractAccount.id,
            sessionToken,
          );
          break;
        case "graz":
          if (data && data.offlineSigner) {
            // This wont work. Was thinking this was 'abstraxion' package and abstractAccount is a DirectHDWallet.
            // Will need to gen an offline signer
            signer = new AADirectSigner(
              data?.offlineSigner,
              abstractAccount.id,
            );
            break;
          }
        case "none":
          // TODO: What do we want to do here?
          signer = undefined;
          break;
      }

      if (!signer) {
        // TODO: More robust edge handling
        return;
      }

      const abstractClient = await AAClient.connectWithSigner(
        testnetChainInfo.rpc,
        signer,
        {
          gasPrice: GasPrice.fromString("0uxion"),
        },
      );

      setAbstractClient(abstractClient);
    }

    if (abstractAccount) {
      getSigner();
    }
  }, [sessionToken, abstractAccount, connectionType]);

  return { client: abstractClient };
};
