/**
 * Hook for managing grants flow in direct mode
 * After wallet connects, this creates grants from smart account to temp keypair
 */

import { useState, useCallback } from "react";
import { GasPrice } from "@cosmjs/stargate";
import {
  buildGrantMessages,
  createCompositeTreasuryStrategy,
  generateTreasuryGrants as generateTreasuryGrantMessages,
  isContractGrantConfigValid,
} from "@burnt-labs/account-management";
import { AADirectSigner, AAEthSigner, AAClient } from "@burnt-labs/signers";
import { abstraxionAuth } from "../components/Abstraxion";
import type { ConnectionInfo } from "./useWalletAuth";
import type { ContractGrantDescription, SpendLimit } from "../components/AbstraxionContext";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";

// Extend Window type to include wallet properties
declare global {
  interface Window {
    ethereum?: any;
    keplr?: any;
    leap?: any;
    okxwallet?: {
      keplr?: any;
    };
  }
}

interface UseGrantsFlowProps {
  rpcUrl: string;
  restUrl?: string; // REST API endpoint for feegrant validation
  gasPrice: string; // Gas price (e.g., '0.001uxion')
  contracts?: ContractGrantDescription[];
  bank?: SpendLimit[];
  stake?: boolean;
  treasury?: string;
  feeGranter?: string; // Address that will pay transaction fees
  daodaoIndexerUrl?: string; // Optional DaoDao indexer URL for fast treasury queries
}

interface GrantsFlowState {
  isCreatingGrants: boolean;
  grantsError: string | null;
  createGrants: (
    smartAccountAddress: string,
    connectionInfo: ConnectionInfo,
    chainId: string,
  ) => Promise<void>;
}

/**
 * Generate grant messages from treasury contract using composite strategy
 * Tries DaoDao indexer first, falls back to direct RPC query
 */
async function generateTreasuryGrants(
  treasuryAddress: string,
  client: any, // CosmWasmClient or AAClient
  granter: string,
  grantee: string,
  daodaoIndexerUrl?: string,
): Promise<any[]> {
  // Create composite treasury strategy with fallback chain using factory function
  const treasuryStrategy = createCompositeTreasuryStrategy({
    daodao: daodaoIndexerUrl ? {
      indexerUrl: daodaoIndexerUrl,
    } : undefined,
    includeDirectQuery: true, // Always include direct query as reliable fallback
  });

  // Generate grant messages from treasury contract
  // Default expiration: 3 months from now
  const threeMonthsFromNow = BigInt(
    Math.floor(
      new Date(new Date().setMonth(new Date().getMonth() + 3)).getTime() / 1000,
    ),
  );

  return generateTreasuryGrantMessages(
    treasuryAddress,
    client,
    granter,
    grantee,
    treasuryStrategy,
    threeMonthsFromNow,
  );
}

/**
 * Hook for creating grants after wallet connection
 *
 * Flow:
 * 1. Generate temp keypair (grantee)
 * 2. Build grant messages from config
 * 3. Sign grant transaction with wallet
 * 4. Store keypair + granter
 * 5. Authenticate
 */
