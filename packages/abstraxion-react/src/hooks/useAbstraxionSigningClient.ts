import {
  useContext,
  useState,
  useEffect,
  useCallback,
  useSyncExternalStore,
} from "react";
import { RedirectController } from "@burnt-labs/abstraxion-js";
import type { SigningClient, SignResult } from "@burnt-labs/abstraxion-js";
import { AbstraxionContext } from "@/src/AbstraxionProvider";

/**
 * Options for useAbstraxionSigningClient hook
 */
export interface UseAbstraxionSigningClientOptions {
  /**
   * When true, returns a direct signing client (wallet popup or dashboard approval).
   * When false/undefined, returns GranteeSignerClient for session key signing (gasless).
   *
   * Direct signing:
   * - Signer mode: AAClient — external wallet prompts for approval
   * - Popup / redirect / iframe mode: RequireSigningClient — dashboard mediates approval
   * - User pays gas from their meta-account balance
   * - For security-critical operations
   *
   * Session key signing (default):
   * - Session key signs transactions (no popup)
   * - Gasless via fee grants
   * - For normal operations
   *
   * @default false
   */
  requireAuth?: boolean;
}

/**
 * Return type for useAbstraxionSigningClient hook
 */
export interface UseAbstraxionSigningClientReturn {
  readonly client: SigningClient | undefined;
  readonly signArb:
    | ((signerAddress: string, message: string | Uint8Array) => Promise<string>)
    | undefined;
  readonly rpcUrl: string;
  readonly error: string | undefined;
  /**
   * Result from a redirect signing flow (populated after returning from the
   * dashboard signing redirect). null when no result is pending.
   */
  readonly signResult: SignResult | null;
  /** Clear the signResult after consuming it. */
  readonly clearSignResult: (() => void) | undefined;
}

/**
 * Hook to get a signing client for transactions.
 *
 * Internally delegates direct-signing client construction to
 * `runtime.createDirectSigningClient()`, which covers all four modes
 * (popup / redirect / embedded / signer) with a single async call.
 */
export const useAbstraxionSigningClient = (
  options?: UseAbstraxionSigningClientOptions,
): UseAbstraxionSigningClientReturn => {
  const {
    abstraxionAccount,
    rpcUrl,
    granterAddress,
    signingClient: signingClientFromState,
    authMode,
    controller,
    runtime,
  } = useContext(AbstraxionContext);

  const requireAuth = options?.requireAuth ?? false;

  const [directClient, setDirectClient] = useState<SigningClient | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | undefined>(undefined);

  // RedirectController exposes a signResult store that survives the
  // navigation round-trip. Subscribe via useSyncExternalStore so consumers
  // can read it after returning from the dashboard.
  const redirectController =
    controller instanceof RedirectController ? controller : undefined;
  const signResult = useSyncExternalStore(
    (cb) => redirectController?.signResult.subscribe(cb) ?? (() => {}),
    () => redirectController?.signResult.snapshot() ?? null,
    () => null,
  );
  const clearSignResult = useCallback(() => {
    redirectController?.signResult.clear();
  }, [redirectController]);

  useEffect(() => {
    if (!requireAuth || !runtime) {
      setDirectClient(undefined);
      setError(undefined);
      return;
    }

    // Signer mode: AAClient construction needs a connected account. Surface a
    // friendly error if we're not there yet — the consumer typically waits
    // for `granterAddress` before issuing a tx anyway.
    if (authMode === "signer" && !granterAddress) {
      setDirectClient(undefined);
      setError(
        "Direct signing requires a connected account. Please ensure you are logged in.",
      );
      return;
    }

    let cancelled = false;
    runtime
      .createDirectSigningClient()
      .then((client) => {
        if (cancelled) return;
        setDirectClient(client);
        setError(undefined);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(
          "[useAbstraxionSigningClient] createDirectSigningClient failed:",
          err,
        );
        setError(
          err instanceof Error
            ? err.message
            : "Failed to create direct signing client",
        );
        setDirectClient(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [requireAuth, runtime, authMode, granterAddress]);

  if (requireAuth) {
    if (authMode === "redirect") {
      return {
        client: directClient,
        signArb: undefined,
        rpcUrl,
        error,
        signResult,
        clearSignResult: signResult ? clearSignResult : undefined,
      };
    }

    return {
      client: directClient,
      signArb: undefined,
      rpcUrl,
      error,
      signResult: null,
      clearSignResult: undefined,
    };
  }

  return {
    client: signingClientFromState,
    signArb: abstraxionAccount?.signArb,
    rpcUrl,
    error: undefined,
    signResult: null,
    clearSignResult: undefined,
  };
};
