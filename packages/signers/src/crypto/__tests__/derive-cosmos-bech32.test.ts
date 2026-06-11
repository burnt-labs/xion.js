import { describe, it, expect } from "vitest";
import { deriveCosmosBech32 } from "../address";

// Valid compressed secp256k1 public key (33 bytes), base64-encoded, with its
// known derived addresses for "xion" and "cosmos" prefixes.
const VALID_PUBKEY_B64 = "AlMM9kMvmfX+wfePigniQkpdmaSLNtCnoW8WXbAOLSfC";
const EXPECTED_XION = "xion1cg2r54yq37qyd3gdjv3t2c0c5yt844akwx50c8";
const EXPECTED_COSMOS = "cosmos1cg2r54yq37qyd3gdjv3t2c0c5yt844akv0wdwv";

describe("deriveCosmosBech32", () => {
  describe("valid derivations", () => {
    it("derives the expected xion address from a raw secp256k1 pubkey", () => {
      expect(deriveCosmosBech32(VALID_PUBKEY_B64, "xion")).toBe(EXPECTED_XION);
    });

    it("derives a different bech32 address per prefix", () => {
      expect(deriveCosmosBech32(VALID_PUBKEY_B64, "cosmos")).toBe(
        EXPECTED_COSMOS,
      );
    });

    it("is deterministic for the same inputs", () => {
      expect(deriveCosmosBech32(VALID_PUBKEY_B64, "xion")).toBe(
        deriveCosmosBech32(VALID_PUBKEY_B64, "xion"),
      );
    });
  });

  describe("invalid inputs return null", () => {
    it("returns null for an empty pubkey", () => {
      expect(deriveCosmosBech32("", "xion")).toBeNull();
    });

    it("returns null for an empty prefix", () => {
      expect(deriveCosmosBech32(VALID_PUBKEY_B64, "")).toBeNull();
    });

    it("returns null for a non-base64 pubkey", () => {
      expect(deriveCosmosBech32("not!base64!!", "xion")).toBeNull();
    });

    it("returns null for a wrong-length key (CosmJS requires 33-byte compressed)", () => {
      // Base64 of a 4-byte buffer — decodes fine but is not a valid pubkey.
      // rawSecp256k1PubkeyToRawAddress only accepts the 33-byte compressed
      // form and throws on anything else, so derivation returns null.
      const tooShort = Buffer.from([1, 2, 3, 4]).toString("base64");
      expect(deriveCosmosBech32(tooShort, "xion")).toBeNull();
    });

    it("does not throw on malformed input", () => {
      expect(() => deriveCosmosBech32("???", "xion")).not.toThrow();
    });
  });
});
