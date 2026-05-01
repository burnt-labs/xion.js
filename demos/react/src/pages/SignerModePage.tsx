import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AuthState,
  TurnkeyProvider,
  useTurnkey,
  type TurnkeyProviderConfig,
} from "@turnkey/react-wallet-kit";
import "@turnkey/react-wallet-kit/styles.css";
import {
  AbstraxionProvider,
  useAbstraxionAccount,
  useAbstraxionSigningClient,
  type SignerConfig,
} from "@burnt-labs/abstraxion-react";
import { Button } from "@/components/Button";
import { SendTokens } from "@/components/SendTokens";
import { useTurnkeyViem } from "@/hooks/useTurnkeyViem";
import { MetamaskAuthState, useMetamask } from "@/hooks/useMetamask";
import { baseConfig } from "@/config";

/**
 * Signer mode = the dApp brings its own keypair. Two reference signers shown
 * here — pick one at runtime:
 *
 *   - Turnkey: hosted-key wallet, signs silently. No popup per tx.
 *   - MetaMask: extension-injected wallet. Each tx (incl. requireAuth direct
 *     signing) triggers a personal_sign popup, like the original
 *     `apps/demo-app/src/app/direct-signing-demo/`.
 *
 * Both build a `SignerConfig` that's passed to AbstraxionProvider via
 * `authentication.getSignerConfig` — the rest of Abstraxion (smart-account
 * provisioning, session keys) is identical between the two.
 */

type Signer = "turnkey" | "metamask";

export function SignerModePage(): JSX.Element {
  const [signer, setSigner] = useState<Signer | null>(null);

  if (!signer) return <SignerSelector onSelect={setSigner} />;
  if (signer === "turnkey") return <TurnkeyFlow onBack={() => setSigner(null)} />;
  return <MetamaskFlow onBack={() => setSigner(null)} />;
}

// ─── Signer chooser landing ────────────────────────────────────────────────

function SignerSelector({
  onSelect,
}: {
  onSelect: (signer: Signer) => void;
}): JSX.Element {
  const turnkeyConfigured = !!import.meta.env.VITE_TURNKEY_ORG_ID;
  const contractConfigured =
    !!import.meta.env.VITE_CODE_ID && !!import.meta.env.VITE_CHECKSUM;

  return (
    <div className="m-auto flex w-full max-w-md flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold tracking-tighter">
          Signer Mode
        </h1>
        <p className="text-sm text-gray-400">
          Choose a signer. Both sign for the same Abstraxion smart account —
          the difference is who holds the keypair.
        </p>
      </div>

      {!contractConfigured && (
        <p className="w-full rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-200">
          Set <code>VITE_CODE_ID</code> and <code>VITE_CHECKSUM</code> in{" "}
          <code>.env.local</code> — they describe the smart-account contract
          Abstraxion will spawn for either signer.
        </p>
      )}

      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={() => onSelect("turnkey")}
          disabled={!turnkeyConfigured}
          className="block rounded-lg border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <p className="text-sm font-bold uppercase tracking-wider">Turnkey</p>
          <p className="mt-1 text-xs text-gray-400">
            Hosted-key wallet. Signs silently — no per-tx popup. Good for UX
            where the user shouldn&apos;t see signature dialogs.
          </p>
          {!turnkeyConfigured && (
            <p className="mt-2 text-xs text-yellow-300">
              Set <code>VITE_TURNKEY_ORG_ID</code> to enable.
            </p>
          )}
        </button>

        <button
          type="button"
          onClick={() => onSelect("metamask")}
          className="block rounded-lg border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10"
        >
          <p className="text-sm font-bold uppercase tracking-wider">MetaMask</p>
          <p className="mt-1 text-xs text-gray-400">
            Feels like a normal Ethereum wallet — every transaction prompts a
            MetaMask popup the user signs themselves — but the keypair is
            backing an Abstraxion smart account, so you still get session
            keys, fee grants, gasless flows, and authenticator management on
            top.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Good fit for native-crypto apps on XION where the audience already
            expects wallet popups and likes seeing the signer they know.
            Mirrors the old <code>direct-signing-demo</code>.
          </p>
        </button>
      </div>

      <Link to="/" className="text-sm text-gray-400 underline">
        ← Back to home
      </Link>
    </div>
  );
}

