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

    console.log('[useTurnkeyViem] Getting signer config...');
    console.log('[useTurnkeyViem] httpClient:', httpClient);
    console.log('[useTurnkeyViem] httpClient keys:', Object.keys(httpClient));

    // Try to get organization ID from httpClient using getWhoami
    let organizationId: string | undefined;
    try {
      const whoami = await httpClient.getWhoami({});
      console.log('[useTurnkeyViem] Whoami response:', whoami);
      organizationId = whoami.organizationId;
    } catch (error) {
      console.error('[useTurnkeyViem] Failed to get whoami:', error);
    }

    if (!organizationId) {
      console.error('[useTurnkeyViem] Could not find organization ID from httpClient.getWhoami()');
      throw new Error('Organization ID not found from httpClient');
    }

    console.log('[useTurnkeyViem] User object:', user);
    console.log('[useTurnkeyViem] Wallet:', {
      walletId: wallet.walletId,
      accountsCount: wallet.accounts?.length
    });
    console.log('[useTurnkeyViem] All wallet accounts:', wallet.accounts);

    // Get Ethereum account from Turnkey wallet
    const ethAccount = wallet.accounts.find(
      a => a.path === "m/44'/60'/0'/0/0" &&
           a.addressFormat === 'ADDRESS_FORMAT_ETHEREUM'
    );

    if (!ethAccount) {
      throw new Error('Ethereum account not found in Turnkey wallet. Please ensure your wallet has an Ethereum account configured.');
    }

    console.log('[useTurnkeyViem] Using Ethereum account:', {
      address: ethAccount.address,
      publicKey: ethAccount.publicKey,
      path: ethAccount.path,
      curve: ethAccount.curve,
      addressFormat: ethAccount.addressFormat
    });

    console.log('[useTurnkeyViem] Creating Viem account with Turnkey...');
    console.log('[useTurnkeyViem] Parent Organization ID (from env):', process.env.NEXT_PUBLIC_TURNKEY_ORG_ID);
    console.log('[useTurnkeyViem] User Sub-Organization ID (from whoami):', organizationId);
    console.log('[useTurnkeyViem] signWith address:', ethAccount.address);
    console.log('[useTurnkeyViem] → Using user sub-org ID for signing');

    // Create Viem account with Turnkey using the user's sub-organization ID
    const viemAccount = await createAccount({
      client: httpClient,
      organizationId: organizationId,
      signWith: ethAccount.address,
    });

    console.log('[useTurnkeyViem] Viem account created successfully');

    return {
      ethereumAddress: ethAccount.address,

      signMessage: async (hexMessage: string) => {
        console.log('[useTurnkeyViem] Signing message with Viem...');

        // Ensure hex message has 0x prefix
        const normalizedMessage = hexMessage.startsWith('0x')
          ? hexMessage
          : `0x${hexMessage}`;

        // Viem's signMessage handles personal_sign format
        const signature = await viemAccount.signMessage({
          message: { raw: normalizedMessage as `0x${string}` },
        });

        console.log('[useTurnkeyViem] Signature generated (length: ' + signature.length + ' chars)');
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
