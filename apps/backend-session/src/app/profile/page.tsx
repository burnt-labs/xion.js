"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@burnt-labs/ui";
import "@burnt-labs/ui/dist/index.css";

import WalletComponent from "@/components/WalletComponent";
import { WalletStatus } from "@/types/frontend";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [walletStatus, setWalletStatus] = useState<WalletStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Check wallet status when component mounts
  useEffect(() => {
    if (session) {
      checkWalletStatus();
    }
  }, [session]);

  const checkWalletStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/wallet/status");
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
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/wallet/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/wallet/disconnect", {
        method: "DELETE",
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

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/signin" });
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

  const renderDetailedPermissions = (
    permissions?: WalletStatus["permissions"],
  ) => {
    if (!permissions) {
      return (
        <div className="text-sm text-white/40">No permissions granted</div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Contracts */}
          {permissions.contracts && permissions.contracts.length > 0 && (
            <div className="rounded-lg bg-[#0a0a0a] p-4">
              <div className="mb-3 flex items-center">
                <svg
                  className="mr-2 h-4 w-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              <span className="text-sm font-medium text-white">
                Contract Permissions ({permissions.contracts.length})
              </span>
            </div>
            <div className="space-y-2">
              {permissions.contracts.map((contract, index) => {
                const isStringContract = typeof contract === "string";
                return (
                  <div key={index} className="rounded bg-[#000000] p-3">
                    {isStringContract ? (
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm text-white">
                          {contract}
                        </span>
                        <span className="text-xs text-white/40">
                          Full Access
                        </span>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-mono text-sm text-white">
                            {(contract as { address: string }).address}
                          </span>
                          <span className="text-xs text-white/40">
                            Limited Access
                          </span>
                        </div>
                        {(
                          contract as {
                            address: string;
                            amounts?: Array<{ denom: string; amount: string }>;
                          }
                        ).amounts &&
                          (
                            contract as {
                              address: string;
                              amounts?: Array<{
                                denom: string;
                                amount: string;
                              }>;
                            }
                          ).amounts!.length > 0 && (
                            <div className="ml-4 space-y-1">
                              <div className="text-xs text-white/40">
                                Spending Limits:
                              </div>
                              {(
                                contract as {
                                  address: string;
                                  amounts: Array<{
                                    denom: string;
                                    amount: string;
                                  }>;
                                }
                              ).amounts.map((amount, amountIndex) => (
                                <div
                                  key={amountIndex}
                                  className="text-xs text-white"
                                >
                                  {amount.amount} {amount.denom}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bank Permissions */}
        {permissions.bank && permissions.bank.length > 0 && (
          <div className="rounded-lg bg-[#0a0a0a] p-4">
            <div className="mb-3 flex items-center">
              <svg
                className="mr-2 h-4 w-4 text-white"
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
              <span className="text-sm font-medium text-white">
                Bank Spending Limits ({permissions.bank.length})
              </span>
            </div>
            <div className="space-y-2">
              {permissions.bank.map((limit, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded bg-[#000000] p-3"
                >
                  <span className="font-mono text-sm text-white">
                    {limit.amount} {limit.denom}
                  </span>
                  <span className="text-xs text-white/40">
                    Per Transaction
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Staking Permission */}
        {permissions.stake && (
          <div className="rounded-lg bg-[#0a0a0a] p-4">
            <div className="flex items-center">
              <svg
                className="mr-2 h-4 w-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              <span className="text-sm font-medium text-white">
                Staking Permission
              </span>
              <span className="ml-2 rounded-full bg-white px-2 py-1 text-xs text-black">
                Enabled
              </span>
            </div>
            <p className="mt-2 text-xs text-white/40">
              Can stake and unstake tokens on your behalf
            </p>
          </div>
        )}

        {/* Treasury Permission */}
        {permissions.treasury && (
          <div className="rounded-lg bg-[#0a0a0a] p-4">
            <div className="mb-2 flex items-center">
              <svg
                className="mr-2 h-4 w-4 text-white"
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
              <span className="text-sm font-medium text-white">
                Treasury Access
              </span>
            </div>
            <div className="rounded bg-[#000000] p-3">
              <span className="font-mono text-sm text-white">
                {permissions.treasury}
              </span>
            </div>
            <p className="mt-2 text-xs text-white/40">
              Can interact with treasury contract
            </p>
          </div>
        )}

        {/* Permission Expiry */}
        {permissions.expiry && (
          <div className="rounded-lg bg-[#0a0a0a] p-4">
            <div className="flex items-center">
              <svg
                className="mr-2 h-4 w-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
              <span className="text-sm font-medium text-white">
                Permission Expiry
              </span>
            </div>
            <p className="mt-2 text-sm text-white">
              {formatTimestamp(permissions.expiry)}
            </p>
          </div>
        )}

        {/* No permissions message */}
        {!permissions.contracts?.length &&
          !permissions.bank?.length &&
          !permissions.stake &&
          !permissions.treasury && (
            <div className="text-center text-sm text-white/40">
              No specific permissions granted
            </div>
          )}
      </div>
    );
  };

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <span className="text-white">Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-20" />

      <div className="relative mx-auto max-w-6xl px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-white p-3">
            <svg
              className="h-8 w-8 text-black"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <h1 className="mb-4 text-5xl font-bold text-white">
            XION Backend Session
          </h1>
          <p className="text-xl text-white">
            Secure wallet management for the future of blockchain
          </p>
        </div>

        <div className="rounded-2xl border border-[#333333] bg-[#111111] p-8">
          <div className="space-y-8">
            {/* User header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
                  <span className="text-lg font-bold text-black">
                    {session.user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Welcome back, {session.user.username}
                  </h2>
                  <p className="text-white">
                    Manage your XION wallet connection
                  </p>
                  {session.user.email ? (
                    <p className="text-sm text-white">
                      {session.user.email}
                    </p>
                  ) : null}
                </div>
              </div>
              <Button
                className="border border-[#333333] bg-white text-black transition-all duration-200 hover:bg-white"
                onClick={handleLogout}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
                Logout
              </Button>
            </div>

            {/* Error message */}
            {error ? (
              <div className="rounded-xl border border-[#333333] bg-[#111111] p-4">
                <div className="flex items-center">
                  <svg
                    className="mr-3 h-5 w-5 text-white"
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
                  <p className="text-white">{error}</p>
                </div>
              </div>
            ) : null}

            {/* Wallet status card */}
            <div className="rounded-xl border border-[#333333] bg-[#111111] p-6">
              <div className="mb-6 flex items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                  <svg
                    className="h-6 w-6 text-black"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
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
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span className="text-white">
                      Loading wallet status...
                    </span>
                  </div>
                </div>
              ) : walletStatus ? (
                <div className="space-y-4">
                  {/* Status badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-white">Connection Status</span>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                        walletStatus.connected
                          ? "border border-[#333333] bg-white text-black"
                          : "border border-[#333333] bg-[#111111] text-white"
                      }`}
                    >
                      <div
                        className={`mr-2 h-2 w-2 rounded-full ${
                          walletStatus.connected ? "bg-black" : "bg-white"
                        }`}
                      />
                      {walletStatus.connected ? "Connected" : "Disconnected"}
                    </span>
                  </div>

                  {walletStatus.connected ? (
                    <div className="space-y-4">
                      {/* Meta Account */}
                      <div className="rounded-lg bg-[#0a0a0a] p-4">
                        <div className="mb-2 flex items-center">
                          <svg
                            className="mr-2 h-4 w-4 text-white"
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
                          <span className="text-sm font-medium text-white">
                            Connected Meta Account
                          </span>
                        </div>
                        <p className="break-all font-mono text-sm text-white">
                          {walletStatus.metaAccountAddress}
                        </p>
                      </div>

                      {/* Session Key */}
                      <div className="rounded-lg bg-[#0a0a0a] p-4">
                        <div className="mb-2 flex items-center">
                          <svg
                            className="mr-2 h-4 w-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                            />
                          </svg>
                          <span className="text-sm font-medium text-white">
                            Session Account (Stored in server)
                          </span>
                        </div>
                        <p className="break-all font-mono text-sm text-white">
                          {walletStatus.sessionKeyAddress}
                        </p>
                      </div>

                      {/* Additional info grid */}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-lg bg-[#0a0a0a] p-4">
                          <div className="mb-2 flex items-center">
                            <svg
                              className="mr-2 h-4 w-4 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                              />
                            </svg>
                            <span className="text-sm font-medium text-white">
                              Expires
                            </span>
                          </div>
                          <p className="text-sm text-white">
                            {formatTimestamp(walletStatus.expiresAt)}
                          </p>
                        </div>

                        <div className="rounded-lg bg-[#0a0a0a] p-4">
                          <div className="mb-2 flex items-center">
                            <svg
                              className="mr-2 h-4 w-4 text-white"
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
                            <span className="text-sm font-medium text-white">
                              State
                            </span>
                          </div>
                          <p className="text-sm text-white">
                            {walletStatus.state || "N/A"}
                          </p>
                        </div>
                      </div>

                      {/* Detailed Permissions */}
                      <div className="rounded-lg bg-[#0a0a0a] p-4">
                        <div className="mb-4 flex items-center">
                          <svg
                            className="mr-2 h-4 w-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                            />
                          </svg>
                          <span className="text-sm font-medium text-white">
                            Detailed Permissions
                          </span>
                        </div>
                        {renderDetailedPermissions(walletStatus.permissions)}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <svg
                    className="mx-auto mb-4 h-12 w-12 text-white"
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
                  <p className="text-white">No wallet connection found</p>
                </div>
              )}
            </div>

            {/* Wallet Component - only show if wallet is connected */}
            {walletStatus?.connected && walletStatus.metaAccountAddress && (
              <WalletComponent
                account={walletStatus}
                onRefresh={checkWalletStatus}
              />
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Button
                className={`flex-1 transform rounded-xl px-6 py-3 font-semibold shadow-lg transition-all duration-200 hover:scale-105 ${
                  walletStatus?.connected
                    ? "cursor-not-allowed bg-[#333333] text-white/40"
                    : "bg-white text-black hover:bg-white"
                }`}
                disabled={loading || walletStatus?.connected}
                onClick={handleConnect}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                  {walletStatus?.connected
                    ? "Already Connected"
                    : "Connect Wallet"}
                </span>
              </Button>

              <Button
                className={`flex-1 transform rounded-xl px-6 py-3 font-semibold shadow-lg transition-all duration-200 hover:scale-105 ${
                  !walletStatus?.connected
                    ? "cursor-not-allowed bg-[#333333] text-white/40"
                    : "border border-[#333333] bg-[#111111] text-white hover:bg-[#1a1a1a]"
                }`}
                disabled={loading || !walletStatus?.connected}
                onClick={handleDisconnect}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                  Disconnect
                </span>
              </Button>

              <Button
                className="flex-1 rounded-xl bg-white px-6 py-3 font-semibold text-black hover:bg-white disabled:cursor-not-allowed disabled:bg-[#333333] disabled:text-white/40"
                disabled={loading}
                onClick={() => checkWalletStatus()}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-5 w-5"
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
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
