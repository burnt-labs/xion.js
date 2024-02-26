import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useStytch } from "@stytch/nextjs";
import {
  AAClient,
  AADirectSigner,
  AbstractAccountJWTSigner,
  GasPrice,
} from "@burnt-labs/signers";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "@/components/AbstraxionContext";
import { getKeplr, useOfflineSigners } from "graz";
import { testnetChainInfo } from "@burnt-labs/constants";
import { AAEthSigner } from "@burnt-labs/signers";

export const useAbstraxionSigningClient = () => {
  const {
    connectionType,
    abstractAccount,
    rpcUrl = testnetChainInfo.rpc,
  } = useContext(AbstraxionContext) as AbstraxionContextProps;

  const stytch = useStytch();
  const sessionToken = stytch.session.getTokens()?.session_token;

  const { data } = useOfflineSigners();
  const keplr = getKeplr();

  const [abstractClient, setAbstractClient] = useState<AAClient | undefined>(
    undefined,
  );

  async function ethSigningFn(msg: any) {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    return window.ethereum.request({
      method: "personal_sign",
      params: [msg, accounts[0]],
    });
  }

  const getSigner = useCallback(async () => {
    let signer:
      | AbstractAccountJWTSigner
      | AADirectSigner
      | AAEthSigner
      | undefined = undefined;

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
            data?.offlineSigner as any, // Temp solution. TS doesn't like this
            abstractAccount.id,
            abstractAccount.currentAuthenticatorIndex,
            // @ts-ignore - signArbitrary function exists on Keplr although it doesn't show
            keplr.signArbitrary,
          );
          break;
        }
      case "metamask":
        signer = new AAEthSigner(
          abstractAccount.id,
          abstractAccount.currentAuthenticatorIndex,
          ethSigningFn,
        );
        break;
      case "none":
        signer = undefined;
        break;
    }

    if (!signer) {
      console.warn("No signer found");
      return;
    }

    const abstractClient = await AAClient.connectWithSigner(
      // Should be set in the context but defaulting here just in case.
      rpcUrl || testnetChainInfo.rpc,
      signer,
      {
        gasPrice: GasPrice.fromString("0uxion"),
      },
    );

    setAbstractClient(abstractClient);
  }, [sessionToken, abstractAccount, connectionType, data, keplr]);

  useEffect(() => {
    if (abstractAccount && !abstractClient) {
      getSigner();
    }
  }, [abstractAccount, getSigner]);

  const memoizedClient = useMemo(
    () => ({ client: abstractClient }),
    [abstractClient],
  );

  return memoizedClient;
};
