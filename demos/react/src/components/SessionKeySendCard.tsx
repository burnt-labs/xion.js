import { useState } from "react";
import { useAbstraxionSigningClient } from "@burnt-labs/abstraxion-react";
import { Button } from "./Button";

interface SessionKeySendCardProps {
  accountAddress: string;
  memo?: string;
}

export function SessionKeySendCard({
  accountAddress,
  memo = "Session key send",
}: SessionKeySendCardProps): JSX.Element {
  const { client } = useAbstraxionSigningClient();
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
        accountAddress,
        [{ denom: "uxion", amount: "1000" }],
        "auto",
        memo,
      );
      if (result) setTxHash(result.transactionHash);
    } catch (err: any) {
      setTxError(err.message || "Transaction failed");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-green-500/30 bg-gray-900/50 p-4">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-green-500" />
        <h3 className="font-semibold text-green-400">Session Key Send</h3>
      </div>
      <p className="text-xs text-gray-400">
        Signs with grantee keypair — no popup, gasless via fee grant.
      </p>
      <Button
        fullWidth
        onClick={handleSend}
        disabled={isSending || !client}
        structure="base"
      >
        {isSending ? "SENDING..." : "SEND 0.001 XION"}
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