// ─── Shared Abstraxion config builder ──────────────────────────────────────

function useAbstraxionSignerConfig(getSignerConfig: () => Promise<SignerConfig>) {
  const codeId = import.meta.env.VITE_CODE_ID;
  const checksum = import.meta.env.VITE_CHECKSUM;
  if (!codeId || !checksum) {
    return null;
  }

  const indexer = (() => {
    const url = import.meta.env.VITE_INDEXER_URL;
    if (!url) return undefined;
    if (import.meta.env.VITE_INDEXER_TYPE === "subquery") {
      return {
        type: "subquery" as const,
        url,
        codeId: parseInt(codeId, 10),
      };
    }
    const authToken = import.meta.env.VITE_INDEXER_TOKEN;
    if (!authToken) return undefined;
    return { type: "numia" as const, url, authToken };
  })();

  return {
    ...baseConfig,
    feeGranter: import.meta.env.VITE_FEE_GRANTER_ADDRESS,
    authentication: {
      type: "signer" as const,
      aaApiUrl: import.meta.env.VITE_AA_API_URL ?? "",
      getSignerConfig,
      smartAccountContract: {
        codeId: parseInt(codeId, 10),
        checksum,
        addressPrefix: import.meta.env.VITE_ADDRESS_PREFIX ?? "xion",
      },
      indexer,
      treasuryIndexer: import.meta.env.VITE_TREASURY_INDEXER_URL
        ? { url: import.meta.env.VITE_TREASURY_INDEXER_URL }
        : undefined,
    },
  };
}

// ─── Turnkey flow ──────────────────────────────────────────────────────────

const turnkeyConfig: TurnkeyProviderConfig = {
  organizationId: import.meta.env.VITE_TURNKEY_ORG_ID ?? "",
  authProxyConfigId: "5119dae0-9dd2-4b94-a7df-131c945f3afc",
  auth: {
    autoRefreshSession: true,
    createSuborgParams: {
      emailOtpAuth: {
        userName: `Demo User ${new Date().toISOString()}`,
        customWallet: {
          walletName: "Abstraxion Demo Wallet",
          walletAccounts: [
            {
              curve: "CURVE_SECP256K1",
              pathFormat: "PATH_FORMAT_BIP32",
              path: "m/44'/60'/0'/0/0",
              addressFormat: "ADDRESS_FORMAT_ETHEREUM",
            },
          ],
        },
      },
      passkeyAuth: {
        userName: `Demo User ${new Date().toISOString()}`,
        customWallet: {
          walletName: "Abstraxion Demo Wallet",
          walletAccounts: [
            {
              curve: "CURVE_SECP256K1",
              pathFormat: "PATH_FORMAT_BIP32",
              path: "m/44'/60'/0'/0/0",
              addressFormat: "ADDRESS_FORMAT_ETHEREUM",
            },
          ],
        },
      },
    },
  },
};

function TurnkeyFlow({ onBack }: { onBack: () => void }): JSX.Element {
  return (
    <TurnkeyProvider config={turnkeyConfig}>
      <TurnkeyAbstraxionWrapper onBack={onBack} />
    </TurnkeyProvider>
  );
}

function TurnkeyAbstraxionWrapper({
  onBack,
}: {
  onBack: () => void;
}): JSX.Element {
  const { getSignerConfig } = useTurnkeyViem();
  const config = useAbstraxionSignerConfig(getSignerConfig);
  if (!config) return <MissingConfig onBack={onBack} />;
  return (
    <AbstraxionProvider config={config}>
      <TurnkeyContent onBack={onBack} />
    </AbstraxionProvider>
  );
}

