---
"@burnt-labs/signers": minor
---

feat(signers): add `deriveCosmosBech32(rawPubkeyBase64, prefix)` pure helper in `crypto/` (exported from `@burnt-labs/signers/crypto` and the main entry). Derives a bech32 account address from a raw secp256k1 public key, returning `null` on invalid input. Lets dashboard/xion-app consumers stop hand-rolling pubkey→address derivation.
