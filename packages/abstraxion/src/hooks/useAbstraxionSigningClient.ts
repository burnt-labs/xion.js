import {
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useSyncExternalStore,
} from "react";
import {
  AAClient,
  createSignerFromSigningFunction,
  GasPrice,
  type AuthenticatorType,
} from "@burnt-labs/signers";
import { AbstraxionContext } from "@/src/AbstraxionProvider";
import { PopupController } from "@/src/controllers/PopupController";
import { RedirectController } from "@/src/controllers/RedirectController";
import { IframeController } from "@/src/controllers/IframeController";
import { RequireSigningClient } from "@/src/controllers/RequireSigningClient";
import type { SigningClient, SignResult } from "@/src/types";

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
 * Client type depends on requireAuth option
 */
export interface UseAbstraxionSigningClientReturn {
  /**
   * Signing client — the concrete type depends on auth mode and `requireAuth`.
   * Use the exported `SigningClient` type for your own type annotations.
   */
  readonly client: SigningClient | undefined;

  /**
   * Sign arbitrary message function (from session keypair)
   * Only available for session key signing
   */
  readonly signArb:
    | ((signerAddress: string, message: string | Uint8Array) => Promise<string>)
    | undefined;

  /**
   * RPC URL for the chain
   */
  readonly rpcUrl: string;

  /**
   * Error message if direct signing is not available
   * Only set when requireAuth is true and connection info is missing
   */
  readonly error: string | undefined;

  /**
   * Result from a redirect signing flow (populated after returning from the
   * dashboard signing redirect). null when no result is pending.
   * Only relevant for redirect mode with requireAuth: true.
   */
  readonly signResult: SignResult | null;

  /**
   * Clear the signResult after consuming it.
   * Only available when signResult is non-null.
   */
  readonly clearSignResult: (() => void) | undefined;
}

/**
 * Hook to get a signing client for transactions
 *
 * @param options - Hook options
 * @param options.requireAuth - When true, returns a direct signing client
 * @returns Signing client and related utilities
 *
 * @example
 * ```typescript
 * // Session key signing (default - gasless, no popup)
 * const { client } = useAbstraxionSigningClient();
 *
 * // Direct signing (wallet popup or dashboard approval, user pays gas)
 * const { client, error } = useAbstraxionSigningClient({ requireAuth: true });
 * if (error) {
 *   // Handle error - e.g., show message that direct signing is not available
 * }
 * ```
 */
