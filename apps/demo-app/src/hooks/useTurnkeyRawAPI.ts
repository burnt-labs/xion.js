/**
 * Turnkey integration hook using Raw API
 * Provides SignerConfig for abstraxion using Turnkey's signRawPayload API
 */

import { useTurnkey } from '@turnkey/react-wallet-kit';
import { hashMessage } from 'viem';
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
          // Apply Ethereum personal_sign prefix and hash with keccak256
          // This is what the contract expects: keccak256("\x19Ethereum Signed Message:\n" + len + message)
          const messageHash = hashMessage({ raw: normalizedMessage as `0x${string}` });

          // Sign the hash with Turnkey Raw API
          const result = await httpClient.signRawPayload({
            signWith: ethAccount.address,
            payload: messageHash,
            encoding: 'PAYLOAD_ENCODING_HEXADECIMAL',
            hashFunction: 'HASH_FUNCTION_NO_OP',  // Already hashed above with personal_sign prefix
          });

          // Turnkey returns r, s, v WITHOUT 0x prefix
          // Pad each to 64 hex chars (32 bytes) and combine
          const r = result.r.padStart(64, '0');
          const s = result.s.padStart(64, '0');

          // Convert v from 0/1 to 27/28 for Ethereum compatibility
          let v = parseInt(result.v, 16);
          if (v < 27) v += 27;
          const vHex = v.toString(16).padStart(2, '0');

          // Combine with 0x prefix
          const signature = `0x${r}${s}${vHex}`;

          console.log('[useTurnkeyRawAPI] ✅ Signature generated:', signature);
          return signature;
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
