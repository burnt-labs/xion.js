/**
 * Standard test addresses for XION blockchain testing
 * These addresses are deterministic and safe to use in tests
 */

export const TEST_ADDRESSES = {
  // Standard test validator address
  validator: "xionvaloper1q5wtf79lrndrm4uxpxzsqnkahewen47qug7f4h",
  
  // Standard test account address
  account: "xion15k0lncpkc93p79sl9fjfs0hwn7hjajsvclnv5k3xeguwe08yme9sttujm4",
  
  // Standard test contract address
  contract: "xion1z70cvc08qv5764zeg3dykcyymj5z6nu4sqr7x8vl4zjef2gyp69s9mmdka",
  
  // Fee granter placeholder
  feeGranter: "xion1test",
} as const;

/**
 * Ethereum wallet test data with deterministic salt calculations
 */
export const ETH_WALLET_TEST_DATA = {
  address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  addressLowercase: "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
  addressNoPrefix: "742d35cc6634c0532925a3b844bc9e7595f0beb0",
  expectedSalt: "3b54f2a1226c4af7c429c9326547a09bf3a1ca36314c60cdff6edf1d3af6a55c",
  config: {
    checksum: "0000000000000000000000000000000000000000000000000000000000000000",
    feeGranter: TEST_ADDRESSES.feeGranter,
    addressPrefix: "xion",
  },
} as const;

/**
 * Secp256k1 wallet test data with deterministic salt calculations
 */
export const SECP256K1_TEST_DATA = {
  pubkey: "A03C6E8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F",
  expectedSalt: "7f1dd81586bbdf2fb8dc766b61af8e79b5f2ca74c7d546af057ec5239c1e7e74",
  config: {
    checksum: "0000000000000000000000000000000000000000000000000000000000000000",
    feeGranter: TEST_ADDRESSES.feeGranter,
    addressPrefix: "xion",
  },
} as const;

/**
 * JWT test data with deterministic salt calculations
 */
export const JWT_TEST_DATA = {
  identifier: "google.com.user123456789",
  expectedSalt: "1d50be584885c20610fb05f5b6884ec1ec28caa890898a20f87b846a9c8a3ad3",
  config: {
    checksum: "0000000000000000000000000000000000000000000000000000000000000000",
    feeGranter: TEST_ADDRESSES.feeGranter,
    addressPrefix: "xion",
  },
} as const;
