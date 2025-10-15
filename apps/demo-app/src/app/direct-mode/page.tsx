"use client";
import { useState } from "react";
import {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";
import "@burnt-labs/abstraxion/dist/index.css";
import Link from "next/link";

export default function DirectModePage(): JSX.Element {
  const { data: account, login } = useAbstraxionAccount();
  const { client, logout } = useAbstraxionSigningClient();

  // Send transaction state
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const handleSendTokens = async () => {
    if (!client || !account.bech32Address || !recipient || !amount) {
      setTxError("Please fill in all fields");
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
          <Button fullWidth onClick={() => login()} structure="base">
            CONNECT WALLET (DIRECT MODE)
          </Button>
        )}

        {account.bech32Address && (
          <>
            <div className="rounded border border-white/20 p-4">
              <h3 className="mb-2 font-semibold">Account Info</h3>
              <p className="text-sm text-gray-400 break-all">
                Address: {account.bech32Address}
              </p>
              <p className="text-sm text-gray-400">
                Client: {client ? "Connected" : "Not connected"}
              </p>
            </div>

            <div className="rounded border border-green-500/20 bg-green-500/10 p-4">
              <p className="text-sm text-green-400">
                ✓ Successfully connected using direct mode! No dashboard redirect needed.
              </p>
            </div>

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
