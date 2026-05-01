import { useState, useEffect, useRef, useCallback } from "react";
import type { SigningClient } from "@burnt-labs/abstraxion-react";

interface UseGetBalanceReturn {
  balance: string | null;
  isLoading: boolean;
  refetch: () => void;
}

export function useGetBalance(
  accountAddress: string | undefined,
  client: SigningClient | undefined,
): UseGetBalanceReturn {
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const hasLoggedRef = useRef(false);

  useEffect(() => {
    async function fetchBalance() {
      if (!client || !accountAddress) {
        if (!hasLoggedRef.current) {
          hasLoggedRef.current = true;
        }
        setBalance(null);
        return;
      }
      hasLoggedRef.current = false;

      try {
        setIsLoading(true);
        // getAllBalances is inherited from StargateClient, not on the SigningClient type
        const balances = await (client as any).getAllBalances(accountAddress);
        const xionBalance = balances.find(
          (b: { denom: string }) => b.denom === "uxion",
        );

        if (xionBalance) {
          const xionAmount = (
            parseInt(xionBalance.amount as string) / 1_000_000
          ).toFixed(6);
          setBalance(xionAmount);
        } else {
          setBalance("0");
        }
      } catch (error) {
        console.error("Failed to fetch balance:", error);
        setBalance("Error");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBalance();
  }, [client, accountAddress, refetchTrigger]);

  const refetch = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  return { balance, isLoading, refetch };
}