function TurnkeyContent({ onBack }: { onBack: () => void }): JSX.Element {
  const {
    authState,
    handleLogin: turnkeyLogin,
    logout: turnkeyLogout,
    user,
    wallets,
  } = useTurnkey();
  const wallet = wallets?.[0];
  const ethAccount = wallet?.accounts.find(
    (a) => a.addressFormat === "ADDRESS_FORMAT_ETHEREUM",
  );
  const isSignerReady = authState === AuthState.Authenticated && !!wallet;

  const isSignerInitializing =
    authState !== AuthState.Authenticated &&
    authState !== AuthState.Unauthenticated;

  return (
    <SignerInnerContent
      signerKind="turnkey"
      signerLabel="Turnkey"
      signerHint="Turnkey signs silently — no per-tx popup. Direct signing is a developer choice (see the note at the bottom)."
      signerAddress={ethAccount?.address}
      signerSubtitle={user?.userEmail ?? user?.userName ?? "Anonymous"}
      isSignerReady={isSignerReady}
      isSignerInitializing={isSignerInitializing}
      onSignerLogin={turnkeyLogin}
      onSignerLogout={turnkeyLogout}
      onBack={onBack}
    />
  );
}

// ─── MetaMask flow ─────────────────────────────────────────────────────────

function MetamaskFlow({ onBack }: { onBack: () => void }): JSX.Element {
  const metamask = useMetamask();
  const config = useAbstraxionSignerConfig(metamask.getSignerConfig);
  if (!config) return <MissingConfig onBack={onBack} />;
  return (
    <AbstraxionProvider config={config}>
      <MetamaskContent metamask={metamask} onBack={onBack} />
    </AbstraxionProvider>
  );
}

function MetamaskContent({
  metamask,
  onBack,
}: {
  metamask: ReturnType<typeof useMetamask>;
  onBack: () => void;
}): JSX.Element {
  const isSignerReady = metamask.isReady;
  const isSignerInitializing =
    metamask.authState === MetamaskAuthState.Authenticating;

  return (
    <SignerInnerContent
      signerKind="metamask"
      signerLabel="MetaMask"
      signerHint="MetaMask prompts for a signature on every transaction — including direct signing (requireAuth). Session-key signing batches authority into one initial popup."
      signerAddress={metamask.ethereumAddress}
      signerError={metamask.error}
      isSignerReady={isSignerReady}
      isSignerInitializing={isSignerInitializing}
      onSignerLogin={metamask.connect}
      onSignerLogout={metamask.disconnect}
      onBack={onBack}
    />
  );
}

// ─── Shared content (renders inside <AbstraxionProvider>) ──────────────────

interface SignerInnerProps {
  signerKind: Signer;
  signerLabel: string;
  signerHint: string;
  signerAddress: string | undefined;
  signerSubtitle?: string;
  signerError?: string;
  isSignerReady: boolean;
  isSignerInitializing: boolean;
  onSignerLogin: () => void | Promise<void>;
  onSignerLogout: () => void;
  onBack: () => void;
}

