import { useContext, useMemo, useState, useEffect } from "react";
import { GranteeSignerClient } from "@burnt-labs/abstraxion-core";
import {
  AAClient,
  createSignerFromSigningFunction,
  GasPrice,
  type AuthenticatorType,
} from "@burnt-labs/signers";
import { AbstraxionContext } from "@/src/AbstraxionProvider";

/**
 * Options for useAbstraxionSigningClient hook
 */
export interface UseAbstraxionSigningClientOptions {
  /**
   * When true, returns an AAClient for direct signing (wallet popup, user pays gas)
   * When false/undefined, returns GranteeSignerClient for session key signing (gasless)
   *
   * Direct signing:
   * - User's authenticator signs transactions (wallet popup)
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
   * - AAClient when requireAuth is true (direct signing)
   */
  readonly client: GranteeSignerClient | AAClient | undefined;

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
 * @param options.requireAuth - When true, returns AAClient for direct signing
 * @returns Signing client and related utilities
 *
 * @example
 * ```typescript
 * // Session key signing (default - gasless, no popup)
 * const { client } = useAbstraxionSigningClient();
 *
 * // Direct signing (wallet popup, user pays gas)
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
  } = useContext(AbstraxionContext);

  const requireAuth = options?.requireAuth ?? false;

  // State for AAClient (created async)
  const [aaClient, setAaClient] = useState<AAClient | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  // Create AAClient when requireAuth is true and connection info is available
  useEffect(() => {
    // Reset state on mode change
    if (!requireAuth) {
      setAaClient(undefined);
      setError(undefined);
      return;
    }

    // Check for unsupported modes
    if (authMode === "redirect") {
      setError(
        "Direct signing (requireAuth: true) is not supported with redirect mode. Use signer or iframe mode instead.",
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

    // Check for connection info (only available in signer mode when connected)
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
        const authenticatorIndex = connectionInfo.metadata?.authenticatorIndex ?? 0;

        if (!authenticatorType) {
          throw new Error("Authenticator type not available in connection info");
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
        console.error("[useAbstraxionSigningClient] Error creating AAClient:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to create direct signing client",
        );
        setAaClient(undefined);
      }
    };

    createClient();
  }, [requireAuth, connectionInfo, granterAddress, rpcUrl, gasPrice, authMode]);

  // Return appropriate client based on mode
  if (requireAuth) {
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
