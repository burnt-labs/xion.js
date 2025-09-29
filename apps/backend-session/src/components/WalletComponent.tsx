"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@burnt-labs/ui";
import TransferComponent from "./TransferComponent";
import {
  WalletBalance,
  WalletData,
  WalletComponentProps,
} from "@/types/frontend";

export default function WalletComponent({
  account,
  onRefresh,
}: WalletComponentProps) {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWalletData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/wallet/account");
      const data = await response.json();

      if (data.success) {
        setWalletData(data.data);
      } else {
        setError(data.error || "Failed to fetch wallet data");
      }
    } catch (err) {
      setError("Network error while fetching wallet data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleRefresh = useCallback(() => {
    fetchWalletData();
    onRefresh?.();
  }, [onRefresh]);

  const handleTransferComplete = useCallback((transactionHash: string) => {
    console.log("Transfer completed:", transactionHash);
    // Refresh wallet data after successful transfer
    fetchWalletData();
  }, []);

  const formatAmount = (amount: string, decimals: number = 6) => {
    const num = parseFloat(amount);
    return num.toFixed(decimals);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="mb-6 flex items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <h3 className="ml-3 text-xl font-semibold text-white">
            Wallet Information
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            <span className="text-slate-300">Loading wallet data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="mb-6 flex items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <h3 className="ml-3 text-xl font-semibold text-white">
            Wallet Information
          </h3>
        </div>
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 backdrop-blur-sm">
          <div className="flex items-center">
            <svg
              className="mr-3 h-5 w-5 text-red-400"
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
            <p className="text-red-300">{error}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-center">
          <Button
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700"
            onClick={handleRefresh}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!walletData) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="mb-6 flex items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <h3 className="ml-3 text-xl font-semibold text-white">
            Wallet Information
          </h3>
        </div>
        <div className="py-8 text-center">
          <svg
            className="mx-auto mb-4 h-12 w-12 text-slate-400"
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
          <p className="text-slate-400">No wallet data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <h3 className="ml-3 text-xl font-semibold text-white">
            Wallet Information
          </h3>
        </div>
        <Button
          className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700"
          onClick={handleRefresh}
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          Refresh
        </Button>
      </div>

      <div className="space-y-6">
        {/* Meta Account Address */}
        <div className="rounded-lg bg-white/5 p-4">
          <div className="mb-2 flex items-center">
            <svg
              className="mr-2 h-4 w-4 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            <span className="text-sm font-medium text-slate-300">
              Meta Account Address
            </span>
          </div>
          <p className="break-all font-mono text-sm text-slate-200">
            {account.metaAccountAddress}
          </p>
        </div>

        {/* Token Balances */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* XION Balance */}
          <div className="rounded-lg bg-white/5 p-4">
            <div className="mb-2 flex items-center">
              <div className="mr-2 h-6 w-6 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"></div>
              <span className="text-sm font-medium text-slate-300">XION</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatAmount(walletData.balances?.xion.amount || "0")}
            </p>
            <p className="text-xs text-slate-400">
              {walletData.balances?.xion.microAmount} uxion
            </p>
          </div>

          {/* USDC Balance */}
          <div className="rounded-lg bg-white/5 p-4">
            <div className="mb-2 flex items-center">
              <div className="mr-2 h-6 w-6 rounded-full bg-gradient-to-r from-green-400 to-emerald-500"></div>
              <span className="text-sm font-medium text-slate-300">USDC</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatAmount(walletData.balances?.usdc.amount || "0")}
            </p>
            <p className="text-xs text-slate-400">
              {walletData.balances?.usdc.microAmount} uusdc
            </p>
          </div>
        </div>

        {/* Transfer Component */}
        <TransferComponent onTransferComplete={handleTransferComplete} />
      </div>
    </div>
  );
}
