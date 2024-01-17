import { useContext } from "react";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "@/src/components/AbstraxionContext";

export interface AbstraxionAccount {
  bech32Address: string;
}

export interface useAbstraxionAccountProps {
  data: AbstraxionAccount;
  isConnected: boolean;
}

export const useAbstraxionAccount = (): useAbstraxionAccountProps => {
  const { isConnected, grantorAddress } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  return {
    data: {
      bech32Address: grantorAddress,
    },
    isConnected: isConnected,
  };
};
