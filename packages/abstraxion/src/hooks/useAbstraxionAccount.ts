import { useContext } from "react";
import { AbstraxionContext } from "@/src/components/AbstraxionContext";

export interface AbstraxionAccount {
  bech32Address: string;
}

export interface AbstraxionAccountState {
  data: AbstraxionAccount;
  isConnected: boolean;
  isConnecting: boolean;
}

export const useAbstraxionAccount = (): AbstraxionAccountState => {
  const { isConnected, granterAddress, isConnecting } =
    useContext(AbstraxionContext);

  return {
    data: {
      bech32Address: granterAddress,
    },
    isConnected,
    isConnecting,
  };
};
