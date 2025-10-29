/**
 * Turnkey integration hook using Raw API
 * Provides SignerConfig for abstraxion using Turnkey's signRawPayload API
 */

import { useTurnkey } from '@turnkey/react-wallet-kit';
import type { SignerConfig } from '@burnt-labs/abstraxion';

export function useTurnkeyRawAPI() {
  const { authState, wallets, httpClient } = useTurnkey();
  const wallet = wallets?.[0];

  const getSignerConfig = async (): Promise<SignerConfig> => {
    if (authState !== 'authenticated' || !wallet || !httpClient) {
      throw new Error('Turnkey not authenticated. Please log in first.');
    }

    // Get Ethereum account from Turnkey wallet
    const ethAccount = wallet.accounts.find(
      a => a.path === "m/44'/60'/0'/0/0" &&
           a.addressFormat === 'ADDRESS_FORMAT_ETHEREUM'
    );

    if (!ethAccount) {
      throw new Error('Ethereum account not found in Turnkey wallet. Please ensure your wallet has an Ethereum account configured.');
    }

    console.log('[useTurnkeyRawAPI] Using Ethereum address:', ethAccount.address);

    return {
      ethereumAddress: ethAccount.address,

      signMessage: async (hexMessage: string) => {
        console.log('[useTurnkeyRawAPI] Signing message with Raw API...');

        // Ensure hex message has 0x prefix
        const normalizedMessage = hexMessage.startsWith('0x')
          ? hexMessage
          : `0x${hexMessage}`;

        try {
          // Use Turnkey's signRawPayload API
          // This signs the hex payload with Keccak256 hash (personal_sign format)
          const result = await httpClient.signRawPayload({
            signWith: ethAccount.address,
            payload: normalizedMessage,
            encoding: 'PAYLOAD_ENCODING_HEXADECIMAL',
            hashFunction: 'HASH_FUNCTION_KECCAK256', // personal_sign uses keccak256
          });

          // Combine r, s, v into signature hex string
          // result.r, result.s, result.v are hex strings with 0x prefix
          const signature = result.r + result.s.slice(2) + result.v.slice(2);

          console.log('[useTurnkeyRawAPI] Signature generated (length: ' + signature.length + ' chars)');
          return signature; // Returns with 0x prefix
        } catch (error) {
          console.error('[useTurnkeyRawAPI] Failed to sign message:', error);
          throw new Error(`Failed to sign message with Turnkey: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    };
  };

  return {
    getSignerConfig,
    isReady: authState === 'authenticated',
    ethereumAddress: wallet?.accounts.find(
      a => a.addressFormat === 'ADDRESS_FORMAT_ETHEREUM'
    )?.address,
    authState,
  };
}
