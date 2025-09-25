"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@burnt-labs/ui";
import Link from "next/link";
import "@burnt-labs/ui/dist/index.css";

export default function SignUpPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email: email || undefined,
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // Redirect to sign in after a short delay
        setTimeout(() => {
          router.push("/auth/signin");
        }, 2000);
      } else {
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      setError("An error occurred during registration");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20" />

        <div className="relative flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-xl">
              <div className="mb-4 inline-flex items-center justify-center rounded-full bg-green-500/20 p-3">
                <svg
                  className="h-8 w-8 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>
              <h1 className="mb-2 bg-gradient-to-r from-white to-green-200 bg-clip-text text-3xl font-bold text-transparent">
                Account Created!
              </h1>
              <p className="mb-4 text-slate-300">
                Your account has been successfully created. Redirecting to sign
                in...
              </p>
              <div className="flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20" />

      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-white/10 p-3 backdrop-blur-sm">
              <svg
                className="h-8 w-8 text-purple-300"
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
            </div>
            <h1 className="mb-2 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-3xl font-bold text-transparent">
              Create Account
            </h1>
            <p className="text-slate-300">Join the XION ecosystem</p>
          </div>

          {/* Sign Up Form */}
          <div className="rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Error message */}
              {error ? (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 backdrop-blur-sm">
                  <div className="flex items-center">
                    <svg
                      className="mr-3 h-5 w-5 text-red-400"
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
                    <p className="text-red-300">{error}</p>
                  </div>
                </div>
              ) : null}

              {/* Username field */}
              <div className="space-y-2">
                <label
                  className="block text-sm font-semibold text-slate-200"
                  htmlFor="username"
                >
                  Username *
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
                    className="w-full rounded-xl border border-white/20 bg-white/10 py-4 pl-14 pr-4 text-lg font-medium text-white placeholder-slate-400 transition-all duration-300 focus:border-purple-400 focus:bg-white/20 focus:ring-2 focus:ring-purple-400/20"
                    id="username"
                    minLength={3}
                    onChange={(e) => {
                      setUsername(e.target.value);
                    }}
                    placeholder="Choose a username"
                    required
                    type="text"
                    value={username}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  At least 3 characters long
                </p>
              </div>

              {/* Email field */}
              <div className="space-y-2">
                <label
                  className="block text-sm font-semibold text-slate-200"
                  htmlFor="email"
                >
                  Email (optional)
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
                          d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                    </div>
                  </div>
                  <Input
                    className="w-full rounded-xl border border-white/20 bg-white/10 py-4 pl-14 pr-4 text-lg font-medium text-white placeholder-slate-400 transition-all duration-300 focus:border-purple-400 focus:bg-white/20 focus:ring-2 focus:ring-purple-400/20"
                    id="email"
                    onChange={(e) => {
                      setEmail(e.target.value);
                    }}
                    placeholder="Enter your email"
                    type="email"
                    value={email}
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label
                  className="block text-sm font-semibold text-slate-200"
                  htmlFor="password"
                >
                  Password *
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
                    className="w-full rounded-xl border border-white/20 bg-white/10 py-4 pl-14 pr-4 text-lg font-medium text-white placeholder-slate-400 transition-all duration-300 focus:border-purple-400 focus:bg-white/20 focus:ring-2 focus:ring-purple-400/20"
                    id="password"
                    minLength={6}
                    onChange={(e) => {
                      setPassword(e.target.value);
                    }}
                    placeholder="Create a password"
                    required
                    type="password"
                    value={password}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  At least 6 characters long
                </p>
              </div>

              {/* Confirm Password field */}
              <div className="space-y-2">
                <label
                  className="block text-sm font-semibold text-slate-200"
                  htmlFor="confirmPassword"
                >
                  Confirm Password *
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
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                        />
                      </svg>
                    </div>
                  </div>
                  <Input
                    className="w-full rounded-xl border border-white/20 bg-white/10 py-4 pl-14 pr-4 text-lg font-medium text-white placeholder-slate-400 transition-all duration-300 focus:border-purple-400 focus:bg-white/20 focus:ring-2 focus:ring-purple-400/20"
                    id="confirmPassword"
                    minLength={6}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                    }}
                    placeholder="Confirm your password"
                    required
                    type="password"
                    value={confirmPassword}
                  />
                </div>
              </div>

              {/* Submit button */}
              <Button
                className="w-full transform rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-purple-700 hover:to-blue-700 disabled:transform-none disabled:cursor-not-allowed disabled:bg-slate-600/50 disabled:text-slate-400"
                disabled={loading}
                type="submit"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating Account...
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
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                    Create Account
                  </span>
                )}
              </Button>
            </form>

            {/* Sign in link */}
            <div className="mt-6 text-center">
              <p className="text-slate-300">
                Already have an account?{" "}
                <Link
                  className="font-semibold text-purple-300 transition-colors hover:text-purple-200"
                  href="/auth/signin"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
