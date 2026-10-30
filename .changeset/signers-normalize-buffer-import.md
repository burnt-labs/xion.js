---
"@burnt-labs/signers": patch
---

fix(signers): `normalizeSecp256k1PublicKey` imports `Buffer` from the `buffer` package instead of relying on a global, so it works in browsers and React Native without a polyfill.
