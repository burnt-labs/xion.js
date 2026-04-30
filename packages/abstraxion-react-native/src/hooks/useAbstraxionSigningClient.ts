import { useContext, useEffect, useState } from "react";
import {
  AAClient,
  createSignerFromSigningFunction,
} from "@burnt-labs/abstraxion-js";
import type {
  AuthenticatorType,
  SigningClient,
  SignResult,
} from "@burnt-labs/abstraxion-js";
import { AbstraxionContext } from "../components/AbstraxionContext";

export interface UseAbstraxionSigningClientOptions {
  /**
   * When true, returns a direct signing client where the active RN auth mode
   * supports direct signing. Signer mode can provide `AAClient`; redirect mode
   * currently supports session-key signing only in React Native.
   */
  requireAuth?: boolean;
}

export interface UseAbstraxionSigningClientReturn {
  readonly client: SigningClient | undefined;
  readonly signArb:
    | ((signerAddress: string, message: string | Uint8Array) => Promise<string>)
    | undefined;
  readonly rpcUrl: string;
  readonly error: string | undefined;
  readonly signResult: SignResult | null;
  readonly clearSignResult: (() => void) | undefined;
}

export const useAbstraxionSigningClient = (
  options?: UseAbstraxionSigningClientOptions,
): UseAbstraxionSigningClientReturn => {
  const {
    abstraxionAccount,
    authMode,
    connectionInfo,
    gasPrice,
    granterAddress,
    rpcUrl,
    signingClient,
  } = useContext(AbstraxionContext);

  const requireAuth = options?.requireAuth ?? false;
  const [aaClient, setAaClient] = useState<AAClient | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!requireAuth) {
      setAaClient(undefined);
      setError(undefined);
      return;
    }

    if (authMode !== "signer") {
      setAaClient(undefined);
      setError(
        "Direct signing with requireAuth is only supported in React Native signer mode. Redirect mode supports session-key signing only.",
      );
      return;
    }

    if (!connectionInfo) {
      setAaClient(undefined);
      setError(
        "Direct signing requires an active signer connection. Please ensure you are logged in.",
      );
      return;
    }

    if (!granterAddress) {
      setAaClient(undefined);
      setError(
        "Direct signing requires a connected account. Please ensure you are logged in.",
      );
      return;
    }

    const createClient = async (): Promise<void> => {
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

        const signer = createSignerFromSigningFunction({
          smartAccountAddress: granterAddress,
          authenticatorIndex,
          authenticatorType,
          signMessage: connectionInfo.signMessage,
        });

        const client = await AAClient.connectWithSigner(rpcUrl, signer, {
          gasPrice,
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

    void createClient();
  }, [authMode, connectionInfo, gasPrice, granterAddress, requireAuth, rpcUrl]);

  if (requireAuth) {
    return {
      client: authMode === "signer" ? aaClient : undefined,
      signArb: undefined,
      rpcUrl,
      error,
      signResult: null,
      clearSignResult: undefined,
    };
  }

  return {
    client: signingClient,
    signArb: abstraxionAccount?.signArb,
    rpcUrl,
    error: undefined,
    signResult: null,
    clearSignResult: undefined,
  } as const;
};
