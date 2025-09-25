"use client";
import { useState, useEffect } from "react";
import { Button } from "@burnt-labs/ui";
import { Input } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";

interface WalletStatus {
  connected: boolean;
  sessionKeyAddress?: string;
  metaAccountAddress?: string;
  permissions?: {
    contracts?: string[];
    bank?: Array<{ denom: string; amount: string }>;
    stake?: boolean;
    treasury?: string;
    expiry?: number;
  };
  expiresAt?: number;
  state?: string;
}

export default function HomePage() {
  const [username, setUsername] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [walletStatus, setWalletStatus] = useState<WalletStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem("username");
    if (savedUsername) {
      setUsername(savedUsername);
      setIsLoggedIn(true);
      checkWalletStatus(savedUsername);
    }
  }, []);

  const handleLogin = () => {
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }
    setIsLoggedIn(true);
    localStorage.setItem("username", username);
    checkWalletStatus(username);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername("");
    setWalletStatus(null);
    localStorage.removeItem("username");
  };

  const checkWalletStatus = async (user: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/wallet/status?username=${encodeURIComponent(user)}`,
      );
      const data = await response.json();

      if (data.success) {
        setWalletStatus(data.data);
      } else {
        setError(data.error || "Failed to check wallet status");
      }
    } catch (err) {
      setError("Network error while checking wallet status");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!username) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/wallet/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          grantedRedirectUrl: window.location.href,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to the authorization URL
        console.log(
          "Redirecting to authorization URL",
          data.data.authorizationUrl,
        );
        window.location.href = data.data.authorizationUrl;
        // No need to check wallet status after redirect
      } else {
        setError(data.error || "Failed to initiate wallet connection");
      }
    } catch (err) {
      setError("Network error while connecting wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!username) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/wallet/disconnect", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (data.success) {
        setWalletStatus(null);
      } else {
        setError(data.error || "Failed to disconnect wallet");
      }
    } catch (err) {
      setError("Network error while disconnecting wallet");
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
  };

  const formatPermissions = (permissions?: WalletStatus["permissions"]) => {
    if (!permissions) return "None";

    const parts: string[] = [];
    if (permissions.contracts && permissions.contracts.length > 0) {
      parts.push(`Contracts: ${permissions.contracts.length}`);
    }
    if (permissions.bank && permissions.bank.length > 0) {
      parts.push(`Bank: ${permissions.bank.length} limits`);
    }
    if (permissions.stake) {
      parts.push("Staking enabled");
    }
    if (permissions.treasury) {
      parts.push(`Treasury: ${permissions.treasury}`);
    }

    return parts.length > 0 ? parts.join(", ") : "None";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>

      <div className="relative mx-auto max-w-6xl px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-white/10 p-3 backdrop-blur-sm">
            <svg
              className="h-8 w-8 text-purple-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="mb-4 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-5xl font-bold text-transparent">
            XION Backend Session
          </h1>
          <p className="text-xl text-slate-300">
            Secure wallet management for the future of blockchain
          </p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          {!isLoggedIn ? (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="mb-2 text-2xl font-semibold text-white">
                  Welcome to XION
                </h2>
                <p className="text-slate-300">
                  Enter your username to get started
                </p>
              </div>

              <div className="space-y-8">
                <div className="group relative">
                  <div className="relative">
                    <label
                      htmlFor="username"
                      className="mb-3 block text-sm font-semibold text-slate-200"
                    >
                      Username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20">
                          <svg
                            className="h-4 w-4 text-purple-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                      </div>
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full rounded-xl border border-white/20 bg-white/10 py-4 pl-14 pr-4 text-lg font-medium text-white placeholder-slate-400 transition-all duration-300 focus:border-purple-400 focus:bg-white/20 focus:ring-2 focus:ring-purple-400/20"
                        placeholder="Enter your username"
                      />
                      {username && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                          <div className="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      Choose a unique username for your XION account
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleLogin}
                  className="w-full transform rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-purple-700 hover:to-blue-700"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                      />
                    </svg>
                    Login
                  </span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* User header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500">
                    <span className="text-lg font-bold text-white">
                      {username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Welcome back, {username}
                    </h2>
                    <p className="text-slate-300">
                      Manage your XION wallet connection
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  className="border border-red-400/30 bg-red-500/20 text-red-300 transition-all duration-200 hover:border-red-400/50 hover:bg-red-500/30"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Logout
                </Button>
              </div>

              {/* Error message */}
              {error && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 backdrop-blur-sm">
                  <div className="flex items-center">
                    <svg
                      className="mr-3 h-5 w-5 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-red-300">{error}</p>
                  </div>
                </div>
              )}

              {/* Wallet status card */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="mb-6 flex items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <h3 className="ml-3 text-xl font-semibold text-white">
                    Wallet Connection Status
                  </h3>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center space-x-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-400 border-t-transparent"></div>
                      <span className="text-slate-300">
                        Loading wallet status...
                      </span>
                    </div>
                  </div>
                ) : walletStatus ? (
                  <div className="space-y-4">
                    {/* Status badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Connection Status</span>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                          walletStatus.connected
                            ? "border border-green-400/30 bg-green-500/20 text-green-300"
                            : "border border-red-400/30 bg-red-500/20 text-red-300"
                        }`}
                      >
                        <div
                          className={`mr-2 h-2 w-2 rounded-full ${
                            walletStatus.connected
                              ? "bg-green-400"
                              : "bg-red-400"
                          }`}
                        ></div>
                        {walletStatus.connected ? "Connected" : "Disconnected"}
                      </span>
                    </div>

                    {walletStatus.connected && (
                      <div className="space-y-4">
                        {/* Session Key */}
                        <div className="rounded-lg bg-white/5 p-4">
                          <div className="mb-2 flex items-center">
                            <svg
                              className="mr-2 h-4 w-4 text-purple-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                              />
                            </svg>
                            <span className="text-sm font-medium text-slate-300">
                              Session Account
                            </span>
                          </div>
                          <p className="break-all font-mono text-sm text-slate-200">
                            {walletStatus.sessionKeyAddress}
                          </p>
                        </div>

                        {/* Meta Account */}
                        <div className="rounded-lg bg-white/5 p-4">
                          <div className="mb-2 flex items-center">
                            <svg
                              className="mr-2 h-4 w-4 text-blue-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            <span className="text-sm font-medium text-slate-300">
                              Meta Account
                            </span>
                          </div>
                          <p className="break-all font-mono text-sm text-slate-200">
                            {walletStatus.metaAccountAddress}
                          </p>
                        </div>

                        {/* Additional info grid */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="rounded-lg bg-white/5 p-4">
                            <div className="mb-2 flex items-center">
                              <svg
                                className="mr-2 h-4 w-4 text-yellow-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span className="text-sm font-medium text-slate-300">
                                Expires
                              </span>
                            </div>
                            <p className="text-sm text-slate-200">
                              {formatTimestamp(walletStatus.expiresAt)}
                            </p>
                          </div>

                          <div className="rounded-lg bg-white/5 p-4">
                            <div className="mb-2 flex items-center">
                              <svg
                                className="mr-2 h-4 w-4 text-indigo-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span className="text-sm font-medium text-slate-300">
                                State
                              </span>
                            </div>
                            <p className="text-sm text-slate-200">
                              {walletStatus.state || "N/A"}
                            </p>
                          </div>
                        </div>

                        {/* Permissions */}
                        <div className="rounded-lg bg-white/5 p-4">
                          <div className="mb-2 flex items-center">
                            <svg
                              className="mr-2 h-4 w-4 text-green-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                              />
                            </svg>
                            <span className="text-sm font-medium text-slate-300">
                              Permissions
                            </span>
                          </div>
                          <p className="text-sm text-slate-200">
                            {formatPermissions(walletStatus.permissions)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <svg
                      className="mx-auto mb-4 h-12 w-12 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-slate-400">No wallet connection found</p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Button
                  onClick={handleConnect}
                  disabled={loading || walletStatus?.connected}
                  className={`flex-1 transform rounded-xl px-6 py-3 font-semibold shadow-lg transition-all duration-200 hover:scale-105 ${
                    walletStatus?.connected
                      ? "cursor-not-allowed bg-slate-600/50 text-slate-400"
                      : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                    {walletStatus?.connected
                      ? "Already Connected"
                      : "Connect Wallet"}
                  </span>
                </Button>

                <Button
                  onClick={handleDisconnect}
                  disabled={loading || !walletStatus?.connected}
                  className={`flex-1 transform rounded-xl px-6 py-3 font-semibold shadow-lg transition-all duration-200 hover:scale-105 ${
                    !walletStatus?.connected
                      ? "cursor-not-allowed bg-slate-600/50 text-slate-400"
                      : "bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-700 hover:to-pink-700"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Disconnect
                  </span>
                </Button>

                <Button
                  onClick={() => checkWalletStatus(username)}
                  disabled={loading}
                  className="flex-1 transform rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-emerald-700 hover:to-teal-700 disabled:transform-none disabled:cursor-not-allowed disabled:bg-slate-600/50 disabled:text-slate-400"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Refresh
                  </span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
