/**
 * Smart account transaction message builders
 * Extracted from AA API xion/accounts.ts
 *
 * These functions build the CosmWasm messages needed to:
 * 1. Register a new smart account (MsgRegisterAccount)
 * 2. Create fee grants for the account
 * 3. Create authz grants for the account
 *
 * Use these for direct on-chain account creation without the AA API.
 */

import { EncodeObject } from "@cosmjs/proto-signing";
import { Buffer } from "buffer";
import Long from "long";
import { MsgExec } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import { MsgGrant } from "cosmjs-types/cosmos/authz/v1beta1/tx";
import { MsgGrantAllowance } from "cosmjs-types/cosmos/feegrant/v1beta1/tx";
import {
  AllowedMsgAllowance,
  PeriodicAllowance,
} from "cosmjs-types/cosmos/feegrant/v1beta1/feegrant";
import {
  MsgExecuteContract,
  MsgMigrateContract,
} from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { MsgRegisterAccount } from "../types/generated/abstractaccount/v1/tx";
import {
  ContractsAllowance,
  MultiAnyAllowance,
} from "../types/generated/abstractaccount/v1/feegrant";

const typeUrlMsgRegisterAccount = "/abstractaccount.v1.MsgRegisterAccount";

/**
 * Configuration for building smart account messages
 */
export interface MessageConfig {
  /** Contract code ID */
  codeId: number;
  /** Fee granter address (creator/funder) */
  feeGranter: string;
  /** Predicted smart account address */
  smartAccountAddress: string;
  /** Salt as Uint8Array */
  salt: Uint8Array;
}

/**
 * Authenticator data for EthWallet
 */
export interface EthWalletAuthenticator {
  /** Ethereum address (0x..., lowercase) */
  address: string;
  /** Signature from personal_sign (base64) */
  signature: string;
}

/**
 * Authenticator data for Secp256k1
 */
export interface Secp256k1Authenticator {
  /** Public key (base64, 33 or 65 bytes) */
  pubkey: string;
  /** Signature from signArbitrary (base64, 64 bytes) */
  signature: string;
}

/**
 * Build the contract init message for EthWallet authenticator
 *
 * @param auth - EthWallet authenticator data
 * @returns Contract init message
 */
export function buildEthWalletInitMsg(auth: EthWalletAuthenticator): any {
  // Normalize address to lowercase with 0x prefix
  let normalizedAddress = auth.address.toLowerCase();
  if (!normalizedAddress.startsWith("0x")) {
    normalizedAddress = "0x" + normalizedAddress;
  }

  // Validate address format (must be 42 chars: "0x" + 40 hex chars)
  if (normalizedAddress.length !== 42) {
    throw new Error(
      `EthWallet address must be 42 characters (0x + 40 hex), got ${normalizedAddress.length}`,
    );
  }

  return {
    id: 0,
    authenticator: {
      EthWallet: {
        id: 0,
        address: normalizedAddress,
        signature: auth.signature,
      },
    },
  };
}

/**
 * Build the contract init message for Secp256k1 authenticator
 *
 * @param auth - Secp256k1 authenticator data
 * @returns Contract init message
 */
export function buildSecp256k1InitMsg(auth: Secp256k1Authenticator): any {
  return {
    id: 0,
    authenticator: {
      Secp256K1: {
        id: 0,
        pubkey: auth.pubkey,
        signature: auth.signature,
      },
    },
  };
}

/**
 * Build MsgRegisterAccount for creating a smart account
 *
 * This is wrapped in MsgExec so it can be executed by a worker account
 * on behalf of the fee granter.
 *
 * @param config - Message configuration
 * @param initMsg - Contract init message (from buildEthWalletInitMsg or buildSecp256k1InitMsg)
 * @param workerAddress - Address that will execute the transaction
 * @returns EncodeObject ready for signAndBroadcast
 */
export function buildMsgRegisterAccount(
  config: MessageConfig,
  initMsg: any,
  workerAddress: string,
): EncodeObject {
  return {
    typeUrl: MsgExec.typeUrl,
    value: MsgExec.fromPartial({
      grantee: workerAddress,
      msgs: [
        {
          typeUrl: typeUrlMsgRegisterAccount,
          value: MsgRegisterAccount.encode(
            MsgRegisterAccount.fromPartial({
              sender: config.feeGranter,
              codeId: Long.fromNumber(config.codeId),
              msg: Buffer.from(JSON.stringify(initMsg)),
              funds: [],
              salt: config.salt,
            }),
          ).finish(),
        },
      ],
    }),
  };
}

/**
 * Build fee grant message for the smart account
 *
 * This creates a MultiAnyAllowance with:
 * - ContractsAllowance for the smart account
 * - AllowedMsgAllowance for specific message types
 *
 * @param config - Message configuration
 * @param workerAddress - Address that will execute the transaction
 * @returns EncodeObject ready for signAndBroadcast
 */
