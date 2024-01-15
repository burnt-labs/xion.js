import { useContext, useEffect, useState } from "react";
import { DirectSecp256k1HdWallet } from "graz/dist/cosmjs";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "@/src/components/AbstraxionContext";
import { getAccountAddress } from "@/utils/get-account-address";

export interface AbstraxionAccount {
  wallet?: DirectSecp256k1HdWallet;
  bech32Address: string;
}

export interface useAbstraxionAccountProps {
  data: AbstraxionAccount;
  isConnected: boolean;
}

export const useAbstraxionAccount = (): useAbstraxionAccountProps => {
  const { abstraxionAccount, isConnected } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  const [bech32Address, setBech32Address] = useState("");

  useEffect(() => {
    async function updateAddress() {
      const address = await getAccountAddress();
      setBech32Address(address);
    }

    updateAddress();
  }, [abstraxionAccount]);

  return {
    data: {
      wallet: abstraxionAccount,
      bech32Address: bech32Address,
    },
    isConnected: isConnected,
  };
};
