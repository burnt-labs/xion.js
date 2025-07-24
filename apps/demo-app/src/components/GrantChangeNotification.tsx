"use client";
import { useEffect, useState } from "react";
import { useAbstraxionAccount } from "@burnt-labs/abstraxion";
import { Button } from "@burnt-labs/ui";

interface GrantChangeNotificationProps {
  onReconnect?: () => void;
  onDismiss?: () => void;
}

export function GrantChangeNotification({
  onReconnect,
  onDismiss,
}: GrantChangeNotificationProps): JSX.Element | null {
  const { data: account, grantsChanged, login } = useAbstraxionAccount();
  const [showNotification, setShowNotification] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    // Show notification when grants have changed and user is not connected
    if (grantsChanged && !account.bech32Address) {
      setShowNotification(true);
    } else {
      setShowNotification(false);
    }
  }, [grantsChanged, account.bech32Address]);

  const handleReconnect = async () => {
    try {
      setIsReconnecting(true);
      await login();
      onReconnect?.();
      setShowNotification(false);
    } catch (error) {
      console.error("Error reconnecting:", error);
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleDismiss = () => {
    setShowNotification(false);
    onDismiss?.();
  };

  if (!showNotification) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-yellow-500/20 bg-gray-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/20">
            <svg
              className="h-5 w-5 text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">
            Permissions Updated
          </h3>
        </div>

        <div className="mb-6 space-y-2">
          <p className="text-gray-300">
            The app's permissions have been updated since your last session.
            You've been automatically logged out for security reasons.
          </p>
          <p className="text-sm text-gray-400">
            Please reconnect to continue using the app with the updated
            permissions.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleReconnect}
            disabled={isReconnecting}
            structure="base"
            className="flex-1"
          >
            {isReconnecting ? "RECONNECTING..." : "RECONNECT"}
          </Button>
          <Button
            onClick={handleDismiss}
            structure="outlined"
            className="flex-1"
          >
            DISMISS
          </Button>
        </div>

        <div className="mt-4 rounded bg-blue-500/10 p-3">
          <p className="text-xs text-blue-300">
            💡 <strong>Developer Note:</strong> This notification appears when
            the treasury contract configuration changes between sessions,
            ensuring users always have the correct permissions.
          </p>
        </div>
      </div>
    </div>
  );
}
