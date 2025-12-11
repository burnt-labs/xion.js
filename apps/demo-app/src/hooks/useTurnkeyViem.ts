/**
 * Turnkey integration hook using Viem
 * Provides SignerConfig for abstraxion using Viem's account abstraction
 */

import { useTurnkey, AuthState } from "@turnkey/react-wallet-kit";
import { createAccount } from "@turnkey/viem";
import type { SignerConfig } from "@burnt-labs/abstraxion";
import { AUTHENTICATOR_TYPE } from "@burnt-labs/abstraxion";

export function useTurnkeyViem() {
  const { authState, wallets, httpClient, user } = useTurnkey();
  const wallet = wallets?.[0];

  const getSignerConfig = async (): Promise<SignerConfig> => {
    if (authState !== AuthState.Authenticated || !wallet || !httpClient) {
      throw new Error("Turnkey not authenticated. Please log in first.");
    }

    const whoami = await httpClient.getWhoami({});
    const organizationId = whoami.organizationId;

    if (!organizationId) {
      throw new Error("Organization ID not found from httpClient");
    }

    const ethAccount = wallet.accounts.find(
      (a) =>
        a.path === "m/44'/60'/0'/0/0" &&
        a.addressFormat === "ADDRESS_FORMAT_ETHEREUM",
    );

    if (!ethAccount) {
      throw new Error(
        "Ethereum account not found in Turnkey wallet. Please ensure your wallet has an Ethereum account configured.",
      );
    }

    const ethereumAddress = ethAccount.address;

    // Create Viem account once - it will be reused for all signMessage calls
    // This avoids recreating the account on every signature operation
    const viemAccount = await createAccount({
      client: httpClient,
      organizationId: organizationId,
      signWith: ethereumAddress,
    });

    return {
      authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
      authenticator: ethereumAddress.toLowerCase(),
      // signMessage expects hex-encoded messages with 0x prefix
      // For account creation: hex-encoded UTF-8 bytes of bech32 address
      // For transactions: hex-encoded transaction bytes
      signMessage: async (hexMessage: string) => {
        if (!hexMessage.startsWith("0x")) {
          throw new Error(
            `Invalid message format: expected hex string with 0x prefix, got: ${hexMessage.substring(0, 50)}...`,
          );
        }

        // Viem handles personal_sign formatting automatically
        const signature = await viemAccount.signMessage({
          message: { raw: hexMessage as `0x${string}` },
        });

        return signature;
      },
    };
  };

  return {
    getSignerConfig,
    isReady: authState === AuthState.Authenticated,
    ethereumAddress: wallet?.accounts.find(
      (a) => a.addressFormat === "ADDRESS_FORMAT_ETHEREUM",
    )?.address,
    authState,
  };
}