function SignerInnerContent(props: SignerInnerProps): JSX.Element {
  const {
    data: account,
    login: abstraxionLogin,
    logout: abstraxionLogout,
    isConnected,
    isConnecting,
    isInitializing,
  } = useAbstraxionAccount();
  const { client } = useAbstraxionSigningClient();

  // Auto-trigger Abstraxion login when the signer is ready. Ref guard avoids
  // re-firing during transient state flips during connect.
  const hasTriggeredLogin = useRef(false);
  useEffect(() => {
    if (
      props.isSignerReady &&
      !isConnected &&
      !isConnecting &&
      !hasTriggeredLogin.current
    ) {
      hasTriggeredLogin.current = true;
      const t = setTimeout(() => {
        abstraxionLogin().catch((err) => {
          console.error(`[signer-mode/${props.signerKind}] login failed:`, err);
          hasTriggeredLogin.current = false;
        });
      }, 500);
      return () => clearTimeout(t);
    }
    if (!props.isSignerReady) hasTriggeredLogin.current = false;
  }, [props.isSignerReady, props.signerKind, isConnected, isConnecting, abstraxionLogin]);

  const handleDisconnect = useCallback(() => {
    abstraxionLogout();
    props.onSignerLogout();
    hasTriggeredLogin.current = false;
  }, [abstraxionLogout, props]);

  const isSystemInitializing = isInitializing || props.isSignerInitializing;

  return (
    <div className="m-auto flex w-full max-w-lg flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold tracking-tighter">
          Signer Mode ({props.signerLabel})
        </h1>
        <p className="text-sm text-gray-400">{props.signerHint}</p>
      </div>

      <FlowIndicator
        isInitializing={isSystemInitializing}
        isSignerAuthed={props.isSignerReady}
        isConnecting={isConnecting}
        isConnected={isConnected}
      />

      {!isConnected && !props.isSignerReady && (
        <Button
          fullWidth
          onClick={() => props.onSignerLogin()}
          disabled={isSystemInitializing}
          structure="base"
        >
          {isSystemInitializing
            ? "INITIALIZING…"
            : `CONNECT ${props.signerLabel.toUpperCase()}`}
        </Button>
      )}

      {props.signerError && (
        <p className="w-full rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
          {props.signerError}
        </p>
      )}

      {isConnected && account.bech32Address && (
        <>
          <div className="w-full space-y-2 rounded-lg border border-white/10 bg-gray-900/50 p-4 backdrop-blur-sm">
            <h3 className="font-semibold">{props.signerLabel}</h3>
            <p className="break-all text-xs text-gray-400">
              ETH address:{" "}
              <span className="font-mono">
                {props.signerAddress ?? "—"}
              </span>
            </p>
            {props.signerSubtitle && (
              <p className="text-xs text-gray-400">
                User:{" "}
                <span className="font-mono text-white">
                  {props.signerSubtitle}
                </span>
              </p>
            )}
          </div>

          <SendTokens
            accountAddress={account.bech32Address}
            client={client}
            memo={`Signer-mode demo (${props.signerKind}): send`}
          />

          <DirectSigningNote
            signerKind={props.signerKind}
            accountAddress={account.bech32Address}
          />

          <Button fullWidth onClick={handleDisconnect} structure="outlined">
            DISCONNECT
          </Button>
        </>
      )}

      <button
        type="button"
        onClick={props.onBack}
        className="text-sm text-gray-400 underline hover:text-gray-300"
      >
        ← Switch signer
      </button>
    </div>
  );
}

// ─── Direct-signing dev note (signer-kind aware) ───────────────────────────

