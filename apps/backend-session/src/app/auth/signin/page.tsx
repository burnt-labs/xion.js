"use client";
import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@burnt-labs/ui";
import Link from "next/link";
import "@burnt-labs/ui/dist/index.css";

export default function SignInPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid username or password");
      } else if (result?.ok) {
        // Get the updated session
        const session = await getSession();
        if (session) {
          router.push("/profile");
        }
      }
    } catch (err) {
      setError("An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-20" />

      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
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
            <h1 className="mb-2 text-3xl font-bold text-white">
              Welcome Back
            </h1>
            <p className="text-white">Sign in to your XION account</p>
          </div>

          {/* Sign In Form */}
          <div className="rounded-2xl border border-[#333333] bg-[#111111] p-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
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

              {/* Username field */}
              <div className="space-y-2">
                <label
                  className="block text-sm font-semibold text-white"
                  htmlFor="username"
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
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                    </div>
                  </div>
                  <Input
                    className="w-full rounded-xl border border-[#333333] bg-[#111111] py-4 pl-14 pr-4 text-lg font-medium text-white placeholder-white/40 transition-all duration-300 focus:border-white focus:bg-[#1a1a1a] focus:ring-2 focus:ring-white/20"
                    id="username"
                    onChange={(e) => {
                      setUsername(e.target.value);
                    }}
                    placeholder="Enter your username"
                    required
                    type="text"
                    value={username}
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label
                  className="block text-sm font-semibold text-white"
                  htmlFor="password"
                >
                  Password
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
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                    </div>
                  </div>
                  <Input
                    className="w-full rounded-xl border border-[#333333] bg-[#111111] py-4 pl-14 pr-4 text-lg font-medium text-white placeholder-white/40 transition-all duration-300 focus:border-white focus:bg-[#1a1a1a] focus:ring-2 focus:ring-white/20"
                    id="password"
                    onChange={(e) => {
                      setPassword(e.target.value);
                    }}
                    placeholder="Enter your password"
                    required
                    type="password"
                    value={password}
                  />
                </div>
              </div>

              {/* Submit button */}
              <Button
                className="w-full rounded-xl bg-white px-6 py-3 font-semibold text-black hover:bg-white disabled:cursor-not-allowed disabled:bg-[#333333] disabled:text-white"
                disabled={loading}
                type="submit"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing In...
                  </span>
                ) : (
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
                )}
              </Button>
            </form>

            {/* Sign up link */}
            <div className="mt-6 text-center">
              <p className="text-white">
                Don't have an account?{" "}
                <Link
                  className="font-semibold text-white transition-colors hover:text-white"
                  href="/auth/signup"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
