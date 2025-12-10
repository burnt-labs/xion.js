# XION Cryptography Package

This package contains cryptographic utilities for XION abstract account operations, including salt calculation, signature verification, and format normalization. These functions are shared across xion.js, account-abstraction-api, and must remain consistent with smart contract implementations.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Salt Calculation](#salt-calculation)
  - [Format Specifications](#format-specifications)
  - [Secp256k1 Salt](#secp256k1-salt)
  - [EthWallet Salt](#ethwallet-salt)
  - [JWT Salt](#jwt-salt)
- [Signature Verification](#signature-verification)
  - [Secp256k1 Signature Verification](#secp256k1-signature-verification)
  - [EthWallet Signature Verification](#ethwallet-signature-verification)
- [Common Patterns](#common-patterns)
- [Cross-Repository Consistency](#cross-repository-consistency)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

XION abstract accounts use CREATE2 address derivation, which requires deterministic salt calculation:

```
┌─────────────────────┐
│  User Identifier    │
│  (pubkey/address)   │
└──────────┬──────────┘
           │
           ▼
   ┌───────────────┐
   │  Normalize    │  ← Different per authenticator type
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐
   │  Calculate    │
   │  Salt (SHA256)│
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐
   │  CREATE2      │  ← Deterministic address
   │  Address      │
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐
   │  Sign Address │  ← Signature verification
   └───────────────┘
```

**Critical requirement**: Salt calculation MUST be identical across:
- xion.js SDK (this package)
- account-abstraction-api
- Smart contract expectations

## Salt Calculation

### Format Specifications

Different authenticator types use different input formats and hashing strategies:

| Authenticator Type | Input Format | Normalization | What Gets Hashed | Output |
|-------------------|--------------|---------------|------------------|--------|
| **Secp256k1** | Base64 pubkey (must normalize hex first) | None (expects base64) | UTF-8 bytes of base64 STRING (44 bytes) | 64-char hex |
| **EthWallet** | Ethereum address | Lowercase, remove 0x | Binary address bytes (20 bytes) | 64-char hex |
| **JWT** | JWT token string | None | UTF-8 bytes of JWT string | 64-char hex |
| **Passkey** | Credential string | None | UTF-8 bytes of credential string | 64-char hex |
| **Ed25519** | Pubkey string | None | UTF-8 bytes of pubkey string | 64-char hex |

### Secp256k1 Salt

**Critical distinction**: Hashes the UTF-8 bytes of the base64 STRING representation, NOT the decoded public key bytes.

#### Formula

```
salt = SHA256(UTF8_encode(base64_pubkey_string))
```

#### Example Calculation

```typescript
// Input: Hex public key (66 chars)
const pubkeyHex = "0235ddf60543861890dd45f9488eda09b6f7a254b0bf1a98099a5fde105fa34f56";

// Step 1: Normalize to base64 (using normalizeSecp256k1PublicKey)
const pubkeyBase64 = "AjXd9gVDhhiQ3UX5SI7aCbb3olSwvxqYCZpf3hBfo09W";
// Base64 string is 44 characters

// Step 2: Convert base64 STRING to UTF-8 bytes
const utf8Bytes = new TextEncoder().encode(pubkeyBase64);
// Result: [65, 106, 88, 100, 57, 103, ...] (44 bytes - the ASCII values)

// Step 3: SHA256 hash
const saltBytes = sha256(utf8Bytes);
const salt = toHex(saltBytes);
// Result: "671de17b..." (64 hex chars = 32 bytes)
```

#### What NOT to do

```typescript
// ❌ WRONG: Hashing decoded pubkey bytes
const pubkeyBytes = fromBase64(pubkeyBase64);  // 33 bytes
const salt = sha256(pubkeyBytes);  // Will produce WRONG salt!

// ✅ CORRECT: Hash the base64 STRING
const salt = sha256(new TextEncoder().encode(pubkeyBase64));
```

#### Input Requirements

| Requirement | Details |
|------------|---------|
| Format | MUST be base64 (44 chars) - function does NOT accept hex directly |
| Pubkey Type | MUST be compressed (33 bytes when decoded) |
| Normalization | **ALWAYS** call `normalizeSecp256k1PublicKey()` first if input is in hex format |

#### Code Example

```typescript
import { calculateSecp256k1Salt } from "./salt";
import { normalizeSecp256k1PublicKey } from "./normalization";

// Always normalize first
const pubkeyHex = "0235ddf60543861890dd45f9488eda09b6f7a254b0bf1a98099a5fde105fa34f56";
const normalized = normalizeSecp256k1PublicKey(pubkeyHex);  // → base64
const salt = calculateSecp256k1Salt(normalized);

console.log(salt);  // "671de17b..." (64 hex chars)
```

### EthWallet Salt

**Critical distinction**: Hashes the binary address bytes (20 bytes), NOT the hex string representation.

#### Formula

```
salt = SHA256(address_bytes)
```

#### Example Calculation

```typescript
// Input: Ethereum address (any case, with or without 0x)
const address = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

// Step 1: Normalize to lowercase hex without 0x
const addressHex = "742d35cc6634c0532925a3b844bc9e7595f0beb0";

// Step 2: Decode hex to binary bytes
const addressBytes = fromHex(addressHex);
// Result: [116, 45, 53, 204, ...] (20 bytes)

// Step 3: SHA256 hash
const saltBytes = sha256(addressBytes);
const salt = toHex(saltBytes);
// Result: "e8f5a8b6..." (64 hex chars = 32 bytes)
```

#### Input Requirements

| Requirement | Details |
|------------|---------|
| Format | Ethereum address (with or without 0x prefix) |
| Case | Any case (normalized to lowercase internally) |
| Length | 40 hex chars (42 with 0x) = 20 bytes |

#### Code Example

```typescript
import { calculateEthWalletSalt } from "./salt";

// All these produce the same salt:
const salt1 = calculateEthWalletSalt("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0");
const salt2 = calculateEthWalletSalt("742d35Cc6634C0532925a3b844Bc9e7595f0bEb0");
const salt3 = calculateEthWalletSalt("0x742D35CC6634C0532925A3B844BC9E7595F0BEB0");

console.log(salt1 === salt2 && salt2 === salt3);  // true
```

### JWT Salt

Hashes the UTF-8 bytes of the JWT token string.

#### Formula

```
salt = SHA256(UTF8_encode(jwt_string))
```

#### Example Calculation

```typescript
// Input: JWT token or identifier
const jwt = "my-app.user-123";

// Step 1: Convert to UTF-8 bytes
const utf8Bytes = new TextEncoder().encode(jwt);

// Step 2: SHA256 hash
const saltBytes = sha256(utf8Bytes);
const salt = toHex(saltBytes);
// Result: "a1b2c3d4..." (64 hex chars = 32 bytes)
```

#### Code Example

```typescript
import { calculateJWTSalt } from "./salt";

const jwt = "my-app.user-123";
const salt = calculateJWTSalt(jwt);

console.log(salt);  // "a1b2c3d4..." (64 hex chars)
```

## Signature Verification

### Secp256k1 Signature Verification

Verifies that a signature is over `SHA256(message_bytes)`. During account creation, the message is the predicted smart account address.

#### Format Requirements

| Component | Format | Length | Notes |
|-----------|--------|--------|-------|
| **Message** | Hex (0x-prefixed) or plain string | Variable | Typically bech32 address (e.g., "xion1...") |
| **Signature** | Hex (with or without 0x) | 128 hex chars | 64 bytes (r + s, NO recovery byte) |
| **Public Key** | Base64 or hex | 44 chars (base64) or 66 chars (hex) | 33 bytes compressed or 65 bytes uncompressed |

#### Message Format

The function supports two message formats for backward compatibility:

1. **Hex format** (recommended): `"0x78696f6e31..."` (UTF-8 encoded address as hex)
2. **Plain string format**: `"xion1..."` (bech32 address)

Both formats are converted to UTF-8 bytes and then SHA256 hashed.

#### Signature Format

**Critical**: Must be 64 bytes (r + s components only), NO recovery byte.

```typescript
// ✅ CORRECT: 64 bytes (128 hex chars)
const signature = "cdae249670bafbc5...";  // 128 chars

// ❌ WRONG: 65 bytes (includes recovery byte)
const signature = "cdae249670bafbc5...1b";  // 130 chars
```

#### Example Verification

```typescript
import { verifySecp256k1Signature } from "./signature-verification";
import { utf8ToHexWithPrefix } from "./hex-validation";

// Smart account address (predicted via CREATE2)
const smartAccountAddress = "xion1yl244ujfadvdya78ryzf2pqzcycz46zs72rq2gtvdlq7aup7gn9s27mxzx";

// Convert to hex format (recommended)
const messageHex = utf8ToHexWithPrefix(smartAccountAddress);
// Result: "0x78696f6e31796c323434756a66616476647961..."

// Signature from wallet (64 bytes)
const signatureHex = "cdae249670bafbc5...";  // 128 hex chars

// Public key (base64 format)
const pubkeyBase64 = "AjXd9gVDhhiQ3UX5SI7aCbb3olSwvxqYCZpf3hBfo09W";

// Verify
const isValid = await verifySecp256k1Signature(
  messageHex,
  signatureHex,
  pubkeyBase64
);

console.log(isValid);  // true if signature is valid
```

#### Smart Contract Equivalent

This verification matches the smart contract's logic during instantiate:

```rust
// contracts/account/src/auth.rs
Authenticator::Secp256K1 { pubkey } => {
  let tx_bytes_hash = util::sha256(tx_bytes);  // tx_bytes = env.contract.address.as_bytes()
  deps.api.secp256k1_verify(&tx_bytes_hash, sig_bytes, pubkey)
}
```

### EthWallet Signature Verification

Verifies Ethereum wallet signatures using ECDSA signature recovery.

#### Format Requirements

| Component | Format | Length | Notes |
|-----------|--------|--------|-------|
| **Message** | String | Variable | Typically bech32 address (e.g., "xion1...") |
| **Signature** | Hex (with or without 0x) | 130 hex chars | 65 bytes (r + s + v) |
| **Expected Address** | Ethereum address | 42 chars (with 0x) | Address that should have signed |

#### Signature Format

**Critical**: Must be 65 bytes (r + s + v), includes recovery byte.

```typescript
// ✅ CORRECT: 65 bytes (130 hex chars)
const signature = "cdae249670bafbc5...1b";  // 130 chars (includes recovery byte)

// ❌ WRONG: 64 bytes (missing recovery byte)
const signature = "cdae249670bafbc5...";  // 128 chars
```

#### Example Verification

```typescript
import { verifyEthWalletSignature } from "./signature-verification";

// Smart account address
const smartAccountAddress = "xion1yl244ujfadvdya78ryzf2pqzcycz46zs72rq2gtvdlq7aup7gn9s27mxzx";

// Signature from MetaMask (65 bytes)
const signatureHex = "cdae249670bafbc5...1b";  // 130 hex chars

// Expected signer address
const expectedAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

// Verify
const isValid = verifyEthWalletSignature(
  smartAccountAddress,
  signatureHex,
  expectedAddress
);

console.log(isValid);  // true if signature is valid
```

## Common Patterns

### Account Creation Flow

Complete flow for creating a new abstract account:

```typescript
import {
  normalizeSecp256k1PublicKey,
  calculateSecp256k1Salt,
  calculateSmartAccountAddress,
  verifySecp256k1Signature,
  utf8ToHexWithPrefix,
  hexSaltToUint8Array
} from "@burnt-labs/signers";

// 1. Normalize public key
const pubkeyHex = "0235ddf60543861890dd45f9488eda09b6f7a254b0bf1a98099a5fde105fa34f56";
const normalizedPubkey = normalizeSecp256k1PublicKey(pubkeyHex);
// Result: "AjXd9gVDhhiQ3UX5SI7aCbb3olSwvxqYCZpf3hBfo09W" (base64)

// 2. Calculate salt
const saltHex = calculateSecp256k1Salt(normalizedPubkey);
// Result: "671de17b..." (64 hex chars)

// 3. Convert salt to Uint8Array
const saltBytes = hexSaltToUint8Array(saltHex);

// 4. Calculate smart account address (CREATE2)
const smartAccountAddress = calculateSmartAccountAddress({
  creator: "xion1...",
  codeHash: "...",
  salt: saltBytes,
  chainPrefix: "xion"
});
// Result: "xion1yl244ujfadvdya78ryzf2pqzcycz46zs72rq2gtvdlq7aup7gn9s27mxzx"

// 5. Sign the predicted address
const messageHex = utf8ToHexWithPrefix(smartAccountAddress);
const signature = await wallet.signMessage(messageHex);
// Wallet returns 64-byte signature (128 hex chars)

// 6. Verify signature before sending to contract
const isValid = await verifySecp256k1Signature(
  messageHex,
  signature,
  normalizedPubkey
);

if (!isValid) {
  throw new Error("Signature verification failed");
}

// 7. Send to contract for instantiation
// Contract will verify the same signature during instantiate
```

### Format Conversion Table

| From | To | Function | Example |
|------|----|---------|---------|
| Hex pubkey | Base64 pubkey | `normalizeSecp256k1PublicKey()` | `"0235dd..."` → `"AjXd9g..."` |
| String | Hex with 0x | `utf8ToHexWithPrefix()` | `"xion1..."` → `"0x78696f..."` |
| Hex salt | Uint8Array | `hexSaltToUint8Array()` | `"671de1..."` → `Uint8Array(32)` |
| Hex | Bytes | `fromHex()` | `"0235dd..."` → `Uint8Array(33)` |
| Bytes | Hex | `toHex()` | `Uint8Array(32)` → `"671de1..."` |

## Cross-Repository Consistency

### Salt Calculation Consistency

**xion.js** (this package):
```typescript
// packages/signers/src/crypto/salt.ts
export function calculateSecp256k1Salt(pubkey: string): string {
  const saltBytes = sha256(new TextEncoder().encode(pubkey));
  return toHex(saltBytes);
}
```

**account-abstraction-api**:
```typescript
// src/xion/accounts/secp256k1/Secp256k1AbstractAccount.ts
import { calculateSecp256k1Salt } from "@burnt-labs/signers";

protected getEncodedSalt(pubKey: string): Uint8Array<ArrayBufferLike> {
  const saltHex = calculateSecp256k1Salt(pubKey);
  return hexSaltToUint8Array(saltHex);
}
```

**Smart Contract**:
```rust
// contracts/account/src/contract.rs
// Uses salt in CREATE2 formula during instantiate
let contract_addr = deps.api.addr_canonicalize(env.contract.address.as_str())?;
```

### Signature Verification Consistency

**xion.js** (this package):
```typescript
// Verifies SHA256(message_bytes)
const messageHash = sha256(messageBytes);
return await Secp256k1.verifySignature(sig, messageHash, pubkeyBytes);
```

**Smart Contract**:
```rust
// contracts/account/src/auth.rs
Authenticator::Secp256K1 { pubkey } => {
  let tx_bytes_hash = util::sha256(tx_bytes);
  deps.api.secp256k1_verify(&tx_bytes_hash, sig_bytes, pubkey)
}
```

Both implementations:
1. SHA256 hash the message bytes
2. Verify signature over the hash
3. Use the same pubkey format (compressed or uncompressed)

## Troubleshooting

### Common Issues

#### Issue: Salt mismatch between xion.js and AA-API

**Symptom**: Different salts produced for the same public key.

**Cause**: Public key not normalized to base64 format before hashing.

**Solution**:
```typescript
// ❌ WRONG: Passing hex directly
const salt = calculateSecp256k1Salt(pubkeyHex);

// ✅ CORRECT: Normalize first
const normalized = normalizeSecp256k1PublicKey(pubkeyHex);
const salt = calculateSecp256k1Salt(normalized);
```

#### Issue: Signature verification fails

**Symptom**: `verifySecp256k1Signature()` returns `false`.

**Causes and Solutions**:

1. **Wrong signature length**:
   ```typescript
   // Check signature length
   const sigBytes = fromHex(signature);
   console.log(sigBytes.length);  // Must be 64 for Secp256k1, 65 for EthWallet
   ```

2. **Wrong message format**:
   ```typescript
   // ✅ CORRECT: Convert to hex with 0x prefix
   const messageHex = utf8ToHexWithPrefix(smartAccountAddress);

   // ❌ WRONG: Plain string (unless using backward compatibility mode)
   const message = smartAccountAddress;
   ```

3. **Wrong public key format**:
   ```typescript
   // ✅ CORRECT: Use normalized base64
   const normalized = normalizeSecp256k1PublicKey(pubkeyHex);
   await verifySecp256k1Signature(message, signature, normalized);
   ```

#### Issue: CREATE2 address doesn't match expected

**Symptom**: Calculated address differs from contract-created address.

**Causes and Solutions**:

1. **Salt calculation error**: Ensure using correct formula for authenticator type
2. **Code hash mismatch**: Verify using correct contract code hash
3. **Creator mismatch**: Ensure using correct creator address

**Debug checklist**:
```typescript
// 1. Verify salt calculation
const saltHex = calculateSecp256k1Salt(normalizedPubkey);
console.log("Salt:", saltHex);  // Should be 64 hex chars

// 2. Verify salt bytes
const saltBytes = hexSaltToUint8Array(saltHex);
console.log("Salt bytes length:", saltBytes.length);  // Should be 32

// 3. Verify inputs to CREATE2
console.log("Creator:", creator);
console.log("Code hash:", codeHash);
console.log("Chain prefix:", chainPrefix);
```

### Getting Help

For more detailed information, see:
- [Root-level cryptography reference](../../../../../../../XION_CRYPTOGRAPHY_REFERENCE.md) - Complete specifications
- [Integration test findings](../../../../INTEGRATION_TEST_FINDINGS.md) - Common issues and solutions
- Smart contract source: `contracts/contracts/account/src/` - Contract implementation

### Validation Tools

Use these diagnostic tests to verify cryptographic consistency:

```bash
cd xion.js/packages/abstraxion
pnpm test tests/integration/diagnostics/secp256k1-consistency.diagnostic.test.ts
```

These tests verify:
- Salt calculation consistency
- Address derivation correctness
- Signature format validation
- Cross-repository consistency
