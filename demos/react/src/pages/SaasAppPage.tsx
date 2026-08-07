import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AbstraxionProvider,
  useAbstraxionAccount,
  useAbstraxionSigningClient,
  type SigningClient,
} from "@burnt-labs/abstraxion-react";
import { Button } from "@/components/Button";
import { baseConfig } from "@/config";

/**
 * "Orbit" — a fake SaaS app demonstrating the product integration flow:
 *
 * 1. User signs in to the app itself (fake login, localStorage session).
 * 2. Settings → "Connect with XION Pay": Stripe-Connect-style button that is
 *    really Abstraxion's client-side `login()` — it provisions the user's
 *    smart account.
 * 3. Overview has normal fake product actions plus one real on-chain action
 *    ("Send payout") that requires — and hints towards — the XION Pay
 *    connection in Settings.
 * 4. On every app open both sessions rehydrate: the app login (time
 *    remaining) and the XION connection (authz grant expiry from chain).
 * 5. The connected address is linked to the app user like an OAuth
 *    `account_id` and verified on every restore — see the doc comment on
 *    `useXionPayConnection` for how to read the connection state and do the
 *    user↔account linking/wrong-account check in a real backend.
 *
 * Same testnet + treasury config as the other demos. `authAppUrl` is omitted
 * so the SDK resolves the deployed dashboard for the chain
 * (https://auth.testnet.burnt.com on xion-testnet-2) — no local dashboard
 * needed.
 */
const config = {
  ...baseConfig,
  authentication: { type: "auto" as const },
};

const SESSION_STORAGE_KEY = "saas-demo.session";
const CONNECTED_AT_STORAGE_KEY = "saas-demo.xion-connected-at";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // fake login lasts 7 days

interface OrbitSession {
  email: string;
  loggedInAt: string;
  expiresAt: string;
}

