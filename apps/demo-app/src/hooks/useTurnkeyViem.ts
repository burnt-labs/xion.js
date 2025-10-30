/**
 * Turnkey integration hook using Viem
 * Provides SignerConfig for abstraxion using Viem's account abstraction
 */

import { useTurnkey, AuthState } from '@turnkey/react-wallet-kit';
import { createAccount } from '@turnkey/viem';
import type { SignerConfig } from '@burnt-labs/abstraxion';

export function useTurnkeyViem() {
  const { authState, wallets, httpClient, user } = useTurnkey();
  const wallet = wallets?.[0];

  const getSignerConfig = async (): Promise<SignerConfig> => {
    if (authState !== AuthState.Authenticated || !wallet || !httpClient) {
      throw new Error('Turnkey not authenticated. Please log in first.');
    }
    // Try to get organization ID from httpClient using getWhoami
    let organizationId: string | undefined;
    try {
      const whoami = await httpClient.getWhoami({});
      console.log('[useTurnkeyViem] Whoami response:', whoami);
      organizationId = whoami.organizationId;
    } catch (error) {
      console.error('[useTurnkeyViem] Failed to get Sub-Organization ID:', error);
    }

    if (!organizationId) {
      console.error('[useTurnkeyViem] Could not find organization ID from httpClient.getWhoami()');
      throw new Error('Organization ID not found from httpClient');
    }

    // Get Ethereum account from Turnkey wallet
    const ethAccount = wallet.accounts.find(
      a => a.path === "m/44'/60'/0'/0/0" &&
           a.addressFormat === 'ADDRESS_FORMAT_ETHEREUM'
    );

    if (!ethAccount) {
      throw new Error('Ethereum account not found in Turnkey wallet. Please ensure your wallet has an Ethereum account configured.');
    }
    // Create Viem account with Turnkey using the user's sub-organization ID
    const viemAccount = await createAccount({
      client: httpClient,
      organizationId: organizationId,
      signWith: ethAccount.address,
    });

    console.log('[useTurnkeyViem] - Viem account created successfully');

    return {
      ethereumAddress: ethAccount.address,

      signMessage: async (hexMessage: string) => {
        console.log('[useTurnkeyViem] - Signing message with Viem...');

        // Ensure hex message has 0x prefix
        const normalizedMessage = hexMessage.startsWith('0x')
          ? hexMessage
          : `0x${hexMessage}`;

        // Viem's signMessage handles personal_sign format
        const signature = await viemAccount.signMessage({
          message: { raw: normalizedMessage as `0x${string}` },
        });

        return signature;
      }
    };
  };

  return {
    getSignerConfig,
    isReady: authState === AuthState.Authenticated,
    ethereumAddress: wallet?.accounts.find(
      a => a.addressFormat === 'ADDRESS_FORMAT_ETHEREUM'
    )?.address,
    authState,
  };
}