export function useGrantsFlow({
  rpcUrl,
  restUrl,
  gasPrice,
  contracts,
  bank,
  stake,
  treasury,
  feeGranter,
  daodaoIndexerUrl,
}: UseGrantsFlowProps): GrantsFlowState {
  const [isCreatingGrants, setIsCreatingGrants] = useState(false);
  const [grantsError, setGrantsError] = useState<string | null>(null);

  const createGrants = useCallback(async (
    smartAccountAddress: string,
    connectionInfo: ConnectionInfo,
    chainId: string,
  ) => {
    try {
      setIsCreatingGrants(true);
      setGrantsError(null);

      // Validate contract grant configurations before proceeding
      if (contracts && contracts.length > 0) {
        const isValid = isContractGrantConfigValid(
          contracts,
          { id: smartAccountAddress } as any
        );

        if (!isValid) {
          throw new Error(
            'Invalid contract grant configuration: Contract address cannot be the same as the granter account'
          );
        }
      }

      // 1. Generate temp keypair and get grantee address
      console.log('[useGrantsFlow] 🔑 Generating new session keypair...');
      const tempKeypair = await abstraxionAuth.generateAndStoreTempAccount();
      const granteeAddress = await abstraxionAuth.getKeypairAddress();
      console.log('[useGrantsFlow] → Session key (grantee) address:', granteeAddress);
      console.log('[useGrantsFlow] → Granter (smart account) address:', smartAccountAddress);

      // 2. Build grant messages - query treasury contract or use manual configs
      let grantMessages: any[] = [];
      let needsDeployFeeGrant = false;

      if (treasury) {
        // Query treasury contract for grant configurations (matching dashboard flow)
        console.log('[useGrantsFlow] 📋 Querying treasury contract for grant configurations...');
        console.log('[useGrantsFlow] → Treasury address:', treasury);
        try {
          // First, create a basic CosmWasmClient to query the treasury contract
          const { CosmWasmClient } = await import('@cosmjs/cosmwasm-stargate');
          const queryClient = await CosmWasmClient.connect(rpcUrl);

          // Generate grant messages from treasury contract
          grantMessages = await generateTreasuryGrants(
            treasury,
            queryClient,
            smartAccountAddress,
            granteeAddress,
            daodaoIndexerUrl,
          );

          console.log('[useGrantsFlow] ✅ Treasury returned', grantMessages.length, 'grant messages');
          needsDeployFeeGrant = true; // Treasury mode requires deploy_fee_grant
        } catch (error) {
          console.error('[useGrantsFlow] ⚠️ Failed to query treasury contract:', error);
          console.log('[useGrantsFlow] → Falling back to manual grant configs');
          // Fall back to manual configs
        }
      }

      // TODO: Verify if this is the correct fallback approach
      // Fall back to manual grant building if treasury query failed or not configured
      if (grantMessages.length === 0) {
        const oneYearFromNow = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);

        grantMessages = buildGrantMessages({
          granter: smartAccountAddress,
          grantee: granteeAddress,
          expiration: oneYearFromNow,
          contracts,
          bank,
          stake,
        });

        if (grantMessages.length === 0) {
          // No grant configs found - skip grants creation
          localStorage.setItem('xion-authz-granter-account', smartAccountAddress);
          abstraxionAuth.abstractAccount = tempKeypair;
          await abstraxionAuth.authenticate();
          return;
        }
      }

      // 3. Create signer for the smart account
      const authenticatorIndex = connectionInfo.authenticatorIndex ?? 0;

      let signer;

      if (connectionInfo.type === 'EthWallet') {
        // MetaMask signer (browser wallet)
        if (!window.ethereum) {
          throw new Error('MetaMask not found');
        }

        const personalSign = async (message: string) => {
          const signature = await window.ethereum!.request({
            method: 'personal_sign',
            params: [message, connectionInfo.address],
          });
          return signature as string;
        };

        signer = new AAEthSigner(
          smartAccountAddress,
          authenticatorIndex,
          personalSign,
        );
      } else if (connectionInfo.type === 'SignerEth') {
        // Session signer (Turnkey, Privy, etc.)
        console.log('[useGrantsFlow] Using session signer for grant creation');

        const personalSign = async (message: string) => {
          return await connectionInfo.signMessage(message);
        };

        signer = new AAEthSigner(
          smartAccountAddress,
          authenticatorIndex,
          personalSign,
        );
      } else {
        // Keplr/Leap/OKX signer (Cosmos wallets)
        const walletName = connectionInfo.walletName || 'keplr';
        const wallet = walletName === 'leap'
          ? window.leap
          : walletName === 'okx'
          ? window.okxwallet?.keplr
          : window.keplr;

        if (!wallet) {
          throw new Error(`${walletName} wallet not found`);
        }

        await wallet.enable(chainId);
        const offlineSigner = await wallet.getOfflineSignerAuto(chainId);

        const signArbitrary = async (
          cId: string,
          signerAddr: string,
          data: string | Uint8Array,
        ) => {
          return await wallet.signArbitrary(cId, signerAddr, data);
        };

        signer = new AADirectSigner(
          offlineSigner as any,
          smartAccountAddress,
          authenticatorIndex,
          signArbitrary,
        );
      }

      // 4. Create AAClient (extends SigningCosmWasmClient with abstract account support)
      const client = await AAClient.connectWithSigner(
        rpcUrl,
        signer as any,
        {
          gasPrice: GasPrice.fromString(gasPrice),
        }
      );

      // 5. Build final message batch
      // If using treasury mode, add deploy_fee_grant contract call
      const messagesToSign = [...grantMessages];

      if (needsDeployFeeGrant && treasury) {
        console.log('[useGrantsFlow] 💰 Adding deploy_fee_grant message to treasury contract');
        const deployFeeGrantMsg = {
          deploy_fee_grant: {
            authz_granter: smartAccountAddress,
            authz_grantee: granteeAddress,
          },
        };

        messagesToSign.push({
          typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
          value: MsgExecuteContract.fromPartial({
            sender: smartAccountAddress,
            contract: treasury,
            msg: new Uint8Array(Buffer.from(JSON.stringify(deployFeeGrantMsg))),
            funds: [],
          }),
        });
      }

      console.log('[useGrantsFlow] 📝 Total messages to sign:', messagesToSign.length);
      console.log('[useGrantsFlow] → Grant messages:', grantMessages.length);
      if (needsDeployFeeGrant) {
        console.log('[useGrantsFlow] → Deploy fee grant message: 1');
      }

      // 6. Simulate transaction to get gas estimate
      console.log('[useGrantsFlow] ⚙️ Simulating transaction to estimate gas...');
      const simmedGas = await client.simulate(
        smartAccountAddress,
        messagesToSign,
        'Create grants for abstraxion',
      );
      console.log('[useGrantsFlow] → Estimated gas:', simmedGas);
      
      // Parse gas price from config (e.g., "0.001uxion" -> { amount: 0.001, denom: "uxion" })
      const gasPriceMatch = gasPrice.match(/^([\d.]+)(.+)$/);
      if (!gasPriceMatch) {
        throw new Error(`Invalid gas price format: ${gasPrice}. Expected format: "0.001uxion"`);
      }
      const gasPriceNum = parseFloat(gasPriceMatch[1]);
      const denom = gasPriceMatch[2];

      // Calculate fee based on simulated gas with generous buffer
      // Using higher multiplier to account for fee market fluctuations
      const calculatedFee = {
        amount: [{ denom, amount: String(Math.ceil(simmedGas * gasPriceNum * 2)) }], // 2x buffer on amount
        gas: String(Math.ceil(simmedGas * 1.6)), // 60% buffer on gas limit
      };

      // Add fee granter if provided (pays transaction fees on behalf of smart account)
      const feeToUse = feeGranter
        ? {
            ...calculatedFee,
            granter: feeGranter,
          }
        : calculatedFee;

      console.log('[useGrantsFlow] 💳 Fee configuration:');
      console.log('[useGrantsFlow] → Gas limit:', feeToUse.gas);
      console.log('[useGrantsFlow] → Fee amount:', feeToUse.amount);
      if (feeGranter) {
        console.log('[useGrantsFlow] → Fee granter:', feeGranter);
      }

      // 7. Sign and broadcast grant transaction
      console.log('[useGrantsFlow] ✍️ Signing and broadcasting transaction...');
      console.log('[useGrantsFlow] → Signer address (smart account):', smartAccountAddress);
      console.log('[useGrantsFlow] → Authenticator index:', authenticatorIndex);
      console.log('[useGrantsFlow] → Connection info:', connectionInfo);

      // Query the smart account to see what authenticator is registered
      if (connectionInfo.type === 'SignerEth') {
        console.log('[useGrantsFlow] → Ethereum address signing with:', connectionInfo.ethereumAddress);
      }

      const result = await client.signAndBroadcast(
        smartAccountAddress,
        messagesToSign,
        feeToUse,
        'Create grants for abstraxion',
      );

      console.log('[useGrantsFlow] ✅ Transaction broadcast successful!');
      console.log('[useGrantsFlow] → Transaction hash:', result.transactionHash);
      console.log('[useGrantsFlow] → Height:', result.height);
      console.log('[useGrantsFlow] → Explorer URL: https://explorer.burnt.com/xion-mainnet-1/tx/' + result.transactionHash);

      // 8. Store granter address (using storage directly since setGranter is private)
      console.log('[useGrantsFlow] 💾 Storing granter address in localStorage');
      localStorage.setItem('xion-authz-granter-account', smartAccountAddress);

      // 9. Set abstract account and trigger auth state (skip verification since we just created grants)
      console.log('[useGrantsFlow] 🔐 Setting session keypair and triggering auth state...');
      abstraxionAuth.abstractAccount = tempKeypair;
      // Skip authenticate() to avoid redundant grant verification query
      // We just successfully created the grants, so we know they exist
      // Just trigger the auth state change directly
      abstraxionAuth['triggerAuthStateChange'](true);
      console.log('[useGrantsFlow] ✅ Session established successfully!');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create grants';
      setGrantsError(errorMessage);
      console.error('Grants flow error:', err);
      throw err;
    } finally {
      setIsCreatingGrants(false);
    }
  }, [rpcUrl, contracts, bank, stake, treasury, daodaoIndexerUrl]);

  return {
    isCreatingGrants,
    grantsError,
    createGrants,
  };
}
