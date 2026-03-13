"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";
import { calculateFee, GasPrice } from "@cosmjs/stargate";
import { coins } from "@cosmjs/proto-signing";
import Link from "next/link";
import { useMetamaskAuth } from "./providers";
import { useGetBalance } from "@/hooks/useGetBalance";
import { MetamaskAuthState } from "@/hooks/useMetamask";

// Prevent static generation - this page requires runtime env vars
export const dynamic = "force-dynamic";

/**
 * Demo component for session key signing (default, gasless)
 */
function SessionKeySigningCard({
  accountAddress,
}: {
  accountAddress: string | undefined;
}) {
  const { client } = useAbstraxionSigningClient();
  const { balance, isLoading: isLoadingBalance } = useGetBalance(
    accountAddress,
    client as any,
  );
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!client || !accountAddress) return;

    setIsSending(true);
    setTxHash(null);
    setTxError(null);

    try {
      const result = await client.sendTokens(
        accountAddress,
        accountAddress, // Send to self for demo
        [{ denom: "uxion", amount: "1000" }], // 0.001 XION
        "auto",
        "Demo: Session Key Signing (Gasless)",
      );
      setTxHash(result.transactionHash);
    } catch (error: any) {
      console.error("Session key signing error:", error);
      setTxError(error.message || "Transaction failed");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 space-y-3 rounded-lg border border-green-500/30 bg-gray-900/50 p-4">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-green-500"></div>
        <h3 className="font-semibold text-green-400">Session Key Signing</h3>
      </div>

      <div className="space-y-2 text-sm text-gray-400">
        <p>
          <strong>Mode:</strong> Default (gasless)
        </p>
        <p>
          <strong>Who Signs:</strong> Session key (no popup)
        </p>
        <p>
          <strong>Who Pays Gas:</strong> Fee grant (free)
        </p>
        <p>
          <strong>Use Case:</strong> Normal operations
        </p>
      </div>

      <div className="border-t border-white/10 pt-3">
        <p className="text-xs text-gray-500">
          Client:{" "}
          {client ? (
            <span className="text-green-400">GranteeSignerClient</span>
          ) : (
            <span className="text-yellow-400">Not ready</span>
          )}
        </p>
        <p className="text-xs text-gray-500">
          Balance:{" "}
          {isLoadingBalance
            ? "Loading..."
            : balance !== null
              ? `${balance} XION`
              : "—"}
        </p>
      </div>

      <Button
        fullWidth
        onClick={handleSend}
        disabled={isSending || !client}
        structure="base"
      >
        {isSending ? "SENDING..." : "SEND 0.001 XION TO SELF"}
      </Button>

      {txHash && (
        <div className="rounded border border-green-500/20 bg-green-500/10 p-2">
          <p className="text-xs text-green-400">Success!</p>
          <p className="truncate text-xs text-gray-400">Hash: {txHash}</p>
        </div>
      )}

      {txError && (
        <div className="rounded border border-red-500/20 bg-red-500/10 p-2">
          <p className="text-xs text-red-400">Error: {txError}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Demo component for direct signing (requireAuth: true, user pays gas)
 */
function DirectSigningCard({
  accountAddress,
}: {
  accountAddress: string | undefined;
}) {
  const { client, error } = useAbstraxionSigningClient({ requireAuth: true });
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Fetch balance using the direct signing client
  useEffect(() => {
    async function fetchBalance() {
      if (!client || !accountAddress) {
        setBalance(null);
        return;
      }

      setIsLoadingBalance(true);
      try {
        // Import StargateClient dynamically for balance queries
        const { StargateClient } = await import("@cosmjs/stargate");
        const rpcEndpoint = process.env.NEXT_PUBLIC_RPC_URL!;
        const queryClient = await StargateClient.connect(rpcEndpoint);

        const balances = await queryClient.getAllBalances(accountAddress);
        const xionBalance = balances.find((b) => b.denom === "uxion");
        if (xionBalance) {
          const xionAmount = (parseInt(xionBalance.amount) / 1_000_000).toFixed(
            6,
          );
          setBalance(xionAmount);
        } else {
          setBalance("0");
        }

        queryClient.disconnect();
      } catch (err) {
        console.error("Failed to fetch balance:", err);
        setBalance("Error");
      } finally {
        setIsLoadingBalance(false);
      }
    }

    fetchBalance();
  }, [client, accountAddress]);

  const handleSend = async () => {
    if (!client || !accountAddress || !("simulate" in client)) return;

    setIsSending(true);
    setTxHash(null);
    setTxError(null);

    try {
      // Simulate to get gas estimate
      const amount = coins(1000, "uxion"); // 0.001 XION
      const gasEstimate = await client.simulate(
        accountAddress,
        [
          {
            typeUrl: "/cosmos.bank.v1beta1.MsgSend",
            value: {
              fromAddress: accountAddress,
              toAddress: accountAddress,
              amount: amount,
            },
          },
        ],
        "Demo: Direct Signing (User Pays Gas)",
      );

      // Apply 1.5x multiplier for safety
      const gasLimit = Math.ceil(gasEstimate * 1.5);
      const gasPrice = GasPrice.fromString("0.001uxion");
      const fee = calculateFee(gasLimit, gasPrice);

      const result = await client.sendTokens(
        accountAddress,
        accountAddress, // Send to self for demo
        amount,
        fee,
        "Demo: Direct Signing (User Pays Gas)",
      );
      setTxHash(result.transactionHash);
    } catch (error: any) {
      console.error("Direct signing error:", error);
      setTxError(error.message || "Transaction failed");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 space-y-3 rounded-lg border border-blue-500/30 bg-gray-900/50 p-4">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-blue-500"></div>
        <h3 className="font-semibold text-blue-400">Direct Signing</h3>
      </div>

      <div className="space-y-2 text-sm text-gray-400">
        <p>
          <strong>Mode:</strong> requireAuth: true
        </p>
        <p>
          <strong>Who Signs:</strong> Wallet (popup)
        </p>
        <p>
          <strong>Who Pays Gas:</strong> You (from balance)
        </p>
        <p>
          <strong>Use Case:</strong> Security-critical ops
        </p>
      </div>

      <div className="border-t border-white/10 pt-3">
        <p className="text-xs text-gray-500">
          Client:{" "}
          {error ? (
            <span className="text-red-400">Error</span>
          ) : client ? (
            <span className="text-blue-400">AAClient</span>
          ) : (
            <span className="text-yellow-400">Creating...</span>
          )}
        </p>
        <p className="text-xs text-gray-500">
          Balance:{" "}
          {isLoadingBalance
            ? "Loading..."
            : balance !== null
              ? `${balance} XION`
              : "—"}
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-500/20 bg-red-500/10 p-2">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <Button
        fullWidth
        onClick={handleSend}
        disabled={isSending || !client || !!error}
        structure="base"
      >
        {isSending ? "SIGNING..." : "SEND 0.001 XION TO SELF"}
      </Button>

      {balance !== null && parseFloat(balance) < 0.01 && !error && (
        <div className="rounded border border-yellow-500/20 bg-yellow-500/10 p-2">
          <p className="text-xs text-yellow-400">
            Low balance! Direct signing requires XION for gas.{" "}
            <a
              href="https://faucet.xion.burnt.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Get testnet tokens
            </a>
          </p>
        </div>
      )}

      {txHash && (
        <div className="rounded border border-blue-500/20 bg-blue-500/10 p-2">
          <p className="text-xs text-blue-400">Success!</p>
          <p className="truncate text-xs text-gray-400">Hash: {txHash}</p>
        </div>
      )}

      {txError && (
        <div className="rounded border border-red-500/20 bg-red-500/10 p-2">
          <p className="text-xs text-red-400">Error: {txError}</p>
        </div>
      )}
    </div>
  );
}

export default function DirectSigningDemoPage() {
  const { metamask, registerAbstraxionLogin, registerAbstraxionLogout } =
    useMetamaskAuth();
  const {
    data: abstraxionAccount,
    isConnected,
    isConnecting,
    isInitializing,
    login: abstraxionLogin,
    logout: abstraxionLogout,
  } = useAbstraxionAccount();

  const isMetamaskReady = metamask.isReady;

  const handleAbstraxionConnect = useCallback(async () => {
    try {
      await abstraxionLogin();
    } catch (err: any) {
      console.error("Abstraxion connection error:", err);
    }
  }, [abstraxionLogin]);

  const handleMetamaskConnect = useCallback(async () => {
    try {
      await metamask.connect();
    } catch (err: any) {
      console.error("MetaMask connection error:", err);
    }
  }, [metamask]);

  useEffect(() => {
    registerAbstraxionLogin(async () => {
      if (!isConnected && !isConnecting) {
        await handleAbstraxionConnect();
      }
    });

    registerAbstraxionLogout(() => {
      if (abstraxionLogout) {
        abstraxionLogout();
      }
    });
  }, [
    registerAbstraxionLogin,
    registerAbstraxionLogout,
    isConnected,
    isConnecting,
    handleAbstraxionConnect,
    abstraxionLogout,
  ]);

  useEffect(() => {
    let hasAttempted = false;

    if (isMetamaskReady && !isConnected && !isConnecting && !hasAttempted) {
      hasAttempted = true;
      const timer = setTimeout(() => {
        handleAbstraxionConnect();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isMetamaskReady, isConnected, isConnecting, handleAbstraxionConnect]);

  const handleDisconnect = useCallback(() => {
    if (abstraxionLogout) {
      abstraxionLogout();
    }
    metamask.disconnect();
  }, [abstraxionLogout, metamask]);

  const isSystemInitializing =
    isInitializing ||
    (metamask.authState !== MetamaskAuthState.Authenticated &&
      metamask.authState !== MetamaskAuthState.Unauthenticated);

  return (
    <main className="m-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 p-4">
      {/* Initialization Loading Overlay */}
      {isSystemInitializing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg">
          <div className="mx-4 max-w-sm rounded-lg border border-yellow-500/50 bg-black/80 p-8 text-center shadow-2xl backdrop-blur-xl">
            <div className="mb-6">
              <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full border-4 border-yellow-500/40 bg-yellow-500/20">
                <div className="border-3 h-8 w-8 animate-spin rounded-full border-solid border-yellow-400 border-r-transparent"></div>
              </div>
            </div>
            <p className="text-lg font-bold text-yellow-400">Initializing</p>
            <p className="mt-3 text-sm text-gray-300">
              Checking for existing sessions...
            </p>
          </div>
        </div>
      )}

      {/* Wallet Connection Loading Overlay */}
      {isConnecting && !isSystemInitializing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg">
          <div className="mx-4 max-w-sm rounded-lg border border-blue-500/50 bg-black/80 p-8 text-center shadow-2xl backdrop-blur-xl">
            <div className="mb-6">
              <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full border-4 border-blue-500/40 bg-blue-500/20">
                <div className="border-3 h-8 w-8 animate-spin rounded-full border-solid border-blue-400 border-r-transparent"></div>
              </div>
            </div>
            <p className="text-lg font-bold text-blue-400">
              Creating Smart Account
            </p>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold tracking-tighter text-white">
        Direct Signing Demo
      </h1>
      <p className="max-w-lg text-center text-gray-400">
        This demo shows the difference between{" "}
        <strong>session key signing</strong> (default, gasless) and{" "}
        <strong>direct signing</strong> (wallet popup, user pays gas).
      </p>

      {!isConnected && (
        <>
          {!isMetamaskReady && (
            <>
              <Button
                fullWidth
                onClick={handleMetamaskConnect}
                structure="base"
              >
                CONNECT METAMASK
              </Button>
              {metamask.error && (
                <div className="w-full rounded border border-red-500/20 bg-red-500/10 p-2">
                  <p className="text-xs text-red-400">{metamask.error}</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {isConnected && abstraxionAccount && (
        <>
          {/* Account Info */}
          <div className="w-full space-y-2 rounded-lg border border-white/10 bg-gray-800/50 p-4">
            <p className="text-xs text-gray-400">
              <strong>Account:</strong>{" "}
              <span className="font-mono">
                {abstraxionAccount.bech32Address}
              </span>
            </p>
            <p className="text-xs text-gray-400">
              <strong>MetaMask:</strong>{" "}
              <span className="font-mono">
                {metamask.ethereumAddress || "N/A"}
              </span>
            </p>
          </div>

          {/* Side-by-Side Comparison */}
          <div className="flex w-full flex-col gap-4 md:flex-row">
            <SessionKeySigningCard
              accountAddress={abstraxionAccount.bech32Address}
            />
            <DirectSigningCard
              accountAddress={abstraxionAccount.bech32Address}
            />
          </div>

          {/* Explanation */}
          <div className="w-full rounded-lg border border-white/10 bg-gray-800/50 p-4">
            <h3 className="mb-2 font-semibold text-white">When to Use Each</h3>
            <ul className="space-y-1 text-sm text-gray-400">
              <li>
                <span className="text-green-400">Session Key:</span> Most
                operations (transfers, mints, swaps, etc.)
              </li>
              <li>
                <span className="text-blue-400">Direct Signing:</span>{" "}
                Security-critical ops (large withdrawals, changing permissions)
              </li>
            </ul>
          </div>

          <Button fullWidth onClick={handleDisconnect} structure="outlined">
            DISCONNECT
          </Button>
        </>
      )}

      <Link
        href="/"
        className="mt-4 inline-block text-sm text-gray-400 underline hover:text-gray-300"
      >
        Back to examples
      </Link>
    </main>
  );
}