export function buildFeeGrantMessage(
  config: MessageConfig,
  workerAddress: string,
): EncodeObject {
  const oneDayInSeconds = BigInt(24 * 60 * 60);
  const periodSpendLimit = [{ denom: "uxion", amount: "100000" }];

  return {
    typeUrl: MsgExec.typeUrl,
    value: MsgExec.fromPartial({
      grantee: workerAddress,
      msgs: [
        {
          typeUrl: MsgGrantAllowance.typeUrl,
          value: MsgGrantAllowance.encode(
            MsgGrantAllowance.fromPartial({
              granter: config.feeGranter,
              grantee: config.smartAccountAddress,
              allowance: {
                typeUrl: "/xion.v1.MultiAnyAllowance",
                value: MultiAnyAllowance.encode(
                  MultiAnyAllowance.fromPartial({
                    allowances: [
                      {
                        typeUrl: "/xion.v1.ContractsAllowance",
                        value: ContractsAllowance.encode(
                          ContractsAllowance.fromPartial({
                            contractAddresses: [config.smartAccountAddress],
                            allowance: {
                              typeUrl: PeriodicAllowance.typeUrl,
                              value: PeriodicAllowance.encode(
                                PeriodicAllowance.fromPartial({
                                  period: { seconds: oneDayInSeconds },
                                  periodSpendLimit,
                                }),
                              ).finish(),
                            },
                          }),
                        ).finish(),
                      },
                      {
                        typeUrl: AllowedMsgAllowance.typeUrl,
                        value: AllowedMsgAllowance.encode(
                          AllowedMsgAllowance.fromPartial({
                            allowance: {
                              typeUrl: PeriodicAllowance.typeUrl,
                              value: PeriodicAllowance.encode(
                                PeriodicAllowance.fromPartial({
                                  period: { seconds: oneDayInSeconds },
                                  periodSpendLimit,
                                }),
                              ).finish(),
                            },
                            // MsgExecuteContract.typeUrl is needed to support paying for the Treasury contract msg execute call. Will eventually be a proxy.
                            // MsgGrantAllowance.typeUrl is needed to support meta accounts fee granting for the staking dashboard (Since it will happen in the same tx as the authz grants)
                            allowedMessages: [
                              MsgGrant.typeUrl,
                              MsgGrantAllowance.typeUrl,
                              MsgExecuteContract.typeUrl,
                              MsgMigrateContract.typeUrl,
                            ],
                          }),
                        ).finish(),
                      },
                    ],
                  }),
                ).finish(),
              },
            }),
          ).finish(),
        },
      ],
    }),
  };
}

/**
 * Helper to convert hex signature to base64
 *
 * @param signatureHex - Signature as hex string (with or without 0x)
 * @returns Signature as base64 string
 */
export function hexSignatureToBase64(signatureHex: string): string {
  const hex = signatureHex.replace(/^0x/, "");
  return Buffer.from(hex, "hex").toString("base64");
}

/**
 * Helper to convert hex pubkey to base64
 *
 * @param pubkeyHex - Public key as hex string (with or without 0x)
 * @returns Public key as base64 string
 */
export function hexPubkeyToBase64(pubkeyHex: string): string {
  const hex = pubkeyHex.replace(/^0x/, "");
  return Buffer.from(hex, "hex").toString("base64");
}

/**
 * Complete workflow: Build all messages needed to create a smart account with EthWallet
 *
 * @param config - Message configuration
 * @param auth - EthWallet authenticator (address + signature in hex)
 * @param workerAddress - Address that will execute the transaction
 * @returns Array of EncodeObjects ready for signAndBroadcast
 */
export function buildEthWalletAccountMessages(
  config: MessageConfig,
  auth: { address: string; signatureHex: string },
  workerAddress: string,
): EncodeObject[] {
  const authenticator: EthWalletAuthenticator = {
    address: auth.address,
    signature: hexSignatureToBase64(auth.signatureHex),
  };

  const initMsg = buildEthWalletInitMsg(authenticator);
  const registerMsg = buildMsgRegisterAccount(config, initMsg, workerAddress);
  const feeGrantMsg = buildFeeGrantMessage(config, workerAddress);

  return [registerMsg, feeGrantMsg];
}

/**
 * Complete workflow: Build all messages needed to create a smart account with Secp256k1
 *
 * @param config - Message configuration
 * @param auth - Secp256k1 authenticator (pubkey + signature in hex)
 * @param workerAddress - Address that will execute the transaction
 * @returns Array of EncodeObjects ready for signAndBroadcast
 */
export function buildSecp256k1AccountMessages(
  config: MessageConfig,
  auth: { pubkeyHex: string; signatureHex: string },
  workerAddress: string,
): EncodeObject[] {
  const authenticator: Secp256k1Authenticator = {
    pubkey: hexPubkeyToBase64(auth.pubkeyHex),
    signature: hexSignatureToBase64(auth.signatureHex),
  };

  const initMsg = buildSecp256k1InitMsg(authenticator);
  const registerMsg = buildMsgRegisterAccount(config, initMsg, workerAddress);
  const feeGrantMsg = buildFeeGrantMessage(config, workerAddress);

  return [registerMsg, feeGrantMsg];
}
