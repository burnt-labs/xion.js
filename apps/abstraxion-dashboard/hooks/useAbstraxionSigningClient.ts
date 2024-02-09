import { useContext, useEffect, useState } from "react";
import { GasPrice } from "graz/dist/cosmjs";
import { useStytch } from "@stytch/nextjs";
import {
  AAClient,
  AADirectSigner,
  AbstractAccountJWTSigner,
} from "@burnt-labs/signers";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "@/components/AbstraxionContext";
import { getKeplr, useOfflineSigners } from "graz";
import { testnetChainInfo } from "@burnt-labs/constants";

export const useAbstraxionSigningClient = (): {
  client: AAClient | undefined;
} => {
  const { connectionType, abstractAccount } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  const stytch = useStytch();
  const sessionToken = stytch.session.getTokens()?.session_token;

  const { data } = useOfflineSigners();
  const keplr = getKeplr();

  const [abstractClient, setAbstractClient] = useState<AAClient | undefined>(
    undefined,
  );

  useEffect(() => {
    async function getSigner() {
      let signer: AbstractAccountJWTSigner | AADirectSigner | undefined =
        undefined;

      // TODO: authenticator vs index. which one is better long term
      // How do you get authenticator index if there are duplicates...?
      // Client-side disable ability to add duplicate authenticators
      switch (connectionType) {
        case "stytch":
          signer = new AbstractAccountJWTSigner(
            abstractAccount.id,
            abstractAccount.currentAuthenticatorIndex,
            sessionToken,
          );
          break;
        case "graz":
          if (data && data.offlineSigner) {
            signer = new AADirectSigner(
              data?.offlineSigner,
              abstractAccount.id,
              abstractAccount.currentAuthenticatorIndex,
              // @ts-ignore - signArbitrary function exists on Keplr although it doesn't show
              keplr.signArbitrary,
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
