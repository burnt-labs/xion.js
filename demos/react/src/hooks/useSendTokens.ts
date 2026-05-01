import { useState } from "react";
import type { SigningClient } from "@burnt-labs/abstraxion-react";

interface UseSendTokensReturn {
  sendTokens: (
    recipient: string,
    amount: string,
    memo?: string,
  ) => Promise<string>;
  isSending: boolean;
  txHash: string | null;
  txError: string | null;
  resetTxState: () => void;
}

export function useSendTokens(
  accountAddress: string | undefined,
  client: SigningClient | undefined,
  balance: string | null,
): UseSendTokensReturn {
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const sendTokens = async (
    recipient: string,
    amount: string,
    memo: string = "Send XION via Abstraxion",
  ): Promise<string> => {
    if (!client || !accountAddress) {
      throw new Error("Client not initialized");
    }

    if (!recipient || !amount) {
      throw new Error("Recipient and amount are required");
    }

    if (!recipient.startsWith("xion1")) {
      throw new Error("Invalid recipient address. Must start with xion1");
    }

    if (balance !== null && parseFloat(amount) > parseFloat(balance)) {
      throw new Error(`Insufficient balance. You have ${balance} XION`);
    }

    try {
      setIsSending(true);
      setTxError(null);
      setTxHash(null);

      const amountInUxion = (parseFloat(amount) * 1_000_000).toString();

      const result = await client.sendTokens(
        accountAddress,
        recipient,
        [{ denom: "uxion", amount: amountInUxion }],
        "auto",
        memo,
      );

      // Redirect mode resolves with `void` because the page navigates away
      // before the response comes back; no hash to display in that case.
      if (!result) return "";
      setTxHash(result.transactionHash);
      return result.transactionHash;
    } catch (error: any) {
      const errorMessage = error.message || "Failed to send tokens";
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

  return { sendTokens, isSending, txHash, txError, resetTxState };
}
