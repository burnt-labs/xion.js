import { useContext, useEffect } from "react";
import { useAccount } from "graz";
import { useStytchSession } from "@stytch/nextjs";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "@/components/AbstraxionContext";

export interface AbstraxionAccount {
  name?: string;
  algo?: string;
  pubKey?: Uint8Array;
  address?: Uint8Array;
  bech32Address: string;
  isNanoLedger?: boolean;
  isKeystone?: boolean;
}

export interface useAbstraxionAccountProps {
  data?: AbstraxionAccount;
  isConnected: boolean;
  isConnecting?: boolean;
  isReconnecting?: boolean;
}

export const useAbstraxionAccount = () => {
  const { session } = useStytchSession();
  const { data, isConnected, isConnecting, isReconnecting } = useAccount();

  const { connectionType, setConnectionType, abstractAccount } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  useEffect(() => {
    const refreshConnectionType = () => {
      if (session) {
        setConnectionType("stytch");
      } else if (data) {
        setConnectionType("graz");
      }
    };

    if (connectionType === "none") {
      refreshConnectionType();
    }
  }, [session, data]);

  switch (connectionType) {
    case "stytch":
      return {
        data: {
          ...abstractAccount,
          bech32Address: abstractAccount?.id,
        } as AbstraxionAccount,
        isConnected: !!session,
      };
    case "graz":
      return {
        data: data as AbstraxionAccount,
        isConnected: isConnected,
        isConnecting: isConnecting,
        isReconnecting: isReconnecting,
      };
    default:
      return { data: undefined, isConnected: false };
  }
};