export const useAbstraxionSigningClient = (
  options?: UseAbstraxionSigningClientOptions,
): UseAbstraxionSigningClientReturn => {
  const {
    abstraxionAccount,
    rpcUrl,
    gasPrice,
    granterAddress,
    signingClient: signingClientFromState,
    connectionInfo,
    authMode,
    controller,
  } = useContext(AbstraxionContext);

  const requireAuth = options?.requireAuth ?? false;

  // Narrow controller to mode-specific types
  const popupController =
    controller instanceof PopupController ? controller : undefined;
  const redirectController =
    controller instanceof RedirectController ? controller : undefined;
  const iframeController =
    controller instanceof IframeController ? controller : undefined;

  // State for AAClient (created async, signer mode only)
  const [aaClient, setAaClient] = useState<AAClient | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  // RequireSigningClient for popup / redirect / iframe modes (synchronous).
  // The transport strategy is bound from the active controller method.
  const requireSigningClient = useMemo(() => {
    if (!requireAuth || !granterAddress) return undefined;

    if (popupController) {
      return new RequireSigningClient(
        popupController.promptSignAndBroadcast.bind(popupController),
        rpcUrl,
      );
    }
    if (redirectController) {
      return new RequireSigningClient(
        redirectController.promptSignAndBroadcast.bind(redirectController),
        rpcUrl,
      );
    }
    if (iframeController) {
      return new RequireSigningClient(
        iframeController.signAndBroadcastWithMetaAccount.bind(iframeController),
        rpcUrl,
      );
    }
    return undefined;
  }, [
    requireAuth,
    granterAddress,
    popupController,
    redirectController,
    iframeController,
    rpcUrl,
  ]);

  // Read sign result from RedirectController via useSyncExternalStore so the
  // hook re-renders whenever signResult changes (set during init, cleared by consumer).
  const signResult = useSyncExternalStore(
    (cb) => redirectController?.signResult.subscribe(cb) ?? (() => {}),
    () => redirectController?.signResult.snapshot() ?? null,
    () => null,
  );

  const clearSignResult = useCallback(() => {
    redirectController?.signResult.clear();
  }, [redirectController]);

  // Create AAClient when requireAuth is true and in signer mode
  useEffect(() => {
    // Reset state on mode change
    if (!requireAuth) {
      setAaClient(undefined);
      setError(undefined);
      return;
    }

    // Popup / redirect / embedded: handled by RequireSigningClient (above).
    // Only set an error if the relevant controller is missing.
    if (authMode === "popup") {
      setAaClient(undefined);
      if (!popupController) {
        setError(
          "Direct signing requires an active connection. Please ensure you are logged in.",
        );
      } else {
        setError(undefined);
      }
      return;
    }

    if (authMode === "redirect") {
      setAaClient(undefined);
      if (!redirectController) {
        setError(
          "Direct signing requires an active connection. Please ensure you are logged in.",
        );
      } else {
        setError(undefined);
      }
      return;
    }

    if (authMode === "embedded") {
      setAaClient(undefined);
      if (!iframeController) {
        setError(
          "Direct signing requires an active connection. Please ensure you are logged in.",
        );
      } else {
        setError(undefined);
      }
      return;
    }

    // Signer mode: create AAClient from connectionInfo
    if (!connectionInfo) {
      setError(
        "Direct signing requires an active connection. Please ensure you are logged in.",
      );
      setAaClient(undefined);
      return;
    }

    if (!granterAddress) {
      setError(
        "Direct signing requires a connected account. Please ensure you are logged in.",
      );
      setAaClient(undefined);
      return;
    }

    // Create AAClient
    const createClient = async () => {
      try {
        const authenticatorType = connectionInfo.metadata
          ?.authenticatorType as AuthenticatorType;
        const authenticatorIndex =
          connectionInfo.metadata?.authenticatorIndex ?? 0;

        if (!authenticatorType) {
          throw new Error(
            "Authenticator type not available in connection info",
          );
        }

        // Create signer from signing function
        const signer = createSignerFromSigningFunction({
          smartAccountAddress: granterAddress,
          authenticatorIndex,
          authenticatorType,
          signMessage: connectionInfo.signMessage,
        });

        // Create AAClient
        const client = await AAClient.connectWithSigner(rpcUrl, signer, {
          gasPrice: GasPrice.fromString(gasPrice),
        });

        setAaClient(client);
        setError(undefined);
      } catch (err) {
        console.error(
          "[useAbstraxionSigningClient] Error creating AAClient:",
          err,
        );
        setError(
          err instanceof Error
            ? err.message
            : "Failed to create direct signing client",
        );
        setAaClient(undefined);
      }
    };

    createClient();
  }, [
    requireAuth,
    connectionInfo,
    granterAddress,
    rpcUrl,
    gasPrice,
    authMode,
    controller,
  ]);

  // Return appropriate client based on mode
  if (requireAuth) {
    // Popup / redirect / iframe: return RequireSigningClient (unified transport-strategy client)
    if (authMode === "popup") {
      return {
        client: requireSigningClient,
        signArb: undefined,
        rpcUrl,
        error,
        signResult: null,
        clearSignResult: undefined,
      };
    }

    // Redirect mode: also expose signResult store for consuming the post-redirect result
    if (authMode === "redirect") {
      return {
        client: requireSigningClient,
        signArb: undefined,
        rpcUrl,
        error,
        signResult,
        clearSignResult: signResult ? clearSignResult : undefined,
      };
    }

    // Embedded (iframe) mode
    if (authMode === "embedded") {
      return {
        client: requireSigningClient,
        signArb: undefined,
        rpcUrl,
        error,
        signResult: null,
        clearSignResult: undefined,
      };
    }

    // Signer mode: return AAClient (has full direct-key access)
    return {
      client: aaClient,
      signArb: undefined,
      rpcUrl,
      error,
      signResult: null,
      clearSignResult: undefined,
    };
  }

  // Default: session key signing
  return {
    client: signingClientFromState,
    signArb: abstraxionAccount?.signArb,
    rpcUrl,
    error: undefined,
    signResult: null,
    clearSignResult: undefined,
  };
};
