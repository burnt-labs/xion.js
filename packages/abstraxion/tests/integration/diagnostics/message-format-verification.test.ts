/**
 * Diagnostic test to verify message format consistency
 * Tests that signing with hex format and verifying with plain string works
 */

import { describe, it, expect } from "vitest";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { stringToPath, Sha256, Secp256k1 } from "@cosmjs/crypto";
import { toHex, fromHex } from "@cosmjs/encoding";
import {
  utf8ToHexWithPrefix,
  verifySecp256k1Signature,
  normalizeSecp256k1PublicKey,
} from "@burnt-labs/signers";
import { TEST_MNEMONIC } from "../fixtures";

describe("Message Format Verification", () => {
  it("should verify that hex-encoded and plain string produce same hash", async () => {
    const address = "xion1yl244ujfadvdya78ryzf2pqzcycz46zs72rq2gtvdlq7aup7gn9s27mxzx";

    // Convert to hex
    const addressHex = utf8ToHexWithPrefix(address);
    console.log("Address (plain):", address);
    console.log("Address (hex):", addressHex);

    // Decode hex back to bytes
    const hexBytes = fromHex(addressHex.slice(2)); // Remove 0x
    const plainBytes = Buffer.from(address, "utf8");

    console.log("Hex bytes:", Array.from(hexBytes));
    console.log("Plain bytes:", Array.from(plainBytes));

    // They should be identical
    expect(hexBytes).toEqual(plainBytes);

    // Hash should also be identical
    const hexHash = new Sha256(hexBytes).digest();
    const plainHash = new Sha256(plainBytes).digest();

    expect(hexHash).toEqual(plainHash);
  });

  it("should sign with hex format and verify with plain string", async () => {
    // Create wallet
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(TEST_MNEMONIC, {
      prefix: "xion",
      hdPaths: [stringToPath(`m/44'/118'/0'/0/0`)],
    });

    const [account] = await wallet.getAccounts();

    // Get private key for signing
    const { Slip10, Slip10Curve, stringToPath: pathToArray } = await import("@cosmjs/crypto");
    const { Bip39, EnglishMnemonic } = await import("@cosmjs/crypto");
    const mnemonicObj = new EnglishMnemonic(TEST_MNEMONIC);
    const seed = await Bip39.mnemonicToSeed(mnemonicObj);
    const { privkey } = Slip10.derivePath(Slip10Curve.Secp256k1, seed, pathToArray(`m/44'/118'/0'/0/0`));

    // Test address
    const address = "xion1yl244ujfadvdya78ryzf2pqzcycz46zs72rq2gtvdlq7aup7gn9s27mxzx";

    // Sign the HEX-encoded address (like xion.js does)
    const addressHex = utf8ToHexWithPrefix(address);
    const messageBytes = fromHex(addressHex.slice(2));
    const digest = new Sha256(messageBytes).digest();
    const sig = await Secp256k1.createSignature(digest, privkey);
    const signatureBytes = new Uint8Array([...sig.r(32), ...sig.s(32)]);
    const signatureHex = toHex(signatureBytes);

    console.log("\n=== Signing with HEX format ===");
    console.log("Message (hex):", addressHex);
    console.log("Signature:", signatureHex);

    // Normalize pubkey
    const compressedPubkey = Secp256k1.compressPubkey(account.pubkey);
    const pubkeyHex = toHex(compressedPubkey);
    const pubkeyBase64 = normalizeSecp256k1PublicKey(pubkeyHex);

    console.log("Pubkey (hex):", pubkeyHex);
    console.log("Pubkey (base64):", pubkeyBase64);

    // Verify with HEX format (should work)
    console.log("\n=== Verifying with HEX format ===");
    const isValidHex = await verifySecp256k1Signature(
      addressHex,
      signatureHex,
      pubkeyBase64
    );
    console.log("Verification result (hex message):", isValidHex);
    expect(isValidHex).toBe(true);

    // Verify with PLAIN STRING format (like AA API does)
    console.log("\n=== Verifying with PLAIN STRING format ===");
    const isValidPlain = await verifySecp256k1Signature(
      address,  // Plain string, no 0x prefix
      signatureHex,
      pubkeyBase64
    );
    console.log("Verification result (plain message):", isValidPlain);
    expect(isValidPlain).toBe(true);

    console.log("\n✅ Both formats verify successfully!");
  });

  it("should demonstrate the AA API flow", async () => {
    // This test simulates exactly what happens:
    // 1. xion.js signs with hex format
    // 2. AA API verifies with plain string format

    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(TEST_MNEMONIC, {
      prefix: "xion",
      hdPaths: [stringToPath(`m/44'/118'/0'/0/0`)],
    });

    const [account] = await wallet.getAccounts();

    const { Slip10, Slip10Curve, stringToPath: pathToArray, Bip39, EnglishMnemonic } = await import("@cosmjs/crypto");
    const mnemonicObj = new EnglishMnemonic(TEST_MNEMONIC);
    const seed = await Bip39.mnemonicToSeed(mnemonicObj);
    const { privkey } = Slip10.derivePath(Slip10Curve.Secp256k1, seed, pathToArray(`m/44'/118'/0'/0/0`));

    const address = "xion1yl244ujfadvdya78ryzf2pqzcycz46zs72rq2gtvdlq7aup7gn9s27mxzx";

    // XION.JS SIDE: Signs with hex
    const signMessageFn = async (hexMessage: string) => {
      const messageBytes = fromHex(hexMessage.slice(2));
      const digest = new Sha256(messageBytes).digest();
      const sig = await Secp256k1.createSignature(digest, privkey);
      const signatureBytes = new Uint8Array([...sig.r(32), ...sig.s(32)]);
      return toHex(signatureBytes);
    };

    const addressHex = utf8ToHexWithPrefix(address);
    const signature = await signMessageFn(addressHex);

    console.log("\n=== XION.JS SIDE ===");
    console.log("Signed message:", addressHex);
    console.log("Signature:", signature);

    // AA API SIDE: Verifies with plain string
    const compressedPubkey = Secp256k1.compressPubkey(account.pubkey);
    const pubkeyHex = toHex(compressedPubkey);
    const pubkeyBase64 = normalizeSecp256k1PublicKey(pubkeyHex);

    console.log("\n=== AA API SIDE ===");
    console.log("Verifying message:", address);  // Plain string!
    console.log("Using pubkey:", pubkeyBase64);

    const isValid = await verifySecp256k1Signature(
      address,  // Plain string (AA API passes this.address)
      signature,
      pubkeyBase64
    );

    console.log("Verification result:", isValid);
    expect(isValid).toBe(true);

    console.log("\n✅ AA API flow works correctly!");
  });
});
