"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@burnt-labs/ui";
import { useGetBalance } from "@/hooks/useGetBalance";
import { useSendTokens } from "@/hooks/useSendTokens";
import type { GranteeSignerClient } from "@burnt-labs/abstraxion-core";

interface SendTokensProps {
  accountAddress: string | undefined;
  client: GranteeSignerClient | undefined;
  memo?: string;
}

/**
 * SendTokens component - displays account balance and provides UI for sending XION tokens
 * @param accountAddress - The bech32 address of the connected account
 * @param client - The signing client for transactions
 * @param memo - Optional memo to include with transactions
 */
export function SendTokens({ accountAddress, client, memo = "Send XION via Abstraxion" }: SendTokensProps) {
  const { balance, isLoading: isLoadingBalance, refetch } = useGetBalance(accountAddress, client);
  const { sendTokens, isSending, txHash, txError, resetTxState } = useSendTokens(accountAddress, client, balance);

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  // Track the last txHash we've seen to only refetch once per transaction
  const lastTxHashRef = useRef<string | null>(null);

  // Refetch balance after successful transaction (only once per unique txHash)
  useEffect(() => {
    if (txHash && txHash !== lastTxHashRef.current) {
      lastTxHashRef.current = txHash;
      // Add a small delay to allow the blockchain to process the transaction
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
      // Error is already handled by the hook
      console.error("Send error:", error);
    }
  };

  if (!accountAddress) {
    return null;
  }

  return (
    <>
      {/* Account Info */}
      <div className="rounded-lg border border-white/10 bg-gray-900/50 p-4 space-y-2 backdrop-blur-sm">
        <h3 className="mb-2 font-semibold">Account Info</h3>
        <p className="text-sm text-gray-400 break-all">
          Address: {accountAddress}
        </p>
        <div className="pt-2 border-t border-white/10">
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

      {/* Low Balance Warning */}
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
            </a>
            {" "}to send transactions.
          </p>
        </div>
      )}

      {/* Send XION Section */}
      <div className="rounded-lg border border-white/10 bg-gray-900/50 p-4 space-y-3 backdrop-blur-sm">
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
            className="w-full rounded bg-gray-800/50 border border-white/20 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-400">
            Amount (XION)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.001"
            step="0.001"
            min="0"
            className="w-full rounded bg-gray-800/50 border border-white/20 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
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
            <p className="text-xs text-green-400 font-medium mb-1">
              ✓ Transaction Successful
            </p>
            <p className="text-xs text-gray-400 break-all">
              Hash: {txHash}
            </p>
          </div>
        )}

        {txError && (
          <div className="rounded border border-red-500/20 bg-red-500/10 p-3">
            <p className="text-xs text-red-400">
              ✗ {txError}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
