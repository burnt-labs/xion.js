/**
 * Account connection logic
 * Handles connecting via connector and discovering/creating smart accounts
 */

import type { Connector, ConnectorConnectionResult } from '@burnt-labs/abstraxion-core';
import { createEthWalletAccount, createSecp256k1Account } from '@burnt-labs/abstraxion-core';
import { AUTHENTICATOR_TYPE, type AuthenticatorType } from '@burnt-labs/signers';
import { checkAccountExists } from '../../index';
import type { SessionManager, ConnectionResult, AccountCreationConfig } from '../types';
import type { CompositeAccountStrategy } from '../../accounts';

/**
 * Parameters for account connection
 */
export interface AccountConnectionParams {
  /** The connector to use */
  connector: Connector;
  
  /** Optional authenticator string (if already known) */
  authenticator?: string;
  
  /** Chain ID */
  chainId: string;
  
  /** Account discovery strategy */
  accountStrategy: CompositeAccountStrategy;
  
  /** Account creation configuration (required if accounts need to be created) */
  accountCreationConfig?: AccountCreationConfig;
  
  /** Session manager for keypair management */
  sessionManager: SessionManager;
}

/**
 * Connect via a connector and discover/create smart account
 * 
 * @param params - Connection parameters
 * @returns Connection result with smart account address and connection info
 */
export async function connectAccount(
  params: AccountConnectionParams,
): Promise<ConnectionResult> {
  const {
    connector,
    authenticator,
    chainId,
    accountStrategy,
    accountCreationConfig,
    sessionManager,
  } = params;

  // 1. Connect via connector
  const connectionResult = await connector.connect(chainId);
  const authenticatorToUse = authenticator || connectionResult.authenticator;
  
  // 2. Determine authenticator type from connection metadata
  const authenticatorType = connectionResult.metadata?.authenticatorType as AuthenticatorType | undefined;
  if (!authenticatorType) {
    throw new Error('Authenticator type not found in connection result metadata');
  }

  // 3. Discover or create smart account
  let smartAccountAddress: string;
  let authenticatorIndex = 0;
  let codeId: number | undefined;

  const accountCheck = await checkAccountExists(
    accountStrategy,
    authenticatorToUse,
    authenticatorType,
    '[orchestrator]'
  );

  if (accountCheck.exists && accountCheck.smartAccountAddress) {
    // Account exists - use it
    smartAccountAddress = accountCheck.smartAccountAddress;
    authenticatorIndex = accountCheck.authenticatorIndex ?? 0;
    codeId = accountCheck.codeId;
  } else {
    // Account doesn't exist - create it
    if (!accountCreationConfig) {
      throw new Error('Account creation config is required but not provided');
    }

    const { aaApiUrl, smartAccountContract, feeGranter } = accountCreationConfig;

    // Create account based on authenticator type
    if (authenticatorType === AUTHENTICATOR_TYPE.EthWallet) {
      // Ethereum wallet account creation
      const ethAddress = authenticatorToUse.toLowerCase();
      const signFn = async (hexMessage: string) => {
        return await connectionResult.signMessage(hexMessage);
      };

      const result = await createEthWalletAccount(
        aaApiUrl,
        ethAddress,
        signFn,
        smartAccountContract.checksum,
        feeGranter,
        smartAccountContract.addressPrefix,
        '[orchestrator]'
      );

      smartAccountAddress = result.account_address;
      codeId = result.code_id;
      authenticatorIndex = 0;
    } else if (authenticatorType === AUTHENTICATOR_TYPE.Secp256K1) {
      // Extract pubkey from connection metadata or derive from authenticator
      const pubkeyFromMetadata = connectionResult.metadata?.pubkey || authenticatorToUse;

      const signFn = async (message: string) => {
        // Cosmos wallets expect plain text, not hex
        return await connectionResult.signMessage(message);
      };

      const result = await createSecp256k1Account(
        aaApiUrl,
        pubkeyFromMetadata,
        signFn,
        smartAccountContract.checksum,
        feeGranter,
        smartAccountContract.addressPrefix,
        '[orchestrator]'
      );

      smartAccountAddress = result.account_address;
      codeId = result.code_id;
      authenticatorIndex = 0;
    } else {
      throw new Error(`Account creation for ${authenticatorType} authenticator type is not yet supported`);
    }
  }

  // 4. Generate session keypair if needed
  let sessionKeypair = await sessionManager.getLocalKeypair();
  if (!sessionKeypair) {
    sessionKeypair = await sessionManager.generateAndStoreTempAccount();
  }

  // Get grantee address
  const accounts = await sessionKeypair.getAccounts();
  const granteeAddress = accounts[0].address;

  // Important: displayAddress from connector is the authenticator/wallet address, NOT the smart account address
  // The smart account address is returned separately as smartAccountAddress in ConnectionResult
  const updatedConnectionResult: ConnectorConnectionResult = {
    ...connectionResult,
    metadata: {
      ...connectionResult.metadata,
      authenticatorIndex,
      codeId,
    },
  };

  return {
    smartAccountAddress,
    connectionInfo: updatedConnectionResult,
    sessionKeypair,
    granteeAddress,
  };
}

