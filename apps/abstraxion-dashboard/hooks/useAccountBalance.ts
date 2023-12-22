import { AbstraxionAccount } from "@burnt-labs/abstraxion";
import { useEffect, useState } from "react";

const XION_FRACTIONAL = 1000000;

export function useAccountBalance(account?: AbstraxionAccount, client?: any) {
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo>({
    total: 0,
    balances: [],
  });

  useEffect(() => {
    if (!account?.bech32Address) return;

    const fetchBalances = async () => {
      let newBalances: Coin[] = [];
      const uxionBalance = await client?.getBalance(
        account.bech32Address,
        "uxion"
      );

      if (uxionBalance?.amount) {
        const xionBalance: Coin = {
          denom: "xion",
          amount: String(Number(uxionBalance.amount) * XION_FRACTIONAL),
        };
        newBalances.push(xionBalance);
      }

      const newTotal = newBalances.reduce(
        (acc, curr) => acc + Number(curr.amount),
        0
      );

      const newBalanceInfo = {
        total: newTotal,
        balances: newBalances,
      };

      //   Check if the new balance info is different from the old one
      if (JSON.stringify(newBalanceInfo) === JSON.stringify(balanceInfo)) {
        return;
      }

      setBalanceInfo(newBalanceInfo);
    };

    fetchBalances();
  }, [account, client, balanceInfo]);

  return balanceInfo;
}
