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
      <div className="min-h-screen bg-black">
        <div className="absolute inset-0 opacity-20" />

        <div className="relative flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-[#333333] bg-[#111111] p-8 text-center">
              <div className="mb-4 inline-flex items-center justify-center rounded-full bg-white p-3">
                <svg
                  className="h-8 w-8 text-black"
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
              <h1 className="mb-2 text-3xl font-bold text-white">
                Account Created!
              </h1>
              <p className="mb-4 text-white">
                Your account has been successfully created. Redirecting to sign
                in...
              </p>
              <div className="flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>
            <h1 className="mb-2 text-3xl font-bold text-white">
              Create Account
            </h1>
            <p className="text-white">Join the XION ecosystem</p>
          </div>

          {/* Sign Up Form */}
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
                    className="w-full rounded-xl border border-[#333333] bg-[#111111] py-4 pl-14 pr-4 text-lg font-medium text-white placeholder-white/40 transition-all duration-300 focus:border-white focus:bg-[#1a1a1a] focus:ring-2 focus:ring-white/20"
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
                <p className="text-xs text-white/40">
                  At least 3 characters long
                </p>
              </div>

              {/* Email field */}
              <div className="space-y-2">
                <label
                  className="block text-sm font-semibold text-white"
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
                    className="w-full rounded-xl border border-[#333333] bg-[#111111] py-4 pl-14 pr-4 text-lg font-medium text-white placeholder-white/40 transition-all duration-300 focus:border-white focus:bg-[#1a1a1a] focus:ring-2 focus:ring-white/20"
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
                  className="block text-sm font-semibold text-white"
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
                    className="w-full rounded-xl border border-[#333333] bg-[#111111] py-4 pl-14 pr-4 text-lg font-medium text-white placeholder-white/40 transition-all duration-300 focus:border-white focus:bg-[#1a1a1a] focus:ring-2 focus:ring-white/20"
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
                <p className="text-xs text-white/40">
                  At least 6 characters long
                </p>
              </div>

              {/* Confirm Password field */}
              <div className="space-y-2">
                <label
                  className="block text-sm font-semibold text-white"
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
                    className="w-full rounded-xl border border-[#333333] bg-[#111111] py-4 pl-14 pr-4 text-lg font-medium text-white placeholder-white/40 transition-all duration-300 focus:border-white focus:bg-[#1a1a1a] focus:ring-2 focus:ring-white/20"
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
                className="w-full rounded-xl bg-white px-6 py-3 font-semibold text-black hover:bg-white disabled:cursor-not-allowed disabled:bg-[#333333] disabled:text-white"
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
              <p className="text-white">
                Already have an account?{" "}
                <Link
                  className="font-semibold text-white transition-colors hover:text-white"
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
