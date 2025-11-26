/**
 * Mock implementation of @burnt-labs/signers package
 * 
 * This mock is used in orchestrator flow tests to avoid WebAuthn import issues.
 * The real @burnt-labs/signers package imports WebAuthn at module load time,
 * which causes errors in Node.js test environments.
 * 
 * This mock provides the necessary signer interfaces without WebAuthn dependencies.
 */

import { vi } from "vitest";

// Mock AAClient
export class AAClient {
  static connect = vi.fn().mockResolvedValue({
    getChainId: vi.fn().mockResolvedValue("xion-testnet-2"),
    queryContractSmart: vi.fn(),
    simulate: vi.fn(),
    signAndBroadcast: vi.fn(),
  });

  getChainId = vi.fn().mockResolvedValue("xion-testnet-2");
  queryContractSmart = vi.fn();
  simulate = vi.fn();
  signAndBroadcast = vi.fn();
}

// Mock AADirectSigner
export class AADirectSigner {
  constructor(public smartAccountAddress: string, public authenticatorIndex: number) {}
  sign = vi.fn();
}

// Mock AAEthSigner
export class AAEthSigner {
  constructor(public smartAccountAddress: string, public authenticatorIndex: number) {}
  sign = vi.fn();
}

// Mock AbstractAccountJWTSigner
export class AbstractAccountJWTSigner {
  constructor(public smartAccountAddress: string, public authenticatorIndex: number) {}
  sign = vi.fn();
}

// Mock AAPasskeySigner (without WebAuthn dependencies)
export class AAPasskeySigner {
  constructor(public smartAccountAddress: string, public authenticatorIndex: number) {}
  sign = vi.fn();
}

// Mock crypto utilities
export const calculateSmartAccountAddress = vi.fn();
export const calculateEthWalletSalt = vi.fn();
export const calculateSecp256k1Salt = vi.fn();
export const calculateJWTSalt = vi.fn();
export const hexSaltToUint8Array = vi.fn();
export const formatEthSignatureToBase64 = vi.fn();
export const formatSecp256k1SignatureToBase64 = vi.fn();

// Mock validation utilities
export const normalizeEthereumAddress = vi.fn();
export const normalizeSecp256k1PublicKey = vi.fn();
export const normalizeJWTIdentifier = vi.fn();
export const isJWTToken = vi.fn();
export const isEthereumAddress = vi.fn();
export const isSecp256k1PublicKey = vi.fn();
export const detectAuthenticatorType = vi.fn();
export const AUTHENTICATOR_TYPE = {
  JWT: "JWT",
  ETH_WALLET: "EthWallet",
  SECP256K1: "Secp256K1",
  PASSKEY: "Passkey",
} as const;

export type AuthenticatorType = "JWT" | "EthWallet" | "Secp256K1" | "Passkey";

