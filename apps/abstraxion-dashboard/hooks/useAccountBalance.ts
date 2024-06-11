import { useCallback, useEffect, useMemo, useState } from "react";
import { useAbstraxionAccount, useAbstraxionSigningClient } from "@/hooks";
import { XION_TO_USDC_CONVERSION } from "@/components/Overview";

export const usdcSearchDenom =
  "ibc/57097251ED81A232CE3C9D899E7C8096D6D87EF84BA203E12E424AA4C9B57A64";

export function useAccountBalance() {
  const { data: account } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo>({
    total: 0,
    balances: [],
  });

  const fetchBalances = useCallback(async () => {
    try {
      if (!account) {
        throw new Error("No account");
      }

      if (!client) {
        throw new Error("No signing client");
      }
      // TODO: Can we optimize balance fetching
      const uxionBalance = await client.getBalance(account.id, "uxion");
      const usdcBalance = await client.getBalance(account.id, usdcSearchDenom);

      const uxionToUsd = Number(uxionBalance.amount) * XION_TO_USDC_CONVERSION;

      setBalanceInfo({
        total: uxionToUsd + Number(usdcBalance.amount),
        balances: [uxionBalance, usdcBalance],
      });
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  }, [account, client, balanceInfo]);

  useEffect(() => {
    if (account && client) {
      fetchBalances();
    }
  }, [account, client]);

  async function sendTokens(
    senderAddress: string,
    sendAmount: number,
    denom: string,
    memo: string,
  ) {
    try {
      if (!account) {
        throw new Error("No account");
      }

      if (!client) {
        throw new Error("No signing client");
      }

      const convertedSendAmount = String(sendAmount * 1000000);

      const res = await client.sendTokens(
        account.id,
        senderAddress,
        [{ denom, amount: convertedSendAmount }],
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
