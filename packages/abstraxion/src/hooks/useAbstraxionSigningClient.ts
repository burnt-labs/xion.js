import { useContext, useMemo, useState, useEffect } from "react";
import { GranteeSignerClient } from "@burnt-labs/abstraxion-core";
import {
  AAClient,
  createSignerFromSigningFunction,
  GasPrice,
  type AuthenticatorType,
} from "@burnt-labs/signers";
import { AbstraxionContext } from "@/src/AbstraxionProvider";
import { PopupController } from "@/src/controllers/PopupController";
import { PopupSigningClient } from "@/src/controllers/PopupSigningClient";

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
   * - Popup mode: PopupSigningClient — dashboard popup prompts for approval
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
   * Signing client
   * - GranteeSignerClient when requireAuth is false/undefined (session key signing)
   * - AAClient when requireAuth is true in signer mode (direct signing)
   * - PopupSigningClient when requireAuth is true in popup mode (dashboard approval)
   */
  readonly client:
    | GranteeSignerClient
    | AAClient
    | PopupSigningClient
    | undefined;

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

  // Narrow controller to PopupController when in popup mode
  const popupController =
    controller instanceof PopupController ? controller : undefined;

  // State for AAClient (created async, signer mode only)
  const [aaClient, setAaClient] = useState<AAClient | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  // PopupSigningClient for popup mode (synchronous, no async creation needed)
  const popupSigningClient = useMemo(() => {
    if (!requireAuth || !popupController || !granterAddress) {
      return undefined;
    }
    return new PopupSigningClient(popupController, granterAddress);
  }, [requireAuth, popupController, granterAddress]);

  // Create AAClient when requireAuth is true and in signer mode
  useEffect(() => {
    // Reset state on mode change
    if (!requireAuth) {
      setAaClient(undefined);
      setError(undefined);
      return;
    }

    // Popup mode: handled by PopupSigningClient (above), no error needed
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

    // Check for unsupported modes
    if (authMode === "redirect") {
      setError(
        "Direct signing (requireAuth: true) is not supported with redirect mode. Use signer or popup mode instead.",
      );
      setAaClient(undefined);
      return;
    }

    if (authMode === "iframe") {
      setError(
        "Direct signing (requireAuth: true) is not yet supported with iframe mode. This feature is planned for a future release.",
      );
      setAaClient(undefined);
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
    // Popup mode: return PopupSigningClient
    if (authMode === "popup") {
      return {
        client: popupSigningClient,
        signArb: undefined,
        rpcUrl,
        error,
      };
    }

    // Signer mode: return AAClient
    return {
      client: aaClient,
      signArb: undefined, // signArb not available for direct signing
      rpcUrl,
      error,
    };
  }

  // Default: session key signing
  return {
    client: signingClientFromState,
    signArb: abstraxionAccount?.signArb,
    rpcUrl,
    error: undefined,
  };
};
