"use client";
import { useState, useEffect } from "react";
import {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";
import "@burnt-labs/abstraxion/dist/index.css";
import Link from "next/link";

export default function DirectModePage(): JSX.Element {
  const {
    data: account,
    login,
    isConnected,
    isConnecting,
    isInitializing,
    isLoading
  } = useAbstraxionAccount();
  const { client, logout } = useAbstraxionSigningClient();

  // Balance state
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Send transaction state
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Query balance when connected
  useEffect(() => {
    async function fetchBalance() {
      if (!client || !account.bech32Address) {
        setBalance(null);
        return;
      }

      try {
        setIsLoadingBalance(true);
        const balances = await client.getAllBalances(account.bech32Address);
        const xionBalance = balances.find((b) => b.denom === "uxion");

        if (xionBalance) {
          // Convert uxion to XION (divide by 1,000,000)
          const xionAmount = (parseInt(xionBalance.amount) / 1_000_000).toFixed(6);
          setBalance(xionAmount);
        } else {
          setBalance("0");
        }
      } catch (error) {
        console.error("Failed to fetch balance:", error);
        setBalance("Error");
      } finally {
        setIsLoadingBalance(false);
      }
    }

    fetchBalance();
  }, [client, account.bech32Address, txHash]); // Refetch after successful transaction

  const handleSendTokens = async () => {
    if (!client || !account.bech32Address || !recipient || !amount) {
      setTxError("Please fill in all fields");
      return;
    }

    // Check if user has sufficient balance
    if (balance !== null && parseFloat(amount) > parseFloat(balance)) {
      setTxError(`Insufficient balance. You have ${balance} XION`);
      return;
    }

    try {
      setIsSending(true);
      setTxError(null);
      setTxHash(null);

      const amountInUxion = (parseFloat(amount) * 1_000_000).toString();

      const result = await client.sendTokens(
        account.bech32Address,
        recipient,
        [{ denom: "uxion", amount: amountInUxion }],
        "auto",
        "Send XION via Abstraxion Direct Mode"
      );

      setTxHash(result.transactionHash);
      setRecipient("");
      setAmount("");
    } catch (error: any) {
      console.error("Send error:", error);
      setTxError(error.message || "Failed to send tokens");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="m-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-4">
      {/* Initialization Loading Overlay */}
      {isInitializing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 max-w-sm rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-6 text-center backdrop-blur-md">
            <div className="mb-4">
              <div className="mx-auto flex h-12 w-12 animate-pulse items-center justify-center rounded-full border-4 border-yellow-500/30 bg-yellow-500/20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-yellow-400 border-r-transparent"></div>
              </div>
            </div>
            <p className="font-bold text-yellow-400">Initializing</p>
            <p className="mt-2 text-sm text-gray-400">
              Checking for existing session...
            </p>
          </div>
        </div>
      )}

      {/* Wallet Connection Loading Overlay */}
      {isConnecting && !isInitializing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 max-w-sm rounded-lg border border-blue-500/30 bg-blue-500/10 p-6 text-center backdrop-blur-md">
            <div className="mb-4">
              <div className="mx-auto flex h-12 w-12 animate-pulse items-center justify-center rounded-full border-4 border-blue-500/30 bg-blue-500/20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-400 border-r-transparent"></div>
              </div>
            </div>
            <p className="font-bold text-blue-400">Connecting Wallet</p>
            <p className="mt-2 text-sm text-gray-400">
              Please approve the connection in your wallet
            </p>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold tracking-tighter text-white">
        Direct Mode Abstraxion Example
      </h1>
      <p className="text-center text-gray-400">
        This example uses the new <strong>direct mode</strong> which allows in-app wallet
        connections without redirecting to the dashboard. Connect with MetaMask,
        Keplr, Leap, or OKX directly in this app.
      </p>

      <div className="w-full space-y-4">
        {!account.bech32Address && (
          <Button
            fullWidth
            onClick={() => login()}
            structure="base"
            disabled={isLoading || isConnecting}
          >
            {isLoading || isConnecting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                <span>
                  {isConnecting ? "CONNECTING..." : "LOADING..."}
                </span>
              </div>
            ) : (
              "CONNECT WALLET (DIRECT MODE)"
            )}
          </Button>
        )}

        {account.bech32Address && (
          <>
            <div className="rounded border border-white/20 p-4 space-y-2">
              <h3 className="mb-2 font-semibold">Account Info</h3>
              <p className="text-sm text-gray-400 break-all">
                Address: {account.bech32Address}
              </p>
              <p className="text-sm text-gray-400">
                Client: {client ? "Connected" : "Not connected"}
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

            <div className="rounded border border-green-500/20 bg-green-500/10 p-4">
              <p className="text-sm text-green-400">
                ✓ Successfully connected using direct mode! No dashboard redirect needed.
              </p>
            </div>

            {/* Low Balance Warning */}
            {balance !== null && parseFloat(balance) === 0 && (
              <div className="rounded border border-yellow-500/20 bg-yellow-500/10 p-4">
                <p className="text-sm text-yellow-400">
                  ⚠ Your account has no XION tokens. You'll need to fund this address to send transactions.
                </p>
              </div>
            )}

            {/* Send XION Section */}
            <div className="rounded border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
              <h3 className="font-semibold text-blue-400">Send XION</h3>

              <div className="space-y-2">
                <label className="block text-sm text-gray-400">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="xion1..."
                  className="w-full rounded bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm text-gray-400">
                    Amount (XION)
                  </label>
                  {balance !== null && parseFloat(balance) > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        // Leave ~0.01 XION for gas fees
                        const maxSend = Math.max(0, parseFloat(balance) - 0.01);
                        setAmount(maxSend.toFixed(6));
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      Max
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.001"
                  step="0.001"
                  min="0"
                  className="w-full rounded bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
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

            <Button
              fullWidth
              onClick={() => {
                if (logout) logout();
              }}
              structure="outlined"
            >
              DISCONNECT
            </Button>
          </>
        )}
      </div>

      <Link
        href="/"
        className="mt-4 inline-block text-sm text-gray-400 underline hover:text-gray-300"
      >
        ← Back to examples
      </Link>
    </main>
  );
}
