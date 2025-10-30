import { useState, useRef, useEffect } from 'react';
import type { GranteeSignerClient } from '@burnt-labs/abstraxion-core';

interface UseSendTokensReturn {
  sendTokens: (recipient: string, amount: string, memo?: string) => Promise<string>;
  isSending: boolean;
  txHash: string | null;
  txError: string | null;
  resetTxState: () => void;
}

/**
 * Hook for sending tokens
 * @param accountAddress - The bech32 address to send from
 * @param client - The signing client
 * @param balance - Current balance (for validation)
 * @returns Send function, loading state, transaction hash, and error state
 */
export function useSendTokens(
  accountAddress: string | undefined,
  client: GranteeSignerClient | undefined,
  balance: string | null
): UseSendTokensReturn {
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Track if we've already logged to prevent spam
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    if (client && accountAddress && !hasLoggedRef.current) {
      console.log('[useSendTokens] Initialized with client and account');
      hasLoggedRef.current = true;
    }
  }, [client, accountAddress]);

  /**
   * Send XION tokens to a recipient
   * @param recipient - Bech32 address (xion1...)
   * @param amount - Amount in XION (will be converted to uxion)
   * @param memo - Optional transaction memo
   * @returns Transaction hash
   */
  const sendTokens = async (recipient: string, amount: string, memo: string = 'Send XION via Abstraxion'): Promise<string> => {
    console.log('[useSendTokens.sendTokens] Checking client and accountAddress:', { client, accountAddress });
    if (!client || !accountAddress) {
      console.error('[useSendTokens.sendTokens] Client not initialized - client:', client, 'accountAddress:', accountAddress);
      throw new Error('Client not initialized');
    }

    if (!recipient || !amount) {
      throw new Error('Recipient and amount are required');
    }

    // Validate recipient address format
    if (!recipient.startsWith('xion1')) {
      throw new Error('Invalid recipient address. Must start with xion1');
    }

    // Check if user has sufficient balance
    if (balance !== null && parseFloat(amount) > parseFloat(balance)) {
      throw new Error(`Insufficient balance. You have ${balance} XION`);
    }

    try {
      setIsSending(true);
      setTxError(null);
      setTxHash(null);

      // Convert XION to uxion (multiply by 1,000,000)
      const amountInUxion = (parseFloat(amount) * 1_000_000).toString();

      const result = await client.sendTokens(
        accountAddress,
        recipient,
        [{ denom: 'uxion', amount: amountInUxion }],
        'auto',
        memo
      );

      setTxHash(result.transactionHash);
      return result.transactionHash;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send tokens';
      setTxError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const resetTxState = () => {
    setTxHash(null);
    setTxError(null);
  };

  return {
    sendTokens,
    isSending,
    txHash,
    txError,
    resetTxState,
  };
}
