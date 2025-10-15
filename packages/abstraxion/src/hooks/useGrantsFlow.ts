/**
 * Hook for managing grants flow in direct mode
 * After wallet connects, this creates grants from smart account to temp keypair
 */

import { useState, useCallback } from "react";
import { GasPrice } from "@cosmjs/stargate";
import {
  buildGrantMessages,
  generateTreasuryGrants,
} from "@burnt-labs/account-management";
import { AADirectSigner, AAEthSigner, AAClient } from "@burnt-labs/signers";
import { abstraxionAuth } from "../components/Abstraxion";
import type { WalletConnectionInfo } from "./useWalletAuth";
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
}

interface GrantsFlowState {
  isCreatingGrants: boolean;
  grantsError: string | null;
  createGrants: (
    smartAccountAddress: string,
    walletInfo: WalletConnectionInfo,
    chainId: string,
  ) => Promise<void>;
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
}: UseGrantsFlowProps): GrantsFlowState {
  const [isCreatingGrants, setIsCreatingGrants] = useState(false);
  const [grantsError, setGrantsError] = useState<string | null>(null);

  const createGrants = useCallback(async (
    smartAccountAddress: string,
    walletInfo: WalletConnectionInfo,
    chainId: string,
  ) => {
    try {
      setIsCreatingGrants(true);
      setGrantsError(null);

      // 1. Generate temp keypair and get grantee address
      const tempKeypair = await abstraxionAuth.generateAndStoreTempAccount();
      const granteeAddress = await abstraxionAuth.getKeypairAddress();

      // 2. Build grant messages - query treasury contract or use manual configs
      let grantMessages: any[] = [];
      let needsDeployFeeGrant = false;

      if (treasury) {
        // Query treasury contract for grant configurations (matching dashboard flow)
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
          );

          needsDeployFeeGrant = true; // Treasury mode requires deploy_fee_grant
        } catch (error) {
          console.error('Failed to query treasury contract:', error);
          // Fall back to manual configs
        }
      }

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
      const authenticatorIndex = walletInfo.authenticatorIndex ?? 0;

      let signer;

      if (walletInfo.type === 'EthWallet') {
        // MetaMask signer
        if (!window.ethereum) {
          throw new Error('MetaMask not found');
        }

        const personalSign = async (message: string) => {
          const signature = await window.ethereum!.request({
            method: 'personal_sign',
            params: [message, walletInfo.address],
          });
          return signature as string;
        };

        signer = new AAEthSigner(
          smartAccountAddress,
          authenticatorIndex,
          personalSign,
        );
      } else {
        // Keplr/Leap/OKX signer
        const walletName = walletInfo.walletName || 'keplr';
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

      // 6. Simulate transaction to get gas estimate
      const simmedGas = await client.simulate(
        smartAccountAddress,
        messagesToSign,
        'Create grants for abstraxion',
      );

      // Calculate fee based on simulated gas with generous buffer
      // Using higher multiplier to account for fee market fluctuations
      const gasPriceNum = rpcUrl.includes('mainnet') ? 0.025 : 0.001;
      const calculatedFee = {
        amount: [{ denom: 'uxion', amount: String(Math.ceil(simmedGas * gasPriceNum * 2)) }], // 2x buffer on amount
        gas: String(Math.ceil(simmedGas * 1.6)), // 60% buffer on gas limit
      };

      // Add fee granter if provided (pays transaction fees on behalf of smart account)
      const feeToUse = feeGranter
        ? {
            ...calculatedFee,
            granter: feeGranter,
          }
        : calculatedFee;

      // 7. Sign and broadcast grant transaction
      const result = await client.signAndBroadcast(
        smartAccountAddress,
        messagesToSign,
        feeToUse,
        'Create grants for abstraxion',
      );

      // 8. Store granter address (using storage directly since setGranter is private)
      localStorage.setItem('xion-authz-granter-account', smartAccountAddress);

      // 9. Set abstract account and authenticate (verify grants exist on-chain)
      abstraxionAuth.abstractAccount = tempKeypair;
      await abstraxionAuth.authenticate();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create grants';
      setGrantsError(errorMessage);
      console.error('Grants flow error:', err);
      throw err;
    } finally {
      setIsCreatingGrants(false);
    }
  }, [rpcUrl, contracts, bank, stake, treasury]);

  return {
    isCreatingGrants,
    grantsError,
    createGrants,
  };
}
