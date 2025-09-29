"use client";
import { useEffect, useState } from "react";
import { Button } from "@burnt-labs/ui";

interface NotificationProps {
  message: string;
  transactionHash?: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose?: () => void;
}

export default function Notification({
  message,
  transactionHash,
  type = "success",
  duration = 5000,
  onClose,
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return "border-green-400/30 bg-green-500/10 text-green-300";
      case "error":
        return "border-red-400/30 bg-red-500/10 text-red-300";
      case "info":
        return "border-blue-400/30 bg-blue-500/10 text-blue-300";
      default:
        return "border-green-400/30 bg-green-500/10 text-green-300";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return (
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
        );
      case "error":
        return (
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
        );
      case "info":
        return (
          <svg
            className="mr-2 h-4 w-4 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm">
      <div
        className={`rounded-lg border p-4 shadow-lg backdrop-blur-sm ${getTypeStyles()}`}
      >
        <div className="flex items-start">
          {getIcon()}
          <div className="flex-1">
            <p className="text-sm font-medium">{message}</p>
            {transactionHash && (
              <div className="mt-2">
                <p className="text-xs opacity-75 mb-1">Transaction Hash:</p>
                <div className="flex items-center space-x-2">
                  <code className="text-xs bg-black/20 px-2 py-1 rounded font-mono break-all">
                    {transactionHash}
                  </code>
                  <Button
                    structure="outlined"
                    className="text-xs px-2 py-1 h-auto bg-white/10 border-white/20 text-white hover:bg-white/20"
                    onClick={() => {
                      window.open(
                        `https://www.mintscan.io/xion-testnet/tx/${transactionHash}`,
                        "_blank"
                      );
                    }}
                  >
                    View
                  </Button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleClose}
            className="ml-2 text-white/60 hover:text-white/80 transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M6 18L18 6M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
