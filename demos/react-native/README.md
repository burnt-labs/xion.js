# demos/react-native

Expo + React Native demo for `@burnt-labs/abstraxion-react-native`.

## Stack

- Expo SDK 52 (React Native 0.76 / new architecture)
- Expo Router (file-based routing under `src/app/`)
- `@burnt-labs/abstraxion-react-native` with redirect auth as the primary flow
- AsyncStorage + Expo WebBrowser/Linking under the hood (already wired in the SDK)
- `react-native-get-random-values` + `react-native-quick-crypto` polyfills for signing

## Setup

```bash
cp .env.example .env.local            # fill in chain config
pnpm install                           # from xion.js/ workspace root
pnpm --filter demos-react-native start
```

Then press `i` for iOS simulator, `a` for Android, or scan the QR code with Expo Go.

## Deep links

The Expo scheme is `abstraxiondemo://` (see `app.json`). The dashboard redirect-auth flow returns to `abstraxiondemo://...` after login. Make sure the dashboard you are testing against allows that scheme as a redirect target.

## Crypto polyfill

`src/setup/crypto.ts` installs `react-native-quick-crypto` as a global polyfill. It's imported at the top of `src/app/_layout.tsx` so it runs before any Abstraxion import — keep it that way or signing will throw at runtime.

## Status

Scaffold only. Auth/signing/manage-authenticators screens land in commit 9 of [`abstraxion_package_restructure.md`](../../../.docs/tasks/abstraxion_package_restructure.md).

Embedded (in-app WebView) mode is deferred to Phase 9b — see the task doc for the transport-layer refactor required.
