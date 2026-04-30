import "react-native-get-random-values";
import { install } from "react-native-quick-crypto";

// Install react-native-quick-crypto as a global polyfill BEFORE any
// `@burnt-labs/abstraxion-react-native` import that triggers signing/crypto
// codepaths. Importing this file from `app/_layout.tsx` guarantees that.
install();
