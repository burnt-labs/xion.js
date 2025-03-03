import { useContext } from "react";
import { AbstraxionContext } from "../components/AbstraxionContext";

/**
 * A hook to access the current connected account information
 * This hook is deliberately kept simple and minimal, matching the
 * original abstraxion package implementation
 *
 * @returns The current connected account information
 */
export const useAbstraxionAccount = () => {
  const { isConnected, isConnecting, abstraxionAccount } =
    useContext(AbstraxionContext);

  return {
    data: {
      bech32Address: abstraxionAccount?.address || "",
    },
    isConnected,
    isConnecting,
  };
};
