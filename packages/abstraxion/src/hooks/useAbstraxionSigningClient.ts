import { useContext, useEffect, useState } from "react";
import { GasPrice } from "@cosmjs/stargate";
import { testnetChainInfo } from "@burnt-labs/constants";
import {
  GranteeSignerClient,
  SignArbSecp256k1HdWallet,
} from "@burnt-labs/abstraxion-core";
import { AbstraxionContext } from "@/src/components/AbstraxionContext";
import { abstraxionAuth } from "../components/Abstraxion";

export const useAbstraxionSigningClient = (): {
  readonly client: GranteeSignerClient | undefined;
  readonly signArb:
    | ((signerAddress: string, message: string | Uint8Array) => Promise<string>)
    | undefined;
  readonly logout: (() => void) | undefined;
  readonly rpcUrl: string;
} => {
  const {
    isConnected,
    abstraxionAccount,
    granterAddress,
    rpcUrl,
    logout,
    gasPrice,
    treasury,
  } = useContext(AbstraxionContext);
  const [signArbWallet, setSignArbWallet] = useState<
    SignArbSecp256k1HdWallet | undefined
  >(undefined);

  const [abstractClient, setAbstractClient] = useState<
    GranteeSignerClient | undefined
  >(undefined);

  useEffect(() => {
    // Skip if not connected or missing required data
    if (!isConnected || !abstraxionAccount || !granterAddress) {
      // Clear client if we're no longer connected
      if (!isConnected && abstractClient) {
        setAbstractClient(undefined);
      }
      return;
    }

    // Skip if client already exists (prevent unnecessary recreation)
    if (abstractClient) {
      return;
    }

    async function getSigner() {
      if (!abstraxionAccount) {
        throw new Error("No account found.");
      }
      try {
        const granteeAddress = await abstraxionAccount
          .getAccounts()
          .then((accounts) => {
            if (accounts.length === 0) {
              throw new Error("No account found.");
            }
            return accounts[0].address;
          });

        const directClient = await GranteeSignerClient.connectWithSigner(
          // Should be set in the context but defaulting here just in case
          rpcUrl || testnetChainInfo.rpc,
          abstraxionAccount,
          {
            gasPrice: GasPrice.fromString(gasPrice),
            granterAddress,
            granteeAddress,
            treasuryAddress: treasury,
          },
        );

        const wallet = await abstraxionAuth.getLocalKeypair();
        if (wallet) {
          setSignArbWallet(wallet);
        }

        setAbstractClient(directClient);
      } catch (error) {
        setAbstractClient(undefined);
      }
    }

    getSigner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, abstraxionAccount, granterAddress]);

  return {
    client: abstractClient,
    signArb: signArbWallet?.signArb,
    logout,
    rpcUrl,
  } as const;
};
