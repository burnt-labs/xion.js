import { useContext } from "react";
import { AbstraxionContext } from "../components/AbstraxionContext";

export interface AbstraxionAccount {
  bech32Address: string;
}

export interface AbstraxionAccountState {
  data: AbstraxionAccount;
  isConnected: boolean;
  isConnecting: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

export const useAbstraxionAccount = (): AbstraxionAccountState => {
  const { isConnected, granterAddress, isConnecting, login, logout } =
    useContext(AbstraxionContext);

  return {
    data: {
      bech32Address: granterAddress,
    },
    isConnected,
    isConnecting,
    login,
    logout,
  };
};
