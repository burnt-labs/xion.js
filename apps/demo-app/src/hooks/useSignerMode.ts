import { useState, useEffect } from 'react';
import { useAbstraxionSigningClient } from '@burnt-labs/abstraxion';

interface UseSignerModeReturn {
  // Balance
  balance: string | null;
  isLoadingBalance: boolean;

  // Send tokens
  sendTokens: (recipient: string, amount: string) => Promise<string>;
  isSending: boolean;
  txHash: string | null;
  txError: string | null;

  // Helper to reset transaction state
  resetTxState: () => void;
}

/**
 * Hook for signer mode operations: querying balance and sending tokens
 * Uses the Abstraxion signing client (GranteeSignerClient) with session keys
 */
export function useSignerMode(accountAddress: string): UseSignerModeReturn {
  const { client } = useAbstraxionSigningClient();

  // Balance state
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Send transaction state
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Fetch balance when client, address, or txHash changes
  useEffect(() => {
    async function fetchBalance() {
      if (!client || !accountAddress) {
        setBalance(null);
        return;
      }

      try {
        setIsLoadingBalance(true);
        const balances = await client.getAllBalances(accountAddress);
        const xionBalance = balances.find((b) => b.denom === 'uxion');

        if (xionBalance) {
          // Convert uxion to XION (divide by 1,000,000)
          const xionAmount = (parseInt(xionBalance.amount) / 1_000_000).toFixed(6);
          setBalance(xionAmount);
        } else {
          setBalance('0');
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error);
        setBalance('Error');
      } finally {
        setIsLoadingBalance(false);
      }
    }

    fetchBalance();
  }, [client, accountAddress, txHash]); // Refetch when client/address changes or after successful transaction

  /**
   * Send XION tokens to a recipient
   * @param recipient - Bech32 address (xion1...)
   * @param amount - Amount in XION (will be converted to uxion)
   * @returns Transaction hash
   */
  const sendTokens = async (recipient: string, amount: string): Promise<string> => {
    console.log('[useSignerMode] sendTokens called');
    console.log('[useSignerMode] client:', client);
    console.log('[useSignerMode] client type:', client?.constructor?.name);
    console.log('[useSignerMode] accountAddress:', accountAddress);

    if (!client || !accountAddress) {
      console.error('[useSignerMode] Cannot send - client or accountAddress missing');
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
        'Send XION via Abstraxion Signer Mode'
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
    balance,
    isLoadingBalance,
    sendTokens,
    isSending,
    txHash,
    txError,
    resetTxState,
  };
}
