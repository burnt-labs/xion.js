import { useContext, useEffect } from "react";
import { useAccount } from "graz";
import { useStytchSession } from "@stytch/nextjs";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "@/components/AbstraxionContext";

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

  useEffect(() => {
    const refreshConnectionType = () => {
      if (session) {
        setConnectionType("stytch");
      } else if (isConnected) {
        // Is this the right conditional
        setConnectionType("graz");
      }
    };

    if (connectionType === "none") {
      refreshConnectionType();
    }
  }, [session]);

  return {
    data: (abstractAccount as AbstraxionAccount) || undefined,
    connectionType,
    isConnected:
      connectionType === "stytch"
        ? !!session
        : connectionType === "graz"
        ? isConnected
        : false,
  };
};
