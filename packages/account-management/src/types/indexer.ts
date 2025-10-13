import { SmartAccountWithCodeId } from "./authenticator";

export interface IndexerStrategy {
  fetchSmartAccounts(
    loginAuthenticator: string,
  ): Promise<SmartAccountWithCodeId[]>;
}
