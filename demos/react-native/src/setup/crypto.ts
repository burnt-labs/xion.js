import "react-native-get-random-values";
import { Buffer } from "buffer";

// CosmJS reaches for `Buffer` and Node crypto globals. Polyfill both before
// any `@burnt-labs/abstraxion-react-native` import that triggers signing
// codepaths. Importing this file from `app/_layout.tsx` guarantees order.
if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}

// react-native-quick-crypto is a native JSI module that throws at import
// time when the binary isn't linked (e.g. Expo Go). Use a dynamic require
// inside try/catch so the bundle still loads — PBKDF2-derived flows will
// fail at runtime if hit. Use a custom dev client for full functionality.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const quickCrypto = require("react-native-quick-crypto");
  quickCrypto.install();
} catch (err) {
  console.warn(
    "[demos-react-native] react-native-quick-crypto unavailable " +
      "(likely Expo Go). PBKDF2-backed flows will fail until you switch " +
      "to a custom dev client (npx expo run:ios | run:android).",
    err,
  );
}
