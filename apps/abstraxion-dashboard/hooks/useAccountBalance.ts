import { useEffect, useMemo, useState } from "react";
import { useAbstraxionAccount, useAbstraxionSigningClient } from "@/hooks";

export function useAccountBalance() {
  const { data: account } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo>({
    total: 0,
    balances: [],
  });

  async function fetchBalances() {
    try {
      if (!account) {
        throw new Error("No account");
      }

      if (!client) {
        throw new Error("No signing client");
      }
      const uxionBalance = await client.getBalance(account.id, "uxion");

      setBalanceInfo({
        total: Number(uxionBalance.amount),
        balances: [uxionBalance],
      });
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  }

  useEffect(() => {
    if (account && client) {
      fetchBalances();
    }
  }, [account, client]);

  async function sendTokens(
    senderAddress: string,
    sendAmount: number,
    memo: string,
  ) {
    try {
      if (!account) {
        throw new Error("No account");
      }

      if (!client) {
        throw new Error("No signing client");
      }

      // Convert user input to uxion
      const amountToUxion = String(sendAmount * 1000000);

      const res = await client.sendTokens(
        account.id,
        senderAddress,
        [{ denom: "uxion", amount: amountToUxion }],
        {
          amount: [{ denom: "uxion", amount: "0" }],
          gas: "200000", // TODO: Dynamic?
        },
        memo,
      );

      if (res.rawLog?.includes("failed")) {
        throw new Error(res.rawLog);
      }

      fetchBalances(); // Update balances after successful token send
      return res;
    } catch (error) {
      throw error;
    }
  }

  const memoizedBalanceInfo = useMemo(() => balanceInfo, [balanceInfo]);

  return { balanceInfo: memoizedBalanceInfo, sendTokens };
}
