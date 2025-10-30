import { useState, useEffect, useRef, useCallback } from 'react';
import type { GranteeSignerClient } from '@burnt-labs/abstraxion-core';

interface UseGetBalanceReturn {
  balance: string | null;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Hook for fetching account balance
 * @param accountAddress - The bech32 address to fetch balance for
 * @param client - The signing client
 * @returns Balance in XION, loading state, and refetch function
 */
export function useGetBalance(
  accountAddress: string | undefined,
  client: GranteeSignerClient | undefined
): UseGetBalanceReturn {
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Track if we've already logged to prevent spam
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    async function fetchBalance() {
      if (!client || !accountAddress) {
        if (!hasLoggedRef.current) {
          console.log('[useGetBalance] Waiting for client and account address...');
          hasLoggedRef.current = true;
        }
        setBalance(null);
        return;
      }

      // Reset log flag when we have both client and account
      hasLoggedRef.current = false;

      try {
        setIsLoading(true);
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
        setIsLoading(false);
      }
    }

    fetchBalance();
  }, [client, accountAddress, refetchTrigger]);

  // Memoize refetch to prevent re-renders in components that depend on it
  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  return {
    balance,
    isLoading,
    refetch,
  };
}
