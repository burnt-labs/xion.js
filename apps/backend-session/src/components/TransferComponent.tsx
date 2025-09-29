"use client";
import { useState } from "react";
import { Button } from "@burnt-labs/ui";
import { TransferComponentProps, TokenDenom } from "@/types/frontend";
import { useNotification } from "@/contexts/NotificationContext";

export default function TransferComponent({
  onTransferComplete,
}: TransferComponentProps) {
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [denom, setDenom] = useState<TokenDenom>("XION");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { addNotification } = useNotification();

  const handleTransfer = async () => {
    // Validate inputs
    if (!toAddress.trim()) {
      setError("Please enter a recipient address");
      return;
    }

    if (!amount.trim() || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/wallet/transaction/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: toAddress.trim(),
          amount: amount.trim(),
          denom,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(
          `Transaction sent successfully! Hash: ${data.data.transactionHash}`,
        );
        addNotification({
          message: "Transaction sent successfully!",
          transactionHash: data.data.transactionHash,
          type: "success",
        });
        setToAddress("");
        setAmount("");
        onTransferComplete?.(data.data.transactionHash);
      } else {
        setError(data.error || "Failed to send transaction");
        addNotification({
          message: data.error || "Failed to send transaction",
          type: "error",
        });
      }
    } catch (err) {
      setError("Network error while sending transaction");
      addNotification({
        message: "Network error while sending transaction",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setToAddress("");
    setAmount("");
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="rounded-lg bg-white/5 p-4">
      <div className="mb-4 flex items-center">
        <svg
          className="mr-2 h-5 w-5 text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
        <h4 className="text-lg font-semibold text-white">Send Tokens</h4>
      </div>

      <div className="space-y-4">
        {/* Recipient Address */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Recipient Address
          </label>
          <input
            type="text"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            placeholder="Enter recipient address (xion1...)"
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            disabled={loading}
          />
        </div>

        {/* Amount and Denom */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Amount
            </label>
            <input
              type="number"
              step="0.000001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              disabled={loading}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Token
            </label>
            <select
              value={denom}
              onChange={(e) => setDenom(e.target.value as TokenDenom)}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
              disabled={loading}
            >
              <option value="XION">XION</option>
              <option value="USDC">USDC</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3">
            <div className="flex items-center">
              <svg
                className="mr-2 h-4 w-4 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="rounded-lg border border-green-400/30 bg-green-500/10 p-3">
            <div className="flex items-center">
              <svg
                className="mr-2 h-4 w-4 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              <p className="text-sm text-green-300">{success}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 disabled:transform-none disabled:cursor-not-allowed disabled:bg-slate-600/50 disabled:text-slate-400"
            onClick={handleTransfer}
            disabled={loading || !toAddress.trim() || !amount.trim()}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Sending...
              </div>
            ) : (
              <div className="flex items-center">
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                Send {denom}
              </div>
            )}
          </Button>
          <Button
            className="bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:from-slate-700 hover:to-slate-800"
            onClick={handleClear}
            disabled={loading}
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
