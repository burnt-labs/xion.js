/**
 * Test to verify AA API signature verification behavior
 * Tests both local and deployed versions
 */

import { describe, it } from "vitest";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { stringToPath, Sha256, Secp256k1 } from "@cosmjs/crypto";
import { toHex, fromHex } from "@cosmjs/encoding";
import {
  utf8ToHexWithPrefix,
  normalizeSecp256k1PublicKey,
  formatSecp256k1Signature,
  formatSecp256k1Pubkey,
  calculateSecp256k1Salt,
  calculateSmartAccountAddress,
} from "@burnt-labs/signers";
import { TEST_MNEMONIC } from "../fixtures";

async function testAAAPI(apiUrl: string, name: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing: ${name}`);
  console.log(`API URL: ${apiUrl}`);
  console.log(`${"=".repeat(60)}\n`);

  // Create wallet
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(TEST_MNEMONIC, {
    prefix: "xion",
    hdPaths: [stringToPath(`m/44'/118'/0'/0/0`)],
  });

  const [account] = await wallet.getAccounts();

  // Get private key
  const {
    Slip10,
    Slip10Curve,
    stringToPath: pathToArray,
    Bip39,
    EnglishMnemonic,
  } = await import("@cosmjs/crypto");
  const mnemonicObj = new EnglishMnemonic(TEST_MNEMONIC);
  const seed = await Bip39.mnemonicToSeed(mnemonicObj);
  const { privkey } = Slip10.derivePath(
    Slip10Curve.Secp256k1,
    seed,
    pathToArray(`m/44'/118'/0'/0/0`),
  );

  // Normalize pubkey
  const compressedPubkey = Secp256k1.compressPubkey(account.pubkey);
  const pubkeyHex = toHex(compressedPubkey);
  const pubkeyBase64 = normalizeSecp256k1PublicKey(pubkeyHex);

  // Calculate address
  const checksum =
    "FC06F022C95172F54AD05BC07214F50572CDF684459EADD4F58A765524567DB8";
  const feeGranter = "xion1xrqz2wpt4rw8rtdvrc4n4yn5h54jm0nn4evn2x";
  const salt = calculateSecp256k1Salt(pubkeyBase64);
  const smartAccountAddress = calculateSmartAccountAddress({
    checksum,
    creator: feeGranter,
    salt,
    prefix: "xion",
  });

  console.log("Smart Account Address:", smartAccountAddress);
  console.log("Pubkey (base64):", pubkeyBase64);
  console.log("Pubkey (hex):", pubkeyHex);

  // Sign the address (hex format - like xion.js does)
  const addressHex = utf8ToHexWithPrefix(smartAccountAddress);
  const messageBytes = fromHex(addressHex.slice(2));
  const digest = new Sha256(messageBytes).digest();
  const sig = await Secp256k1.createSignature(digest, privkey);
  const signatureBytes = new Uint8Array([...sig.r(32), ...sig.s(32)]);
  const signatureHex = toHex(signatureBytes);

  console.log("\nMessage signed (hex):", addressHex);
  console.log("Signature (hex, 128 chars):", signatureHex);

  // Format for AA API
  const formattedSignature = formatSecp256k1Signature(signatureHex);
  const formattedPubkey = formatSecp256k1Pubkey(pubkeyHex);

  console.log("\nFormatted for AA API:");
  console.log("Signature:", formattedSignature);
  console.log("Pubkey:", formattedPubkey);

  // Call AA API
  try {
    const response = await fetch(`${apiUrl}/api/v2/accounts/create/secp256k1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pubKey: formattedPubkey,
        signature: formattedSignature,
      }),
    });

    const data = await response.json();

    console.log(`\nResponse Status: ${response.status}`);
    console.log("Response Body:", JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log("\n✅ SUCCESS - Account created!");
    } else {
      console.log("\n❌ FAILED - Error from API");
    }

    return { success: response.ok, data };
  } catch (error) {
    console.log("\n❌ ERROR - Failed to call API");
    console.error(error);
    return { success: false, error };
  }
}

describe("AA API Version Comparison", () => {
  it("should test local AA API", async () => {
    await testAAAPI("http://localhost:8787", "LOCAL AA API");
  }, 30000);

  it("should test deployed AA API", async () => {
    await testAAAPI(
      "https://aa-api.xion-testnet-2.burnt.com",
      "DEPLOYED AA API (testnet)",
    );
  }, 30000);
});