function DirectSigningNote({
  signerKind,
  accountAddress,
}: {
  signerKind: Signer;
  accountAddress: string;
}): JSX.Element {
  const { client, error } = useAbstraxionSigningClient({ requireAuth: true });
  const [isSending, setIsSending] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!client) return;
    setIsSending(true);
    setHash(null);
    setSendError(null);
    try {
      const result = await client.sendTokens(
        accountAddress,
        accountAddress,
        [{ denom: "uxion", amount: "1000" }],
        "auto",
        `Signer-mode demo (${signerKind}): direct send`,
      );
      if (result) setHash(result.transactionHash);
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsSending(false);
    }
  };

  const isMetamask = signerKind === "metamask";

  return (
    <details className="w-full rounded-lg border border-white/10 bg-gray-900/30 text-xs">
      <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-gray-200 transition-colors hover:text-white">
        Direct signing (<code className="text-amber-300">requireAuth: true</code>)
        {isMetamask ? " — prompts MetaMask each tx" : " — developer option"}
      </summary>
      <div className="space-y-3 px-4 pb-4">
        {isMetamask ? (
          <p className="text-gray-400">
            With MetaMask, every direct-signing tx triggers a{" "}
            <code className="text-amber-300">personal_sign</code> popup. The
            session-key path bundles authority into a single popup at login
            and signs subsequent txs silently from the granted keypair.
          </p>
        ) : (
          <p className="text-gray-400">
            With Turnkey, both paths are silent for the user. The choice is
            architectural:
          </p>
        )}
        <ul className="ml-4 list-disc space-y-1 text-gray-400">
          <li>
            <span className="text-green-300">Session-key</span> — gasless via
            fee grants, signs with the granted session keypair. Default.
          </li>
          <li>
            <span className="text-amber-300">Direct (requireAuth)</span> — the
            user&apos;s meta-account signs each tx and pays gas from its own
            balance. No grants needed. Useful when (a) you don&apos;t want to
            wire fee grants, (b) you want every action authenticated by the
            real signer rather than a session key, or (c) you&apos;re moving
            funds the user owns.
          </li>
        </ul>

        {error && (
          <p className="rounded border border-red-500/20 bg-red-500/10 p-2 text-red-400">
            {error}
          </p>
        )}

        <Button
          fullWidth
          onClick={handleSend}
          disabled={isSending || !client || !!error}
          structure="outlined"
        >
          {isSending
            ? "SENDING…"
            : isMetamask
              ? "SEND 0.001 XION (PROMPTS METAMASK)"
              : "SEND 0.001 XION (DIRECT, USER PAYS GAS)"}
        </Button>

        {hash && (
          <p className="rounded border border-amber-500/20 bg-amber-500/10 p-2 text-amber-400">
            Sent. <span className="truncate text-gray-400">Hash: {hash}</span>
          </p>
        )}
        {sendError && (
          <p className="rounded border border-red-500/20 bg-red-500/10 p-2 text-red-400">
            {sendError}
          </p>
        )}
      </div>
    </details>
  );
}

// ─── Flow indicator ────────────────────────────────────────────────────────

interface FlowIndicatorProps {
  isInitializing: boolean;
  isSignerAuthed: boolean;
  isConnecting: boolean;
  isConnected: boolean;
}

function FlowIndicator(props: FlowIndicatorProps): JSX.Element {
  const steps: Array<{ label: string; on: boolean; pulse: boolean }> = [
    {
      label: "Init",
      on: !props.isInitializing,
      pulse: props.isInitializing,
    },
    {
      label: "Signer",
      on: props.isSignerAuthed,
      pulse: false,
    },
    {
      label: "Account",
      on: props.isConnected,
      pulse: props.isConnecting,
    },
    { label: "Ready", on: props.isConnected, pulse: false },
  ];

  return (
    <div className="w-full rounded-lg border border-gray-600/30 bg-gray-800/50 p-4">
      <p className="mb-3 text-xs font-semibold text-gray-400">
        Authentication Flow
      </p>
      <div className="flex items-center justify-between text-xs">
        {steps.map((step, i) => (
          <div key={step.label} className="flex flex-1 items-center">
            <div
              className={`flex items-center gap-1 ${
                step.pulse
                  ? "text-blue-400"
                  : step.on
                    ? "text-green-400"
                    : "text-gray-600"
              }`}
            >
              <div
                className={`h-2 w-2 rounded-full ${
                  step.pulse
                    ? "animate-pulse bg-blue-400"
                    : step.on
                      ? "bg-green-400"
                      : "bg-gray-600"
                }`}
              />
              <span>{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-2 h-px flex-1 ${step.on ? "bg-green-400/50" : "bg-gray-600"}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Missing config screen ─────────────────────────────────────────────────

function MissingConfig({ onBack }: { onBack: () => void }): JSX.Element {
  return (
    <div className="m-auto flex w-full max-w-md flex-col items-center gap-6 text-center">
      <h1 className="text-2xl font-bold tracking-tighter">Signer Mode</h1>
      <p className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
        Set <code>VITE_CODE_ID</code>, <code>VITE_CHECKSUM</code>, and{" "}
        <code>VITE_AA_API_URL</code> in <code>.env.local</code> — they
        describe the smart-account contract Abstraxion will spawn.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-gray-400 underline hover:text-gray-300"
      >
        ← Switch signer
      </button>
    </div>
  );
}
