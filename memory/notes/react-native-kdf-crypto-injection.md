---
title: React Native wallet KDF requires explicit quickCrypto injection
type: gotcha
scope: "{packages/abstraxion-core/src/SignArbSecp256k1HdWallet.ts,demos/react-native/src/setup/crypto.ts}"
confidence: 0.99
sources: [421]
updated: 2026-11-20
---
`SignArbSecp256k1HdWallet.executeKdf` detects React Native via `global.navigator?.product` and reads `global.quickCrypto`, requiring a callable `pbkdf2` property.
It calls the callback API with password, CosmJS salt, 100000 iterations, configured output length, and `"sha256"`; both password-based serialization and restoration reach this path.
App setup must explicitly assign the crypto implementation to `global.quickCrypto` before these operations; installing general crypto globals alone does not satisfy this lookup.
The checked-out demo only calls `install()`; PR #421 adds `global.quickCrypto = quickCryptoModule.default ?? quickCryptoModule` to handle the CommonJS/default-export boundary.
Review React Native bootstrap or crypto dependency changes against this injected interface, not merely the presence of `global.crypto`.
