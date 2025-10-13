export interface IndexerStrategy {
  fetchSmartAccounts(
    loginAuthenticator: string,
  ): Promise<SmartAccountWithCodeId[]>;
}
