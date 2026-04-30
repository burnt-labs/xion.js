import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage(): JSX.Element {
  return (
    <div className="m-auto flex w-full max-w-xs flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold tracking-tighter">ABSTRAXION</h1>
      <p className="text-center text-sm text-gray-400">
        React demo scaffold. Drop new pages into{" "}
        <code className="rounded bg-white/10 px-1 py-0.5">src/routes/</code> —
        TanStack Router will pick them up via file-based routing.
      </p>
      <div className="flex w-full flex-col gap-2 text-center text-sm text-gray-500">
        <Link
          to="/"
          className="rounded border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
