# demos/react-native

Expo + React Native demo for `@burnt-labs/abstraxion-react-native`.

## Stack

- Expo SDK 54 (React Native 0.81 / React 19 / new architecture)
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

Then press `i` for iOS simulator, `a` for Android, or scan the QR code with Expo Go / your dev client.

> Don't use the web target (`w` / `expo start --web`). Native-only modules — `react-native-quick-crypto` (signing polyfill) and the redirect-auth deep-link flow — aren't web-compatible, and Metro will fail the bundle.

## Pick a runtime

You have three ways to run this demo. Pick based on what you have installed and what you need to test.

| Runtime | Setup cost | Functionality | Best for |
| --- | --- | --- | --- |
| iOS Simulator | Install Xcode (~10 GB, macOS only) | Full | macOS users — fastest local loop |
| **Option A** — Expo Go | None (just install the app) | **Limited** — UI only | Quick UI checks, demoing scaffold work |
| **Option B** — Custom dev client | One-time native build | Full | Physical Android phone, full signing on any device |

### iOS Simulator (recommended on macOS)

One-time setup:

1. Install **Xcode** from the Mac App Store (~10 GB).
2. Open Xcode once, accept the license, and install the iOS Simulator component under *Settings → Platforms*.

Then `pnpm --filter demos-react-native start` and press `i` — Expo boots the simulator and installs the app for you. Full functionality, no extra build step.

### Option A — Expo Go on a physical device (limited)

1. Install **Expo Go** from the iOS App Store or Google Play.
2. Put the phone on the **same Wi-Fi** as your dev machine.
3. `pnpm --filter demos-react-native start`, then scan the QR code with the iPhone Camera app (iOS) or the Expo Go app (Android).

**Limitations of Option A.** Expo Go is a pre-built shell with a fixed set of native modules — you can't add new ones at runtime. This demo depends on `react-native-quick-crypto` (a native JSI module), which is **not** bundled in Expo Go.

`src/setup/crypto.ts` swallows the load failure so the bundle still boots, but:

- ❌ `SignArbSecp256k1HdWallet` (PBKDF2-derived signers) — throws when called
- ❌ Any future flow that goes through `quickCrypto.pbkdf2`
- ✅ Redirect auth + UI navigation
- ✅ Most basic transaction signing (uses libsodium / pure-JS paths)
- ✅ Deep links (`abstraxiondemo://`)

If you only want to scan the QR and see the UI, this is the fastest path. If anything throws "quickCrypto not available globally", switch to Option B.

### Option B — custom dev client (full functionality, any device)

A "dev client" is a one-time-built version of the Expo Go app with *your* native modules (quick-crypto) compiled in. After the first build the loop is identical to Expo Go — Metro hot-reloads, scan a QR, etc.

**Prerequisite for both sub-paths:** add `expo-dev-client` to the demo:

```bash
cd /Users/<you>/path/to/xion.js
pnpm --filter demos-react-native add expo-dev-client
```

#### B1 — Local build (free, fastest iteration)

You install the native toolchain on your machine, Expo runs `gradle` / `xcodebuild`, the binary is installed on your device.

**Android phone (USB):**

One-time setup:
1. Install **Android Studio** — it ships the SDK + platform tools.
2. Set `ANDROID_HOME` (the Android Studio setup wizard prints the path; usually `~/Library/Android/sdk`).
3. Install **OpenJDK 17**: `brew install --cask zulu@17`.
4. On the phone: enable **Developer Options** (Settings → About Phone → tap Build Number 7 times) → enable **USB Debugging**.
5. Plug in via USB. Verify with `adb devices` — your phone should appear.

Build + install:
```bash
cd xion.js/demos/react-native
npx expo run:android --device
```
First build: ~5–10 min (Gradle downloads everything). Subsequent JS changes hot-reload through Metro — no rebuild needed unless you change native code.

**iPhone (physical) or iOS Simulator:**

One-time setup:
1. Install **Xcode** + license: `sudo xcodebuild -license`.
2. Install command line tools: `xcode-select --install`.
3. *(Physical iPhone only)* Sign in to Xcode with your Apple ID — *Xcode → Settings → Accounts*. A free Apple ID works; the build is valid for 7 days, then re-sign by rebuilding.
4. *(Physical iPhone only)* Plug in via USB → tap **Trust This Computer** on the phone.

Build + install:
```bash
# iOS Simulator (no Apple ID needed):
npx expo run:ios

# Physical iPhone:
npx expo run:ios --device
```

#### B2 — EAS Build (cloud, no local toolchain)

If you don't want to install Xcode or Android Studio, let Expo's cloud do the build:

```bash
npm i -g eas-cli
eas login                                          # free Expo account
cd xion.js/demos/react-native
eas build --profile development --platform android  # or ios
```

Wait ~15 min, get a download URL, install:

- **Android:** sideload the `.apk` directly onto your phone — easiest path if you want to test on Android without installing Android Studio.
- **iOS:** requires a paid Apple Developer account ($99/yr) for ad-hoc provisioning. Not worth it just for this demo — use B1 instead.

#### Running against a dev client (any sub-path)

Once installed, start Metro from the workspace root:

```bash
pnpm --filter demos-react-native start
```

Open the dev client app on the device → it shows recently-opened projects, or you can scan the QR / paste the Metro URL. Reloads are instant from then on.

> Note on "macOS device": Expo doesn't build native macOS apps. On macOS your targets are iOS Simulator, physical iPhone via USB, or Android (simulator/device). The web target is unsupported for this demo (see the warning above).

## Deep links

The Expo scheme is `abstraxiondemo://` (see `app.json`). The dashboard redirect-auth flow returns to `abstraxiondemo://...` after login. Make sure the dashboard you are testing against allows that scheme as a redirect target.

## Crypto polyfill

`src/setup/crypto.ts` polyfills three things, in order:

1. `react-native-get-random-values` — secure RNG (pure JS, works everywhere).
2. `Buffer` from the `buffer` npm package — assigned to `global.Buffer` for CosmJS.
3. `react-native-quick-crypto` — native JSI module for fast PBKDF2.

Step 3 is wrapped in `try/catch` so the bundle still boots in Expo Go (where the native module isn't available — see Option A above). If you need PBKDF2-backed signing flows, use the iOS Simulator path or build a custom dev client (Option B).

This file is imported at the top of `src/app/_layout.tsx` so it runs before any Abstraxion import — keep it that way or `Buffer is not defined` will surface at runtime.

## Status

Scaffold only. Auth/signing/manage-authenticators screens land in commit 9 of [`abstraxion_package_restructure.md`](../../../.docs/tasks/abstraxion_package_restructure.md).

Embedded (in-app WebView) mode is deferred to Phase 9b — see the task doc for the transport-layer refactor required.
