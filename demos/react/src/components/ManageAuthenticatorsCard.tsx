import { useState } from "react";
import { useManageAuthenticators } from "@burnt-labs/abstraxion-react";
import { Button } from "./Button";

type ManageStatus = "idle" | "pending" | "success" | "cancelled" | "error";

/**
 * Small "manage your account" button + status display. Drop into any demo
 * where the user is connected via popup / redirect / embedded — same pattern
 * as the direct-signing card. Hidden in modes where the controller doesn't
 * support it (signer mode).
 */
export function ManageAuthenticatorsCard(): JSX.Element | null {
  const { manageAuthenticators, isSupported } = useManageAuthenticators();
  const [status, setStatus] = useState<ManageStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isSupported) return null;

  const handleManage = async () => {
    setStatus("pending");
    setErrorMsg(null);
    try {
      await manageAuthenticators();
      setStatus("success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isCancelled = /cancelled|closed/i.test(msg);
      setStatus(isCancelled ? "cancelled" : "error");
      if (!isCancelled) setErrorMsg(msg);
    }
  };

  return (
    <div className="w-full space-y-2 rounded-lg border border-white/10 bg-gray-900/30 p-4">
      <h3 className="text-sm font-semibold">Manage Your Account</h3>
      <p className="text-xs text-gray-400">
        Add or remove ways to sign in (passkey, social, wallet) via the
        dashboard. Opens in the same transport as login.
      </p>
      <Button
        fullWidth
        onClick={handleManage}
        disabled={status === "pending"}
        structure="outlined"
      >
        {status === "pending"
          ? "OPENING DASHBOARD…"
          : "MANAGE AUTHENTICATORS ↗"}
      </Button>
      {status === "success" && (
        <p className="text-xs text-green-400">Authenticators updated.</p>
      )}
      {status === "cancelled" && (
        <p className="text-xs text-yellow-400">Cancelled.</p>
      )}
      {status === "error" && errorMsg && (
        <p className="text-xs text-red-400">{errorMsg}</p>
      )}
    </div>
  );
}
