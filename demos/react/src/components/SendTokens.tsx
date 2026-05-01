import { useState, useEffect, useRef } from "react";
import type { SigningClient } from "@burnt-labs/abstraxion-react";
import { Button } from "./Button";
import { useGetBalance } from "@/hooks/useGetBalance";
import { useSendTokens } from "@/hooks/useSendTokens";

interface SendTokensProps {
  accountAddress: string | undefined;
  client: SigningClient | undefined;
  memo?: string;
}

export function SendTokens({
  accountAddress,
  client,
  memo = "Send XION via Abstraxion",
}: SendTokensProps): JSX.Element | null {
  const {
    balance,
    isLoading: isLoadingBalance,
    refetch,
  } = useGetBalance(accountAddress, client);
  const { sendTokens, isSending, txHash, txError } = useSendTokens(
    accountAddress,
    client,
    balance,
  );

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const lastTxHashRef = useRef<string | null>(null);

  useEffect(() => {
    if (txHash && txHash !== lastTxHashRef.current) {
      lastTxHashRef.current = txHash;
      setTimeout(() => {
        refetch();
      }, 1000);
    }
  }, [txHash, refetch]);

  const handleSendTokens = async () => {
    try {
      await sendTokens(recipient, amount, memo);
      setRecipient("");
      setAmount("");
    } catch (error) {
      console.error("Send error:", error);
    }
  };

  if (!accountAddress) {
    return null;
  }

  return (
    <>
      <div className="space-y-2 rounded-lg border border-white/10 bg-gray-900/50 p-4 backdrop-blur-sm">
        <h3 className="mb-2 font-semibold">Account Info</h3>
        <p className="break-all text-sm text-gray-400">
          Address: {accountAddress}
        </p>
        <div className="border-t border-white/10 pt-2">
          <p className="text-sm text-gray-400">
            Balance:{" "}
            {isLoadingBalance ? (
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-gray-400 border-r-transparent"></span>
                Loading...
              </span>
            ) : balance !== null ? (
              <span className="font-mono text-white">{balance} XION</span>
            ) : (
              "—"
            )}
          </p>
        </div>
      </div>

      {balance !== null && parseFloat(balance) === 0 && (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
          <p className="text-sm text-yellow-400">
            ⚠ Your account has no XION tokens.{" "}
            <a
              href="https://faucet.xion.burnt.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-yellow-300"
            >
              Get testnet tokens from the faucet
            </a>{" "}
            to send transactions.
          </p>
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-white/10 bg-gray-900/50 p-4 backdrop-blur-sm">
        <h3 className="font-semibold">Send XION</h3>

        <div className="space-y-2">
          <label className="block text-sm text-gray-400">
            Recipient Address
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="xion1..."
            className="w-full rounded border border-white/20 bg-gray-800/50 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-400">Amount (XION)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.001"
            step="0.001"
            min="0"
            className="w-full rounded border border-white/20 bg-gray-800/50 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <Button
          fullWidth
          onClick={handleSendTokens}
          disabled={isSending || !recipient || !amount}
          structure="base"
        >
          {isSending ? "SENDING..." : "SEND TOKENS"}
        </Button>

        {txHash && (
          <div className="rounded border border-green-500/20 bg-green-500/10 p-3">
            <p className="mb-1 text-xs font-medium text-green-400">
              ✓ Transaction Successful
            </p>
            <p className="break-all text-xs text-gray-400">Hash: {txHash}</p>
          </div>
        )}

        {txError && (
          <div className="rounded border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-xs text-red-400">✗ {txError}</p>
          </div>
        )}
      </div>
    </>
  );
}
