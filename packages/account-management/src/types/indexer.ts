import { SmartAccountWithCodeId } from "./authenticator";

// Re-export for convenience
export type { SmartAccountWithCodeId };

export interface IndexerStrategy {
  fetchSmartAccounts(
    loginAuthenticator: string,
  ): Promise<SmartAccountWithCodeId[]>;
}
