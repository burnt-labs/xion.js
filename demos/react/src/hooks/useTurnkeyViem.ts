import { useTurnkey, AuthState } from "@turnkey/react-wallet-kit";
import { createAccount } from "@turnkey/viem";
import {
  AUTHENTICATOR_TYPE,
  type SignerConfig,
} from "@burnt-labs/abstraxion-react";

/**
 * Provides a `getSignerConfig` for Abstraxion signer mode, backed by a
 * Turnkey-managed Eth keypair signed via Viem.
 *
 * The returned `SignerConfig` is what `AbstraxionProvider`'s
 * `authentication.getSignerConfig` calls when the user logs in: it tells
 * Abstraxion how to sign the bytes needed for account creation and tx
 * broadcasting. We bind a Viem account once and reuse it for every
 * `signMessage` call — recreating the account on each signature triggers
 * extra Turnkey roundtrips.
 */
export function useTurnkeyViem() {
  const { authState, wallets, httpClient } = useTurnkey();
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
        "Ethereum account not found in Turnkey wallet — make sure the wallet has an ETH derivation configured.",
      );
    }

    const ethereumAddress = ethAccount.address;
    const viemAccount = await createAccount({
      client: httpClient,
      organizationId,
      signWith: ethereumAddress,
    });

    return {
      authenticatorType: AUTHENTICATOR_TYPE.EthWallet,
      authenticator: ethereumAddress.toLowerCase(),
      // Abstraxion calls this with a hex-encoded payload (bech32 bytes for
      // account creation, tx bytes for broadcasts). Viem handles the
      // personal_sign wrapper internally.
      signMessage: async (hexMessage: string) => {
        if (!hexMessage.startsWith("0x")) {
          throw new Error(
            `Invalid message format: expected 0x-prefixed hex, got ${hexMessage.slice(0, 24)}…`,
          );
        }
        return viemAccount.signMessage({
          message: { raw: hexMessage as `0x${string}` },
        });
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
