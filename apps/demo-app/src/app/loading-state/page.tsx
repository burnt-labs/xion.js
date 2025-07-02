"use client";

export default function LoadingStatePage() {
  return (
    <main className="m-auto flex min-h-screen max-w-xs flex-col items-center justify-center gap-4 p-4">
      <div className="rounded border border-white/20 p-6 text-center">
        <p className="font-bold">You are being redirected...</p>
        <p className="text-sm">
          Use custom UI to render loading state with your own branding
        </p>
      </div>
    </main>
  );
}
