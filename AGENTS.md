# AGENTS.md

## Dashboard messaging

- Use `MessageTarget.XION_IFRAME` for dashboard iframe request targets, including React Native WebView bridge envelopes; its wire value is `"xion_iframe"`, not `"XION_IFRAME"`. When changing either transport, add or update a regression test that checks the serialized request target is `"xion_iframe"`.

## React Native crypto

- When changing React Native crypto setup, explicitly assign a crypto implementation exposing `pbkdf2` to `global.quickCrypto` before wallet KDF operations; do not rely on calling `install()` alone. The core wallet reads `global.quickCrypto.pbkdf2`, not `global.crypto`.
