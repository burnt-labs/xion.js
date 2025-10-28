"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@burnt-labs/ui";
import Link from "next/link";
import "@burnt-labs/ui/dist/index.css";

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  // Redirect if authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/profile");
    }
  }, [status, router]);

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
            <div className="text-center">
              <h2 className="mb-4 text-3xl font-bold text-white">
                Welcome to XION
              </h2>
              <p className="mb-8 text-lg text-white">
                Get started with secure wallet management and session keys
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-[#333333] bg-[#111111] p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white">
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
                <h3 className="mb-2 text-xl font-semibold text-white">
                  Secure Authentication
                </h3>
                <p className="text-white">
                  Create an account with username and password for secure access
                </p>
              </div>

              <div className="rounded-xl border border-[#333333] bg-[#111111] p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white">
                  <svg
                    className="h-6 w-6 text-black"
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
                </div>
                <h3 className="mb-2 text-xl font-semibold text-white">
                  Session Keys
                </h3>
                <p className="text-white">
                  Manage secure session keys for wallet operations
                </p>
              </div>

              <div className="rounded-xl border border-[#333333] bg-[#111111] p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white">
                  <svg
                    className="h-6 w-6 text-black"
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
                </div>
                <h3 className="mb-2 text-xl font-semibold text-white">
                  Permissions
                </h3>
                <p className="text-white">
                  Control access to contracts, staking, and treasury operations
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/auth/signup">
                <Button className="w-full rounded-xl bg-white px-8 py-4 text-lg font-semibold text-black hover:bg-white sm:w-auto">
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                    Create Account
                  </span>
                </Button>
              </Link>

              <Link href="/auth/signin">
                <Button className="w-full rounded-xl border border-[#333333] bg-[#111111] px-8 py-4 text-lg font-semibold text-white hover:bg-[#1a1a1a] sm:w-auto">
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                    Sign In
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
