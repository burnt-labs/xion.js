import { useContext, useEffect } from "react";
import { useAccount } from "graz";
import { useStytch, useStytchSession } from "@stytch/nextjs";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "@/components/AbstraxionContext";
import { decodeJwt } from "jose";
import { getHumanReadablePubkey } from "@/utils";

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
  const { isConnected } = useAccount();

  const { connectionType, setConnectionType, abstractAccount } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  const loginType = localStorage.getItem("loginType");
  const loginAuthenticator = localStorage.getItem("loginAuthenticator"); // Primarily for metamask case

  const { data: grazAccount } = useAccount();
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
  }, [session]);

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
        ? !!loginAuthenticator
        : false,
  };
};