function readSession(): OrbitSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as OrbitSession;
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "expired";
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${Math.max(minutes, 1)}m`;
}

/** Re-render on an interval so "expires in…" countdowns stay fresh. */
function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * The real Abstraxion connection, presented as an OAuth-style
 * payment-provider integration.
 *
 * ── 1. Reading the client-side connection state ──────────────────────────
 * `useAbstraxionAccount()` is the single source of truth, and maps onto
 * server-side OAuth2 concepts like this:
 *
 *   isInitializing          → the SDK is restoring a persisted session from
 *                             storage on page load ("do we still have a
 *                             token?"). Show a neutral/loading state.
 *   isConnected +
 *   data.bech32Address      → the user's smart account is connected. The
 *                             address is the stable account identifier —
 *                             the equivalent of the `account_id` an OAuth
 *                             callback would hand your backend.
 *   login() / logout()      → start/end the connection. `login()` opens the
 *                             auth dashboard like an OAuth consent screen;
 *                             the "token" (session key + authz grants) ends
 *                             up client-side instead of on your server.
 *
 * ── 2. Linking the address to YOUR user ──────────────────────────────────
 * Because the connection lives in the browser, your backend never sees a
 * callback. Instead, the first time a logged-in user connects, send the
 * address to your backend and store it on the user record (exactly like
 * storing a `stripe_account_id`). On every later visit, compare the
 * client-side connected address against the one on file — if they differ,
 * the browser holds a session for a *different* XION account (shared
 * machine, second account) and you should warn and refuse to act on it.
 * In this demo the "backend user record" is localStorage keyed by the
 * fake user's email; the comparison logic is what you'd ship for real.
 */
function useXionPayConnection(userEmail: string) {
  const {
    data: account,
    login,
    logout,
    isConnected,
    isInitializing,
    isLoading,
  } = useAbstraxionAccount();

  const [error, setError] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<string | null>(() =>
    localStorage.getItem(CONNECTED_AT_STORAGE_KEY),
  );
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  // "Backend user record": which XION account is linked to this app user.
  // Real apps: POST the address to your API and persist it on the user row.
  const linkedAccountKey = `saas-demo.linked-account.${userEmail}`;
  const [linkedAddress, setLinkedAddress] = useState<string | null>(() =>
    localStorage.getItem(linkedAccountKey),
  );

  // Stamp the first time the connection appears; survives reloads.
  //
  // Clearing it is just as important: the session can end without disconnect()
  // ever running — revoked from the XION dashboard, expired grant, cleared
  // browser state — and a stale stamp would make the next connection report a
  // "connected for …" duration measured from the *previous* session. Wait for
  // isInitializing to settle first, otherwise the restore pass (isConnected is
  // briefly false on load) would wipe the stamp we're trying to persist.
  useEffect(() => {
    if (isInitializing) return;

    const connected = isConnected && Boolean(account.bech32Address);

    if (connected && !connectedAt) {
      const stamp = new Date().toISOString();
      localStorage.setItem(CONNECTED_AT_STORAGE_KEY, stamp);
      setConnectedAt(stamp);
    } else if (!connected && connectedAt) {
      localStorage.removeItem(CONNECTED_AT_STORAGE_KEY);
      setConnectedAt(null);
    }
  }, [isInitializing, isConnected, account.bech32Address, connectedAt]);

  // First connect for this user → link the address to their user record.
  useEffect(() => {
    if (isConnected && account.bech32Address && !linkedAddress) {
      localStorage.setItem(linkedAccountKey, account.bech32Address);
      setLinkedAddress(account.bech32Address);
    }
  }, [isConnected, account.bech32Address, linkedAddress, linkedAccountKey]);

  // The wrong-account check: the browser's connected account is not the one
  // linked to the logged-in app user. Surface a warning and block actions.
  const isWrongAccount = Boolean(
    isConnected &&
    account.bech32Address &&
    linkedAddress &&
    linkedAddress !== account.bech32Address,
  );

  // Explicit user choice to make the currently connected account the linked
  // one (e.g. they intentionally switched XION accounts).
  const relink = useCallback(() => {
    if (!account.bech32Address) return;
    localStorage.setItem(linkedAccountKey, account.bech32Address);
    setLinkedAddress(account.bech32Address);
  }, [account.bech32Address, linkedAccountKey]);

  // Latest authz grant expiration issued by the smart account.
  useEffect(() => {
    if (!isConnected || !account.bech32Address || !baseConfig.restUrl) {
      setExpiresAt(null);
      return;
    }
    const abort = new AbortController();
    fetch(
      `${baseConfig.restUrl}/cosmos/authz/v1beta1/grants/granter/${account.bech32Address}?pagination.limit=100`,
      { signal: abort.signal },
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { grants?: Array<{ expiration?: string }> } | null) => {
        const times = (data?.grants ?? [])
          .map((g) => (g.expiration ? new Date(g.expiration).getTime() : 0))
          .filter((t) => t > Date.now());
        setExpiresAt(
          times.length ? new Date(Math.max(...times)).toISOString() : null,
        );
      })
      .catch(() => {
        // Non-fatal: the panel just omits the expiry row.
      });
    return () => abort.abort();
  }, [isConnected, account.bech32Address]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      await login();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [login]);

  const disconnect = useCallback(async () => {
    await logout();
    localStorage.removeItem(CONNECTED_AT_STORAGE_KEY);
    setConnectedAt(null);
    setExpiresAt(null);
  }, [logout]);

  return {
    isConnected: isConnected && Boolean(account.bech32Address),
    isBusy: isLoading && !isInitializing,
    isRestoring: isInitializing,
    address: account.bech32Address,
    linkedAddress,
    isWrongAccount,
    relink,
    connectedAt,
    expiresAt,
    connect,
    disconnect,
    error,
  };
}

type XionPayConnection = ReturnType<typeof useXionPayConnection>;

export function SaasAppPage(): JSX.Element {
  return (
    <AbstraxionProvider config={config}>
      <SaasApp />
    </AbstraxionProvider>
  );
}

function SaasApp(): JSX.Element {
  const [session, setSession] = useState<OrbitSession | null>(() =>
    readSession(),
  );

  const handleLogin = useCallback((email: string) => {
    const now = Date.now();
    const next: OrbitSession = {
      email,
      loggedInAt: new Date(now).toISOString(),
      expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
    setSession(next);
  }, []);

  const handleSignOut = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
  }, []);

  return (
    <div className="m-auto flex w-full max-w-lg flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold tracking-tighter">
          SaaS Integration
        </h1>
        <p className="text-sm text-gray-400">
          A fake product (&quot;Orbit&quot;) with its own login. The{" "}
          <strong>Connect with XION Pay</strong> button in Settings runs the
          real Abstraxion <code>login()</code>; both sessions persist across
          reloads.
        </p>
      </div>

      {session ? (
        <OrbitApp session={session} onSignOut={handleSignOut} />
      ) : (
        <LoginCard onLogin={handleLogin} />
      )}

      <Link to="/" className="text-sm text-gray-400 underline">
        ← Back to home
      </Link>
    </div>
  );
}

function LoginCard({
  onLogin,
}: {
  onLogin: (email: string) => void;
}): JSX.Element {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const canSubmit = /\S+@\S+\.\S+/.test(email);

  // Small fake delay so it feels like a real IdP round-trip.
  const fakeAuthenticate = (resolvedEmail: string) => {
    setPending(true);
    setTimeout(() => onLogin(resolvedEmail), 800);
  };

  return (
    <div className="w-full space-y-3 rounded-lg border border-white/10 bg-gray-900/50 p-4 backdrop-blur-sm">
      <h3 className="font-semibold">Sign in to Orbit</h3>
      <p className="text-sm text-gray-400">
        Fake login — stands in for your app&apos;s own auth (WorkOS, Auth0, …)
        and just writes a 7-day session to localStorage.
      </p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) fakeAuthenticate(email.trim());
        }}
      >
        <label className="block space-y-1" htmlFor="orbit-email">
          <span className="text-sm text-gray-400">Work email</span>
          <input
            autoComplete="email"
            className="w-full rounded border border-white/20 bg-gray-800/50 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
            id="orbit-email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            type="email"
            value={email}
          />
        </label>
        <Button fullWidth type="submit" disabled={!canSubmit || pending}>
          {pending ? "SIGNING IN…" : "CONTINUE"}
        </Button>
      </form>
      <Button
        fullWidth
        structure="outlined"
        disabled={pending}
        onClick={() => fakeAuthenticate("alex@orbit.inc")}
      >
        CONTINUE WITH GOOGLE
      </Button>
    </div>
  );
}

type Tab = "dashboard" | "settings";

function OrbitApp({
  session,
  onSignOut,
}: {
  session: OrbitSession;
  onSignOut: () => void;
}): JSX.Element {
  const [tab, setTab] = useState<Tab>("dashboard");
  const connection = useXionPayConnection(session.email);
  const { client } = useAbstraxionSigningClient();
  const now = useNow();

  return (
    <div className="w-full overflow-hidden rounded-lg border border-white/10 bg-gray-900/50 backdrop-blur-sm">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-sm font-bold tracking-tighter">◍ ORBIT</span>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-white">{session.email}</p>
            <p className="text-[11px] text-gray-500">
              session expires in{" "}
              {formatDuration(new Date(session.expiresAt).getTime() - now)}
            </p>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-gray-800/50 text-xs font-bold text-cyan-400">
            {session.email.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <nav className="flex border-b border-white/10 px-2">
        {(["dashboard", "settings"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
              tab === t
                ? "border-cyan-400 text-white"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="space-y-4 p-4">
        {tab === "dashboard" ? (
          <DashboardTab
            session={session}
            connection={connection}
            client={client}
            onGoToSettings={() => setTab("settings")}
          />
        ) : (
          <SettingsTab
            session={session}
            connection={connection}
            onSignOut={onSignOut}
          />
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Dashboard — stats, everyday fake actions, one real on-chain action, and
 * an activity feed the actions write into
 * ---------------------------------------------------------------------- */

type PayoutState =
  | { status: "idle" | "hint" | "sending" }
  | { status: "error"; message: string };

interface ActivityEntry {
  label: string;
  detail?: string;
  time: string;
}

const SEED_ACTIVITY: ActivityEntry[] = [
  { label: "Invoice #1041 paid", detail: "$1,250.00", time: "2h ago" },
  { label: "New customer", detail: "novalabs.io", time: "yesterday" },
  { label: "Invoice #1040 sent", detail: "$740.00", time: "2d ago" },
];

function DashboardTab({
  session,
  connection,
  client,
  onGoToSettings,
}: {
  session: OrbitSession;
  connection: XionPayConnection;
  client: SigningClient | undefined;
  onGoToSettings: () => void;
}): JSX.Element {
  const [activity, setActivity] = useState<ActivityEntry[]>(SEED_ACTIVITY);
  const [invoiceNo, setInvoiceNo] = useState(1042);
  const [payout, setPayout] = useState<PayoutState>({ status: "idle" });

  const logActivity = (label: string, detail?: string) => {
    setActivity((entries) => [{ label, detail, time: "just now" }, ...entries]);
  };

  const handlePayout = async () => {
    // The on-chain action needs a XION Pay connection that belongs to THIS
    // app user — nudge to Settings when missing or mismatched.
    if (!connection.isConnected || !client || connection.isWrongAccount) {
      setPayout({ status: "hint" });
      return;
    }
    try {
      setPayout({ status: "sending" });
      // Tiny self-send just to prove a real transaction goes through.
      const result = await client.sendTokens(
        connection.address,
        connection.address,
        [{ denom: "uxion", amount: "1" }],
        "auto",
        "Orbit demo payout",
      );
      logActivity(
        "Payout sent on-chain ⛓",
        result ? `tx ${result.transactionHash.slice(0, 12)}…` : undefined,
      );
      setPayout({ status: "idle" });
    } catch (err) {
      setPayout({
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = session.email.split("@")[0];

  return (
    <>
      <div>
        <h3 className="font-semibold capitalize">
          {greeting}, {name}
        </h3>
        <p className="text-xs text-gray-400">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}{" "}
          · Orbit Demo Co.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Balance" value="$8,420.50" />
        <StatTile label="This month" value="$12,480" sub="+8.2%" />
        <StatTile label="Invoices due" value="7" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          structure="outlined"
          onClick={() => {
            setInvoiceNo((n) => n + 1);
            logActivity(`Invoice #${invoiceNo + 1} created`, "draft (fake)");
          }}
        >
          + New invoice
        </Button>
        <Button
          structure="outlined"
          onClick={() => logActivity("Report exported", "CSV (fake)")}
        >
          Export report
        </Button>
        <Button
          structure="outlined"
          onClick={() =>
            logActivity("Payment reminders queued", "3 emails (fake)")
          }
        >
          Send reminders
        </Button>
        <Button onClick={handlePayout} disabled={payout.status === "sending"}>
          {payout.status === "sending" ? "SENDING…" : "SEND PAYOUT ⛓"}
        </Button>
      </div>

      {payout.status === "hint" && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
          <p className="text-xs text-yellow-400">
            {connection.isWrongAccount
              ? "⚠ The connected XION Pay account doesn't belong to this user."
              : "⚠ Payouts are sent on-chain and need a connected XION Pay account."}
          </p>
          <Button structure="outlined" onClick={onGoToSettings}>
            Settings →
          </Button>
        </div>
      )}

      {payout.status === "error" && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
          <p className="text-xs text-red-400">✗ {payout.message}</p>
          <p className="mt-1 text-xs text-gray-400">
            An empty account can&apos;t pay for a send —{" "}
            <a
              href="https://faucet.xion.burnt.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              grab testnet XION from the faucet
            </a>{" "}
            and try again.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="mb-2 text-sm font-semibold">Recent activity</h3>
        <ul className="divide-y divide-white/5">
          {activity.slice(0, 6).map((entry, i) => (
            <li
              key={`${entry.label}-${i}`}
              className="flex items-center justify-between gap-3 py-2 text-xs"
            >
              <span className="text-white">{entry.label}</span>
              <span className="flex shrink-0 items-center gap-3">
                {entry.detail && (
                  <span className="font-mono text-gray-400">
                    {entry.detail}
                  </span>
                )}
                <span className="w-14 text-right text-gray-500">
                  {entry.time}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="mt-0.5 font-mono text-base font-semibold text-white">
        {value}
      </p>
      {sub && <p className="text-[11px] text-green-400">{sub}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Settings — a normal-looking settings page; XION Pay is just one section
 * ---------------------------------------------------------------------- */

function SettingsTab({
  session,
  connection,
  onSignOut,
}: {
  session: OrbitSession;
  connection: XionPayConnection;
  onSignOut: () => void;
}): JSX.Element {
  const [emailReceipts, setEmailReceipts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  return (
    <>
      <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="font-semibold">Profile</h3>
        <div className="space-y-1 text-xs text-gray-400">
          <p>
            Email: <span className="text-white">{session.email}</span>
          </p>
          <p>
            Workspace: <span className="text-white">Orbit Demo Co.</span>
          </p>
          <p>
            Plan: <span className="text-white">Pro (trial)</span>
          </p>
          <p>
            Member since:{" "}
            <span className="text-white">
              {new Date(session.loggedInAt).toLocaleDateString()}
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="font-semibold">Notifications</h3>
        <label className="flex items-center justify-between text-xs text-gray-400">
          Email me payment receipts
          <input
            type="checkbox"
            checked={emailReceipts}
            onChange={(e) => setEmailReceipts(e.target.checked)}
            className="h-4 w-4 accent-cyan-400"
          />
        </label>
        <label className="flex items-center justify-between text-xs text-gray-400">
          Weekly revenue digest
          <input
            type="checkbox"
            checked={weeklyDigest}
            onChange={(e) => setWeeklyDigest(e.target.checked)}
            className="h-4 w-4 accent-cyan-400"
          />
        </label>
      </div>

      <XionPaySection connection={connection} />

      <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 p-3">
        <p className="text-xs text-gray-400">
          Sign out of Orbit. The XION Pay connection is kept and restored on
          your next login.
        </p>
        <Button structure="outlined" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </>
  );
}

function XionPaySection({
  connection,
}: {
  connection: XionPayConnection;
}): JSX.Element {
  const now = useNow();

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Payments · XION Pay</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            connection.isConnected
              ? "bg-green-500/10 text-green-400"
              : "bg-white/10 text-gray-400"
          }`}
        >
          {connection.isConnected ? "Connected" : "Not connected"}
        </span>
      </div>
      <p className="text-xs text-gray-400">
        Send and receive payouts through your XION smart account. Connecting
        creates the account if you don&apos;t have one — no wallet or seed
        phrase required.
      </p>

      {connection.isConnected ? (
        <>
          <div className="space-y-1 rounded border border-white/10 bg-gray-800/50 p-3 font-mono text-xs">
            <p className="break-all text-white">{connection.address}</p>
            {connection.connectedAt && (
              <p className="text-gray-400">
                connected for{" "}
                {formatDuration(
                  now - new Date(connection.connectedAt).getTime(),
                )}
              </p>
            )}
            <p className="text-gray-400">
              authorization expires in{" "}
              {connection.expiresAt
                ? formatDuration(new Date(connection.expiresAt).getTime() - now)
                : "…"}
            </p>
            {!connection.isWrongAccount && (
              <p className="text-green-400">
                ✓ matches the account linked to this user
              </p>
            )}
          </div>

          {connection.isWrongAccount && (
            <div className="space-y-2 rounded border border-red-500/20 bg-red-500/10 p-3">
              <p className="text-xs font-medium text-red-400">
                ⚠ Wrong account connected
              </p>
              <p className="text-xs text-gray-400">
                This user is linked to{" "}
                <span className="break-all font-mono text-white">
                  {connection.linkedAddress}
                </span>{" "}
                but the browser is connected to a different XION account.
                Disconnect and sign in with the right one, or link the connected
                account to this user instead.
              </p>
              <Button structure="outlined" onClick={connection.relink}>
                Link this account instead
              </Button>
            </div>
          )}

          <Button
            structure="outlined"
            onClick={() => void connection.disconnect()}
          >
            Disconnect
          </Button>
        </>
      ) : (
        <Button
          fullWidth
          disabled={connection.isBusy || connection.isRestoring}
          onClick={() => void connection.connect()}
        >
          {connection.isBusy
            ? "WAITING FOR AUTHORIZATION…"
            : "CONNECT WITH XION PAY →"}
        </Button>
      )}

      {connection.error && (
        <div className="rounded border border-red-500/20 bg-red-500/10 p-3">
          <p className="text-xs text-red-400">✗ {connection.error}</p>
        </div>
      )}

      <p className="text-xs text-gray-500">
        The button calls Abstraxion&apos;s{" "}
        <code className="rounded bg-white/10 px-1 py-0.5">login()</code> — the
        auth dashboard opens like an OAuth consent screen and your app gets a
        session-scoped authorization for the user&apos;s smart account. The
        address is then stored against the app user (like a{" "}
        <code className="rounded bg-white/10 px-1 py-0.5">
          stripe_account_id
        </code>
        ) and checked on every visit.
      </p>
    </div>
  );
}
