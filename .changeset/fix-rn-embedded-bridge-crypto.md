---
"@burnt-labs/abstraxion-react-native": patch
"@burnt-labs/abstraxion-core": patch
---

Send the dashboard's accepted `xion_iframe` target from the embedded React Native bridge. Previously, the dashboard ignored every embedded CONNECT request until it timed out.

Accept react-native-quick-crypto 1.x as a peer dependency. Version 1.x fixes GHSA-wrf3-fwx3-8jrv and keeps the same `pbkdf2` API.

Set `global.quickCrypto` in the React Native demo after installing the crypto polyfill.
