import { useContext, useEffect, useRef, useState } from "react";
import { useAccount } from "graz";
import { useStytch, useStytchSession } from "@stytch/react";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "../components/AbstraxionContext";
import { decodeJwt } from "jose";
import { getHumanReadablePubkey } from "../utils";

export interface AuthenticatorNodes {
  __typename: string;
  id: string;
  type: string;
  authenticator: string;
  authenticatorIndex: number;
  version: string;
}

export interface AccountAuthenticators {
  __typename: string;
  nodes: AuthenticatorNodes[];
}

export interface AbstraxionAccount {
  __typename: string;
  id: string; // bech32Address
  authenticators: AccountAuthenticators;
  currentAuthenticatorIndex: number;
}

export interface useAbstraxionAccountProps {
  data?: AbstraxionAccount;
  isConnected: boolean;
  isConnecting?: boolean;
  isReconnecting?: boolean;
}

export const useAbstraxionAccount = () => {
  const { session } = useStytchSession();

  const {
    connectionType,
    setConnectionType,
    abstractAccount,
    setAbstractAccount,
  } = useContext(AbstraxionContext) as AbstraxionContextProps;

  const loginType = localStorage.getItem("loginType");
  const [loginAuthenticator, setLoginAuthenticator] = useState(
    localStorage.getItem("loginAuthenticator"),
  );

  const { data: grazAccount, isConnected } = useAccount();
  const stytchClient = useStytch();
  const session_jwt = stytchClient.session.getTokens()?.session_jwt;

  function getAuthenticator() {
    let authenticator = "";
    switch (connectionType) {
      case "stytch":
        const { aud, sub } = session_jwt
          ? decodeJwt(session_jwt)
          : { aud: undefined, sub: undefined };
        authenticator = `${Array.isArray(aud) ? aud[0] : aud}.${sub}`;
        break;
      case "graz":
        authenticator = getHumanReadablePubkey(grazAccount?.pubKey);
        break;
      case "metamask":
        authenticator = loginAuthenticator || "";
        break;
      case "okx":
        authenticator = loginAuthenticator || "";
        break;
      case "none":
        authenticator = "";
        break;
    }

    return authenticator;
  }

  useEffect(() => {
    const refreshConnectionType = () => {
      setConnectionType((loginType as any) || "none");
    };

    if (connectionType === "none") {
      refreshConnectionType();
    }
  }, [session, isConnected, grazAccount]);

  // Metamask & OKX account detection
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (connectionType === "metamask") {
        localStorage.setItem("loginAuthenticator", accounts[0]);
        setLoginAuthenticator(accounts[0]);
        setAbstractAccount(undefined);
      }
    };

    window.ethereum?.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum?.off("accountsChanged", handleAccountsChanged);
    };
  }, []);

  // OKX account detection
  useEffect(() => {
    const handleAccountsChanged = async (accounts: any) => {
      if (connectionType === "okx") {
        const okxXionAddress = localStorage.getItem("okxXionAddress");
        const okxWalletName = localStorage.getItem("okxWalletName");

        // If user switches account via extension, log user out.
        // No good way to handle account switch via the OKX keplr event system
        if (
          okxXionAddress !== accounts.account.XION_TEST ||
          okxWalletName !== accounts.name
        ) {
          // Basically log out
          setConnectionType("none");
          setAbstractAccount(undefined);
          localStorage.removeItem("loginType");
          localStorage.removeItem("loginAuthenticator");
          localStorage.removeItem("okxXionAddress");
          localStorage.removeItem("okxWalletName");
        }
      }
    };

    if (window.okxwallet) {
      window.okxwallet?.keplr.on("connect", handleAccountsChanged);
    }

    return () => {
      window.okxwallet?.keplr.on("connect", handleAccountsChanged);
    };
  }, []);

  // Keplr account detection
  useEffect(() => {
    const handleAccountsChanged = () => {
      if (connectionType === "graz") {
        setAbstractAccount(undefined);
      }
    };

    window.addEventListener("keplr_keystorechange", handleAccountsChanged);
    return () => {
      window.removeEventListener("keplr_keystorechange", handleAccountsChanged);
    };
  }, []);

  return {
    data: (abstractAccount as AbstraxionAccount) || undefined,
    connectionType,
    loginAuthenticator: getAuthenticator(),
    isConnected:
      connectionType === "stytch"
        ? !!session
        : connectionType === "graz"
        ? isConnected
        : connectionType === "metamask"
        ? window.ethereum.isConnected()
        : connectionType === "okx"
        ? localStorage.getItem("loginAuthenticator")
        : false,
  };
};
