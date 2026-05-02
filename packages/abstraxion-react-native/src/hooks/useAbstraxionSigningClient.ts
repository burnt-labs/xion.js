import {
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { RedirectController } from "@burnt-labs/abstraxion-js";
import type { SigningClient, SignResult } from "@burnt-labs/abstraxion-js";
import { AbstraxionContext } from "../components/AbstraxionContext";

/**
 * Options for `useAbstraxionSigningClient`.
 */
export interface UseAbstraxionSigningClientOptions {
  /**
   * When true, returns a direct signing client (signer mode → AAClient,
   * redirect/embedded → RequireSigningClient mediated by the dashboard).
   * When false/undefined, returns the GranteeSignerClient for session-key
   * signing (gasless, no popup).
   */
  requireAuth?: boolean;
}

/**
 * Return type for `useAbstraxionSigningClient`.
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
   * dashboard). Null when no result is pending or not in redirect mode.
   */
  readonly signResult: SignResult | null;
  /** Clear the signResult after consuming it. */
  readonly clearSignResult: (() => void) | undefined;
}

/**
 * Hook to get a signing client for transactions.
 *
 * Direct-signing client construction is delegated to
 * `runtime.createDirectSigningClient()`, which covers signer / redirect /
 * embedded modes with a single async call. The hook itself only mirrors the
 * resulting promise into React state and subscribes to the redirect-mode
 * `signResult` store.
 */
export const useAbstraxionSigningClient = (
  options?: UseAbstraxionSigningClientOptions,
): UseAbstraxionSigningClientReturn => {
  const {
    abstraxionAccount,
    authMode,
    controller,
    granterAddress,
    rpcUrl,
    runtime,
    signingClient: signingClientFromState,
  } = useContext(AbstraxionContext);

  const requireAuth = options?.requireAuth ?? false;

  const [directClient, setDirectClient] = useState<SigningClient | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | undefined>(undefined);

  const redirectController =
    controller instanceof RedirectController ? controller : undefined;
  const signResult = useSyncExternalStore(
    (cb) => redirectController?.signResult.subscribe(cb) ?? (() => undefined),
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

    // Signer mode AAClient construction needs a connected account. Surface a
    // friendly error rather than a raw runtime throw.
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
  } as const;
};
