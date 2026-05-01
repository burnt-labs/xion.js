import { Link } from "react-router-dom";

interface DemoLink {
  to: "/auto" | "/embedded" | "/signer-mode";
  title: string;
  description: string;
}

const demos: DemoLink[] = [
  {
    to: "/auto",
    title: "AUTO MODE",
    description:
      "Recommended. Resolves to popup on desktop and redirect on mobile/PWA. Full state-machine debug panel, session-key + direct signing, and manage-authenticators.",
  },
  {
    to: "/embedded",
    title: "EMBEDDED MODE",
    description:
      "Dashboard runs inside an iframe. Toggle between inline (always visible) and dynamic (button + modal) presentations.",
  },
  {
    to: "/signer-mode",
    title: "SIGNER MODE",
    description:
      "BYO keypair via Turnkey or MetaMask. Abstraxion provisions a smart account on top and gives you session-key + direct signing without dashboard redirects.",
  },
];

export function HomePage(): JSX.Element {
  return (
    <div className="m-auto flex w-full max-w-md flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tighter">ABSTRAXION</h1>
        <p className="mt-2 text-sm text-gray-400">
          React reference demo for{" "}
          <code className="rounded bg-white/10 px-1 py-0.5">
            @burnt-labs/abstraxion-react
          </code>
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        {demos.map(({ to, title, description }) => (
          <Link
            key={to}
            to={to}
            className="block rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
          >
            <p className="text-sm font-bold uppercase tracking-wider">
              {title}
            </p>
            <p className="mt-1 text-xs text-gray-400">{description}</p>
          </Link>
        ))}
      </div>

      <p className="text-center text-xs text-gray-500">
        Each demo wires up{" "}
        <code className="rounded bg-white/10 px-1 py-0.5">
          AbstraxionProvider
        </code>{" "}
        with a different <code>authentication.type</code>. Inspect each
        route's source to see the config.
      </p>
    </div>
  );
}
