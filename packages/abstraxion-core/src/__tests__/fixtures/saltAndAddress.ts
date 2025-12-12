/**
 * Mock data for salt and address calculations
 * These are deterministic values calculated from specific inputs
 * Used to verify that salt and address calculations remain consistent
 *
 * Salt values are calculated deterministically from the input credentials.
 * Address values require checksum, feeGranter, and addressPrefix to be calculated.
 */

export const mockSaltAndAddressData = {
  ethWallet: {
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
    addressLowercase: "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
    addressNoPrefix: "742d35cc6634c0532925a3b844bc9e7595f0beb0",
    // Expected salt calculated from the address (normalized)
    // This salt is deterministic and should always be the same for this address
    expectedSalt:
      "3b54f2a1226c4af7c429c9326547a09bf3a1ca36314c60cdff6edf1d3af6a55c",
    // Expected address calculated with these config values
    config: {
      checksum:
        "0000000000000000000000000000000000000000000000000000000000000000", // Placeholder
      feeGranter: "xion1test", // Placeholder
      addressPrefix: "xion",
    },
    expectedAddress: "", // Will be populated after running test
  },
  secp256k1: {
    pubkey:
      "A03C6E8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F8F4F",
    // Expected salt calculated from the pubkey
    // This salt is deterministic and should always be the same for this pubkey
    expectedSalt:
      "7f1dd81586bbdf2fb8dc766b61af8e79b5f2ca74c7d546af057ec5239c1e7e74",
    // Expected address calculated with these config values
    config: {
      checksum:
        "0000000000000000000000000000000000000000000000000000000000000000", // Placeholder
      feeGranter: "xion1test", // Placeholder
      addressPrefix: "xion",
    },
    expectedAddress: "", // Will be populated after running test
  },
  jwt: {
    identifier: "google.com.user123456789",
    // Expected salt calculated from the identifier
    // This salt is deterministic and should always be the same for this identifier
    expectedSalt:
      "1d50be584885c20610fb05f5b6884ec1ec28caa890898a20f87b846a9c8a3ad3",
    // Expected address calculated with these config values
    config: {
      checksum:
        "0000000000000000000000000000000000000000000000000000000000000000", // Placeholder
      feeGranter: "xion1test", // Placeholder
      addressPrefix: "xion",
    },
    expectedAddress: "", // Will be populated after running test
  },
};
